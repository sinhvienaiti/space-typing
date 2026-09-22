import { describe, expect, it } from "vitest";
import {
  pickVocabularyEntryForRank,
  rankWordTargetScore,
  wordDifficultyBreakdown,
  wordDifficultyScore,
} from "../src/enemies/word-difficulty";
import type { VocabularyEntry } from "../src/types";

const entries: VocabularyEntry[] = [
  { id: "easy", en: "cat", vi: "mèo", ipa: "/kæt/" },
  { id: "mid", en: "planet", vi: "hành tinh", ipa: "/ˈplænɪt/" },
  {
    id: "hard",
    en: "extraordinary",
    vi: "phi thường",
    ipa: "/ɪkˈstrɔːrdəneri/",
  },
  {
    id: "phrase",
    en: "quantum field",
    vi: "trường lượng tử",
    ipa: "/ˈkwɑːntəm fiːld/",
  },
];

describe("M10 WordDifficultyScore", () => {
  it("is deterministic and bounded", () => {
    for (const entry of entries) {
      const first = wordDifficultyScore(entry, 50);
      const second = wordDifficultyScore(entry, 50);
      expect(first).toBe(second);
      expect(first).toBeGreaterThanOrEqual(0);
      expect(first).toBeLessThanOrEqual(100);
    }
  });

  it("uses vocabulary level without inventing rarity metadata", () => {
    expect(wordDifficultyScore(entries[1]!, 100)).toBeGreaterThan(
      wordDifficultyScore(entries[1]!, 1),
    );
  });

  it("accounts for character, token and spelling-transition pressure", () => {
    const easy = wordDifficultyBreakdown(entries[0]!, 1);
    const hard = wordDifficultyBreakdown(entries[2]!, 1);
    const phrase = wordDifficultyBreakdown(entries[3]!, 1);

    expect(hard.characterScore).toBeGreaterThan(easy.characterScore);
    expect(phrase.tokenScore).toBeGreaterThan(easy.tokenScore);
    expect(hard.score).toBeGreaterThan(easy.score);
  });

  it("selects from the nearest score band inside the existing source", () => {
    const low = pickVocabularyEntryForRank(entries, "I", 1, 0);
    const high = pickVocabularyEntryForRank(entries, "X", 100, 0);

    expect(entries).toContain(low);
    expect(entries).toContain(high);
    expect(
      Math.abs(wordDifficultyScore(low!, 1) - rankWordTargetScore("I")),
    ).toBeLessThanOrEqual(
      Math.abs(
        wordDifficultyScore(entries[2]!, 1) -
          rankWordTargetScore("I"),
      ),
    );
  });
});
