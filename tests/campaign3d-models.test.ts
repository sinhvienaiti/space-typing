import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { allBossIdentities } from "../src/boss/identity";
import { PILOTS, pilotById, pilotShotModelId } from "../src/campaign3d/pilots";
import catalog from "../src/characters/ship-visual-catalog.json";
import { ENEMY_FAMILY_IDS } from "../src/enemies/families";
import { MODEL_CONTRACTS, type ModelManifest } from "../src/render3d/model-contracts";
import type { EnemyKind } from "../src/types";

const KINDS: readonly EnemyKind[] = ["scout", "mine", "tank", "destroyer", "oppressor", "shield", "carrier", "jammer", "cloaker", "healer", "splitter", "sniper", "leech", "commander"];
const manifest = JSON.parse(readFileSync("public/assets/space-typing/models/manifest.json", "utf8")) as ModelManifest;
const preset = JSON.parse(readFileSync("scripts/models/presets/campaign3d-models.json", "utf8")) as { version: number; models: Record<string, Record<string, unknown>> };

describe("Campaign 3D pilots", () => {
  it("offers Draconis first, then the twelve Fleet ships in catalog order", () => {
    expect(PILOTS.map((pilot) => pilot.id)).toEqual(["draconis", ...[...catalog].sort((a, b) => a.order - b.order).map((visual) => visual.id)]);
    expect(PILOTS.filter((pilot) => pilot.ship)).toHaveLength(12);
    for (const pilot of PILOTS) expect(pilot.shot).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("falls back to Draconis for unknown or missing saved choices", () => {
    expect(pilotById(null).id).toBe("draconis");
    expect(pilotById("not-a-ship").id).toBe("draconis");
    expect(pilotById("solar-lance").name).toBe("Solar Lance");
  });

  it("finds every ship pilot's hull and projectile model in the manifest", () => {
    for (const pilot of PILOTS.filter((item) => item.ship)) {
      expect(manifest.models["ships/" + pilot.id], pilot.id).toBeDefined();
      const shot = pilotShotModelId(pilot);
      expect(shot).toBe(pilot.id + "-bolt");
      expect(manifest.models["skills/" + shot], shot!).toBeDefined();
    }
    expect(pilotShotModelId(pilotById("draconis"))).toBeNull();
  });
});

describe("Campaign 3D model coverage", () => {
  it("has a model for every enemy family and kind, under ids the 2D Campaign never looks up", () => {
    for (const family of ENEMY_FAMILY_IDS) {
      for (const kind of KINDS) {
        const entry = manifest.models["enemies/" + family + "-" + kind + "-3d"];
        expect(entry, family + "-" + kind).toBeDefined();
        expect(entry!.sockets).toEqual(expect.arrayContaining([...MODEL_CONTRACTS.enemies.requiredSockets]));
        // The 2D Campaign resolves enemies/<family>-<kind> and enemies/<kind>; those must stay absent.
        expect(manifest.models["enemies/" + family + "-" + kind]).toBeUndefined();
        expect(manifest.models["enemies/" + kind]).toBeUndefined();
      }
    }
  });

  it("has a hovering, socketed model for every boss identity, facing the camera at full size", () => {
    for (const identity of allBossIdentities()) {
      const entry = manifest.models["bosses/" + identity.id];
      expect(entry, identity.id).toBeDefined();
      expect(entry!.sockets).toEqual(expect.arrayContaining([...MODEL_CONTRACTS.bosses.requiredSockets]));
      expect(entry!.clips.some((clip) => clip.includes("Boss_Idle_Hover")), identity.id).toBe(true);
      // The exported rest pose is the full-size hover, not the shrunken first intro frame.
      expect(Math.max(...entry!.size), identity.id).toBeGreaterThan(1.5);
    }
  });

  it("keeps generated entries within their contract budgets", () => {
    for (const key of Object.keys(preset.models)) {
      const entry = manifest.models[key];
      expect(entry, key).toBeDefined();
      const kind = key.split("/")[0] as "enemies" | "bosses" | "skills";
      const { min, max } = MODEL_CONTRACTS[kind].triangles;
      expect(entry!.triangles, key).toBeGreaterThanOrEqual(min);
      expect(entry!.triangles, key).toBeLessThanOrEqual(max);
      expect(entry!.tiers.high?.bytes, key).toBeGreaterThan(0);
      expect(entry!.tiers.medium?.bytes, key).toBeGreaterThan(0);
    }
  });
});
