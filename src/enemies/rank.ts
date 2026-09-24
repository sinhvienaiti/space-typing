import type { EnemyKind } from "../types";
import { clamp } from "../logic";
import { worldRankDistributionForStage } from "../worlds/roster";
import { WORLD_RANK_LABELS } from "../worlds/registry";

export const ENEMY_RANKS = WORLD_RANK_LABELS;

export type EnemyRank = (typeof ENEMY_RANKS)[number];

const KIND_RANK_OFFSET: Record<EnemyKind, number> = {
  scout: 0,
  mine: 0,
  tank: 1,
  destroyer: 0,
  oppressor: 1,
  shield: 1,
  carrier: 0,
  jammer: 0,
  cloaker: 0,
  healer: 0,
  splitter: 0,
  sniper: 1,
  leech: 1,
  commander: 1,
};

export function enemyRankNumber(rank: EnemyRank): number {
  return ENEMY_RANKS.indexOf(rank) + 1;
}

export type EnemyRankVisualProfile = {
  intensity: number;
  glowScale: number;
  lineWidthBoost: number;
  auraAlpha: number;
  auraRadiusScale: number;
};

export function enemyRankVisualProfile(
  rank: EnemyRank,
): EnemyRankVisualProfile {
  const intensity = clamp((enemyRankNumber(rank) - 1) / 9, 0, 1);
  return {
    intensity,
    glowScale: 1 + intensity * 0.65,
    lineWidthBoost: intensity * 1.5,
    auraAlpha: 0.07 + intensity * 0.28,
    auraRadiusScale: 1.12 + intensity * 0.18,
  };
}

export function enemyRankForNumber(value: number): EnemyRank {
  const index = clamp(Math.floor(value), 1, 10) - 1;
  return ENEMY_RANKS[index] ?? "I";
}

export function enemyRankLabel(rank: EnemyRank): string {
  return "Rank " + rank;
}

export function sampleWorldEnemyRank(
  stage: number,
  random = Math.random(),
): EnemyRank {
  const distribution = worldRankDistributionForStage(stage);
  const weights = ENEMY_RANKS.map((rank) =>
    Math.max(0, distribution[rank] ?? 0),
  );
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return "I";

  let cursor = clamp(random, 0, 0.999999) * total;
  for (let index = 0; index < ENEMY_RANKS.length; index += 1) {
    cursor -= weights[index] ?? 0;
    if (cursor < 0) return ENEMY_RANKS[index] ?? "I";
  }
  return ENEMY_RANKS[ENEMY_RANKS.length - 1] ?? "X";
}

export function rankForWordDifficultyScore(score: number): EnemyRank {
  const safeScore = clamp(
    Number.isFinite(score) ? score : 0,
    0,
    100,
  );
  return enemyRankForNumber(Math.floor(safeScore / 10) + 1);
}

export type ResolveEnemyRankInput = {
  stage: number;
  kind: EnemyKind;
  elite: boolean;
  minimumLayers: number;
  wordDifficultyScore: number;
  sampledRank?: EnemyRank;
};

export function resolveEnemyRank(
  input: ResolveEnemyRankInput,
): EnemyRank {
  const sampled =
    input.sampledRank ?? sampleWorldEnemyRank(input.stage);
  const sampledNumber = enemyRankNumber(sampled);
  const wordNumber = enemyRankNumber(
    rankForWordDifficultyScore(input.wordDifficultyScore),
  );
  const kindOffset = KIND_RANK_OFFSET[input.kind];
  const eliteOffset = input.elite ? 2 : 0;

  // Word difficulty materially contributes, but the authored World band
  // remains the dominant source. This avoids a long word alone turning an
  // early-World enemy into Rank X.
  let resolved = Math.round(
    sampledNumber * 0.65 + wordNumber * 0.35,
  );
  resolved += kindOffset + eliteOffset;

  const minimumLayers = clamp(
    Math.floor(input.minimumLayers),
    1,
    3,
  );
  if (minimumLayers >= 3) resolved = Math.max(resolved, 7);
  else if (minimumLayers >= 2) resolved = Math.max(resolved, 4);

  return enemyRankForNumber(resolved);
}

export function validateEnemyRankDistribution(
  stage: number,
): string[] {
  const distribution = worldRankDistributionForStage(stage);
  const errors: string[] = [];
  const weights = ENEMY_RANKS.map((rank) => distribution[rank]);

  if (
    weights.some(
      (weight) =>
        typeof weight !== "number" ||
        !Number.isFinite(weight) ||
        weight < 0,
    )
  ) {
    errors.push("Rank weights must be finite and non-negative.");
  }
  if (!weights.some((weight) => (weight ?? 0) > 0)) {
    errors.push("At least one Rank weight must be positive.");
  }

  return errors;
}
