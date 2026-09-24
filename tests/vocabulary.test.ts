import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isVocabularyEntry,
  loadVocabularyTopic,
  parseCustomVocabulary,
  parseVocabularyIndex,
  parseVocabularyTopicIndex,
  representativeTopicLevel,
  vocabularyLevelUrl,
} from "../src/vocabulary";

describe("shared vocabulary helpers", () => {
  afterEach(() => vi.unstubAllGlobals());

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

  it("validates shared Topic metadata", () => {
    const index = parseVocabularyTopicIndex({
      version: 1,
      totalGroups: 1,
      totalTopics: 1,
      uniqueVocabularyKeys: 2,
      topics: [
        {
          id: "travel.airport",
          label: "Airport",
          group: "travel-tourism",
          groupLabel: "Travel & Tourism",
          levels: ["A1", "B1"],
          count: 2,
          keys: ["passport", "airport"],
          entries: [
            { key: "passport", level: 30 },
            { key: "airport", level: 10 },
          ],
        },
      ],
    });
    expect(index.topics[0]?.id).toBe("travel.airport");
    expect(() =>
      parseVocabularyTopicIndex({
        version: 1,
        totalGroups: 1,
        totalTopics: 1,
        uniqueVocabularyKeys: 1,
        topics: [{ id: "", label: "Broken", group: "x", levels: [], count: 1, keys: [] }],
      }),
    ).toThrow("Shared vocabulary topic index is invalid.");
  });

  it("loads only Topic levels and derives a representative difficulty level", async () => {
    const topicIndex = parseVocabularyTopicIndex({
      version: 1,
      totalGroups: 1,
      totalTopics: 1,
      uniqueVocabularyKeys: 2,
      topics: [
        {
          id: "travel.airport",
          label: "Airport",
          group: "travel-tourism",
          groupLabel: "Travel & Tourism",
          levels: ["A1", "B1"],
          count: 2,
          keys: ["passport", "airport"],
          entries: [
            { key: "passport", level: 30 },
            { key: "airport", level: 10 },
          ],
        },
      ],
    });
    const vocabularyIndex = parseVocabularyIndex({
      version: 1,
      plannedLevels: 100,
      availableLevels: 3,
      totalEntries: 3,
      levels: [
        { level: 10, label: "Ten", file: "levels/010.json", count: 1 },
        { level: 30, label: "Thirty", file: "levels/030.json", count: 1 },
        { level: 80, label: "Unused", file: "levels/080.json", count: 1 },
      ],
    });

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const body =
        url.endsWith("/levels/010.json")
          ? { entries: [{ id: "L010-001", en: "airport", vi: "sân bay", ipa: "/ˈerˌpɔrt/" }] }
            : url.endsWith("/levels/030.json")
              ? { entries: [{ id: "L030-001", en: "passport", vi: "hộ chiếu", ipa: "/ˈpæsˌpɔrt/" }] }
              : { entries: [] };
      return { ok: true, status: 200, json: async () => body } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const loaded = await loadVocabularyTopic(
      "travel.airport",
      topicIndex,
      vocabularyIndex,
    );

    expect(loaded.entries.map((entry) => entry.en)).toEqual(["passport", "airport"]);
    expect(loaded.levels).toEqual([10, 30]);
    expect(loaded.representativeLevel).toBe(10);
    const urls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(urls.some((url) => url.endsWith("/lookup.json"))).toBe(false);
    expect(urls.some((url) => url.endsWith("/levels/080.json"))).toBe(false);
  });

  it("derives Topic difficulty from the vocabulary distribution, not only distinct levels", () => {
    expect(
      representativeTopicLevel([
        { key: "basic", level: 10 },
        { key: "mid", level: 30 },
        { key: "advanced-a", level: 80 },
        { key: "advanced-b", level: 80 },
        { key: "advanced-c", level: 80 },
      ]),
    ).toBe(80);
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
