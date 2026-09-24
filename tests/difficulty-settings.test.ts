import { describe, expect, it } from "vitest";
import {
  createDifficultySettings,
  difficultyInputFromSettings,
  recordDifficultyResult,
  sanitizeDifficultySettings,
} from "../src/campaign/difficulty-settings";

describe("runtime difficulty settings", () => {
  it("defaults to Balanced behavior", () => {
    expect(createDifficultySettings()).toEqual({
      mode: "balanced",
      customTargetWpm: 60,
      customPressure: 1,
      customEnemySpeed: 1,
      customBulletSpeed: 1,
      customFireRate: 1,
      customSpawnRate: 1,
      profile: {
        smoothedWpm: 60,
        smoothedAccuracy: 96,
        samples: 0,
      },
    });
  });

  it("migrates legacy fixed-mode ids without losing player intent", () => {
    expect(
      sanitizeDifficultySettings({ mode: "relaxed" }).mode,
    ).toBe("relax");
    expect(
      sanitizeDifficultySettings({ mode: "normal" }).mode,
    ).toBe("balanced");
    expect(
      sanitizeDifficultySettings({ mode: "expert" }).mode,
    ).toBe("extreme");
  });

  it("sanitizes modes, custom values and adaptive profile", () => {
    const state = sanitizeDifficultySettings({
      mode: "adaptive",
      customTargetWpm: 999,
      customPressure: 0.1,
      profile: {
        smoothedWpm: 120,
        smoothedAccuracy: 98,
        samples: 3,
      },
    });

    expect(state.mode).toBe("adaptive");
    expect(state.customTargetWpm).toBe(300);
    expect(state.customPressure).toBe(0.7);
    expect(state.profile.smoothedWpm).toBe(120);
  });

  it("keeps collecting a smoothed profile even in fixed modes", () => {
    let state = createDifficultySettings();
    state = recordDifficultyResult(state, 80, 98);
    state = recordDifficultyResult(state, 40, 86);

    expect(state.mode).toBe("balanced");
    expect(state.profile.smoothedWpm).toBe(70);
    expect(state.profile.smoothedAccuracy).toBe(95);
    expect(state.profile.samples).toBe(2);
  });

  it("sanitizes independent custom dimensions without changing fixed modes", () => {
    const state = sanitizeDifficultySettings({
      mode: "custom",
      customEnemySpeed: -4,
      customBulletSpeed: 99,
      customFireRate: 0.1,
      customSpawnRate: 100,
    });
    expect(state.customEnemySpeed).toBe(0.1);
    expect(state.customBulletSpeed).toBe(1.65);
    expect(state.customFireRate).toBe(0.1);
    expect(state.customSpawnRate).toBe(1.45);
    const copy = sanitizeDifficultySettings(JSON.parse(JSON.stringify(state)));
    expect(copy).toEqual(state);
  });

  it("builds production difficulty input from selected settings", () => {
    const state = sanitizeDifficultySettings({
      mode: "custom",
      customTargetWpm: 90,
      customPressure: 1.2,
      profile: {
        smoothedWpm: 75,
        smoothedAccuracy: 97,
        samples: 4,
      },
    });

    expect(difficultyInputFromSettings(state, 250, 35)).toEqual({
      stage: 250,
      mode: "custom",
      vocabularyLevel: 35,
      recentWpm: 75,
      recentAccuracy: 97,
      customTargetWpm: 90,
      customPressure: 1.2,
      customEnemySpeed: 1,
      customBulletSpeed: 1,
      customFireRate: 1,
      customSpawnRate: 1,
    });
  });
});
