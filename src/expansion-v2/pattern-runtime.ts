import { typingText } from "../logic";
import type { VocabularyEntry } from "../types";
import type { TypingPatternId } from "./contracts";

function unit(seedInput: number): number {
  let value = (Math.floor(seedInput) >>> 0) || 1;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return (value >>> 0) / 0x100000000;
}

function rotated<T>(items: readonly T[], seed: number): T[] {
  if (items.length <= 1) return [...items];
  const offset = Math.floor(unit(seed) * items.length) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function combine(
  entries: readonly VocabularyEntry[],
  count: 2 | 3,
  seed: number,
  prefix: string,
): VocabularyEntry[] {
  if (entries.length < count) return [...entries];
  const ordered = rotated(entries, seed);
  const output: VocabularyEntry[] = [];
  for (let index = 0; index + count <= ordered.length; index += count) {
    const group = ordered.slice(index, index + count);
    const ids = group.map((entry) => entry.id || entry.en.toLowerCase());
    output.push({
      id: prefix + ":" + ids.join("+"),
      en: group.map((entry) => entry.en.trim()).join(" "),
      vi: group.map((entry) => entry.vi?.trim()).filter(Boolean).join(" · "),
      ipa: group.map((entry) => entry.ipa?.trim()).filter(Boolean).join(" · "),
    });
  }
  return output.length > 0 ? output : [...entries];
}

export function buildPatternVocabulary(
  entries: readonly VocabularyEntry[],
  pattern: TypingPatternId,
  seed: number,
): VocabularyEntry[] {
  const valid = entries.filter((entry) => typingText(entry.en).length > 0);
  if (valid.length === 0) return [];

  if (pattern === "short-burst") {
    const filtered = valid.filter((entry) => {
      const length = typingText(entry.en).length;
      return length >= 2 && length <= 4;
    });
    return filtered.length > 0 ? filtered : [...valid];
  }

  if (pattern === "long-word") {
    const filtered = valid.filter(
      (entry) => typingText(entry.en).length >= 8,
    );
    return filtered.length > 0 ? filtered : [...valid];
  }

  if (pattern === "phrase") {
    return combine(valid, 2, seed, "phrase");
  }

  if (pattern === "boss-sentence") {
    return combine(valid, 3, seed, "sentence");
  }

  return [...valid];
}

export function chainMinimumLayers(
  pattern: TypingPatternId,
  existing: number,
): number {
  return pattern === "chain"
    ? Math.max(3, existing)
    : existing;
}

export type SharedTargetEffect = {
  linkedTargets: number;
  typedProgressRatio: number;
  emitsAdditionalCompletion: false;
  emitsAdditionalLearning: false;
};

export function sharedTargetEffect(
  pattern: TypingPatternId,
  availableTargets: number,
): SharedTargetEffect {
  if (pattern !== "shared-target") {
    return {
      linkedTargets: 0,
      typedProgressRatio: 0,
      emitsAdditionalCompletion: false,
      emitsAdditionalLearning: false,
    };
  }
  return {
    linkedTargets: Math.min(2, Math.max(0, Math.floor(availableTargets))),
    typedProgressRatio: 0.34,
    emitsAdditionalCompletion: false,
    emitsAdditionalLearning: false,
  };
}
