import { describe, expect, it } from "vitest";
import {
  buildPatternVocabulary,
  chainMinimumLayers,
  sharedTargetEffect,
} from "../src/expansion-v2/pattern-runtime";

const words = [
  { id: "a", en: "sun", vi: "", ipa: "" },
  { id: "b", en: "moon", vi: "", ipa: "" },
  { id: "c", en: "planet", vi: "", ipa: "" },
  { id: "d", en: "asteroid", vi: "", ipa: "" },
  { id: "e", en: "galaxy", vi: "", ipa: "" },
  { id: "f", en: "universe", vi: "", ipa: "" },
];

describe("Expansion V2 pattern runtime", () => {
  it("builds deterministic phrase and boss-sentence prompts", () => {
    const phraseA = buildPatternVocabulary(words, "phrase", 42);
    const phraseB = buildPatternVocabulary(words, "phrase", 42);
    expect(phraseA).toEqual(phraseB);
    expect(phraseA.length).toBeGreaterThan(0);
    expect(phraseA[0]?.en.split(" ")).toHaveLength(2);

    const sentence = buildPatternVocabulary(
      words,
      "boss-sentence",
      42,
    );
    expect(sentence.length).toBeGreaterThan(0);
    expect(sentence[0]?.en.split(" ")).toHaveLength(3);
  });

  it("keeps short and long pattern fallbacks finite", () => {
    const short = buildPatternVocabulary(words, "short-burst", 5);
    expect(short.every((entry) => entry.en.length <= 4)).toBe(true);

    const long = buildPatternVocabulary(words, "long-word", 5);
    expect(long.some((entry) => entry.en.length >= 8)).toBe(true);

    const noLong = buildPatternVocabulary(
      [{ id: "x", en: "cat", vi: "", ipa: "" }],
      "long-word",
      5,
    );
    expect(noLong).toHaveLength(1);
  });

  it("uses three sequential layers for Chain without changing literal words", () => {
    expect(chainMinimumLayers("chain", 1)).toBe(3);
    expect(chainMinimumLayers("chain", 2)).toBe(3);
    expect(chainMinimumLayers("normal-word", 2)).toBe(2);
  });

  it("Shared Target has bounded linked progress and never emits duplicate typed facts", () => {
    expect(sharedTargetEffect("shared-target", 10)).toEqual({
      linkedTargets: 2,
      typedProgressRatio: 0.34,
      emitsAdditionalCompletion: false,
      emitsAdditionalLearning: false,
    });
    expect(sharedTargetEffect("normal-word", 10).linkedTargets).toBe(0);
  });
});
