import { describe, expect, it } from "vitest";
import {
  worldAmbientEffectsProfile,
  worldUsesAuthoredAmbientEffects,
} from "../src/worlds/world-ambient-effects";

describe("World authored ambient effects", () => {
  it("keeps Halo Garden effects isolated to World 02", () => {
    expect(worldUsesAuthoredAmbientEffects("world-02")).toBe(true);
    expect(worldUsesAuthoredAmbientEffects("world-01")).toBe(false);
    expect(worldUsesAuthoredAmbientEffects("world-03")).toBe(false);
  });

  it("enables the full lightweight Halo Garden motion set", () => {
    const profile = worldAmbientEffectsProfile("world-02");

    expect(profile).not.toBeNull();
    expect(profile?.meteorCount).toBeLessThanOrEqual(3);
    expect(profile).toMatchObject({
      cloudMist: true,
      waterfallShimmer: true,
      starDrift: true,
      galaxyDrift: true,
      haloGlow: true,
      lightRays: true,
      meteorCount: 3,
    });
  });

  it("does not accidentally allocate authored FX profiles for legacy Worlds", () => {
    for (const id of ["world-06", "world-11", "world-21", "world-31"]) {
      expect(worldAmbientEffectsProfile(id)).toBeNull();
    }
  });
});
