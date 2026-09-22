import type {
  EnemyKind,
  VocabularyEntry,
} from "../types";
import {
  enemyRankForNumber,
  enemyRankNumber,
  resolveEnemyRank,
  sampleWorldEnemyRank,
  type EnemyRank,
} from "./rank";
import {
  enemyLayerCount,
  enemyLayerPlan,
  type EnemyLayerId,
} from "./layers";
import {
  pickVocabularyEntryForRank,
  rankWordTargetScore,
  wordDifficultyScore,
} from "./word-difficulty";

export type EnemyTypingProfile = {
  rank: EnemyRank;
  entry: VocabularyEntry;
  wordDifficultyScore: number;
  layerPlan: EnemyLayerId[];
  layersRemaining: 1 | 2 | 3;
};

export type ResolveEnemyTypingProfileInput = {
  stage: number;
  kind: EnemyKind;
  elite: boolean;
  minimumLayers: number;
  vocabularyLevel: number;
  entries: readonly VocabularyEntry[];
  random?: () => number;
  excludeEntryId?: string;
  wordScoreOffset?: number;
  rankBonus?: number;
};

export function resolveEnemyTypingProfile(
  input: ResolveEnemyTypingProfileInput,
): EnemyTypingProfile {
  const random = input.random ?? Math.random;
  const sampledBaseRank = sampleWorldEnemyRank(
    input.stage,
    random(),
  );
  const sampledRank = enemyRankForNumber(
    enemyRankNumber(sampledBaseRank) +
      Math.max(0, Math.min(3, Math.floor(input.rankBonus ?? 0))),
  );

  // Resolve mechanical pressure first so an armored/tank archetype selects
  // words from the correct band instead of choosing a low-rank word first.
  const mechanicalRank = resolveEnemyRank({
    stage: input.stage,
    kind: input.kind,
    elite: input.elite,
    minimumLayers: input.minimumLayers,
    wordDifficultyScore: rankWordTargetScore(sampledRank),
    sampledRank,
  });

  let entry =
    pickVocabularyEntryForRank(
      input.entries,
      mechanicalRank,
      input.vocabularyLevel,
      random(),
      input.excludeEntryId,
    ) ?? input.entries[0];

  if (entry === undefined) {
    throw new Error("Enemy typing profile requires vocabulary.");
  }

  let score = wordDifficultyScore(
    entry,
    input.vocabularyLevel,
  );
  const finalRank = resolveEnemyRank({
    stage: input.stage,
    kind: input.kind,
    elite: input.elite,
    minimumLayers: input.minimumLayers,
    wordDifficultyScore: score,
    sampledRank,
  });

  // Difficulty may shift word pressure inside the final Rank band, but it
  // must not change access to the authored World Rank distribution.
  if (
    enemyRankNumber(finalRank) !== enemyRankNumber(mechanicalRank) ||
    (input.wordScoreOffset ?? 0) !== 0
  ) {
    const adjusted =
      pickVocabularyEntryForRank(
        input.entries,
        finalRank,
        input.vocabularyLevel,
        random(),
        input.excludeEntryId,
        input.wordScoreOffset ?? 0,
      ) ?? entry;
    entry = adjusted;
    score = wordDifficultyScore(
      adjusted,
      input.vocabularyLevel,
    );
  }

  const count = enemyLayerCount(
    finalRank,
    input.minimumLayers,
  );

  return {
    rank: finalRank,
    entry,
    wordDifficultyScore: score,
    layerPlan: enemyLayerPlan(input.kind, count),
    layersRemaining: count,
  };
}
