import { describe, expect, it } from "vitest";
import {
  shouldTriggerZenithCore,
  ZENITH_ACTIVE_SKILL,
  ZENITH_CORE_STREAK,
  ZENITH_PROTOCOL_DURATION,
} from "../src/characters/zenith";

describe("Zenith", () => {
  it("triggers Zenith Core on clean streak milestones", () => {
    expect(shouldTriggerZenithCore(ZENITH_CORE_STREAK - 1)).toBe(false);
    expect(shouldTriggerZenithCore(ZENITH_CORE_STREAK)).toBe(true);
  });

  it("uses a combined accuracy and streak gate for Zenith Shift", () => {
    expect(ZENITH_ACTIVE_SKILL.id).toBe("zenith-shift");
    expect(ZENITH_ACTIVE_SKILL.typingCondition?.minAccuracy).toBe(93);
    expect(ZENITH_ACTIVE_SKILL.typingCondition?.minStreak).toBe(8);
  });

  it("keeps Zenith Protocol as a sustained phase", () => {
    expect(ZENITH_PROTOCOL_DURATION).toBeGreaterThan(6);
  });
});
