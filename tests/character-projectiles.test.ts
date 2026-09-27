import { describe, expect, it } from "vitest";
import { CHARACTER_IDS } from "../src/characters/registry";
import { playerProjectileProfile } from "../src/characters/projectiles";

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

  it("keeps major class identities visually distinct", () => {
    expect(playerProjectileProfile("aegis").archetype).toBe("heavy");
    expect(playerProjectileProfile("volt").archetype).toBe("electric");
    expect(playerProjectileProfile("reaper").archetype).toBe("slash");
    expect(playerProjectileProfile("zenith").archetype).toBe("cosmic");
  });
});
