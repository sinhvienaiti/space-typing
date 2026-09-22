import { describe, expect, it } from "vitest";
import {
  pickVocabularyEntryForRank,
  wordDifficultyScore,
} from "../src/enemies/word-difficulty";
import type { VocabularyEntry } from "../src/types";

const entries: VocabularyEntry[] = [
  { id: "a", en: "cat", vi: "mèo", ipa: "/kæt/" },
  { id: "b", en: "planet", vi: "hành tinh", ipa: "/ˈplænɪt/" },
  { id: "c", en: "shielding", vi: "che chắn", ipa: "/ˈʃiːldɪŋ/" },
  { id: "d", en: "extraordinary", vi: "phi thường", ipa: "/ɪkˈstrɔːrdəneri/" },
  { id: "e", en: "quantum field", vi: "trường lượng tử", ipa: "/ˈkwɑːntəm fiːld/" },
];

describe("M12 in-rank word pressure", () => {
  it("can bias easier/harder words without switching vocabulary source", () => {
    const easier = pickVocabularyEntryForRank(
      entries,
      "VI",
      50,
      0,
      undefined,
      -20,
    );
    const harder = pickVocabularyEntryForRank(
      entries,
      "VI",
      50,
      0,
      undefined,
      20,
    );

    expect(entries).toContain(easier);
    expect(entries).toContain(harder);
    expect(
      wordDifficultyScore(harder!, 50),
    ).toBeGreaterThanOrEqual(
      wordDifficultyScore(easier!, 50),
    );
  });
});
