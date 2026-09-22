import { describe, expect, it } from "vitest";
import {
  applyEnemyAreaControl,
  softenNearbyEnemies,
  tickEnemyRewardControl,
  timedRewardMultiplier,
} from "../src/enemies/reward-runtime";
import type { Enemy } from "../src/types";

function enemy(id: number, x: number, word = "planet"): Enemy {
  return {
    id,
    kind: "scout",
    definitionId: "rainbow-scout",
    elite: false,
    eliteModifiers: [],
    entry: { id: String(id), en: word, vi: "x", ipa: "/x/" },
    typed: 0,
    wordMissed: false,
    layersRemaining: 1,
    x,
    y: 100,
    baseX: x,
    speed: 30,
    age: 0,
    drift: 0,
    radius: 20,
    flash: 0,
    kick: 0,
    actionCooldown: null,
  };
}

describe("enemy reward runtime helpers", () => {
  it("freezes nearby non-elite enemies without touching the source", () => {
    const source = enemy(1, 100);
    const nearby = enemy(2, 180);
    const far = enemy(3, 500);
    const elite = { ...enemy(4, 160), elite: true };

    expect(
      applyEnemyAreaControl([source, nearby, far, elite], source, 3, 0),
    ).toBe(1);
    expect(nearby.rewardControlTimer).toBe(3);
    expect(tickEnemyRewardControl(nearby, 1)).toBe(0);
    expect(tickEnemyRewardControl(nearby, 2)).toBe(1);
    expect(source.rewardControlTimer).toBeUndefined();
    expect(far.rewardControlTimer).toBeUndefined();
    expect(elite.rewardControlTimer).toBeUndefined();
  });

  it("resolves timed score/credit multipliers without leaking after expiry", () => {
    expect(timedRewardMultiplier(10)).toBe(2);
    expect(timedRewardMultiplier(0)).toBe(1);
    expect(timedRewardMultiplier(-1)).toBe(1);
  });

  it("softens nearby words but never completes them automatically", () => {
    const source = enemy(1, 100);
    const nearby = enemy(2, 150, "planet");
    const far = enemy(3, 600, "planet");

    expect(softenNearbyEnemies([source, nearby, far], source, 0.35)).toBe(1);
    expect(nearby.typed).toBeGreaterThan(0);
    expect(nearby.typed).toBeLessThan("planet".length);
    expect(far.typed).toBe(0);
  });
});
