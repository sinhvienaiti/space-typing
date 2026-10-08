import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DuelShip3D, ship3dEnabled, ship3dMode } from "../src/duel/ship3d";

const ROOT = join(import.meta.dirname, "../public/assets/space-typing/ships/3d");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Duel 3D hull", () => {
  it("defaults to the painted relief hull; ?ship3d=model and ?ship3d=0 for comparison", () => {
    vi.stubGlobal("location", { search: "" });
    expect(ship3dEnabled()).toBe(true);
    expect(ship3dMode()).toBe("relief");
    vi.stubGlobal("location", { search: "?ship3d=model" });
    expect(ship3dMode()).toBe("model");
    vi.stubGlobal("location", { search: "?ship3d=0" });
    expect(ship3dEnabled()).toBe(false);
  });

  it("stays on the sprite without WebGL and never fetches", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("location", { search: "" });
    expect(await DuelShip3D.load("vanguard")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("ships complete relief data (the default hull) listed in the manifest", () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8")) as { ships: string[] };
    expect(manifest.ships).toContain("vanguard");
    for (const id of manifest.ships) {
      const model = JSON.parse(readFileSync(join(ROOT, id, "model.json"), "utf8")) as {
        aspect: number; heightScale: number; heightGrid: [number, number]; nozzles: number[][];
        color: string; emissive: string; height: string;
      };
      expect(model.aspect).toBeGreaterThan(0.5);
      expect(model.heightScale).toBeGreaterThan(0);
      const bytes = readFileSync(join(ROOT, id, model.height.split("?")[0]!));
      expect(bytes.length).toBe(model.heightGrid[0] * model.heightGrid[1]);
      for (const file of [model.color, model.emissive]) expect(readFileSync(join(ROOT, id, file.split("?")[0]!)).length).toBeGreaterThan(1000);
      // Engine colours from the painting (Vanguard: its light rig), as #rrggbb.
      const colors = (model as unknown as { colors?: Record<string, string> }).colors;
      for (const key of ["hot", "plume", "outer"]) expect(colors?.[key]).toMatch(/^#[0-9a-f]{6}$/i);
      // Light and gun anchors from the painting.
      const anchors = (model as unknown as { anchors?: { guns?: number[][]; wingtips?: number[][]; nose?: number[] } }).anchors;
      // Guns follow each ship's shot recipe: two for most, four for Arsenal.
      expect(anchors?.guns?.length ?? 0).toBeGreaterThanOrEqual(2);
      expect(anchors?.wingtips).toHaveLength(2);
      expect(anchors?.nose?.[1]).toBeLessThan(0.1);
      // Painted flames are cut away: each nozzle exit sits on the rear half.
      expect(model.nozzles.length).toBeGreaterThan(0);
      for (const [x, y, r] of model.nozzles) {
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(1);
        expect(y).toBeGreaterThan(0.5);
        expect(r).toBeGreaterThan(0);
      }
    }
  });
});
