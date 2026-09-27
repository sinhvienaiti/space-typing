import { describe, expect, it } from "vitest";
import { CHARACTER_IDS } from "../src/characters/registry";
import {
  characterFlightTrailProfile,
  playerProjectileProfile,
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
      expect(projectile.trailLength).toBeGreaterThan(20);
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
