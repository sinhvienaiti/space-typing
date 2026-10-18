import type { VisualQuality } from "../types";
import {
  MODEL_MANIFEST_URL,
  modelKey,
  type ModelKind,
  type ModelManifest,
  type ModelManifestEntry,
} from "./model-contracts";

/**
 * Finds and loads models prepared by `pnpm models:prepare`. The manifest says
 * which models exist, so the game never probes for missing files: a model
 * that is not listed keeps its painted 2D art.
 *
 * Tier per quality: Low never loads 3D; Medium loads the ".medium" file
 * (smaller textures); High and Ultra load ".high".
 */
type GLTF = import("three/examples/jsm/loaders/GLTFLoader.js").GLTF;

let manifestPromise: Promise<ModelManifest | null> | null = null;
let retryManifestAt = 0;
let loaderPromise: Promise<import("three/examples/jsm/loaders/GLTFLoader.js").GLTFLoader> | null = null;

export function modelManifest(fetcher: typeof fetch = fetch): Promise<ModelManifest | null> {
  if (manifestPromise !== null && retryManifestAt > 0 && Date.now() >= retryManifestAt) manifestPromise = null;
  manifestPromise ??= (async () => {
    let result: ModelManifest | null = null;
    try {
      const response = await fetcher(MODEL_MANIFEST_URL, { cache: "no-cache" });
      if (!response.ok || !(response.headers.get("content-type") ?? "").includes("json")) return null;
      const json = (await response.json()) as ModelManifest;
      result = json?.version === 1 && json.models !== null && typeof json.models === "object" ? json : null;
      return result;
    } catch {
      return null;
    } finally {
      retryManifestAt = result === null ? Date.now() + 30_000 : 0;
    }
  })();
  return manifestPromise;
}

/** For tests. */
export function resetModelManifest(): void {
  manifestPromise = null;
  retryManifestAt = 0;
}

export function pickModelTier(entry: ModelManifestEntry, quality: VisualQuality): string | null {
  if (quality === "low") return null;
  const preferred = quality === "medium" ? ["medium", "high"] : ["high", "medium"];
  for (const tier of preferred) {
    const file = entry.tiers[tier as "high" | "medium"];
    if (file !== undefined) return file.url;
  }
  return null;
}

export async function modelEntry(kind: ModelKind, id: string): Promise<ModelManifestEntry | null> {
  const manifest = await modelManifest();
  return manifest?.models[modelKey(kind, id)] ?? null;
}

export async function modelUrl(kind: ModelKind, id: string, quality: VisualQuality): Promise<string | null> {
  const entry = await modelEntry(kind, id);
  return entry === null ? null : pickModelTier(entry, quality);
}

async function gltfLoader(): Promise<import("three/examples/jsm/loaders/GLTFLoader.js").GLTFLoader> {
  loaderPromise ??= Promise.all([
    import("three/examples/jsm/loaders/GLTFLoader.js"),
    import("three/examples/jsm/libs/meshopt_decoder.module.js"),
  ]).then(([loader, meshopt]) => {
    const instance = new loader.GLTFLoader();
    instance.setMeshoptDecoder(meshopt.MeshoptDecoder);
    return instance;
  });
  return loaderPromise;
}

/** Loads a GLB (meshopt, quantized, WebP textures all supported). */
export async function loadModel(url: string): Promise<GLTF> {
  const loader = await gltfLoader();
  return loader.loadAsync(url);
}
