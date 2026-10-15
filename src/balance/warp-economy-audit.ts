import { difficultyFor } from "../campaign/difficulty";
import { PRIMARY_DIFFICULTY_MODES } from "../campaign/difficulty-modes";
import { createStageConfig } from "../campaign/stage";
import type { DifficultyInput } from "../campaign/types";
import {
  createStageObjectiveState,
  objectiveForStage,
  objectiveRewardFactor,
} from "../events/objectives";
import { createBossRewardChoiceOptions } from "../events/reward-choice";
import {
  HIDDEN_ENCOUNTER_KINDS,
  HIDDEN_CHALLENGE_TIERS,
  hiddenEncounterReward,
  type ActiveHiddenEncounter,
} from "../discovery/hidden-encounter";
import {
  scaleExpansionCurrencyReward,
  stageClearExpansionCurrencyReward,
} from "../economy/currencies";
import {
  createWarpCharge,
  reconcileWarp,
  spendWarp,
  WARP_POLICY,
} from "../economy/warp-charge";
import {
  applyAscensionDifficulty,
  ascensionCompletionReward,
} from "../progression/ascension";
import { RELIC_IDS } from "../relics/registry";
import {
  performanceReward,
  sectorCheckpointReward,
} from "../rewards/campaign-rewards";

export const AUDIT_INPUTS: Array<{
  id: string;
  input: Omit<DifficultyInput, "stage">;
}> = [
  ...PRIMARY_DIFFICULTY_MODES.map((mode) => ({
    id: mode,
    input: { mode, vocabularyLevel: 1, recentWpm: 60, recentAccuracy: 99 },
  })),
  ...[10, 60, 300].map((recentWpm) => ({
    id: `adaptive-${recentWpm}`,
    input: {
      mode: "adaptive" as const,
      vocabularyLevel: 1,
      recentWpm,
      recentAccuracy: 99,
    },
  })),
  ...[0.7, 1.45].flatMap((customPressure) =>
    [10, 300].map((customTargetWpm) => ({
      id: `custom-${customTargetWpm}-${customPressure}`,
      input: {
        mode: "custom" as const,
        vocabularyLevel: 1,
        recentWpm: 60,
        recentAccuracy: 99,
        customPressure,
        customTargetWpm,
      },
    })),
  ),
];

export type RewardScenario = {
  input: Omit<DifficultyInput, "stage">;
  tier: number;
  voice: boolean;
  performance: boolean;
  objective: boolean;
  maxBossCache: boolean;
};

/** A formula bound, not a prediction that a human can earn every badge or complete every objective. */
export function auditStageReward(
  stageNumber: number,
  scenario: RewardScenario,
  firstClear = true,
) {
  const stage = createStageConfig(stageNumber);
  const difficulty = applyAscensionDifficulty(
    difficultyFor({ ...scenario.input, stage: stageNumber }),
    scenario.tier,
    stageNumber,
  );
  const definition = objectiveForStage(stage, difficulty);
  const objective = definition ? createStageObjectiveState(definition) : null;
  if (objective && scenario.objective) objective.status = "complete";
  const objectiveFactor = objectiveRewardFactor(objective, difficulty);
  const stageSC = scaleExpansionCurrencyReward(
    stageClearExpansionCurrencyReward(stageNumber, stage.role, 99),
    difficulty.rewardMultiplier * (1 + objectiveFactor),
  ).starCrystal;
  const performanceSC = scenario.performance
    ? scaleExpansionCurrencyReward(
        performanceReward({
          stats: { stage: stageNumber, misses: 0, maxStreak: 25 },
          accuracy: 99,
          wpm: difficulty.targetWpm * 1.05,
          difficulty,
          objectiveComplete: scenario.objective && definition !== null,
          typingEvidence: !scenario.voice,
        }).currencies,
        difficulty.rewardMultiplier,
      ).starCrystal
    : 0;
  const sectorSC =
    firstClear && stageNumber % 10 === 0
      ? scaleExpansionCurrencyReward(
          sectorCheckpointReward(stageNumber).currencies,
          difficulty.ascensionRewardMultiplier ?? 1,
        ).starCrystal
      : 0;
  const ascensionSC =
    firstClear && stageNumber === 1000
      ? ascensionCompletionReward(scenario.tier).currencies.starCrystal
      : 0;
  const boss = ["mini-boss", "boss", "major-boss"].includes(stage.role);
  const cacheSC =
    scenario.maxBossCache && boss
      ? Math.max(
          0,
          ...createBossRewardChoiceOptions(
            stageNumber,
            0,
            { version: 1, owned: [...RELIC_IDS], equipped: [] },
            difficulty.ascensionRewardMultiplier ?? 1,
          ).map((option) =>
            option.kind === "currency" ? option.currencies.starCrystal : 0,
          ),
        )
      : 0;
  return {
    stage: stageNumber,
    stageSC,
    performanceSC,
    sectorSC,
    ascensionSC,
    cacheSC,
    total: stageSC + performanceSC + sectorSC + ascensionSC + cacheSC,
  };
}

