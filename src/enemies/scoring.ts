import { clamp } from "../logic";
import { enemyRankNumber, type EnemyRank } from "./rank";

export type EnemyKillRewardInput = {
  wordLength: number;
  layerCount: number;
  rank: EnemyRank;
  elite: boolean;
};

export function enemyKillRewardScore(
  input: EnemyKillRewardInput,
): number {
  const wordLength = clamp(
    Math.floor(Number.isFinite(input.wordLength) ? input.wordLength : 0),
    1,
    40,
  );
  const layerCount = clamp(
    Math.floor(Number.isFinite(input.layerCount) ? input.layerCount : 1),
    1,
    3,
  );
  const base = 80 + wordLength * 14;
  const layerMultiplier =
    layerCount === 3 ? 1.75 : layerCount === 2 ? 1.35 : 1;
  const rankMultiplier =
    1 + Math.max(0, enemyRankNumber(input.rank) - 1) * 0.04;
  const eliteMultiplier = input.elite ? 1.25 : 1;

  return Math.max(
    1,
    Math.round(
      base *
        layerMultiplier *
        rankMultiplier *
        eliteMultiplier,
    ),
  );
}
