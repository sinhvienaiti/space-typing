import {
  lastWordChainLetter,
  normalizeWordChainWord,
} from "../../../src/duel/word-chain";

export const WORD_CHAIN_LEXICON_VERSION = "word-chain-pilot-v1";

export const WORD_CHAIN_LEXICON: readonly string[] = Object.freeze([
  "apple",
  "earth",
  "home",
  "early",
  "yellow",
  "water",
  "river",
  "road",
  "dream",
  "music",
  "cloud",
  "dog",
  "green",
  "night",
  "tree",
  "energy",
  "young",
  "game",
  "garden",
  "name",
  "never",
  "read",
  "dance",
  "easy",
  "year",
  "rain",
  "north",
  "happy",
  "kind",
  "deep",
  "play",
  "paper",
  "right",
  "time",
  "every",
  "world",
  "drive",
  "engine",
  "quiet",
  "train",
  "near",
  "red",
  "door",
  "run",
]);

const WORD_SET = new Set(WORD_CHAIN_LEXICON);

export function isFrozenWordChainWord(value: string): boolean {
  return WORD_SET.has(normalizeWordChainWord(value));
}

function unusedWords(usedWords: ReadonlySet<string>): string[] {
  return WORD_CHAIN_LEXICON.filter((word) => !usedWords.has(word));
}

export function wordChainContinuationCount(
  candidate: string,
  usedWords: ReadonlySet<string>,
): number {
  const normalized = normalizeWordChainWord(candidate);
  const nextInitial = lastWordChainLetter(normalized);
  return unusedWords(usedWords).filter(
    (word) => word !== normalized && word.startsWith(nextInitial),
  ).length;
}

export function legalWordChainMoves(
  requiredInitial: string,
  usedWords: ReadonlySet<string>,
): readonly string[] {
  const initial = normalizeWordChainWord(requiredInitial).slice(0, 1);
  if (!/^[a-z]$/.test(initial)) return [];
  return unusedWords(usedWords)
    .filter((word) => word.startsWith(initial))
    .filter((word) => wordChainContinuationCount(word, usedWords) > 0)
    .sort((left, right) => left.localeCompare(right));
}

export function validateWordChainLexicon(): readonly string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const raw of WORD_CHAIN_LEXICON) {
    const word = normalizeWordChainWord(raw);
    if (!/^[a-z]{3,20}$/.test(word)) {
      errors.push(`Invalid frozen Word Chain token: ${raw}`);
      continue;
    }
    if (seen.has(word)) errors.push(`Duplicate frozen Word Chain token: ${word}`);
    seen.add(word);
    const withoutSelf = new Set<string>([word]);
    if (legalWordChainMoves(lastWordChainLetter(word), withoutSelf).length === 0) {
      errors.push(`Unsafe frozen continuation after: ${word}`);
    }
  }
  return errors;
}
