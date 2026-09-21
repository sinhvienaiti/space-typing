import { describe, expect, it } from "vitest";
import {
  REAPER_ACTIVE_SKILL,
  reaperStreakDamageMultiplier,
} from "../src/characters/reaper";

describe("Reaper", () => {
  it("grows damage with clean streak tiers and caps it", () => {
    expect(reaperStreakDamageMultiplier(0)).toBe(1);
    expect(reaperStreakDamageMultiplier(40)).toBeGreaterThan(1);
    expect(reaperStreakDamageMultiplier(1000)).toBeLessThanOrEqual(1.48);
  });

  it("uses streak-gated Execute", () => {
    expect(REAPER_ACTIVE_SKILL.id).toBe("reaper-execute");
    expect(REAPER_ACTIVE_SKILL.typingCondition?.minStreak).toBe(12);
  });
});
