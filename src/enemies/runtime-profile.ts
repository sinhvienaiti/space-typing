import type { EnemyKind } from "../types";
import type { EnemyRank } from "./rank";
import { enemyRankNumber } from "./rank";
import {
  enemySkillDefinition,
  orderedEnemySkillPool,
  type EnemySkillId,
} from "./skills";
import {
  auditThreatBudget,
  calculateThreatBudget,
  type ThreatBudget,
} from "./threat";
import { worldForStage } from "../worlds/registry";

export type EnemyRuntimeProfile = {
  skills: EnemySkillId[];
  threatBudget: ThreatBudget;
};

export type ResolveEnemyRuntimeProfileInput = {
  stage: number;
  kind: EnemyKind;
  rank: EnemyRank;
  elite: boolean;
  wordDifficultyScore: number;
  layers: number;
  random?: () => number;
};

function desiredSkillCount(
  rank: EnemyRank,
  elite: boolean,
): number {
  const value = enemyRankNumber(rank);
  const base = value >= 8 ? 3 : value >= 4 ? 2 : 1;
  return Math.min(3, base + (elite && value < 8 ? 1 : 0));
}

export function resolveEnemyRuntimeProfile(
  input: ResolveEnemyRuntimeProfileInput,
): EnemyRuntimeProfile {
  const random = input.random ?? Math.random;
  const world = worldForStage(input.stage);
  const rankNumber = enemyRankNumber(input.rank);
  const pool = orderedEnemySkillPool(world, input.kind)
    .filter(
      (id) =>
        enemySkillDefinition(id).minRank <= rankNumber,
    );

  // Rotate the already-prioritized World pool for bounded variety.
  const offset =
    pool.length === 0
      ? 0
      : Math.floor(
          Math.max(0, Math.min(0.999999, random())) *
            pool.length,
        );
  const ordered =
    pool.length === 0
      ? []
      : [...pool.slice(offset), ...pool.slice(0, offset)];

  const selected: EnemySkillId[] = [];
  const targetCount = desiredSkillCount(
    input.rank,
    input.elite,
  );

  for (const id of ordered) {
    if (selected.length >= targetCount) break;

    const candidate = [...selected, id];
    const budget = calculateThreatBudget({
      kind: input.kind,
      rank: input.rank,
      elite: input.elite,
      wordDifficultyScore: input.wordDifficultyScore,
      layers: input.layers,
      skills: candidate,
    });

    if (auditThreatBudget(budget, input.elite).length === 0) {
      selected.push(id);
    }
  }

  const threatBudget = calculateThreatBudget({
    kind: input.kind,
    rank: input.rank,
    elite: input.elite,
    wordDifficultyScore: input.wordDifficultyScore,
    layers: input.layers,
    skills: selected,
  });

  return {
    skills: selected,
    threatBudget,
  };
}
