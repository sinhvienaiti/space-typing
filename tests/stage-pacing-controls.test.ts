import { describe, expect, it } from "vitest";
import { createStageConfig } from "../src/campaign/stage";
import { difficultyFor } from "../src/campaign/difficulty";

const base = (stage: number, mode: "balanced" | "hard" | "custom") => ({
  stage,
  mode,
  vocabularyLevel: 1,
  recentWpm: 60,
  recentAccuracy: 96,
});

describe("longer stages with gentle first-World pressure", () => {
  it("increases TOTAL enemies across the Campaign without changing concurrency", () => {
    const first = createStageConfig(1).enemyBudget;
    expect(first).toBeGreaterThanOrEqual(34);
    expect(first).toBeLessThanOrEqual(60);
    expect(createStageConfig(9).enemyBudget).toBeGreaterThan(first);
    expect(createStageConfig(11).enemyBudget).toBeGreaterThanOrEqual(54);
    expect(createStageConfig(51).enemyBudget).toBeGreaterThanOrEqual(100);
    expect(createStageConfig(501).enemyBudget).toBeLessThanOrEqual(155);
    const balanced = difficultyFor(base(1, "balanced"));
    expect(balanced.maxEnemies).toBeLessThanOrEqual(8);
    expect(balanced.urgentThreatCap).toBeLessThanOrEqual(2);
  });

  it("slows early Balanced hostile attacks relative to later Worlds and Hard", () => {
    const first = difficultyFor(base(1, "balanced"));
    const later = difficultyFor(base(51, "balanced"));
    const hard = difficultyFor(base(1, "hard"));
    expect(first.attackIntervalFactor).toBeGreaterThan(later.attackIntervalFactor);
    expect(first.attackIntervalFactor).toBeGreaterThan(hard.attackIntervalFactor);
    expect(first.projectileSpeedScale).toBeLessThan(1);
    expect(first.enemySpeed).toBeGreaterThan(0.82);
  });

  it("applies four independent Custom controls only to new stage profiles", () => {
    const standard = difficultyFor(base(5, "custom"));
    const tuned = difficultyFor({
      ...base(5, "custom"),
      customEnemySpeed: 0.65,
      customBulletSpeed: 0.6,
      customFireRate: 0.45,
      customSpawnRate: 0.7,
    });
    expect(tuned.enemySpeed).toBeLessThan(standard.enemySpeed);
    expect(tuned.projectileSpeedScale).toBeCloseTo(0.6);
    expect(tuned.attackIntervalFactor).toBeGreaterThan(standard.attackIntervalFactor);
    expect(tuned.spawnInterval).toBeGreaterThan(standard.spawnInterval);
    expect(tuned.maxEnemies).toEqual(standard.maxEnemies);
    expect(difficultyFor({...base(5, "balanced"), customEnemySpeed: 0.45}).enemySpeed)
      .toEqual(difficultyFor(base(5, "balanced")).enemySpeed);
  });
});
