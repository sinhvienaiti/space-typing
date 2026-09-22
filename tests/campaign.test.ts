import { describe, expect, it } from "vitest";
import {
  difficultyFor,
  estimatedTypingSeconds,
} from "../src/campaign/difficulty";
import {
  createDefaultCampaignProgress,
  recordStageClear,
  sanitizeCampaignProgress,
  selectCampaignStage,
} from "../src/campaign/progress";
import {
  createCampaignStages,
  createStageConfig,
  galaxyForStage,
  stageRole,
} from "../src/campaign/stage";

describe("1000-stage Campaign model", () => {
  it("generates exactly 1000 valid stages across ten Galaxies", () => {
    const stages = createCampaignStages();

    expect(stages).toHaveLength(1000);
    expect(stages[0]?.stage).toBe(1);
    expect(stages[999]?.stage).toBe(1000);
    expect(galaxyForStage(1)).toBe(1);
    expect(galaxyForStage(100)).toBe(1);
    expect(galaxyForStage(101)).toBe(2);
    expect(galaxyForStage(1000)).toBe(10);

    expect(stages.every((stage) => stage.enemyBudget > 0)).toBe(true);
    expect(stages.every((stage) => stage.eliteChance >= 0)).toBe(true);
  });

  it("assigns milestone roles on the 20-stage World rhythm", () => {
    expect(stageRole(5)).toBe("elite");
    expect(stageRole(10)).toBe("mini-boss");
    expect(stageRole(15)).toBe("special");
    expect(stageRole(20)).toBe("boss");

    expect(stageRole(30)).toBe("mini-boss");
    expect(stageRole(40)).toBe("boss");
    expect(stageRole(55)).toBe("hazard");
    expect(stageRole(90)).toBe("mini-boss");
    expect(stageRole(95)).toBe("gauntlet");
    expect(stageRole(100)).toBe("major-boss");
    expect(stageRole(200)).toBe("major-boss");
  });

  it("raises the global stage baseline while keeping all profiles bounded", () => {
    const early = difficultyFor({
      stage: 1,
      mode: "normal",
      vocabularyLevel: 1,
      recentWpm: 60,
      recentAccuracy: 96,
    });
    const late = difficultyFor({
      stage: 1000,
      mode: "normal",
      vocabularyLevel: 1,
      recentWpm: 60,
      recentAccuracy: 96,
    });

    expect(late.stageFactor).toBeGreaterThan(early.stageFactor);
    expect(late.combatPressure).toBeGreaterThan(early.combatPressure);
    expect(late.spawnInterval).toBeLessThan(early.spawnInterval);
    expect(late.maxEnemies).toBeGreaterThanOrEqual(early.maxEnemies);

    for (let stage = 1; stage <= 1000; stage += 1) {
      const config = createStageConfig(stage);
      expect(config.stage).toBe(stage);
      expect(config.galaxy).toBeGreaterThanOrEqual(1);
      expect(config.galaxy).toBeLessThanOrEqual(10);
    }
  });

  it("uses smoothed WPM-style pressure for Adaptive mode", () => {
    const slower = difficultyFor({
      stage: 120,
      mode: "adaptive",
      vocabularyLevel: 10,
      recentWpm: 45,
      recentAccuracy: 94,
    });
    const faster = difficultyFor({
      stage: 120,
      mode: "adaptive",
      vocabularyLevel: 10,
      recentWpm: 100,
      recentAccuracy: 99,
    });

    expect(faster.wpmFactor).toBeGreaterThan(slower.wpmFactor);
    expect(faster.combatPressure).toBeGreaterThan(slower.combatPressure);
  });

  it("treats harder vocabulary as higher word complexity with reaction compensation", () => {
    const easy = difficultyFor({
      stage: 300,
      mode: "normal",
      vocabularyLevel: 1,
      recentWpm: 70,
      recentAccuracy: 97,
    });
    const hard = difficultyFor({
      stage: 300,
      mode: "normal",
      vocabularyLevel: 100,
      recentWpm: 70,
      recentAccuracy: 97,
    });

    expect(hard.vocabularyComplexity).toBeGreaterThan(easy.vocabularyComplexity);
    expect(hard.vocabularyReactionFactor).toBeLessThan(easy.vocabularyReactionFactor);
  });

  it("estimates typing time from WPM without making it zero", () => {
    expect(estimatedTypingSeconds(5, 60, 0)).toBeCloseTo(1);
    expect(estimatedTypingSeconds(10, 120, 0)).toBeCloseTo(1);
    expect(estimatedTypingSeconds(4, 80)).toBeGreaterThan(0.65);
  });
});

describe("Campaign progress", () => {
  it("unlocks the next stage without ever resetting cleared progress", () => {
    const initial = createDefaultCampaignProgress();
    const afterOne = recordStageClear(initial, 1, {
      score: 1000,
      accuracy: 98,
      wpm: 72,
      clearedAt: "2026-09-21T14:00:00.000Z",
    });

    expect(afterOne.highestUnlockedStage).toBe(2);
    expect(afterOne.selectedStage).toBe(2);
    expect(afterOne.clearedStages).toEqual([1]);

    const replay = recordStageClear(afterOne, 1, {
      score: 900,
      accuracy: 99,
      wpm: 75,
      clearedAt: "2026-09-21T15:00:00.000Z",
    });

    expect(replay.highestUnlockedStage).toBe(2);
    expect(replay.bestByStage["1"]?.score).toBe(1000);
  });

  it("does not allow selection of a locked stage", () => {
    const progress = createDefaultCampaignProgress();
    expect(selectCampaignStage(progress, 5)).toEqual(progress);
  });

  it("sanitizes invalid stored progress", () => {
    const clean = sanitizeCampaignProgress({
      version: 999,
      highestUnlockedStage: 5000,
      selectedStage: 9000,
      clearedStages: [1, 2, 2, -5, "bad"],
      bestByStage: {},
    });

    expect(clean.version).toBe(1);
    expect(clean.highestUnlockedStage).toBe(1000);
    expect(clean.selectedStage).toBe(1000);
    expect(clean.clearedStages).toEqual([1, 2]);
  });
});
