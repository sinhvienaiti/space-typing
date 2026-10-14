import type { BuiltShip } from "./vanguard-model";

type Disposable = { dispose: () => void };
type MeshLike = {
  isMesh?: boolean;
  geometry?: Disposable;
  material?: Disposable | readonly Disposable[];
};

/**
 * Dedupe only concurrent construction. Resolved WebGL-backed instances are
 * deliberately not retained globally: a later Duel/Admin preview receives a
 * fresh owner that can be disposed without poisoning a shared cache.
 */
export function dedupeShip3DInFlight<T>(
  loads: Map<string, Promise<T>>,
  key: string,
  create: () => Promise<T>,
): Promise<T> {
  const existing = loads.get(key);
  if (existing !== undefined) return existing;

  const pending = create();
  loads.set(key, pending);
  void pending.finally(() => {
    if (loads.get(key) === pending) loads.delete(key);
  });
  return pending;
}

/**
 * Release every GPU resource owned by a BuiltShip exactly once. Three.js
 * Object3D does not dispose geometry/material/texture resources when removed
 * from a scene, so ownership must be explicit for repeated preview mounts.
 */
export function disposeBuiltShipResources(built: BuiltShip): void {
  const geometries = new Set<Disposable>();
  const materials = new Set<Disposable>();
  const textures = new Set<Disposable>(built.textures);

  built.group.traverse((object) => {
    const mesh = object as unknown as MeshLike;
    if (mesh.isMesh !== true) return;
    if (mesh.geometry?.dispose !== undefined) geometries.add(mesh.geometry);
    const material = mesh.material;
    if (Array.isArray(material)) {
      for (const entry of material) {
        if (entry?.dispose !== undefined) materials.add(entry);
      }
    } else if (material?.dispose !== undefined) {
      materials.add(material);
    }
  });

  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) texture.dispose();
}
