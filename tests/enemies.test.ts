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
      destroyer: 0,
      oppressor: 0,
      shield: 0,
      carrier: 0,
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
    expect(stage8.oppressor).toBe(0);

    const stage15 = enemyWeightsForStage(15);
    expect(stage15.oppressor).toBeGreaterThan(0);
    expect(stage15.shield).toBe(0);
    expect(stage15.carrier).toBe(0);

    const stage20 = enemyWeightsForStage(20);
    expect(stage20.shield).toBeGreaterThan(0);
    expect(stage20.carrier).toBe(0);

    const stage25 = enemyWeightsForStage(25);
    expect(stage25.carrier).toBeGreaterThan(0);
  });

  it("keeps enemy weights bounded and usable through Stage 1000", () => {
    for (const stage of [1, 5, 100, 500, 1000]) {
      const weights = enemyWeightsForStage(stage);
      const total =
        weights.scout +
        weights.mine +
        weights.tank +
        weights.destroyer +
        weights.oppressor +
        weights.shield +
        weights.carrier;

      expect(total).toBeCloseTo(1);
      expect(weights.scout).toBeGreaterThanOrEqual(0.3);
      expect(weights.mine).toBeLessThanOrEqual(0.34);
      expect(weights.tank).toBeLessThanOrEqual(0.24);
      expect(weights.destroyer).toBeLessThanOrEqual(0.2);
      expect(weights.oppressor).toBeLessThanOrEqual(0.16);
      expect(weights.shield).toBeLessThanOrEqual(0.13);
      expect(weights.carrier).toBeLessThanOrEqual(0.1);
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
    expect(destroyer.actionInterval).not.toBeNull();
    expect(destroyer.baseSpeed).toBeLessThan(scout.baseSpeed);

    const oppressor = enemyProfile("oppressor", 1);
    expect(oppressor.radius).toBeGreaterThan(destroyer.radius);
    expect(oppressor.actionInterval).not.toBeNull();
    expect(oppressor.baseSpeed).toBeLessThan(destroyer.baseSpeed);

    const shield = enemyProfile("shield", 1);
    expect(shield.layers).toBe(2);
    expect(shield.actionInterval).toBeNull();

    const carrier = enemyProfile("carrier", 1);
    expect(carrier.radius).toBeGreaterThan(shield.radius);
    expect(carrier.actionInterval).not.toBeNull();
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

    const stage15 = enemyWeightsForStage(15);
    const oppressorPoint =
      stage15.mine +
      stage15.tank +
      stage15.destroyer +
      stage15.oppressor / 2;
    expect(chooseEnemyKind(15, oppressorPoint)).toBe("oppressor");

    const stage20 = enemyWeightsForStage(20);
    const shieldPoint =
      stage20.mine +
      stage20.tank +
      stage20.destroyer +
      stage20.oppressor +
      stage20.shield / 2;
    expect(chooseEnemyKind(20, shieldPoint)).toBe("shield");

    const stage25 = enemyWeightsForStage(25);
    const carrierPoint =
      stage25.mine +
      stage25.tank +
      stage25.destroyer +
      stage25.oppressor +
      stage25.shield +
      stage25.carrier / 2;
    expect(chooseEnemyKind(25, carrierPoint)).toBe("carrier");
  });
});
