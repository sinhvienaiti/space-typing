import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SHIP_VISUAL_CATALOG, discoverShipSources, resolveShipSourceFilename, validateShipCatalog } from "../scripts/ships/ship-sources.mjs";

const roots = [];
function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), "ship-catalog-")); roots.push(root);
  for (const file of files) { const path = join(root, file); mkdirSync(join(path, ".."), {recursive:true}); writeFileSync(path,"fixture"); }
  return root;
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root,{recursive:true,force:true}); });

describe("shared ship source catalog", () => {
  it("maps every numbered source to its canonical visual and keeps Vanguard names", () => {
    expect(SHIP_VISUAL_CATALOG).toHaveLength(12);
    for (const entry of SHIP_VISUAL_CATALOG) {
      for (const file of entry.imageSources) expect(resolveShipSourceFilename(file)).toBe(entry.id);
      for (const file of entry.rawModelSources) expect(resolveShipSourceFilename(file,"rawModel")).toBe(entry.id);
    }
    expect(resolveShipSourceFilename("vanguard-top-hd.png")).toBe("vanguard");
    expect(resolveShipSourceFilename("vanguard.meshy.glb","rawModel")).toBe("vanguard");
    expect(resolveShipSourceFilename("AEGIS-top-hd.JPG")?.toLowerCase()).toBe("aegis");
    expect(resolveShipSourceFilename("solar-lance-top-hd.JPEG")).toBe("solar-lance");
  });
  it("discovers ignored source files directly and preserves deterministic alias priority", () => {
    const root = fixture(["art-src/ships/razorwing-top-hd.png","art-src/ships/ship-02-razorwing-2d.png","art-src/3d/ships/ship-12-eternal-sovereign.glb"]);
    const image = discoverShipSources(root,{kind:"image",ids:["razorwing"]});
    expect(image.sources[0].path).toBe(join(root,"art-src/ships/ship-02-razorwing-2d.png"));
    expect(image.sources[0].legacyCharacterId).toBe("aegis");
    expect(image.warnings).toHaveLength(1);
    const models = discoverShipSources(root,{kind:"rawModel",ids:["eternal-sovereign","vanguard"]});
    expect(models.sources.map(s=>s.id)).toEqual(["eternal-sovereign"]);
    expect(models.missing).toEqual(["vanguard"]);
  });
  it("prefers Vanguard's numbered model over its legacy Meshy name", () => {
    const root = fixture(["art-src/3d/ships/vanguard.meshy.glb","art-src/3d/ships/ship-01-vanguard.glb"]);
    const models = discoverShipSources(root,{kind:"rawModel",ids:["vanguard"]});
    expect(models.sources[0].path).toBe(join(root,"art-src/3d/ships/ship-01-vanguard.glb"));
    expect(models.warnings).toHaveLength(1);
  });
  it("rejects explicit unknown IDs and reports filename/order conflicts", () => {
    expect(resolveShipSourceFilename("ship-03-razorwing-2d.png")).toBeNull();
    expect(resolveShipSourceFilename("../vanguard-top-hd.png")).toBeNull();
    const root = fixture(["art-src/ships/ship-03-razorwing-2d.png"]);
    expect(discoverShipSources(root,{kind:"image"}).warnings[0]).toContain("conflicting");
    expect(()=>discoverShipSources(root,{kind:"rawModel",ids:["unknown"]})).toThrow("Unknown ship id");
  });
  it("rejects duplicate ids, slots, order and source filename conflicts", () => {
    for (const property of ["id","order","legacyCharacterId"]) {
      const copy = structuredClone(SHIP_VISUAL_CATALOG); copy[1][property] = copy[0][property];
      expect(()=>validateShipCatalog(copy)).toThrow(/Duplicate/);
    }
    const copy = structuredClone(SHIP_VISUAL_CATALOG); copy[1].imageSources = ["ship-03-razorwing-2d.png"];
    expect(()=>validateShipCatalog(copy)).toThrow("filename/order conflict");
  });
});
