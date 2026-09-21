import { describe, expect, it } from "vitest";
import {
  chooseEnemyKind,
  enemyProfile,
  enemyWeightsForStage,
} from "../src/enemies/kinds";

describe("enemy progression", () => {
  it("starts with Scout only and unlocks Mine/Tank gradually", () => {
    expect(enemyWeightsForStage(1)).toEqual({
      scout: 1,
      mine: 0,
      tank: 0,
    });

    const stage3 = enemyWeightsForStage(3);
    expect(stage3.mine).toBeGreaterThan(0);
    expect(stage3.tank).toBe(0);

    const stage5 = enemyWeightsForStage(5);
    expect(stage5.mine).toBeGreaterThan(0);
    expect(stage5.tank).toBeGreaterThan(0);
    expect(stage5.destroyer).toBe(0);

    const stage8 = enemyWeightsForStage(8);
    expect(stage8.destroyer).toBeGreaterThan(0);
  });

  it("keeps enemy weights bounded and usable through Stage 1000", () => {
    for (const stage of [1, 5, 100, 500, 1000]) {
      const weights = enemyWeightsForStage(stage);
      const total =
        weights.scout + weights.mine + weights.tank + weights.destroyer;

      expect(total).toBeCloseTo(1);
      expect(weights.scout).toBeGreaterThanOrEqual(0.3);
      expect(weights.mine).toBeLessThanOrEqual(0.34);
      expect(weights.tank).toBeLessThanOrEqual(0.24);
      expect(weights.destroyer).toBeLessThanOrEqual(0.22);
    }
  });

  it("gives Mine speed pressure and Tank multiple armor layers", () => {
    const scout = enemyProfile("scout", 1);
    const mine = enemyProfile("mine", 1);
    const tank = enemyProfile("tank", 1);

    expect(mine.baseSpeed).toBeGreaterThan(scout.baseSpeed);
    expect(tank.baseSpeed).toBeLessThan(scout.baseSpeed);
    expect(tank.radius).toBeGreaterThan(scout.radius);
    expect(tank.layers).toBe(2);

    const destroyer = enemyProfile("destroyer", 1);
    expect(destroyer.fireInterval).not.toBeNull();
    expect(destroyer.baseSpeed).toBeLessThan(scout.baseSpeed);
  });

  it("chooses enemy kinds from deterministic random input", () => {
    expect(chooseEnemyKind(1, 0.2)).toBe("scout");
    expect(chooseEnemyKind(5, 0.01)).toBe("mine");

    const weights = enemyWeightsForStage(5);
    expect(chooseEnemyKind(5, weights.mine + 0.01)).toBe("tank");
    expect(chooseEnemyKind(5, 0.99)).toBe("scout");

    const stage8 = enemyWeightsForStage(8);
    const destroyerPoint =
      stage8.mine + stage8.tank + stage8.destroyer / 2;
    expect(chooseEnemyKind(8, destroyerPoint)).toBe("destroyer");
  });
});
