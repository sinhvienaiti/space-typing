import { describe, expect, it } from "vitest";
import {
  sceneProfileForWorld,
  sceneQualityBudget,
  validateWorldSceneRegistry,
  WORLD_SCENE_REGISTRY,
} from "../src/worlds/scene-registry";
import {
  WORLD_CINEMATIC_MOTIONS,
  WORLD_SCENE_ARCHETYPES,
} from "../src/worlds/scene-types";
import { WORLD_REGISTRY } from "../src/worlds/registry";

describe("World background scene registry", () => {
  it("resolves one valid scene for every World", () => {
    expect(validateWorldSceneRegistry()).toEqual([]);
    expect(Object.keys(WORLD_SCENE_REGISTRY)).toHaveLength(50);

    for (const world of WORLD_REGISTRY) {
      const scene = sceneProfileForWorld(world);
      expect(scene.worldId).toBe(world.id);
      expect(scene.id).toContain(world.backgroundProfile);
      expect(scene.seed).toBeGreaterThan(0);
      expect(WORLD_CINEMATIC_MOTIONS).toContain(scene.primaryMotion);
      if (scene.secondaryMotion !== null) {
        expect(WORLD_CINEMATIC_MOTIONS).toContain(scene.secondaryMotion);
      }
      expect(scene.flightIntensity).toBeGreaterThanOrEqual(0);
      expect(scene.starDensity).toBeGreaterThanOrEqual(0);
      expect(scene.midObjectDensity).toBeGreaterThanOrEqual(0);
      expect(scene.foregroundDensity).toBeGreaterThanOrEqual(0);
      expect(scene.eventFrequency).toBeGreaterThanOrEqual(0);
      expect(scene.vortexStrength).toBeGreaterThanOrEqual(0);
      expect(scene.asteroidDensity).toBeGreaterThanOrEqual(0);
      expect(scene.cloudDensity).toBeGreaterThanOrEqual(0);
    }
  });

  it("covers all ten visual scene archetypes", () => {
    const archetypes = new Set(
      WORLD_REGISTRY.map((world) =>
        sceneProfileForWorld(world).archetype,
      ),
    );

    expect([...archetypes].sort()).toEqual(
      [...WORLD_SCENE_ARCHETYPES].sort(),
    );
  });

  it("gives every Galaxy five deterministic World-local variants", () => {
    for (let galaxy = 1; galaxy <= 10; galaxy += 1) {
      const scenes = WORLD_REGISTRY
        .filter((world) => world.galaxy === galaxy)
        .map((world) => sceneProfileForWorld(world));

      expect(scenes).toHaveLength(5);
      expect(scenes.map((scene) => scene.variant)).toEqual(
        [1, 2, 3, 4, 5],
      );
      expect(new Set(scenes.map((scene) => scene.landmarkStyle)).size)
        .toBe(5);
      expect(new Set(scenes.map((scene) => scene.floorStyle)).size)
        .toBe(5);
    }
  });

  it("keeps scene detail budgets bounded and quality ordered", () => {
    const low = sceneQualityBudget("low");
    const medium = sceneQualityBudget("medium");
    const high = sceneQualityBudget("high");
    const ultra = sceneQualityBudget("ultra");

    expect(low.ambientParticles).toBeLessThan(medium.ambientParticles);
    expect(medium.ambientParticles).toBeLessThan(high.ambientParticles);
    expect(high.ambientParticles).toBeLessThan(ultra.ambientParticles);
    expect(ultra.ambientParticles).toBeLessThanOrEqual(28);
    expect(ultra.farDetails).toBeLessThanOrEqual(6);
    expect(ultra.midDetails).toBeLessThanOrEqual(5);

    expect(low.farStars).toBeLessThan(medium.farStars);
    expect(medium.farStars).toBeLessThan(high.farStars);
    expect(high.farStars).toBeLessThan(ultra.farStars);
    expect(ultra.farStars).toBeLessThanOrEqual(210);

    expect(low.nearStars).toBeLessThan(medium.nearStars);
    expect(ultra.nearStars).toBeLessThanOrEqual(34);
    expect(ultra.midObjects).toBeLessThanOrEqual(13);
    expect(ultra.foregroundObjects).toBeLessThanOrEqual(22);
    expect(ultra.eventObjects).toBeLessThanOrEqual(2);
  });

  it("gives Galaxy and meteor Worlds strong cinematic motion identities", () => {
    const galaxy = sceneProfileForWorld("world-01");
    const meteor = sceneProfileForWorld("world-36");

    expect(galaxy.primaryMotion).toBe("deep-flight");
    expect(galaxy.starDensity).toBeGreaterThan(0.9);
    expect(galaxy.vortexStrength).toBeGreaterThan(0.5);
    expect(galaxy.asteroidDensity).toBeGreaterThan(0.4);

    expect(meteor.primaryMotion).toBe("asteroid-flow");
    expect(meteor.asteroidDensity).toBeGreaterThan(0.9);
    expect(meteor.eventFrequency).toBeGreaterThan(0.4);
  });

  it("falls back safely to World 01 for unknown ids", () => {
    expect(sceneProfileForWorld("missing-world").worldId).toBe("world-01");
  });
});
