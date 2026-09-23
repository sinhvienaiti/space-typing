import type { VocabularyEntry } from "../types";
import { clamp, normalizeWord, typingText } from "../logic";
import {
  prefixConflictScore,
  type PrefixClarityContext,
} from "../typing/prefix-clarity";
import type { EnemyRank } from "./rank";
import { enemyRankNumber } from "./rank";

export type WordDifficultyBreakdown = {
  score: number;
  vocabularyLevel: number;
  characterScore: number;
  tokenScore: number;
  patternScore: number;
  transitionScore: number;
};

const RARE_LETTERS = new Set(["j", "q", "v", "x", "z"]);
const VOWELS = new Set(["a", "e", "i", "o", "u", "y"]);

function tokenCount(text: string): number {
  const tokens = normalizeWord(text)
    .split(/[^a-z]+/g)
    .filter((token) => token.length > 0);
  return Math.max(1, tokens.length);
}

function spellingPatternScore(letters: string): number {
  if (letters.length === 0) return 0;

  let rare = 0;
  let doubles = 0;
  for (let index = 0; index < letters.length; index += 1) {
    const current = letters[index] ?? "";
    if (RARE_LETTERS.has(current)) rare += 1;
    if (
      index > 0 &&
      current === (letters[index - 1] ?? "")
    ) {
      doubles += 1;
    }
  }

  const uniqueRatio =
    new Set(letters).size / Math.max(1, letters.length);
  return clamp(
    rare * 2.2 +
      doubles * 1.25 +
      uniqueRatio * 5,
    0,
    16,
  );
}

function awkwardTransitionScore(letters: string): number {
  let score = 0;

  for (let index = 1; index < letters.length; index += 1) {
    const left = letters[index - 1] ?? "";
    const right = letters[index] ?? "";
    const bothConsonants =
      !VOWELS.has(left) && !VOWELS.has(right);

    if (bothConsonants) score += 0.7;
    if (RARE_LETTERS.has(left) || RARE_LETTERS.has(right)) {
      score += 0.55;
    }
  }

  return clamp(score, 0, 14);
}

export function wordDifficultyBreakdown(
  entry: VocabularyEntry,
  vocabularyLevel = 1,
): WordDifficultyBreakdown {
  const letters = typingText(entry.en);
  const safeLevel = clamp(
    Math.floor(
      Number.isFinite(vocabularyLevel)
        ? vocabularyLevel
        : 1,
    ),
    1,
    100,
  );
  const characters = letters.length;
  const tokens = tokenCount(entry.en);

  const characterScore = clamp(
    Math.max(0, characters - 3) * 2,
    0,
    28,
  );
  const tokenScore = clamp((tokens - 1) * 7, 0, 14);
  const patternScore = spellingPatternScore(letters);
  const transitionScore = awkwardTransitionScore(letters);
  const levelScore = ((safeLevel - 1) / 99) * 28;

  return {
    score: clamp(
      levelScore +
        characterScore +
        tokenScore +
        patternScore +
        transitionScore,
      0,
      100,
    ),
    vocabularyLevel: safeLevel,
    characterScore,
    tokenScore,
    patternScore,
    transitionScore,
  };
}

export function wordDifficultyScore(
  entry: VocabularyEntry,
  vocabularyLevel = 1,
): number {
  return wordDifficultyBreakdown(entry, vocabularyLevel).score;
}

export function rankWordTargetScore(rank: EnemyRank): number {
  return enemyRankNumber(rank) * 10 - 5;
}

export function pickVocabularyEntryForRank(
  entries: readonly VocabularyEntry[],
  rank: EnemyRank,
  vocabularyLevel = 1,
  random = Math.random(),
  excludeId?: string,
  scoreOffset = 0,
  clarity?: PrefixClarityContext,
): VocabularyEntry | undefined {
  if (entries.length === 0) return undefined;

  const filtered =
    excludeId === undefined
      ? [...entries]
      : entries.filter((entry) => entry.id !== excludeId);
  const source = filtered.length > 0 ? filtered : [...entries];
  const target = clamp(
    rankWordTargetScore(rank) +
      (Number.isFinite(scoreOffset) ? scoreOffset : 0),
    0,
    100,
  );

  const ordered = source
    .map((entry) => ({
      entry,
      distance: Math.abs(
        wordDifficultyScore(entry, vocabularyLevel) - target,
      ),
    }))
    .sort(
      (a, b) =>
        a.distance - b.distance ||
        a.entry.id.localeCompare(b.entry.id),
    );

  // Pick from a small nearest band so repeated layers retain variety while
  // never switching to a different vocabulary source.
  const baseBandSize = Math.min(
    ordered.length,
    Math.max(1, Math.min(8, Math.ceil(ordered.length * 0.2))),
  );

  if (
    clarity === undefined ||
    clarity.activeWords.length === 0
  ) {
    const index = Math.min(
      baseBandSize - 1,
      Math.floor(clamp(random, 0, 0.999999) * baseBandSize),
    );
    return ordered[index]?.entry;
  }

  // Keep the authored difficulty target first: clarity only chooses inside a
  // larger near-rank band, never from the whole vocabulary.
  const clarityBandSize = Math.min(
    ordered.length,
    Math.max(
      baseBandSize,
      Math.min(24, Math.ceil(ordered.length * 0.35)),
    ),
  );
  const clarityBand = ordered
    .slice(0, clarityBandSize)
    .map((candidate) => ({
      ...candidate,
      conflict: prefixConflictScore(
        candidate.entry.en,
        clarity.activeWords,
      ),
    }))
    .sort(
      (a, b) =>
        a.conflict - b.conflict ||
        a.distance - b.distance ||
        a.entry.id.localeCompare(b.entry.id),
    );

  const bestConflict = clarityBand[0]?.conflict ?? 0;
  const lowConflictBand = clarityBand.filter(
    (candidate) => candidate.conflict <= bestConflict + 4,
  );
  const sampleBand = lowConflictBand.slice(
    0,
    Math.max(1, Math.min(baseBandSize, lowConflictBand.length)),
  );
  const index = Math.min(
    sampleBand.length - 1,
    Math.floor(clamp(random, 0, 0.999999) * sampleBand.length),
  );
  return sampleBand[index]?.entry ?? clarityBand[0]?.entry;
}
