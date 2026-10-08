import { describe, expect, it } from "vitest";
import contract from "../contracts/space-typing-admin-vfx.v1.json";
import { qualityProfile } from "../src/performance/quality";
import type { VisualQuality } from "../src/types";

const QUALITY_TIERS = ["low", "medium", "high", "ultra"] as const satisfies readonly VisualQuality[];

const EXPECTED_EVENTS = ["hit", "death", "layerBreak", "cast", "bossEntrance", "bossPhase", "bossDeath", "bossHit"];

function runtimeProfile(quality: VisualQuality) {
  const profile = qualityProfile(quality);
  return {
    dprCap: profile.dprCap,
    particleScale: profile.particleScale,
    maxParticles: profile.maxParticles,
    minStars: profile.minStars,
    maxStars: profile.maxStars,
    starAreaDivisor: profile.starAreaDivisor,
    glowScale: profile.glowScale,
    gridStep: profile.gridStep,
    maxCanvasPixels: profile.maxCanvasPixels,
  };
}

describe("Admin VFX contract", () => {
  it("exposes the real runtime as read-only instead of inventing an authoring boundary", () => {
    expect(contract.capability).toBe("vfx.read");
    expect(contract.route.path).toBe("/admin/space-typing/vfx");
    expect(contract.vfx.mode).toBe("runtime-derived-readonly");
    expect(contract.vfx.authorableFields).toEqual([]);
    expect(contract.vfx.writeCapability).toBe(false);
    expect(contract.vfx.adminPreviewWriteCapability).toBe(false);
    expect(contract.vfx.applyBoundary).toBe("none");
    expect(contract.vfx.persistenceOwner).toBe("code-owned-runtime-vfx");
  });

  it("mirrors canonical runtime quality profiles", () => {
    expect(contract.vfx.qualityTiers).toEqual(QUALITY_TIERS);
    for (const quality of QUALITY_TIERS) {
      expect(contract.vfx.qualityProfiles[quality]).toEqual(runtimeProfile(quality));
    }
  });

  it("documents the bounded combat system and runtime event surface", () => {
    expect(contract.vfx.combatFxLimits).toEqual({ maxParticles: 360, maxRings: 48 });
    expect(contract.vfx.combatEvents).toEqual(EXPECTED_EVENTS);
    expect(contract.vfx.skillQualityDetailTier).toEqual({ low: 0, medium: 1, high: 2, ultra: 3 });
    expect(contract.vfx.runtimeSources).toContain("src/Game.ts");
    expect(contract.vfx.runtimeSources).toContain("src/vfx/combat-fx.ts");
    expect(contract.vfx.runtimeSources).toContain("src/vfx/skill-fx.ts");
    expect(contract.vfx.runtimeSources).toContain("src/vfx/player-shots.ts");
  });
});
