import { describe, expect, it } from "vitest";
import {
  campaignDifficultyPoints,
  summarizeDifficultyByGalaxy,
} from "../src/balance/campaign-audit";

describe("Campaign Stage 001-1000 difficulty validation", () => {
  it("keeps every production difficulty value finite and inside clamps", () => {
    const points = campaignDifficultyPoints({
      mode: "normal",
      vocabularyLevel: 50,
      recentWpm: 60,
      recentAccuracy: 96,
    });

    expect(points).toHaveLength(1000);

    for (const point of points) {
      const profile = point.profile;
      for (const value of Object.values(profile)) {
        expect(Number.isFinite(value)).toBe(true);
      }
      expect(profile.combatPressure).toBeGreaterThanOrEqual(0.62);
      expect(profile.combatPressure).toBeLessThanOrEqual(3.2);
      expect(profile.enemySpeed).toBeGreaterThanOrEqual(0.82);
      expect(profile.enemySpeed).toBeLessThanOrEqual(2.1);
      expect(profile.spawnInterval).toBeGreaterThanOrEqual(0.34);
      expect(profile.spawnInterval).toBeLessThanOrEqual(1.8);
      expect(profile.projectilePressure).toBeLessThanOrEqual(2.8);
      expect(profile.bossPressure).toBeLessThanOrEqual(2.7);
    }
  });

  it("increases the normal-mode average pressure across Galaxies", () => {
    const summaries = summarizeDifficultyByGalaxy(
      campaignDifficultyPoints({
        mode: "normal",
        vocabularyLevel: 1,
        recentWpm: 60,
        recentAccuracy: 96,
      }),
    );

    expect(summaries).toHaveLength(10);
    for (let index = 1; index < summaries.length; index += 1) {
      expect(
        summaries[index]!.averageCombatPressure,
        "Galaxy " + String(index + 1),
      ).toBeGreaterThan(
        summaries[index - 1]!.averageCombatPressure,
      );
      expect(summaries[index]!.averageSpawnInterval).toBeLessThan(
        summaries[index - 1]!.averageSpawnInterval,
      );
    }
  });

  it("keeps fixed difficulty modes ordered at milestone stages", () => {
    for (const stage of [1, 100, 300, 500, 700, 1000]) {
      const values = ["relaxed", "normal", "hard", "expert"].map(
        (mode) =>
          campaignDifficultyPoints({
            mode: mode as "relaxed" | "normal" | "hard" | "expert",
            vocabularyLevel: 20,
            recentWpm: 60,
            recentAccuracy: 96,
          })[stage - 1]!.profile.combatPressure,
      );

      expect(values[0]).toBeLessThan(values[1]!);
      expect(values[1]).toBeLessThan(values[2]!);
      expect(values[2]).toBeLessThan(values[3]!);
    }
  });

  it("compensates reaction pressure for harder vocabulary", () => {
    const easy = campaignDifficultyPoints({
      mode: "normal",
      vocabularyLevel: 1,
      recentWpm: 60,
      recentAccuracy: 96,
    })[499]!.profile;
    const hardVocabulary = campaignDifficultyPoints({
      mode: "normal",
      vocabularyLevel: 100,
      recentWpm: 60,
      recentAccuracy: 96,
    })[499]!.profile;

    expect(hardVocabulary.vocabularyComplexity).toBeGreaterThan(
      easy.vocabularyComplexity,
    );
    expect(hardVocabulary.combatPressure).toBeLessThan(
      easy.combatPressure,
    );
  });

  it("keeps adaptive difficulty responsive but bounded", () => {
    const struggling = campaignDifficultyPoints({
      mode: "adaptive",
      vocabularyLevel: 30,
      recentWpm: 35,
      recentAccuracy: 86,
    })[699]!.profile;
    const strong = campaignDifficultyPoints({
      mode: "adaptive",
      vocabularyLevel: 30,
      recentWpm: 105,
      recentAccuracy: 99.2,
    })[699]!.profile;

    expect(strong.combatPressure).toBeGreaterThan(
      struggling.combatPressure,
    );
    expect(strong.combatPressure).toBeLessThanOrEqual(3.2);
    expect(struggling.combatPressure).toBeGreaterThanOrEqual(0.62);
  });
});
