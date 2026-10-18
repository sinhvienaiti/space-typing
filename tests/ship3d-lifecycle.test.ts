import { describe, expect, it, vi } from "vitest";
import type { BuiltShip } from "../src/duel/vanguard-model";
import * as three from "three";
import {
  dedupeShip3DInFlight,
  disposeBuiltShipResources,
} from "../src/duel/ship3d-lifecycle";

describe("Ship3D lifecycle foundation", () => {
  it("closes a shared decoded bitmap once and disposes bone textures", () => {
    const close = vi.fn();
    const bitmap = { close, width: 1, height: 1 };
    const texture = new three.Texture(bitmap as unknown as ImageBitmap);
    const second = new three.Texture(bitmap as unknown as ImageBitmap);
    const material = new three.MeshStandardMaterial({ map: texture, emissiveMap: second });
    const mesh = new three.SkinnedMesh(new three.BoxGeometry(), material);
    const bone = new three.Bone(); mesh.add(bone);
    const skeleton = new three.Skeleton([bone]);
    mesh.bind(skeleton); skeleton.computeBoneTexture();
    const disposeBones = vi.spyOn(skeleton.boneTexture!, "dispose");
    const group = new three.Group(); group.add(mesh);
    disposeBuiltShipResources({ group, textures: [texture, second] });
    expect(close).toHaveBeenCalledTimes(1);
    expect(disposeBones).toHaveBeenCalledTimes(1);
  });
  it("dedupes only in-flight construction and releases the cache after settle", async () => {
    const loads = new Map<string, Promise<number>>();
    let resolve!: (value: number) => void;
    const create = vi.fn(() => new Promise<number>((done) => { resolve = done; }));

    const first = dedupeShip3DInFlight(loads, "self:vanguard", create);
    const second = dedupeShip3DInFlight(loads, "self:vanguard", create);
    expect(second).toBe(first);
    expect(create).toHaveBeenCalledTimes(1);
    expect(loads.size).toBe(1);

    resolve(7);
    await expect(first).resolves.toBe(7);
    await Promise.resolve();
    expect(loads.size).toBe(0);

    const third = dedupeShip3DInFlight(loads, "self:vanguard", async () => 8);
    expect(third).not.toBe(first);
    await expect(third).resolves.toBe(8);
  });

  it("disposes shared geometry/material/texture resources exactly once", () => {
    const geometry = { dispose: vi.fn() };
    const material = { dispose: vi.fn() };
    const secondMaterial = { dispose: vi.fn() };
    const texture = { dispose: vi.fn() };
    const secondTexture = { dispose: vi.fn() };
    const objects = [
      { isMesh: true, geometry, material },
      { isMesh: true, geometry, material: [material, secondMaterial] },
      { isMesh: false },
    ];
    const built = {
      group: { traverse: (visit: (value: unknown) => void) => objects.forEach(visit) },
      textures: [texture, texture, secondTexture],
    } as unknown as BuiltShip;

    disposeBuiltShipResources(built);

    expect(geometry.dispose).toHaveBeenCalledTimes(1);
    expect(material.dispose).toHaveBeenCalledTimes(1);
    expect(secondMaterial.dispose).toHaveBeenCalledTimes(1);
    expect(texture.dispose).toHaveBeenCalledTimes(1);
    expect(secondTexture.dispose).toHaveBeenCalledTimes(1);
  });
});
