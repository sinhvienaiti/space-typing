import { describe, expect, it } from "vitest";
import { enemyDefinition } from "../src/enemies/registry";
import { timedRewardMultiplier } from "../src/enemies/reward-runtime";

describe("enemy reward integration contracts", () => {
  it("assigns Prism Archon a stage-clear-friendly Credits x2 reward", () => {
    const prism = enemyDefinition("prism-archon");
    expect(prism?.reward).toBe("credits-x2");
    expect(prism?.rewardPower).toBeGreaterThan(0);
  });

  it("keeps Damage Up duration inside the planned 6-10 second window", () => {
    expect(enemyDefinition("berserk-devil")?.rewardPower).toBeGreaterThanOrEqual(6);
    expect(enemyDefinition("berserk-devil")?.rewardPower).toBeLessThanOrEqual(10);
  });

  it("only assigns a boss reward when it survives the immediate stage-clear flow", () => {
    expect(enemyDefinition("archangel-core")?.reward).toBeUndefined();
    expect(enemyDefinition("demon-lord-orb")?.reward).toBeUndefined();
    expect(enemyDefinition("glacier-queen")?.reward).toBeUndefined();
    expect(enemyDefinition("prism-archon")?.reward).toBe("credits-x2");
    expect(enemyDefinition("void-eye")?.reward).toBeUndefined();
    expect(enemyDefinition("cosmic-emperor")?.reward).toBeUndefined();
  });

  it("keeps multiplier duration bounded and explicit", () => {
    expect(timedRewardMultiplier(12)).toBe(2);
    expect(timedRewardMultiplier(0)).toBe(1);
  });
});
