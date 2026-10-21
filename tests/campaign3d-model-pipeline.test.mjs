import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { blenderArguments, cacheSignature, parseArguments, prepareCampaign3DModels, resolveSource, SOURCE_ROOT, validatePreset } from "../scripts/models/prepare-campaign3d-models.mjs";
import { MODEL_CONTRACTS } from "../src/render3d/model-contracts.ts";

const preset = JSON.parse(readFileSync("scripts/models/presets/campaign3d-models.json", "utf8"));

describe("Campaign 3D model preparation", () => {
  it("validates every preset entry", () => {
    expect(preset.version).toBe(1);
    for (const [key, value] of Object.entries(preset.models)) expect(() => validatePreset(key, value)).not.toThrow();
  });

  it("rejects malformed presets", () => {
    const base = { source: "enemies/x.glb", triangles: 6000, reviewed: true };
    expect(() => validatePreset("enemies/a-scout", { ...base, rotate: [1, 0, 0] })).toThrow(/rotate/);
    expect(() => validatePreset("enemies/a-scout", { ...base, triangles: 9000 })).toThrow(/triangles/);
    expect(() => validatePreset("enemies/a-scout", { ...base, source: "../escape.glb" })).toThrow(/source/);
    expect(() => validatePreset("ships/vanguard", base)).toThrow(/key/);
    expect(() => validatePreset("bosses/x", { ...base, triangles: 30000, facing: "+Z" })).toThrow(/facing/);
  });

  it("passes orientation inline so a leading minus is not read as an option", () => {
    const entry = validatePreset("bosses/warden-angel", { source: "bosses/warden-angel.glb", rotate: [-1, 0, 0, 0, -1, 0, 0, 0, 1], facing: "-Y", triangles: 30000, reviewed: true });
    const args = blenderArguments("/project", entry);
    expect(args).toContain("--rotate=-1,0,0,0,-1,0,0,0,1");
    expect(args).toContain("--facing=-Y");
    expect(args).toContain("--nose=+Y");
    expect(args.slice(args.indexOf("--input"), args.indexOf("--input") + 2)).toEqual(["--input", join("/project", "art-src/3d/bosses/warden-angel.glb")]);
  });

  it("builds from the model mirrored after its 2D art, or its placeholder until that exists", () => {
    expect(SOURCE_ROOT).toBe("art-src/3d");
    const root = mkdtempSync(join(tmpdir(), "c3d-src-"));
    try {
      mkdirSync(join(root, "art-src/3d/enemies"), { recursive: true });
      writeFileSync(join(root, "art-src/3d/enemies/frost-healer.glb"), "healer");
      const entry = validatePreset("enemies/frost-leech-3d", { source: "enemies/frost-leech.glb", placeholder: "enemies/frost-healer.glb", triangles: 6000, reviewed: true });
      expect(resolveSource(root, entry)).toEqual({ path: join(root, "art-src/3d/enemies/frost-healer.glb"), placeholder: true });
      writeFileSync(join(root, "art-src/3d/enemies/frost-leech.glb"), "leech");
      expect(resolveSource(root, entry)).toEqual({ path: join(root, "art-src/3d/enemies/frost-leech.glb"), placeholder: false });
      expect(resolveSource(root, validatePreset("enemies/x-scout-3d", { source: "enemies/x-scout.glb", triangles: 6000, reviewed: true }))).toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects a placeholder outside the sources or equal to the source", () => {
    const base = { source: "enemies/a-scout.glb", triangles: 6000, reviewed: true };
    expect(() => validatePreset("enemies/a-scout-3d", { ...base, placeholder: "../b.glb" })).toThrow(/placeholder/);
    expect(() => validatePreset("enemies/a-scout-3d", { ...base, placeholder: base.source })).toThrow(/placeholder/);
  });

  it("keys the build cache on content, not paths, so moving a source costs no rebuild", () => {
    const shared = { helperHash: "h", packagerHash: "p", contractsHash: "c", dependencyHash: "d" };
    const numbers = { triangles: 6000, rotate: [1, 0, 0, 0, 1, 0, 0, 0, 1], reviewed: true };
    const before = cacheSignature({ source: "enemies/old-name.glb", ...numbers }, "abc", shared, true);
    expect(cacheSignature({ source: "enemies/new-name.glb", placeholder: "enemies/x.glb", note: "moved", ...numbers }, "abc", shared, true)).toBe(before);
    expect(cacheSignature({ source: "enemies/new-name.glb", ...numbers }, "changed", shared, true)).not.toBe(before);
    expect(cacheSignature({ source: "enemies/new-name.glb", ...numbers, triangles: 5000 }, "abc", shared, true)).not.toBe(before);
  });

  it("every preset source sits where its 2D art is mirrored", () => {
    for (const [key, value] of Object.entries(preset.models)) {
      const top = value.source.split("/")[0];
      expect(["enemies", "bosses", "projectiles", "relics", "duel-targets", "pickups", "puzzle", "defense"], key).toContain(top);
    }
  });

  it("builds from the placeholder, waits for review when the own model arrives, and never falls back over a built own model", async () => {
    const root = mkdtempSync(join(tmpdir(), "c3d-batch-"));
    const put = (path, content) => {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), typeof content === "string" ? content : JSON.stringify(content));
    };
    const key = "enemies/frost-leech-3d";
    const entry = { source: "enemies/frost-leech.glb", placeholder: "enemies/frost-healer.glb", triangles: 6000, reviewed: true };
    const presetWith = (value) => put("scripts/models/presets/campaign3d-models.json", { version: 1, models: { [key]: value } });
    const runtime = (tier) => join(root, "public/assets/space-typing/models/enemies/frost-leech-3d/frost-leech-3d." + tier + ".glb");
    const inputs = [];
    // Blender copies its input to the processed file; the packager copies that into both tiers and the manifest.
    const runCommand = async (command, args) => {
      if (args.includes("--input")) {
        const input = args[args.indexOf("--input") + 1];
        inputs.push(input);
        put("art-src/models/enemies/frost-leech-3d.glb", readFileSync(input, "utf8"));
        return;
      }
      const built = readFileSync(join(root, "art-src/models/enemies/frost-leech-3d.glb"), "utf8");
      const url = (tier) => "/assets/space-typing/models/enemies/frost-leech-3d/frost-leech-3d." + tier + ".glb";
      for (const tier of ["high", "medium"]) put(url(tier).replace("/assets", "public/assets"), built);
      put("public/assets/space-typing/models/manifest.json", { version: 1, models: { [key]: { sockets: MODEL_CONTRACTS.enemies.requiredSockets, tiers: { high: { url: url("high") }, medium: { url: url("medium") } } } } });
    };
    const run = async (options = {}) => {
      const lines = [];
      const outcome = await prepareCampaign3DModels({ root, runCommand, log: (line) => lines.push(line), blender: "blender", ...options });
      return { status: outcome.results[0].status, failures: outcome.failures, lines };
    };
    try {
      put("scripts/models/blender/space_typing_model_tools.py", "helper");
      put("scripts/models/prepare-models.ts", "packager");
      put("src/render3d/model-contracts.ts", "contracts");
      put("art-src/3d/enemies/frost-healer.glb", "healer");
      presetWith(entry);

      expect((await run()).status).toBe("pass");
      expect(inputs).toEqual([join(root, "art-src/3d/enemies/frost-healer.glb")]);
      expect(readFileSync(runtime("high"), "utf8")).toBe("healer");
      expect((await run()).status).toBe("cached");

      // The own model arrives: its rotate was tuned for the stand-in, so nothing is replaced until it is reviewed.
      put("art-src/3d/enemies/frost-leech.glb", "leech");
      const waiting = await run();
      expect([waiting.status, waiting.failures]).toEqual(["review", 1]);
      expect(readFileSync(runtime("high"), "utf8")).toBe("healer");

      // Reviewed: the placeholder is dropped and the own model is built.
      const { placeholder, ...own } = entry;
      presetWith(own);
      expect((await run()).status).toBe("pass");
      expect(inputs.at(-1)).toBe(join(root, "art-src/3d/enemies/frost-leech.glb"));
      expect(readFileSync(runtime("high"), "utf8")).toBe("leech");

      // The own file disappears while the preset still names a placeholder: the built model is kept.
      presetWith(entry);
      unlinkSync(join(root, "art-src/3d/enemies/frost-leech.glb"));
      const gone = await run();
      expect([gone.status, gone.failures]).toEqual(["missing", 1]);
      expect(readFileSync(runtime("high"), "utf8")).toBe("leech");
      expect(existsSync(runtime("medium"))).toBe(true);
      expect(inputs).toHaveLength(2);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("parses its options", () => {
    expect(parseArguments(["--kind", "bosses", "--only=bosses/warden-angel", "--dry-run"])).toEqual({ kind: "bosses", only: "bosses/warden-angel", dryRun: true });
    expect(() => parseArguments(["--kind", "ships"])).toThrow(/--kind/);
    expect(() => parseArguments(["--bogus"])).toThrow(/Unknown/);
  });
});
