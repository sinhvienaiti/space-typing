import type {
  EnemyKind,
  VocabularyEntry,
} from "../types";
import {
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
};

export function resolveEnemyTypingProfile(
  input: ResolveEnemyTypingProfileInput,
): EnemyTypingProfile {
  const random = input.random ?? Math.random;
  const sampledRank = sampleWorldEnemyRank(
    input.stage,
    random(),
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

  // If real word complexity moves the resolved Rank, repick once from the
  // same configured vocabulary source. Never switch vocabulary levels.
  if (enemyRankNumber(finalRank) !== enemyRankNumber(mechanicalRank)) {
    const adjusted =
      pickVocabularyEntryForRank(
        input.entries,
        finalRank,
        input.vocabularyLevel,
        random(),
        input.excludeEntryId,
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
