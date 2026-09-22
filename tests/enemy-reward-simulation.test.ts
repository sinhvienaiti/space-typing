import { describe, expect, it } from "vitest";
import {
  plannedRewardRollChance,
  simulateEnemyRewardBalance,
} from "../src/enemies/simulation";

describe("enemy reward balance simulation", () => {
  it("keeps the explicit reward roll bounded through Stage 1000", () => {
    expect(plannedRewardRollChance(1)).toBe(0);
    expect(plannedRewardRollChance(15)).toBeCloseTo(0.025);
    expect(plannedRewardRollChance(1000)).toBeLessThanOrEqual(0.08);
  });

  it("keeps early reward pressure low", () => {
    const result = simulateEnemyRewardBalance({
      stage: 30,
      kills: 20_000,
      seed: 30,
    });

    expect(result.rewardRate).toBeLessThan(0.11);
    expect(result.highValueRewardRate).toBeLessThan(0.04);
    expect(result.controlUptime).toBeLessThan(0.08);
    expect(result.clearScreenRate).toBe(0);
  });

  it("keeps late-game high-value rewards bounded", () => {
    const result = simulateEnemyRewardBalance({
      stage: 650,
      kills: 20_000,
      seed: 650,
    });

    expect(result.rewardRate).toBeLessThan(0.2);
    expect(result.highValueRewardRate).toBeLessThan(0.12);
    expect(result.controlUptime).toBeLessThan(0.2);
    expect(result.scoreX2Uptime).toBeLessThan(0.15);
    expect(result.creditsX2Uptime).toBe(0);
    expect(result.clearScreenRate).toBe(0);
  });

  it("is deterministic for the same stage, sample and seed", () => {
    const input = { stage: 500, kills: 5_000, seed: 42 };
    expect(simulateEnemyRewardBalance(input)).toEqual(
      simulateEnemyRewardBalance(input),
    );
  });
});
