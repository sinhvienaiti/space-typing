import { describe, expect, it } from "vitest";
import {
  applyEnemyRewardEffect,
  type EnemyRewardSystems,
} from "../src/enemies/reward-effects";
import { ENEMY_REWARD_IDS } from "../src/enemies/rewards";
import { SkillEngine } from "../src/skills/engine";

function recorder(): {
  calls: string[];
  systems: EnemyRewardSystems;
} {
  const calls: string[] = [];
  const systems: EnemyRewardSystems = {
    restoreHull: (value) => calls.push("hull:" + value),
    restoreShield: (value) => calls.push("shield:" + value),
    applyPlayerStatus: (id, duration) =>
      calls.push("status:" + id + ":" + duration),
    setFireRateBoost: (duration) =>
      calls.push("fire-rate:" + duration),
    freezeNearby: (duration) => calls.push("freeze:" + duration),
    slowNearby: (duration) => calls.push("slow:" + duration),
    damageNearby: (power) => calls.push("burst:" + power),
    chainDamage: (power) => calls.push("chain:" + power),
    clearNormalEnemies: () => calls.push("clear-normal"),
    clearProjectiles: () => calls.push("clear-projectiles"),
    setScoreMultiplier: (multiplier, duration) =>
      calls.push("score:" + multiplier + ":" + duration),
    setCreditsMultiplier: (multiplier, duration) =>
      calls.push("credits:" + multiplier + ":" + duration),
    reduceSkillCooldowns: (seconds) =>
      calls.push("cooldown:" + seconds),
    restoreEnergy: (ratio) => calls.push("energy:" + ratio),
    addPower: (amount) => calls.push("power:" + amount),
  };
  return { calls, systems };
}

describe("enemy reward effects", () => {
  it("dispatches every reward ID through one existing-system adapter", () => {
    const expected = new Map([
      ["heal-burst", "hull:"],
      ["shield-burst", "shield:"],
      ["damage-up", "status:overcharged:"],
      ["fire-rate-up", "fire-rate:"],
      ["freeze-nearby", "freeze:"],
      ["slow-nearby", "slow:"],
      ["explosion-burst", "burst:"],
      ["chain-lightning", "chain:"],
      ["clear-normal", "clear-normal"],
      ["clear-projectiles", "clear-projectiles"],
      ["score-x2", "score:2:"],
      ["credits-x2", "credits:2:"],
      ["luck-up", "status:lucky:"],
      ["cooldown-charge", "cooldown:"],
      ["energy-burst", "energy:"],
      ["overdrive-charge", "power:"],
    ]);

    for (const id of ENEMY_REWARD_IDS) {
      const { calls, systems } = recorder();
      const result = applyEnemyRewardEffect(id, systems);

      expect(result.id).toBe(id);
      expect(calls).toHaveLength(1);
      expect(calls[0]?.startsWith(expected.get(id) ?? "missing")).toBe(true);
    }
  });

  it("uses explicit positive reward power and ignores invalid values", () => {
    const first = recorder();
    applyEnemyRewardEffect("freeze-nearby", first.systems, 4);
    expect(first.calls).toEqual(["freeze:4"]);

    const second = recorder();
    applyEnemyRewardEffect("heal-burst", second.systems, Number.NaN);
    expect(second.calls).toEqual(["hull:0.15"]);
  });

  it("reduces active skill cooldowns through SkillEngine", () => {
    const engine = new SkillEngine();
    engine.setDefinitions([
      {
        id: "test",
        name: "Test",
        energyCost: 0,
        cooldown: 10,
        charges: null,
        perStageLimit: null,
      },
      {
        id: "ready",
        name: "Ready",
        energyCost: 0,
        cooldown: 0,
        charges: null,
        perStageLimit: null,
      },
    ]);

    expect(
      engine.activate("test", {
        energy: 100,
        streak: 0,
        hits: 0,
        misses: 0,
      }).ok,
    ).toBe(true);

    expect(engine.reduceCooldowns(4)).toBe(1);
    expect(engine.getState("test")?.cooldownRemaining).toBe(6);
    expect(engine.reduceCooldowns(99)).toBe(1);
    expect(engine.getState("test")?.cooldownRemaining).toBe(0);
    expect(engine.reduceCooldowns(-5)).toBe(0);
  });
});
