import { describe, expect, it } from "vitest";
import { parseArtAssetManifest } from "../src/assets/pipeline";
import { auditEnemySystem } from "../src/enemies/audit";
import { ENEMY_REGISTRY } from "../src/enemies/registry";
import { enemyFxProfile } from "../src/vfx/enemy-fx";
import { qualityProfile } from "../src/performance/quality";
import manifestJson from "../public/assets/space-typing/manifest.json";

describe("enemy visual/playtest automated audit", () => {
  it("keeps registry readability and progression contracts clean", () => {
    const audit = auditEnemySystem();
    expect(audit.errors).toEqual([]);
    expect(
      audit.errors.some((error) => error.includes("stage-clear flow")),
    ).toBe(false);
  });

  it("records procedural source metadata for every visual family", () => {
    const manifest = parseArtAssetManifest(manifestJson);
    const ids = new Set(manifest.entries.map((entry) => entry.id));

    for (const family of [
      "rainbow",
      "angel",
      "devil",
      "frost",
      "prism",
      "nature",
      "shadow",
      "cosmic",
    ]) {
      expect(ids.has("enemy-family-" + family)).toBe(true);
    }
    expect(ids.has("boss-family-modular-v1")).toBe(true);
  });

  it("keeps reward markers outside the text-only word renderer contract", () => {
    for (const definition of ENEMY_REGISTRY) {
      if (definition.reward === undefined) continue;
      expect(definition.visual.rewardMarker).toBeTruthy();
      expect(definition.visual.rewardMarker).not.toContain(" ");
    }
  });

  it("keeps peak scripted bursts within the existing particle caps", () => {
    const peak = Math.max(
      enemyFxProfile("cosmic", "boss-death").count,
      enemyFxProfile("prism", "boss-phase").count,
    );

    expect(peak).toBeLessThan(qualityProfile("low").maxParticles);
    expect(peak).toBeLessThan(qualityProfile("ultra").maxParticles);
  });
});
