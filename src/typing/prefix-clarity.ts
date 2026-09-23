import { typingText } from "../logic";
import type { VocabularyEntry } from "../types";

export type PrefixClarityContext = {
  activeWords: readonly string[];
};

export type PrefixConflictBreakdown = {
  score: number;
  exactDuplicate: boolean;
  maxSharedPrefix: number;
  sameInitialCount: number;
};

export function sharedTypingPrefixLength(
  left: string,
  right: string,
): number {
  const a = typingText(left);
  const b = typingText(right);
  const limit = Math.min(a.length, b.length);
  let length = 0;
  while (length < limit && a[length] === b[length]) {
    length += 1;
  }
  return length;
}

export function prefixConflictBreakdown(
  candidate: string,
  activeWords: readonly string[],
): PrefixConflictBreakdown {
  const word = typingText(candidate);
  if (word.length === 0) {
    return {
      score: 0,
      exactDuplicate: false,
      maxSharedPrefix: 0,
      sameInitialCount: 0,
    };
  }

  let exactDuplicate = false;
  let maxSharedPrefix = 0;
  let sameInitialCount = 0;
  let score = 0;

  for (const active of activeWords) {
    const normalized = typingText(active);
    if (normalized.length === 0) continue;

    const shared = sharedTypingPrefixLength(word, normalized);
    maxSharedPrefix = Math.max(maxSharedPrefix, shared);

    if (word === normalized) {
      exactDuplicate = true;
      score += 1000;
      continue;
    }

    if (shared >= 1) {
      sameInitialCount += 1;
    }

    if (shared >= 3) {
      score += 80 + Math.min(5, shared - 3) * 12;
    } else if (shared === 2) {
      score += 30;
    } else if (shared === 1) {
      score += 9;
    }
  }

  if (sameInitialCount >= 2) {
    score += (sameInitialCount - 1) * 14;
  }

  return {
    score,
    exactDuplicate,
    maxSharedPrefix,
    sameInitialCount,
  };
}

export function prefixConflictScore(
  candidate: string,
  activeWords: readonly string[],
): number {
  return prefixConflictBreakdown(candidate, activeWords).score;
}

export function clarityOrderEntries(
  entries: readonly VocabularyEntry[],
  context: PrefixClarityContext,
): VocabularyEntry[] {
  return [...entries].sort((a, b) => {
    const left = prefixConflictScore(a.en, context.activeWords);
    const right = prefixConflictScore(b.en, context.activeWords);
    return left - right || a.id.localeCompare(b.id);
  });
}
