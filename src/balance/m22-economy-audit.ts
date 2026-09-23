import {
  equipmentDropChance,
  gradeChanceSummary,
  type LootSource,
} from "../loot/equipment-loot";
import {
  simulateEquipmentDrops,
  simulateGradeDistribution,
} from "../loot/simulation";
import {
  simulateEnemyRewardBalance,
} from "../enemies/simulation";
import {
  stageClearExpansionCurrencyReward,
} from "../economy/currencies";
import { stageRole } from "../campaign/stage";
import { sectorCheckpointReward } from "../rewards/campaign-rewards";
import { GRADE_IDS, type GradeId } from "../grades";

export const M22_LOOT_SOURCES: readonly LootSource[] = [
  "normal",
  "elite",
  "golden",
  "treasure",
  "anomaly",
  "boss",
];

export type M22LootAudit = {
  source: LootSource;
  expectedDropRate: number;
  observedDropRate: number;
  highSalvageDropRate: number;
  expectedGrades: Record<GradeId, number>;
  observedGrades: Record<GradeId, number>;
};

export type M22EnemyRewardAudit = {
  stage: number;
  rewardRate: number;
  highValueRewardRate: number;
  controlUptime: number;
  scoreX2Uptime: number;
  clearScreenRate: number;
};

export type M22EconomyAuditReport = {
  loot: M22LootAudit[];
  enemyRewards: M22EnemyRewardAudit[];
  campaignCurrencyTotals: {
    alloy: number;
    starCrystal: number;
    quantumCore: number;
  };
  sectorRewardTotals: {
    credits: number;
    alloy: number;
    starCrystal: number;
    quantumCore: number;
  };
  errors: string[];
};

function gradeRates(
  counts: {
    rolls: number;
    aluminum: number;
    copper: number;
    silver: number;
    gold: number;
    diamond: number;
  },
): Record<GradeId, number> {
  return Object.fromEntries(
    GRADE_IDS.map((grade) => [
      grade,
      counts.rolls <= 0 ? 0 : counts[grade] / counts.rolls,
    ]),
  ) as Record<GradeId, number>;
}

export function runM22EconomyAudit(): M22EconomyAuditReport {
  const errors: string[] = [];
  const loot: M22LootAudit[] = [];

  for (const [index, source] of M22_LOOT_SOURCES.entries()) {
    const expectedDropRate = equipmentDropChance(source, 0);
    const observed = simulateEquipmentDrops(
      source,
      45,
      0,
      20_000,
      0x220000 + index,
    );
    const highSalvage = simulateEquipmentDrops(
      source,
      45,
      80,
      20_000,
      0x220000 + index,
    );
    const expectedGrades = gradeChanceSummary(source, 45);
    const observedGrades = gradeRates(
      simulateGradeDistribution(
        source,
        45,
        30_000,
        0x221000 + index,
      ),
    );

    if (Math.abs(observed.dropRate - expectedDropRate) > 0.012) {
      errors.push(source + ": equipment drop simulation drifted from production chance.");
    }
    if (highSalvage.dropRate + 1e-9 < observed.dropRate) {
      errors.push(source + ": higher Salvage reduced equipment drop rate.");
    }
    for (const grade of GRADE_IDS) {
      if (
        Math.abs(observedGrades[grade] - expectedGrades[grade]) >
        0.015
      ) {
        errors.push(source + "/" + grade + ": grade distribution drifted.");
      }
    }

    loot.push({
      source,
      expectedDropRate,
      observedDropRate: observed.dropRate,
      highSalvageDropRate: highSalvage.dropRate,
      expectedGrades,
      observedGrades,
    });
  }

  const enemyRewards = [30, 250, 500, 750, 1000].map(
    (stage): M22EnemyRewardAudit => {
      const result = simulateEnemyRewardBalance({
        stage,
        kills: 10_000,
        seed: 0x22e000 + stage,
      });
      if (result.rewardRate > 0.22) {
        errors.push("Stage " + String(stage) + ": enemy reward rate too high.");
      }
      if (result.highValueRewardRate > 0.14) {
        errors.push("Stage " + String(stage) + ": high-value enemy reward rate too high.");
      }
      if (result.controlUptime > 0.22) {
        errors.push("Stage " + String(stage) + ": reward control uptime too high.");
      }
      if (result.scoreX2Uptime > 0.18) {
        errors.push("Stage " + String(stage) + ": score multiplier uptime too high.");
      }
      if (result.clearScreenRate > 0.02) {
        errors.push("Stage " + String(stage) + ": clear-screen reward rate too high.");
      }
      return {
        stage,
        rewardRate: result.rewardRate,
        highValueRewardRate: result.highValueRewardRate,
        controlUptime: result.controlUptime,
        scoreX2Uptime: result.scoreX2Uptime,
        clearScreenRate: result.clearScreenRate,
      };
    },
  );

  const campaignCurrencyTotals = {
    alloy: 0,
    starCrystal: 0,
    quantumCore: 0,
  };
  for (let stage = 1; stage <= 1000; stage += 1) {
    const reward = stageClearExpansionCurrencyReward(
      stage,
      stageRole(stage),
      98,
    );
    campaignCurrencyTotals.alloy += reward.alloy;
    campaignCurrencyTotals.starCrystal += reward.starCrystal;
    campaignCurrencyTotals.quantumCore += reward.quantumCore;
  }
  if (
    campaignCurrencyTotals.alloy <= 0 ||
    campaignCurrencyTotals.starCrystal <= 0 ||
    campaignCurrencyTotals.quantumCore <= 0
  ) {
    errors.push("Campaign clear path does not earn every expansion currency.");
  }

  const sectorRewardTotals = {
    credits: 0,
    alloy: 0,
    starCrystal: 0,
    quantumCore: 0,
  };
  for (let stage = 10; stage <= 1000; stage += 10) {
    const reward = sectorCheckpointReward(stage);
    sectorRewardTotals.credits += reward.credits;
    sectorRewardTotals.alloy += reward.currencies.alloy;
    sectorRewardTotals.starCrystal += reward.currencies.starCrystal;
    sectorRewardTotals.quantumCore += reward.currencies.quantumCore;
  }

  return {
    loot,
    enemyRewards,
    campaignCurrencyTotals,
    sectorRewardTotals,
    errors,
  };
}
