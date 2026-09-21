import { describe, expect, it } from "vitest";
import {
  goldenEnemyChance,
  shouldScheduleTreasureDrone,
  shouldSpawnGoldenEnemy,
  treasureDroneChance,
} from "../src/events/rare-targets";

describe("rare combat targets", () => {
  it("keeps Golden Enemies out of the earliest tutorial stages", () => {
    expect(goldenEnemyChance(1)).toBe(0);
    expect(shouldSpawnGoldenEnemy(1, 0)).toBe(false);
  });

  it("keeps rare-target chances bounded across 1000 stages", () => {
    expect(goldenEnemyChance(1000)).toBeLessThanOrEqual(0.04);
    expect(treasureDroneChance(1000)).toBeLessThanOrEqual(0.12);
  });

  it("can schedule Treasure Drone after its introduction stage", () => {
    expect(shouldScheduleTreasureDrone(10, 0)).toBe(true);
    expect(shouldScheduleTreasureDrone(10, 0.99)).toBe(false);
  });
});
