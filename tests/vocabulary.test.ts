import { describe, expect, it } from "vitest";
import {
  isVocabularyEntry,
  parseCustomVocabulary,
  vocabularyLevelUrl,
} from "../src/vocabulary";

describe("shared vocabulary helpers", () => {
  it("recognizes the parent vocabulary entry shape", () => {
    expect(isVocabularyEntry({
      id: "L001-001",
      en: "good",
      vi: "tốt",
      ipa: "/ɡʊd/",
    })).toBe(true);
    expect(isVocabularyEntry({ id: "broken", en: "" })).toBe(false);
  });

  it("builds the parent vocabulary level URL", () => {
    expect(vocabularyLevelUrl({
      level: 1,
      label: "Foundation 001",
      file: "levels/001.json",
      count: 150,
    })).toBe("/vocabulary/levels/001.json");
  });

  it("parses custom EN-VI-IPA rows and removes duplicate English entries", () => {
    const entries = parseCustomVocabulary(
      "apple | quả táo | /ˈæpəl/\nAPPLE = trùng = /x/\nspace → không gian → /speɪs/",
    );
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      en: "apple",
      vi: "quả táo",
      ipa: "/ˈæpəl/",
    });
    expect(entries[1]?.en).toBe("space");
  });
});
