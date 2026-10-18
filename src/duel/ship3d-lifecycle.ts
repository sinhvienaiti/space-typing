import type { BuiltShip } from "./vanguard-model";
import { disposeObjectResources } from "../render3d/dispose-resources";

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
export function disposeBuiltShipResources(built: Pick<BuiltShip, "group" | "textures">): void {
  disposeObjectResources(built.group, built.textures);
}
