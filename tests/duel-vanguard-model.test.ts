import * as three from "three";
import { describe, expect, it } from "vitest";
import { buildVanguard } from "../src/duel/vanguard-model";

describe("Vanguard 3D model", () => {
  const ship = buildVanguard(three);
  const meshes: three.Mesh[] = [];
  ship.group.traverse((object) => { if ((object as three.Mesh).isMesh) meshes.push(object as three.Mesh); });

  it("is merged into a handful of draw calls with sane geometry", () => {
    expect(meshes.length).toBeLessThanOrEqual(10);
    let triangles = 0;
    for (const mesh of meshes) {
      const position = mesh.geometry.getAttribute("position");
      const normal = mesh.geometry.getAttribute("normal");
      expect(normal.count).toBe(position.count);
      for (const value of normal.array as Float32Array) expect(Number.isFinite(value)).toBe(true);
      triangles += position.count / 3;
    }
    expect(triangles).toBeLessThan(20000);
  });

  it("fits its frame: nose ahead, tail behind, within the stated half-width", () => {
    const box = new three.Box3().setFromObject(ship.group);
    expect(box.min.z).toBeLessThan(-0.48);
    expect(box.max.z).toBeGreaterThan(0.36);
    expect(Math.max(-box.min.x, box.max.x)).toBeLessThanOrEqual(ship.halfWidth + 0.02);
    // Left and right halves mirror each other.
    expect(box.min.x + box.max.x).toBeCloseTo(0, 2);
  });

  it("has two engines at the tail and two guns ahead, mirrored", () => {
    expect(ship.nozzles).toHaveLength(2);
    expect(ship.muzzles).toHaveLength(2);
    expect(ship.nozzles[0]!.at.x).toBeCloseTo(-ship.nozzles[1]!.at.x, 5);
    expect(ship.muzzles[0]!.x).toBeCloseTo(-ship.muzzles[1]!.x, 5);
    for (const nozzle of ship.nozzles) expect(nozzle.at.z).toBeGreaterThan(0.3);
    for (const muzzle of ship.muzzles) expect(muzzle.z).toBeLessThan(-0.1);
    expect(ship.lights.nose!.z).toBeLessThan(-0.45);
    expect(ship.lights.wingtips).toHaveLength(2);
  });

  it("glows harder with momentum", () => {
    const glow = meshes.map((mesh) => mesh.material as three.MeshStandardMaterial).find((material) => material.emissiveMap !== null || material.emissive?.getHex() === 0x39d4ff)!;
    ship.tick(1, 0);
    const calm = glow.emissiveIntensity;
    ship.tick(1, 1);
    expect(glow.emissiveIntensity).toBeGreaterThan(calm);
  });
});
