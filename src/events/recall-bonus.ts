import { clamp, typingText } from "../logic";
import type { VocabularyEntry } from "../types";

export type RecallBonusTarget = {
  entry: VocabularyEntry;
  typed: number;
  hintIndices: number[];
  x: number;
  y: number;
  speed: number;
  age: number;
  lifetime: number;
};

export function recallBonusChance(stage: number): number {
  const safeStage = clamp(Math.floor(stage), 1, 1000);
  return Math.min(0.3, 0.22 + (safeStage - 1) * 0.00008);
}

export function shouldScheduleRecallBonus(
  stage: number,
  random = Math.random(),
): boolean {
  return random < recallBonusChance(stage);
}

export function recallBonusHintCount(word: string): number {
  const length = typingText(word).length;
  if (length <= 4) return 0;
  if (length <= 7) return 1;
  return 2;
}

export function pickRecallBonusHintIndices(
  word: string,
  random = Math.random,
): number[] {
  const length = typingText(word).length;
  const count = recallBonusHintCount(word);
  if (count === 0 || length <= 2) return [];

  const candidates = Array.from(
    { length: Math.max(0, length - 2) },
    (_, index) => index + 1,
  );
  const selected: number[] = [];

  while (selected.length < count && candidates.length > 0) {
    const roll = clamp(random(), 0, 0.999999);
    const index = Math.floor(roll * candidates.length);
    const [picked] = candidates.splice(index, 1);
    if (picked !== undefined) selected.push(picked);
  }

  return selected.sort((left, right) => left - right);
}

export function recallBonusMask(
  word: string,
  typed: number,
  hintIndices: readonly number[],
): string {
  const answer = typingText(word);
  const safeTyped = clamp(Math.floor(typed), 0, answer.length);
  const hints = new Set(hintIndices);

  return [...answer]
    .map((letter, index) => {
      if (index < safeTyped || hints.has(index)) return letter;
      return "_";
    })
    .join(" ");
}

export function recallBonusRewardScore(
  word: string,
  hintIndices: readonly number[],
): number {
  const length = typingText(word).length;
  const hintPenalty = hintIndices.length * 40;
  return Math.max(500, 500 + length * 30 - hintPenalty);
}

export function eligibleRecallBonusEntry(
  entry: VocabularyEntry,
): boolean {
  const answer = typingText(entry.en);
  return (
    answer.length >= 4 &&
    answer.length <= 11 &&
    /^[a-z]+$/.test(entry.en.trim().toLocaleLowerCase("en-US")) &&
    entry.vi.trim().length > 0
  );
}
