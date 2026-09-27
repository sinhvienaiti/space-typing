import { describe, expect, it } from "vitest";
import { difficultyFor } from "../src/campaign/difficulty";
import {
  bossProjectilesEnabled,
  normalEnemyProjectilesEnabled,
  sanitizeEnemyProjectileMode,
} from "../src/combat/enemy-projectile-policy";
import type { DifficultyMode } from "../src/campaign/types";

function profile(mode: DifficultyMode, targetWpm = 60) {
  return difficultyFor({
    stage: 1,
    mode,
    vocabularyLevel: 1,
    recentWpm: targetWpm,
    recentAccuracy: 96,
    customTargetWpm: targetWpm,
    customPressure: 1,
  });
}

describe("enemy projectile policy", () => {
  it("keeps Auto off below Nightmare and on at Nightmare+", () => {
    for (const mode of ["relax", "balanced", "hard", "extreme"] as const) {
      expect(normalEnemyProjectilesEnabled("auto", profile(mode))).toBe(false);
    }
    expect(normalEnemyProjectilesEnabled("auto", profile("nightmare"))).toBe(true);
    expect(normalEnemyProjectilesEnabled("auto", profile("impossible"))).toBe(true);
  });

  it("lets explicit Off/On override any effective difficulty", () => {
    expect(normalEnemyProjectilesEnabled("off", profile("impossible"))).toBe(false);
    expect(normalEnemyProjectilesEnabled("on", profile("relax"))).toBe(true);
  });

  it("keeps boss projectile policy independent from the normal-enemy setting", () => {
    expect(bossProjectilesEnabled()).toBe(true);
  });

  it("migrates missing and legacy boolean settings and survives JSON round-trip", () => {
    expect(sanitizeEnemyProjectileMode(undefined)).toBe("auto");
    expect(sanitizeEnemyProjectileMode(true)).toBe("on");
    expect(sanitizeEnemyProjectileMode(false)).toBe("off");
    expect(sanitizeEnemyProjectileMode("auto")).toBe("auto");

    const serialized = JSON.stringify({ enemyProjectileMode: "on" });
    const restored = JSON.parse(serialized) as { enemyProjectileMode?: unknown };
    expect(sanitizeEnemyProjectileMode(restored.enemyProjectileMode)).toBe("on");
  });
});
