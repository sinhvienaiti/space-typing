import { describe, expect, it } from "vitest";
import {
  isVocabularyEntry,
  parseCustomVocabulary,
  parseVocabularyIndex,
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

  it("validates the shared vocabulary index before exposing levels", () => {
    expect(
      parseVocabularyIndex({
        version: 1,
        plannedLevels: 100,
        availableLevels: 1,
        totalEntries: 150,
        levels: [
          {
            level: 1,
            label: "Foundation 001",
            file: "levels/001.json",
            count: 150,
          },
        ],
      }),
    ).toMatchObject({
      version: 1,
      plannedLevels: 100,
      availableLevels: 1,
      totalEntries: 150,
    });

    expect(() =>
      parseVocabularyIndex({
        version: 1,
        plannedLevels: 100,
        availableLevels: 1,
        totalEntries: 150,
        levels: [
          {
            level: 1,
            label: "Broken",
            file: 123,
            count: 150,
          },
        ],
      }),
    ).toThrow("Shared vocabulary index is invalid.");
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
