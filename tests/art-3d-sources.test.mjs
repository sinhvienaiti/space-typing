import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { indexSources, mirrorImage, readers } from "../scripts/models/index-3d-sources.mjs";
import { SHIP_VISUAL_CATALOG } from "../scripts/ships/ship-sources.mjs";

// art-src/ is local; its index (art-src/3d/SOURCES.json) is tracked, so the rule is checked without the models.
const sources = JSON.parse(readFileSync("art-src/3d/SOURCES.json", "utf8"));
const preset = JSON.parse(readFileSync("scripts/models/presets/campaign3d-models.json", "utf8"));

describe("3D sources mirror their 2D art", () => {
  it("maps a model path to its 2D image", () => {
    expect(mirrorImage("enemies/frost-healer.glb")).toBe("art-src/enemies/frost-healer.png");
    expect(mirrorImage("pickups/credits/boss.glb")).toBe("art-src/pickups/credits/boss.png");
    expect(mirrorImage("ships/ship-02-razorwing.glb")).toBe("art-src/ships/ship-02-razorwing-2d.png");
    expect(mirrorImage("ships/ship-01-vanguard.glb")).toBe("art-src/ships/vanguard-top-hd.png");
    expect(mirrorImage("skills/dragon-fireball.glb")).toBeNull();
  });

  it("names every indexed model after the 2D image it was made from", () => {
    expect(Object.keys(sources.files).length).toBeGreaterThan(0);
    for (const [file, value] of Object.entries(sources.files)) expect(value.image, file).toBe(mirrorImage(file));
    for (const [file, value] of Object.entries(sources.notMadeYet)) expect(value.image, file).toBe(mirrorImage(file));
  });

  it("indexes every file a build reads, or records it as not made yet", () => {
    for (const [key, value] of Object.entries(preset.models)) {
      expect(sources.files[value.source] ?? sources.notMadeYet[value.source], key + " source").toBeDefined();
      if (value.placeholder) expect(sources.files[value.placeholder], key + " placeholder").toBeDefined();
      if (sources.notMadeYet[value.source]) expect(sources.notMadeYet[value.source].standIn, key).toBe(value.placeholder);
    }
    for (const visual of SHIP_VISUAL_CATALOG) {
      const numbered = visual.rawModelSources.find((name) => /^ship-\d\d-/.test(name));
      expect(sources.files["ships/" + numbered], visual.id).toBeDefined();
    }
  });

  it("keeps who reads each file in step with the preset and the ship catalog", () => {
    const used = readers(preset);
    for (const [file, value] of Object.entries(sources.files)) expect(value.usedBy, file).toEqual(used[file] ?? []);
  });

  it.runIf(existsSync("art-src/3d/enemies"))("matches the local files when the backup is present", () => {
    const { out, noImage } = indexSources();
    expect(noImage).toEqual([]);
    expect(out.files).toEqual(sources.files);
    expect(out.notMadeYet).toEqual(sources.notMadeYet);
  });
});
