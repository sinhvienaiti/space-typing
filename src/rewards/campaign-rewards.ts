import type { DifficultyProfile } from "../campaign/types";
import {
  createExpansionCurrencyState,
  type ExpansionCurrencyReward,
} from "../economy/currencies";
import type { GameStats } from "../types";

export const PERFORMANCE_REWARD_IDS = [
  "precision",
  "flawless",
  "streak",
  "tempo",
  "objective",
] as const;

export type PerformanceRewardId =
  (typeof PERFORMANCE_REWARD_IDS)[number];

export type PerformanceReward = {
  credits: number;
  currencies: ExpansionCurrencyReward;
  earned: PerformanceRewardId[];
};

export type SectorReward = {
  credits: number;
  currencies: ExpansionCurrencyReward;
};

function safeStage(stage: number): number {
  return Math.max(1, Math.min(1000, Math.floor(stage)));
}

export function performanceReward(input: {
  stats: Pick<GameStats, "stage" | "misses" | "maxStreak">;
  accuracy: number;
  wpm: number;
  difficulty: DifficultyProfile;
  objectiveComplete: boolean;
}): PerformanceReward {
  const stage = safeStage(input.stats.stage);
  const accuracy = Math.max(0, Math.min(100, input.accuracy));
  const wpm = Math.max(0, Number.isFinite(input.wpm) ? input.wpm : 0);
  const earned: PerformanceRewardId[] = [];

  if (accuracy >= 99) earned.push("precision");
  if (input.stats.misses === 0) earned.push("flawless");
  if (input.stats.maxStreak >= 25) earned.push("streak");

  // Speed is measured against the selected/adaptive target instead of one
  // global WPM gate, so Relax/Adaptive players are not asked for Impossible
  // typing speed to receive the same reward layer.
  if (wpm >= Math.max(10, input.difficulty.targetWpm) * 1.05) {
    earned.push("tempo");
  }
  if (input.objectiveComplete) earned.push("objective");

  if (earned.length === 0) {
    return {
      credits: 0,
      currencies: createExpansionCurrencyState(),
      earned,
    };
  }

  const perBadgeCredits = 8 + Math.floor(stage * 0.12);
  const credits = perBadgeCredits * earned.length;
  const alloy =
    Math.floor(earned.length / 2) +
    (earned.includes("flawless") && stage >= 100 ? 1 : 0);
  const starCrystal =
    stage >= 100 && earned.length >= 4 ? 1 : 0;

  return {
    credits,
    currencies: {
      alloy,
      starCrystal,
      quantumCore: 0,
    },
    earned,
  };
}

export function sectorCheckpointReward(stageInput: number): SectorReward {
  const stage = safeStage(stageInput);
  const sector = Math.max(1, Math.ceil(stage / 10));
  const galaxy = Math.max(1, Math.ceil(stage / 100));

  return {
    credits: 90 + sector * 8,
    currencies: {
      alloy: 4 + galaxy,
      starCrystal: stage >= 100 ? 1 + Math.floor((galaxy - 1) / 4) : 0,
      quantumCore: stage % 100 === 0 ? 1 : 0,
    },
  };
}

export function performanceRewardText(
  reward: PerformanceReward,
): string {
  if (reward.earned.length === 0) return "";
  const labels: Record<PerformanceRewardId, string> = {
    precision: "Precision",
    flawless: "Flawless",
    streak: "Streak",
    tempo: "Tempo",
    objective: "Objective",
  };
  return reward.earned.map((id) => labels[id]).join(" + ");
}
