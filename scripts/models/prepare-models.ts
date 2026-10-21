/**
 * pnpm models:prepare [--only <kind>/<id>] [--force]
 *
 * Turns Blender/Meshy/Tripo exports into game-ready GLB files:
 *   art-src/models/<kind>/<id>.glb  (kind: ships, enemies, bosses, skills, items)
 *   art-src/3d/bosses/tyrant-g01.glb (the G01 boss: packaged as authored, no Blender pass)
 * →
 *   public/assets/space-typing/models/<kind>/<id>/<id>.high.glb
 *   public/assets/space-typing/models/<kind>/<id>/<id>.medium.glb
 *   public/assets/space-typing/models/manifest.json
 *
 * Each tier: dedup, prune, weld, resample animation, textures resized to the
 * tier's limit and re-encoded as WebP, geometry quantized and compressed with
 * meshopt (EXT_meshopt_compression). The Medium tier is simplified when the
 * model is over its triangle budget. Validation follows
 * src/render3d/model-contracts.ts; a model missing a required socket or clip
 * is reported and skipped unless --force.
 */
import { mkdir, readdir, stat, writeFile, readFile, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO, type Document } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  cloneDocument,
  dedup,
  getBounds,
  meshopt,
  prune,
  resample,
  simplify,
  textureCompress,
  weld,
} from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";
import {
  MODEL_CONTRACTS,
  missingClips,
  missingSockets,
  modelKey,
  type ModelKind,
  type ModelManifest,
  type ModelManifestEntry,
  type ModelTier,
} from "../../src/render3d/model-contracts";

const ROOT = resolve(import.meta.dirname, "../..");
const PUBLIC_BASE = "/assets/space-typing/models";
const KINDS = Object.keys(MODEL_CONTRACTS) as ModelKind[];
const TIERS: ModelTier[] = ["high", "medium"];

type Source = { kind: ModelKind; id: string; path: string };

export async function findSources(root = ROOT, only = ""): Promise<Source[]> {
  const found = new Map<string, Source>();
  for (const legacy of [{ kind: "bosses" as ModelKind, id: "tyrant-g01", path: join(root, "art-src/3d/bosses/tyrant-g01.glb") }]) {
    if (existsSync(legacy.path)) found.set(modelKey(legacy.kind, legacy.id), legacy);
  }
  for (const kind of KINDS) {
    const dir = join(root, "art-src/models", kind);
    if (!existsSync(dir)) continue;
    for (const file of await readdir(dir)) {
      if (!file.toLowerCase().endsWith(".glb")) continue;
      const id = basename(file, ".glb").toLowerCase();
      if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
        console.warn("skip " + kind + "/" + file + ": use lower-case letters, digits and dashes");
        continue;
      }
      found.set(modelKey(kind, id), { kind, id, path: join(dir, file) });
    }
  }
  return [...found.values()].filter((source) => only === "" || modelKey(source.kind, source.id) === only);
}

export function countTriangles(document: Document): number {
  let total = 0;
  for (const mesh of document.getRoot().listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      const indices = primitive.getIndices();
      const position = primitive.getAttribute("POSITION");
      const mode = primitive.getMode();
      if (mode !== 4) continue; // TRIANGLES only
      total += Math.floor((indices?.getCount() ?? position?.getCount() ?? 0) / 3);
    }
  }
  return total;
}

function socketNames(document: Document): string[] {
  return document
    .getRoot()
    .listNodes()
    .map((node) => node.getName())
    .filter((name) => name.startsWith("FX_"));
}

function clipNames(document: Document): string[] {
  return document.getRoot().listAnimations().map((animation) => animation.getName());
}

export function validationProblems(kind: ModelKind, document: Document): string[] {
  const contract = MODEL_CONTRACTS[kind];
  const triangles = countTriangles(document);
  return [
    ...missingSockets(contract, socketNames(document)).map((name) => "missing socket " + name),
    ...missingClips(contract, clipNames(document)).map((name) => "missing clip containing " + name),
    ...(triangles < contract.triangles.min ? ["only " + triangles + " triangles (min " + contract.triangles.min + ")"] : []),
  ];
}

