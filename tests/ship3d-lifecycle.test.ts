import { describe, expect, it, vi } from "vitest";
import type { BuiltShip } from "../src/duel/vanguard-model";
import {
  dedupeShip3DInFlight,
  disposeBuiltShipResources,
} from "../src/duel/ship3d-lifecycle";

describe("Ship3D lifecycle foundation", () => {
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
