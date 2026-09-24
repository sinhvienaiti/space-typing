import { describe, expect, it } from "vitest";
import { difficultyFor } from "../src/campaign/difficulty";
import { sanitizeDifficultySettings } from "../src/campaign/difficulty-settings";

describe("Batch B custom 0.10x combat controls", () => {
  it("preserves the four independent 0.10x values through sanitization", () => {
    const state = sanitizeDifficultySettings({
      mode: "custom",
      customEnemySpeed: 0.1,
      customBulletSpeed: 0.1,
      customFireRate: 0.1,
      customSpawnRate: 0.1,
    });

    expect(state.customEnemySpeed).toBe(0.1);
    expect(state.customBulletSpeed).toBe(0.1);
    expect(state.customFireRate).toBe(0.1);
    expect(state.customSpawnRate).toBe(0.1);
  });

  it("applies 0.10x movement, projectile, fire and spawn pacing without zero or infinity", () => {
    const normal = difficultyFor({
      stage: 100,
      mode: "custom",
      vocabularyLevel: 20,
      recentWpm: 60,
      recentAccuracy: 96,
      customTargetWpm: 60,
      customPressure: 1,
      customEnemySpeed: 1,
      customBulletSpeed: 1,
      customFireRate: 1,
      customSpawnRate: 1,
    });
    const learning = difficultyFor({
      stage: 100,
      mode: "custom",
      vocabularyLevel: 20,
      recentWpm: 60,
      recentAccuracy: 96,
      customTargetWpm: 60,
      customPressure: 1,
      customEnemySpeed: 0.1,
      customBulletSpeed: 0.1,
      customFireRate: 0.1,
      customSpawnRate: 0.1,
    });

    expect(learning.enemySpeed).toBeLessThan(normal.enemySpeed * 0.2);
    expect(learning.projectileSpeedScale).toBeCloseTo(
      (normal.projectileSpeedScale ?? 1) * 0.1,
      5,
    );
    expect(learning.attackIntervalFactor).toBeGreaterThan(
      normal.attackIntervalFactor * 9,
    );
    expect(learning.spawnInterval).toBeGreaterThan(
      normal.spawnInterval * 5,
    );

    for (const value of [
      learning.enemySpeed,
      learning.projectileSpeedScale ?? 0,
      learning.attackIntervalFactor,
      learning.spawnInterval,
    ]) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    }
  });
});
