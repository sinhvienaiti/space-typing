import { describe, expect, it } from "vitest";
import {
  loadTypingTextChallenge,
  parseTypingTextIndex,
  parseTypingTextLevel,
  passageVocabulary,
  selectTypingTextPassage,
} from "../src/typing-text";

const index = parseTypingTextIndex({
  version: 1,
  plannedLevels: 100,
  availableLevels: 1,
  totalPassages: 2,
  totalWords: 500,
  levels: [
    {
      level: 1,
      cefr: "A1",
      file: "levels/001.json",
      passageCount: 2,
      wordCount: 500,
    },
  ],
});

const level = parseTypingTextLevel(
  {
    version: 1,
    level: 1,
    cefr: "A1",
    passages: [
      {
        id: "L001-P001",
        topic: "first",
        style: "narrative",
        setting: "home",
        tone: "calm",
        targetWords: ["space", "shield", "space"],
        wordCount: 250,
        text: "A valid passage.",
      },
      {
        id: "L001-P002",
        topic: "second",
        style: "narrative",
        setting: "school",
        tone: "warm",
        targetWords: ["energy"],
        wordCount: 250,
        text: "Another valid passage.",
      },
    ],
  },
  1,
);

describe("typing-text challenges", () => {
  it("selects the same passage for the same stage seed", () => {
    expect(selectTypingTextPassage(level, 7).id).toBe("L001-P002");
    expect(selectTypingTextPassage(level, 7).id).toBe("L001-P002");
  });

  it("deduplicates target words and reuses vocabulary metadata", () => {
    const entries = passageVocabulary(level.passages[0]!, [
      {
        id: "source-space",
        en: "space",
        vi: "không gian",
        ipa: "/speɪs/",
      },
    ]);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      id: "source-space",
      en: "space",
      vi: "không gian",
      ipa: "/speɪs/",
    });
    expect(entries[1]).toMatchObject({
      en: "shield",
      vi: "",
      ipa: "",
    });
  });

  it("rejects a requested level that the parent index does not expose", async () => {
    const fetcher = async (url: string) => ({
      ok: true,
      json: async () =>
        url.endsWith("index.json")
          ? index
          : level,
    });

    await expect(
      loadTypingTextChallenge(2, 1, [], fetcher),
    ).rejects.toThrow("Typing-text level 2 is unavailable.");
  });

  it("loads challenge data through the parent library contract", async () => {
    const fetcher = async (url: string) => ({
      ok: true,
      json: async () =>
        url.endsWith("index.json")
          ? index
          : level,
    });

    const challenge = await loadTypingTextChallenge(
      1,
      0,
      [],
      fetcher,
    );
    expect(challenge.passage.id).toBe("L001-P001");
    expect(challenge.entries.map((entry) => entry.en)).toEqual([
      "space",
      "shield",
    ]);
  });
});
