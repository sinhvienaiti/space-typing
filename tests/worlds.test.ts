import { describe, expect, it } from "vitest";
import {
  WORLD_COUNT,
  WORLD_REGISTRY,
  isWorldBossStage,
  isWorldEntryStage,
  isWorldMiniBossStage,
  plannedWorldStageRole,
  stageInWorld,
  validateWorldRegistry,
  worldById,
  worldForStage,
  worldIndexForStage,
} from "../src/worlds/registry";
import {
  WORLD_ENVIRONMENT_REGISTRY,
  environmentForWorld,
  validateWorldEnvironmentRegistry,
} from "../src/worlds/environment";
import {
  shopInstanceId,
  shopInstanceSeed,
  type ShopRollContext,
} from "../src/shops/state";
import { createHiddenDiscoveryState } from "../src/discovery/hidden-content";

function shopContext(stage: number): ShopRollContext {
  return {
    stage,
    worldKey: worldForStage(stage).id,
    luck: 15,
    progression: stage - 1,
    hiddenDiscovery: createHiddenDiscoveryState(),
  };
}

describe("M07 World registry", () => {
  it("maps all 1000 stages deterministically across exactly 50 Worlds", () => {
    expect(WORLD_REGISTRY).toHaveLength(WORLD_COUNT);
    expect(validateWorldRegistry()).toEqual([]);

    for (let stage = 1; stage <= 1000; stage += 1) {
      const world = worldForStage(stage);
      expect(stage).toBeGreaterThanOrEqual(world.stageStart);
      expect(stage).toBeLessThanOrEqual(world.stageEnd);
      expect(worldIndexForStage(stage)).toBe(
        Math.floor((stage - 1) / 20),
      );
    }

    expect(worldForStage(1).id).toBe("world-01");
    expect(worldForStage(20).id).toBe("world-01");
    expect(worldForStage(21).id).toBe("world-02");
    expect(worldForStage(1000).id).toBe("world-50");
  });

  it("maps five Worlds per Galaxy with fixed 20-stage ranges", () => {
    for (const [index, world] of WORLD_REGISTRY.entries()) {
      expect(world.stageStart).toBe(index * 20 + 1);
      expect(world.stageEnd).toBe(index * 20 + 20);
      expect(world.galaxy).toBe(Math.floor(index / 5) + 1);
      expect(worldById(world.id)).toBe(world);
    }
  });

  it("resolves World-local stage rhythm and major-boss overrides", () => {
    expect(stageInWorld(1)).toBe(1);
    expect(stageInWorld(20)).toBe(20);
    expect(stageInWorld(21)).toBe(1);

    expect(isWorldEntryStage(201)).toBe(true);
    expect(isWorldMiniBossStage(210)).toBe(true);
    expect(isWorldBossStage(220)).toBe(true);

    expect(plannedWorldStageRole(10)).toBe("mini-boss");
    expect(plannedWorldStageRole(20)).toBe("world-boss");
    expect(plannedWorldStageRole(100)).toBe("galaxy-major-boss");
    expect(plannedWorldStageRole(101)).toBe("normal");
  });

  it("provides a valid visual/environment profile for every World", () => {
    expect(validateWorldEnvironmentRegistry()).toEqual([]);
    expect(Object.keys(WORLD_ENVIRONMENT_REGISTRY)).toHaveLength(50);

    for (const world of WORLD_REGISTRY) {
      const environment = environmentForWorld(world);
      expect(environment.worldId).toBe(world.id);
      expect(environment.id).toBe(world.backgroundProfile);
      expect(environment.starDrift).toBeGreaterThan(0);
      expect(environment.gridIntensity).toBeGreaterThan(0);
      expect(environment.hazeIntensity).toBeGreaterThan(0);
    }
  });

  it("feeds M06 shop identity from canonical World ids", () => {
    const stage20 = shopContext(20);
    const stage21 = shopContext(21);

    expect(stage20.worldKey).toBe("world-01");
    expect(stage21.worldKey).toBe("world-02");
    expect(shopInstanceId("normal", stage20)).not.toBe(
      shopInstanceId("normal", stage21),
    );
    expect(shopInstanceSeed("normal", stage20)).not.toBe(
      shopInstanceSeed("normal", stage21),
    );
  });

  it("keeps World identity contracts non-empty for later M08-M09 consumers", () => {
    for (const world of WORLD_REGISTRY) {
      expect(world.enemyFamilies.length).toBeGreaterThan(0);
      expect(world.enemyRoster.length).toBeGreaterThan(0);
      expect(world.miniBoss.length).toBeGreaterThan(0);
      expect(world.worldBoss.length).toBeGreaterThan(0);
      expect(world.rewardPool.length).toBeGreaterThan(0);
      expect(world.shopPool.length).toBeGreaterThan(0);
      expect(world.musicProfile.length).toBeGreaterThan(0);
      expect(world.transitionPresentation.length).toBeGreaterThan(0);
    }
  });
});
