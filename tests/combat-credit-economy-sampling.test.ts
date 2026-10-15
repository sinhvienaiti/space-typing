import { describe, expect, it } from "vitest";
import {
  combatCreditExpectedWeight,
  combatCreditReward,
  combatCreditStageBudget,
  combatCreditWeight,
  settleCombatCreditStageBase,
} from "../src/rewards/combat-credit-drops";
import { stageClearCreditReward } from "../src/economy/credits";
import {
  createStageConfig,
  stageRole,
} from "../src/campaign/stage";
import type { BossRole } from "../src/boss/model";

type EconomySample = {
  stage: number;
  baseline: number;
  expectedEligibleKills: number;
  combat: number;
  settlement: number;
  combined: number;
};

function bossRoleForStage(stage: number): BossRole | null {
  const role = stageRole(stage);
  if (
    role === "mini-boss" ||
    role === "boss" ||
    role === "major-boss"
  ) {
    return role;
  }
  return null;
}

function sampleStage(stage: number): EconomySample {
  const config = createStageConfig(stage);
  const bossRole = bossRoleForStage(stage);
  const expectedEligibleKills =
    config.enemyBudget + (bossRole === null ? 0 : 1);
  const baseline = stageClearCreditReward({
    stage,
    accuracy: 94,
    salvage: 0,
  });
  let remainingBudget = combatCreditStageBudget({
    existingBaseCredits: baseline,
    expectedEligibleKills,
  });
  let remainingExpectedWeight = combatCreditExpectedWeight({
    regularEnemyCount: config.enemyBudget,
    bossRole,
  });
  let combat = 0;

  const claim = (weight: number): void => {
    const amount = combatCreditReward({
      remainingBudget,
      remainingExpectedWeight,
      sourceWeight: weight,
    });
    combat += amount;
    remainingBudget = Math.max(
      0,
      remainingBudget - amount,
    );
    remainingExpectedWeight = Math.max(
      0,
      remainingExpectedWeight - weight,
    );
  };

  for (let index = 0; index < config.enemyBudget; index += 1) {
    claim(combatCreditWeight("common"));
  }
  if (bossRole !== null) {
    claim(combatCreditWeight(bossRole));
  }

  const settlement = settleCombatCreditStageBase({
    stageBaseCredits: baseline,
    combatCreditsGranted: combat,
    creditsMultiplier: 1,
  }).settlementCredits;

  return {
    stage,
    baseline,
    expectedEligibleKills,
    combat,
    settlement,
    combined: combat + settlement,
  };
}

describe("Combat Credit FINAL V3 1000-stage reference sampling", () => {
  it("keeps all 1000 stages finite and preserves the minimum-one kill contract", () => {
    for (let stage = 1; stage <= 1000; stage += 1) {
      const sample = sampleStage(stage);

      expect(Number.isFinite(sample.combined)).toBe(true);
      expect(sample.baseline).toBeGreaterThan(0);
      expect(sample.expectedEligibleKills).toBeGreaterThan(0);
      expect(sample.combat).toBeGreaterThanOrEqual(
        sample.expectedEligibleKills,
      );
      expect(sample.combined).toBeGreaterThanOrEqual(
        sample.baseline,
      );
    }
  });

  it("does not double-pay the overlapping stage base once the kill layer fits inside it", () => {
    for (let stage = 111; stage <= 1000; stage += 1) {
      const sample = sampleStage(stage);
      expect(sample.combined).toBe(sample.baseline);
    }
  });

  it("keeps the documented sampling windows reproducible for tuning review", () => {
    const windows = [
      [1, 20],
      [100, 120],
      [250, 270],
      [500, 520],
      [750, 770],
      [980, 1000],
    ] as const;

    for (const [start, end] of windows) {
      const samples = Array.from(
        { length: end - start + 1 },
        (_, index) => sampleStage(start + index),
      );
      expect(samples).toHaveLength(end - start + 1);
      expect(
        samples.every(
          (sample) =>
            sample.stage >= start &&
            sample.stage <= end,
        ),
      ).toBe(true);
    }
  });
});
