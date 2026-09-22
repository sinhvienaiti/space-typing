import { describe, expect, it } from "vitest";
import { enemyDefinition } from "../src/enemies/registry";
import { timedRewardMultiplier } from "../src/enemies/reward-runtime";

describe("enemy reward integration contracts", () => {
  it("assigns Prism Archon a stage-clear-friendly Credits x2 reward", () => {
    const prism = enemyDefinition("prism-archon");
    expect(prism?.reward).toBe("credits-x2");
    expect(prism?.rewardPower).toBeGreaterThan(0);
  });

  it("keeps multiplier duration bounded and explicit", () => {
    expect(timedRewardMultiplier(12)).toBe(2);
    expect(timedRewardMultiplier(0)).toBe(1);
  });
});