export function auditCampaign(scenario: RewardScenario) {
  const total = {
    stageSC: 0,
    performanceSC: 0,
    sectorSC: 0,
    ascensionSC: 0,
    cacheSC: 0,
    total: 0,
  };
  for (let stage = 1; stage <= 1000; stage++) {
    const reward = auditStageReward(stage, scenario);
    for (const key of Object.keys(total) as Array<keyof typeof total>)
      total[key] += reward[key];
  }
  return total;
}

export function auditReplay(scenario: RewardScenario) {
  let best = auditStageReward(1, scenario, false);
  for (let stage = 2; stage <= 1000; stage++) {
    const reward = auditStageReward(stage, scenario, false);
    if (reward.total > best.total) best = reward;
  }
  return best;
}

/** One defeat per attempt; Phoenix recovery succeeds here. No combat duration or survival rate is asserted. */
export function auditFailureBounds(
  reward: ReturnType<typeof auditStageReward>,
  failure: number,
  phoenix: number,
) {
  const success = 1 - failure * (1 - phoenix);
  const clearSC = reward.total - reward.cacheSC;
  const scLower = reward.total * success;
  const scUpper = clearSC * success + reward.cacheSC; // Upper bound: a failed run already committed its cache.
  return {
    failure,
    phoenix,
    warpPerClear: WARP_POLICY.cost / success,
    phoenixPerClear: (failure * phoenix) / success,
    scPerWarp: [scLower / WARP_POLICY.cost, scUpper / WARP_POLICY.cost],
    netPerRefill: WARP_POLICY.prices.map((price) => ({
      price,
      lower: 2 * scLower - price,
      upper: 2 * scUpper - price,
    })),
    scPerMinuteAtAssumedSeconds: [30, 60, 180].map((seconds) => ({
      seconds,
      lower: (scLower * 60) / seconds,
      upper: (scUpper * 60) / seconds,
    })),
  };
}

export function auditHiddenBounds() {
  return HIDDEN_ENCOUNTER_KINDS.flatMap((kind) =>
    HIDDEN_CHALLENGE_TIERS.flatMap((tier) =>
      [100, 500, 1000].map((sourceStage) => {
        // Hidden World takes 3 or 4 paid steps; the others take one.
        const active: ActiveHiddenEncounter = {
          id: "audit",
          offerId: "audit",
          kind,
          tier,
          sourceStage,
          step: 1,
          totalSteps: kind === "hidden-world" ? 3 : 1,
          seed: 1,
          hiddenWorldId: null,
        };
        const crystals = hiddenEncounterReward(active, 99).currencies
          .starCrystal;
        return {
          kind,
          tier,
          sourceStage,
          crystals,
          warpCost: [active.totalSteps * 10, kind === "hidden-world" ? 40 : 10],
          campaignBridgeFee: 10,
        };
      }),
    ),
  );
}

export function auditPacing() {
  const origin = Date.UTC(2026, 9, 4);
  const empty = {
    ...createWarpCharge(origin),
    current: 0,
    reserveConsent: true,
  };
  const idle = [1, 3, 7].map((days) => {
    const w = reconcileWarp(empty, origin + days * 86_400_000);
    return {
      days,
      active: w.current,
      reserve: w.reserve,
      immediateAttempts: Math.floor((w.current + w.reserve) / 10),
      hoursAtBothCaps: Math.max(0, days * 24 - 70),
    };
  });
  const schedules = [1, 4, 24].map((sessions) => {
    let warp = empty,
      attempts = 0;
    for (let session = 1; session <= sessions; session++) {
      const now = origin + (session * 86_400_000) / sessions;
      warp = reconcileWarp(warp, now);
      while (warp.current + warp.reserve >= 10) {
        warp = spendWarp(warp, now).warp;
        attempts++;
      }
    }
    return { sessions, attempts, endingWarp: warp.current + warp.reserve };
  });
  return {
    idle,
    schedules,
    initialStockAttempts: 10,
    fullStockAttempts: 40,
    idealNoPaidHoursFor1000Clears: 990,
    freePracticeWarpCost: 0,
    expeditionCampaignCrystals: 0,
    duelWarpCost: 0,
  };
}
