/**
 * pnpm models:prepare [--only <kind>/<id>] [--force]
 *
 * Turns Blender/Meshy/Tripo exports into game-ready GLB files:
 *   art-src/models/<kind>/<id>.glb  (kind: ships, enemies, bosses, skills, items)
 *   art-src/bosses/3d/tyrant-g01.glb (legacy G01 source, still read)
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
import { mkdir, readdir, stat, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename, dirname, join, resolve } from "node:path";
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
const SOURCE_DIR = join(ROOT, "art-src/models");
const LEGACY_SOURCES: { kind: ModelKind; id: string; path: string }[] = [
  { kind: "bosses", id: "tyrant-g01", path: join(ROOT, "art-src/bosses/3d/tyrant-g01.glb") },
];
const OUT_DIR = join(ROOT, "public/assets/space-typing/models");
const PUBLIC_BASE = "/assets/space-typing/models";
const KINDS = Object.keys(MODEL_CONTRACTS) as ModelKind[];
const TIERS: ModelTier[] = ["high", "medium"];

const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] ?? "" : "";
const force = args.includes("--force");

type Source = { kind: ModelKind; id: string; path: string };

async function findSources(): Promise<Source[]> {
  const found = new Map<string, Source>();
  for (const legacy of LEGACY_SOURCES) {
    if (existsSync(legacy.path)) found.set(modelKey(legacy.kind, legacy.id), legacy);
  }
  for (const kind of KINDS) {
    const dir = join(SOURCE_DIR, kind);
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

function countTriangles(document: Document): number {
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

async function previousManifest(): Promise<ModelManifest> {
  try {
    const raw = JSON.parse(await readFile(join(OUT_DIR, "manifest.json"), "utf8")) as ModelManifest;
    if (raw.version === 1 && raw.models !== null && typeof raw.models === "object") return raw;
  } catch {
    /* First run. */
  }
  return { version: 1, generatedAt: "", models: {} };
}

async function main(): Promise<void> {
  await MeshoptDecoder.ready;
  await MeshoptEncoder.ready;
  await MeshoptSimplifier.ready;
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

  const sources = await findSources();
  if (sources.length === 0) {
    console.log("No model sources. Put Blender exports in art-src/models/<kind>/<id>.glb (kinds: " + KINDS.join(", ") + ").");
    return;
  }
  const manifest = await previousManifest();
  let failures = 0;

  for (const source of sources) {
    const key = modelKey(source.kind, source.id);
    const contract = MODEL_CONTRACTS[source.kind];
    const document = await io.read(source.path);
    const triangles = countTriangles(document);
    const sockets = socketNames(document);
    const clips = clipNames(document);
    const problems = [
      ...missingSockets(contract, sockets).map((name) => "missing socket " + name),
      ...missingClips(contract, clips).map((name) => "missing clip containing " + name),
      ...(triangles < contract.triangles.min ? ["only " + triangles + " triangles (min " + contract.triangles.min + ")"] : []),
    ];
    const notes = triangles > contract.triangles.max
      ? ["" + triangles + " triangles (budget " + contract.triangles.max + "); Medium tier will be simplified"]
      : [];
    const sourceBytes = (await stat(source.path)).size;
    console.log("\n" + key + "  ←  " + source.path.replace(ROOT + "/", ""));
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
      const file = join(OUT_DIR, source.kind, source.id, source.id + "." + tier + ".glb");
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, bytes);
      const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 10);
      entry.tiers[tier] = { url: PUBLIC_BASE + "/" + source.kind + "/" + source.id + "/" + source.id + "." + tier + ".glb?v=" + hash, bytes: bytes.byteLength };
      console.log("  " + tier.padEnd(6) + " → " + (bytes.byteLength / 1048576).toFixed(2) + " MB (textures ≤ " + limit + " px)");
    }
    manifest.models[key] = entry;
  }

  // Version retained entries too when --only is used: every stable filename must invalidate old caches.
  for (const entry of Object.values(manifest.models)) for (const tier of Object.values(entry.tiers)) {
    const path = tier.url.split("?")[0]!;
    if (!path.startsWith(PUBLIC_BASE + "/")) throw new Error("Unexpected model URL: " + path);
    const bytes = await readFile(join(OUT_DIR, path.slice(PUBLIC_BASE.length + 1)));
    tier.url = path + "?v=" + createHash("sha256").update(bytes).digest("hex").slice(0, 10);
    tier.bytes = bytes.byteLength;
  }
  manifest.generatedAt = new Date().toISOString();
  manifest.models = Object.fromEntries(Object.entries(manifest.models).sort(([a], [b]) => a.localeCompare(b)));
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log("\nmanifest: " + Object.keys(manifest.models).length + " models → public/assets/space-typing/models/manifest.json");
  if (failures > 0) {
    console.log(failures + " model(s) skipped; see ERROR lines above.");
    process.exitCode = 1;
  }
}

await main();
