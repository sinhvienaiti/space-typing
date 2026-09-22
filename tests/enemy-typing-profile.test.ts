import { describe, expect, it } from "vitest";
import { resolveEnemyTypingProfile } from "../src/enemies/typing-profile";
import { enemyRankNumber } from "../src/enemies/rank";
import type { VocabularyEntry } from "../src/types";

const entries: VocabularyEntry[] = [
  { id: "a", en: "cat", vi: "mèo", ipa: "/kæt/" },
  { id: "b", en: "orbit", vi: "quỹ đạo", ipa: "/ˈɔːrbɪt/" },
  { id: "c", en: "shield", vi: "khiên", ipa: "/ʃiːld/" },
  {
    id: "d",
    en: "transcendent",
    vi: "siêu việt",
    ipa: "/trænˈsendənt/",
  },
  {
    id: "e",
    en: "quantum field",
    vi: "trường lượng tử",
    ipa: "/ˈkwɑːntəm fiːld/",
  },
];

function sequence(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length] ?? 0;
}

describe("M10 enemy typing profile", () => {
  it("resolves Rank, word score and layer plan once at spawn", () => {
    const profile = resolveEnemyTypingProfile({
      stage: 1,
      kind: "scout",
      elite: false,
      minimumLayers: 1,
      vocabularyLevel: 1,
      entries,
      random: sequence([0, 0]),
    });

    expect(profile.entry).toBeDefined();
    expect(profile.wordDifficultyScore).toBeGreaterThanOrEqual(0);
    expect(profile.layersRemaining).toBeGreaterThanOrEqual(1);
    expect(profile.layersRemaining).toBeLessThanOrEqual(3);
    expect(profile.layerPlan).toHaveLength(profile.layersRemaining);
  });

  it("forces armored three-layer enemies into Rank VII-X", () => {
    const profile = resolveEnemyTypingProfile({
      stage: 20,
      kind: "tank",
      elite: true,
      minimumLayers: 3,
      vocabularyLevel: 20,
      entries,
      random: sequence([0, 0, 0]),
    });

    expect(enemyRankNumber(profile.rank)).toBeGreaterThanOrEqual(7);
    expect(profile.layersRemaining).toBe(3);
    expect(profile.layerPlan).toHaveLength(3);
    expect(profile.layerPlan.at(-1)).toBe("core");
  });

  it("stays inside the configured vocabulary source", () => {
    const profile = resolveEnemyTypingProfile({
      stage: 1000,
      kind: "commander",
      elite: true,
      minimumLayers: 2,
      vocabularyLevel: 100,
      entries,
      random: sequence([0.999, 0, 0]),
    });

    expect(entries).toContain(profile.entry);
    expect(enemyRankNumber(profile.rank)).toBeGreaterThanOrEqual(7);
  });
});
