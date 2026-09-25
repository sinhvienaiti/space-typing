import { describe, expect, it } from "vitest";
import {
  sceneProfileForWorld,
  sceneQualityBudget,
  validateWorldSceneRegistry,
  WORLD_SCENE_REGISTRY,
} from "../src/worlds/scene-registry";
import { WORLD_SCENE_ARCHETYPES } from "../src/worlds/scene-types";
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
  });

  it("falls back safely to World 01 for unknown ids", () => {
    expect(sceneProfileForWorld("missing-world").worldId).toBe("world-01");
  });
});