async function previousManifest(outDir: string): Promise<ModelManifest> {
  let text: string;
  try {
    text = await readFile(join(outDir, "manifest.json"), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { version: 1, generatedAt: "", models: {} };
    throw error;
  }
  try {
    const raw = JSON.parse(text) as ModelManifest;
    if (raw.version === 1 && raw.models !== null && typeof raw.models === "object" && !Array.isArray(raw.models)) return raw;
  } catch { /* Report the corrupt existing file without replacing it. */ }
  throw new Error("Existing model manifest is invalid; restore or repair " + join(outDir, "manifest.json") + " before preparing models");
}

async function writeAtomic(path: string, value: Uint8Array | string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = path + ".tmp-" + process.pid;
  await writeFile(temporary, value);
  await rename(temporary, path);
}

export async function prepareModels({ root = ROOT, only = "", force = false } = {}): Promise<{ failures: number; manifest: ModelManifest }> {
  const outDir = join(root, "public/assets/space-typing/models");
  await MeshoptDecoder.ready;
  await MeshoptEncoder.ready;
  await MeshoptSimplifier.ready;
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

  const sources = await findSources(root, only);
  const manifest = await previousManifest(outDir);
  if (sources.length === 0) {
    console.log("No model sources. Put Blender exports in art-src/models/<kind>/<id>.glb (kinds: " + KINDS.join(", ") + ").");
    return { failures: 0, manifest };
  }
  let failures = 0;

  for (const source of sources) {
    const key = modelKey(source.kind, source.id);
    try {
      const contract = MODEL_CONTRACTS[source.kind];
      const document = await io.read(source.path);
      const triangles = countTriangles(document);
      const sockets = socketNames(document);
      const clips = clipNames(document);
      const problems = validationProblems(source.kind, document);
      const notes = triangles > contract.triangles.max
        ? ["" + triangles + " triangles (budget " + contract.triangles.max + "); Medium tier will be simplified"]
        : [];
      const sourceBytes = (await stat(source.path)).size;
      console.log("\n" + key + "  ←  " + source.path.replace(root + "/", ""));
      console.log("  " + triangles.toLocaleString() + " tris · " + (sourceBytes / 1048576).toFixed(2) + " MB · sockets: " + (sockets.join(", ") || "none") + " · clips: " + (clips.join(", ") || "none"));
      for (const note of notes) console.log("  note: " + note);
      if (problems.length > 0) {
        for (const problem of problems) console.log("  ERROR: " + problem);
        if (!force) {
          failures += 1;
          console.log("  skipped (fix the export, or rerun with --force)");
          continue;
        }
      }

      // Sockets are empty leaf nodes: pruning must keep them.
      const keep = prune({ keepLeaves: true, keepExtras: true });
      await document.transform(dedup(), keep, weld(), resample());
      const bounds = getBounds(document.getRoot().listScenes()[0]!);
      const size: [number, number, number] = [0, 1, 2].map((axis) =>
        Number((bounds.max[axis]! - bounds.min[axis]!).toFixed(4)),
      ) as [number, number, number];

      const entry: ModelManifestEntry = { kind: source.kind, id: source.id, tiers: {}, triangles, sockets, clips, size };
      const pending: { file: string; bytes: Uint8Array }[] = [];
      for (const tier of TIERS) {
        const copy = cloneDocument(document);
        const limit = contract.textureMax[tier];
        const steps = [
          textureCompress({ encoder: sharp, targetFormat: "webp", resize: [limit, limit], quality: tier === "high" ? 90 : 84 }),
        ];
        if (tier === "medium" && triangles > contract.triangles.max) {
          steps.push(simplify({ simplifier: MeshoptSimplifier, ratio: contract.triangles.max / triangles, error: 0.002 }));
        }
        steps.push(meshopt({ encoder: MeshoptEncoder, level: "medium", cleanup: false }), prune({ keepLeaves: true, keepExtras: true }));
        await copy.transform(...steps);
        const kept = socketNames(copy);
        const lost = sockets.filter((name) => !kept.includes(name));
        if (lost.length > 0) throw new Error(key + " " + tier + ": optimisation removed sockets " + lost.join(", "));
        const bytes = await io.writeBinary(copy);
        const file = join(outDir, source.kind, source.id, source.id + "." + tier + ".glb");
        pending.push({ file, bytes });
        const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 10);
        entry.tiers[tier] = { url: PUBLIC_BASE + "/" + source.kind + "/" + source.id + "/" + source.id + "." + tier + ".glb?v=" + hash, bytes: bytes.byteLength };
        console.log("  " + tier.padEnd(6) + " → " + (bytes.byteLength / 1048576).toFixed(2) + " MB (textures ≤ " + limit + " px)");
      }
      // Finish both tier transforms before replacing a previous working model.
      for (const { file, bytes } of pending) await writeAtomic(file, bytes);
      manifest.models[key] = entry;
    } catch (error) {
      failures += 1;
      console.error("FAIL " + key + ": " + (error instanceof Error ? error.message : String(error)) + "; previous manifest entry kept");
    }
  }

  // Version retained entries too when --only is used: every stable filename must invalidate old caches.
  for (const entry of Object.values(manifest.models)) for (const tier of Object.values(entry.tiers)) {
    const path = tier.url.split("?")[0]!;
    if (!path.startsWith(PUBLIC_BASE + "/")) throw new Error("Unexpected model URL: " + path);
    let bytes: Uint8Array;
    try {
      bytes = await readFile(join(outDir, path.slice(PUBLIC_BASE.length + 1)));
    } catch {
      console.warn("WARN missing retained model tier " + path + "; manifest URL retained, other models can still be prepared");
      continue;
    }
    tier.url = path + "?v=" + createHash("sha256").update(bytes).digest("hex").slice(0, 10);
    tier.bytes = bytes.byteLength;
  }
  manifest.generatedAt = new Date().toISOString();
  manifest.models = Object.fromEntries(Object.entries(manifest.models).sort(([a], [b]) => a.localeCompare(b)));
  await writeAtomic(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log("\nmanifest: " + Object.keys(manifest.models).length + " models → public/assets/space-typing/models/manifest.json");
  if (failures > 0) {
    console.log(failures + " model(s) skipped; see ERROR lines above.");
  }
  return { failures, manifest };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const only = args.includes("--only") ? args[args.indexOf("--only") + 1] ?? "" : "";
  const { failures } = await prepareModels({ only, force: args.includes("--force") });
  if (failures > 0) process.exitCode = 1;
}
