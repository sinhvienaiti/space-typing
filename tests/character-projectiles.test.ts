import { describe, expect, it } from "vitest";
import { CHARACTER_IDS } from "../src/characters/registry";
import {
  PLAYER_PROJECTILE_BODY_SCALE,
  PLAYER_PROJECTILE_RAY_COUNT,
  PROJECTILE_VISUAL_IDENTITIES,
} from "../src/characters/projectile-renderer";
import {
  PLAYER_PROJECTILE_ATLAS_ASSET_ID,
  PLAYER_PROJECTILE_ATLAS_INDEX,
  projectileAtlasCell,
} from "../src/characters/projectile-art";
import {
  characterFlightTrailProfile,
  playerProjectileProfile,
  PROJECTILE_TRAIL_PROFILES,
  projectileTrailProfile,
  RESERVED_PLAYER_PROJECTILE_STYLES,
} from "../src/characters/projectiles";

describe("character projectile profiles", () => {
  it("covers every character with bounded rendering values", () => {
    for (const id of CHARACTER_IDS) {
      const profile = playerProjectileProfile(id);
      expect(profile.primary).toMatch(/^#/);
      expect(profile.secondary).toMatch(/^#/);
      expect(profile.width).toBeGreaterThan(0);
      expect(profile.width).toBeLessThanOrEqual(3);
      expect(profile.glow).toBeGreaterThan(0);
      expect(profile.glow).toBeLessThanOrEqual(1.5);
      expect(profile.impactHue).toBeGreaterThanOrEqual(0);
      expect(profile.impactHue).toBeLessThanOrEqual(360);
    }
  });

  it("keeps runtime projectile bodies and light rays large enough to read", () => {
    expect(PLAYER_PROJECTILE_BODY_SCALE).toBeGreaterThanOrEqual(2.3);
    expect(PLAYER_PROJECTILE_RAY_COUNT).toBeGreaterThanOrEqual(8);
  });

  it("keeps the generated projectile atlas one-to-one with all 12 approved concepts", () => {
    expect(PLAYER_PROJECTILE_ATLAS_ASSET_ID).toBe(
      "player-projectile-atlas-v1",
    );
    const indices = Object.values(PLAYER_PROJECTILE_ATLAS_INDEX);
    expect(indices).toHaveLength(12);
    expect(new Set(indices).size).toBe(12);
    expect(Math.min(...indices)).toBe(0);
    expect(Math.max(...indices)).toBe(11);
    expect(projectileAtlasCell("meteor-bolt")).toEqual({
      sx: 0,
      sy: 0,
      sw: 256,
      sh: 128,
    });
    expect(projectileAtlasCell("aurora-ribbon")).toEqual({
      sx: 512,
      sy: 384,
      sw: 256,
      sh: 128,
    });
  });

  it("gives all 12 approved concept styles distinct visual identities", () => {
    const entries = Object.entries(PROJECTILE_VISUAL_IDENTITIES);
    expect(entries).toHaveLength(12);
    const signatures = entries.map(
      ([styleId, identity]) =>
        styleId + ":" + identity.body + ":" + identity.wake + ":" + identity.particles,
    );
    expect(new Set(signatures).size).toBe(12);
    for (const [, identity] of entries) {
      expect(identity.body.length).toBeGreaterThan(5);
      expect(identity.wake.length).toBeGreaterThan(5);
      expect(identity.particles.length).toBeGreaterThan(5);
    }
  });

  it("defines a real strong taper for all 12 approved projectile styles", () => {
    const entries = Object.entries(PROJECTILE_TRAIL_PROFILES);
    expect(entries).toHaveLength(12);

    for (const [styleId, trail] of entries) {
      expect(trail.headScale, styleId).toBeGreaterThanOrEqual(1);
      expect(trail.lengthScale, styleId).toBeGreaterThanOrEqual(1);
      expect(trail.frontWidthRatio, styleId).toBeGreaterThanOrEqual(0.55);
      expect(trail.frontWidthRatio, styleId).toBeLessThanOrEqual(0.7);
      expect(trail.midWidthRatio, styleId).toBeGreaterThanOrEqual(0.25);
      expect(trail.midWidthRatio, styleId).toBeLessThanOrEqual(0.4);
      expect(trail.endWidthRatio, styleId).toBeGreaterThanOrEqual(0.08);
      expect(trail.endWidthRatio, styleId).toBeLessThanOrEqual(0.18);
      expect(trail.frontWidthRatio, styleId).toBeGreaterThan(
        trail.midWidthRatio,
      );
      expect(trail.midWidthRatio, styleId).toBeGreaterThan(
        trail.endWidthRatio,
      );
      expect(trail.outerAlpha, styleId).toBeGreaterThan(0);
      expect(trail.coreAlpha, styleId).toBeGreaterThan(trail.outerAlpha);
      expect(trail.coreWidthRatio, styleId).toBeGreaterThan(0.2);
      expect(trail.ribbonCount, styleId).toBeGreaterThanOrEqual(1);
      expect(trail.ribbonCount, styleId).toBeLessThanOrEqual(3);
      expect(trail.sideStreakCount, styleId).toBeGreaterThanOrEqual(2);
    }
  });

  it("maps every playable ship to one unique approved projectile and flight trail", () => {
    const projectileIds = CHARACTER_IDS.map(
      (id) => playerProjectileProfile(id).styleId,
    );
    const trailKinds = CHARACTER_IDS.map(
      (id) => characterFlightTrailProfile(id).kind,
    );

    expect(new Set(projectileIds).size).toBe(CHARACTER_IDS.length);
    expect(new Set(trailKinds).size).toBe(CHARACTER_IDS.length);
    expect(RESERVED_PLAYER_PROJECTILE_STYLES).toEqual(["nova-pearl"]);

    for (const id of CHARACTER_IDS) {
      const projectile = playerProjectileProfile(id);
      const trail = characterFlightTrailProfile(id);
      expect(projectile.presentationSpeed).toBeGreaterThan(1000);
      expect(projectile.bodyRadius).toBeGreaterThanOrEqual(3.8);
      expect(projectile.trailLength).toBeGreaterThanOrEqual(130);
      expect(projectile.trail).toBe(projectileTrailProfile(projectile.styleId));
      expect(projectile.trail.frontWidthRatio).toBeGreaterThan(
        projectile.trail.endWidthRatio,
      );
      expect(projectile.particleCount).toBeGreaterThan(0);
      expect(projectile.muzzleRadius).toBeGreaterThan(0);
      expect(trail.length).toBeGreaterThan(50);
      expect(trail.width).toBeGreaterThan(3);
      expect(trail.detailCount).toBeGreaterThan(0);
    }
  });

  it("keeps the approved ship-to-projectile mapping stable", () => {
    expect(playerProjectileProfile("vanguard").styleId).toBe("meteor-bolt");
    expect(playerProjectileProfile("aegis").styleId).toBe("halo-burst");
    expect(playerProjectileProfile("volt").styleId).toBe("thunder-needle");
    expect(playerProjectileProfile("wraith").styleId).toBe("void-spike");
    expect(playerProjectileProfile("fortune").styleId).toBe("twin-star-shot");
    expect(playerProjectileProfile("arsenal").styleId).toBe("solar-lance");
    expect(playerProjectileProfile("oracle").styleId).toBe("crescent-slash");
    expect(playerProjectileProfile("bastion").styleId).toBe("tidal-pearl");
    expect(playerProjectileProfile("reaper").styleId).toBe("blossom-comet");
    expect(playerProjectileProfile("celestial").styleId).toBe("prism-dart");
    expect(playerProjectileProfile("zenith").styleId).toBe("aurora-ribbon");
  });

  it("keeps major class identities visually distinct", () => {
    expect(playerProjectileProfile("aegis").archetype).toBe("heavy");
    expect(playerProjectileProfile("volt").archetype).toBe("electric");
    expect(playerProjectileProfile("reaper").archetype).toBe("slash");
    expect(playerProjectileProfile("zenith").archetype).toBe("cosmic");
  });
});
