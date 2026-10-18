import type { Object3D, Texture } from "three";

/** GLTF textures own decoded ImageBitmaps as well as GPU allocations. Release both, once. */
export function disposeTexture(texture: Pick<Texture, "dispose"> & { source?: { data?: unknown } }, closed = new Set<unknown>()): void {
  texture.dispose();
  const data = texture.source?.data;
  if (data && typeof data === "object" && "close" in data && typeof data.close === "function" && !closed.has(data)) {
    closed.add(data);
    data.close();
  }
}

export function disposeObjectResources(group: Pick<Object3D, "traverse">, extraTextures: readonly Texture[] = []): void {
  const geometries = new Set<{ dispose(): void }>();
  const materials = new Set<import("three").Material>();
  const textures = new Set<Texture>(extraTextures);
  const skeletons = new Set<import("three").Skeleton>();
  group.traverse(object => {
    const mesh = object as import("three").SkinnedMesh;
    if (!mesh.isMesh) return;
    if (mesh.geometry) geometries.add(mesh.geometry);
    if (mesh.skeleton) skeletons.add(mesh.skeleton);
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) if (value && typeof value === "object" && "isTexture" in value) textures.add(value as Texture);
    }
  });
  for (const skeleton of skeletons) skeleton.dispose();
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  const closed = new Set<unknown>();
  for (const texture of textures) disposeTexture(texture, closed);
}
