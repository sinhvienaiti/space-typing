import { describe, expect, it } from "vitest";
import {
  shouldTriggerWraithCloak,
  WRAITH_ACTIVE_SKILL,
  WRAITH_PASSIVE_STREAK,
  WRAITH_TIME_COLLAPSE_DURATION,
} from "../src/characters/wraith";

describe("Wraith", () => {
  it("triggers cloak on clean streak milestones", () => {
    expect(shouldTriggerWraithCloak(WRAITH_PASSIVE_STREAK - 1)).toBe(false);
    expect(shouldTriggerWraithCloak(WRAITH_PASSIVE_STREAK)).toBe(true);
    expect(shouldTriggerWraithCloak(WRAITH_PASSIVE_STREAK * 2)).toBe(true);
  });

  it("defines Phase Cloak through the shared skill engine", () => {
    expect(WRAITH_ACTIVE_SKILL.id).toBe("wraith-phase-cloak");
    expect(WRAITH_ACTIVE_SKILL.typingCondition?.minStreak).toBe(10);
  });

  it("keeps Time Collapse longer than the short passive cloak", () => {
    expect(WRAITH_TIME_COLLAPSE_DURATION).toBeGreaterThan(5);
  });
});
