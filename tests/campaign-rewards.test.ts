import { describe, expect, it } from "vitest";
import { difficultyFor } from "../src/campaign/difficulty";
import {
  performanceReward,
  performanceRewardText,
  sectorCheckpointReward,
} from "../src/rewards/campaign-rewards";

describe("M19 campaign reward layers", () => {
  it("keeps performance rewards optional when no badge threshold is met", () => {
    const difficulty = difficultyFor({
      stage: 120,
      mode: "balanced",
      vocabularyLevel: 20,
      recentWpm: 55,
      recentAccuracy: 95,
    });

    const reward = performanceReward({
      stats: { stage: 120, misses: 3, maxStreak: 12 },
      accuracy: 95,
      wpm: Math.max(0, difficulty.targetWpm - 10),
      difficulty,
      objectiveComplete: false,
    });

    expect(reward.earned).toEqual([]);
    expect(reward.credits).toBe(0);
    expect(reward.currencies).toEqual({
      alloy: 0,
      starCrystal: 0,
      quantumCore: 0,
    });
    expect(performanceRewardText(reward)).toBe("");
  });

  it("uses the selected difficulty target WPM for tempo and combines earned badges", () => {
    const difficulty = difficultyFor({
      stage: 200,
      mode: "relax",
      vocabularyLevel: 20,
      recentWpm: 45,
      recentAccuracy: 99,
    });

    const reward = performanceReward({
      stats: { stage: 200, misses: 0, maxStreak: 40 },
      accuracy: 99.5,
      wpm: difficulty.targetWpm * 1.06,
      difficulty,
      objectiveComplete: true,
    });

    expect(reward.earned).toEqual([
      "precision",
      "flawless",
      "streak",
      "tempo",
      "objective",
    ]);
    expect(reward.credits).toBeGreaterThan(0);
    expect(reward.currencies.alloy).toBeGreaterThan(0);
    expect(reward.currencies.starCrystal).toBe(1);
    expect(performanceRewardText(reward)).toContain("Tempo");
  });

  it("scales the sector checkpoint cache without creating a new currency", () => {
    const early = sectorCheckpointReward(10);
    const late = sectorCheckpointReward(1000);

    expect(early.credits).toBeGreaterThan(0);
    expect(early.currencies.quantumCore).toBe(0);
    expect(late.credits).toBeGreaterThan(early.credits);
    expect(late.currencies.alloy).toBeGreaterThan(early.currencies.alloy);
    expect(late.currencies.quantumCore).toBe(1);
  });
});
