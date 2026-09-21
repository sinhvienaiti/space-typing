import { describe, expect, it } from "vitest";
import {
  restoreVanguardShield,
  shouldTriggerVanguardShieldRhythm,
  VANGUARD_ACTIVE_SKILL,
  VANGUARD_NOVA_DURATION,
} from "../src/characters/vanguard";

describe("Vanguard", () => {
  it("triggers Shield Rhythm every 20 consecutive correct keys", () => {
    expect(shouldTriggerVanguardShieldRhythm(19)).toBe(false);
    expect(shouldTriggerVanguardShieldRhythm(20)).toBe(true);
    expect(shouldTriggerVanguardShieldRhythm(40)).toBe(true);
    expect(shouldTriggerVanguardShieldRhythm(0)).toBe(false);
  });

  it("restores a small Shield amount without exceeding the cap", () => {
    expect(restoreVanguardShield(40, 100)).toBe(48);
    expect(restoreVanguardShield(96, 100)).toBe(100);
  });

  it("defines Barrier Pulse through the shared skill engine", () => {
    expect(VANGUARD_ACTIVE_SKILL.id).toBe("vanguard-barrier-pulse");
    expect(VANGUARD_ACTIVE_SKILL.energyCost).toBeGreaterThan(0);
    expect(VANGUARD_ACTIVE_SKILL.cooldown).toBeGreaterThan(0);
    expect(VANGUARD_ACTIVE_SKILL.typingCondition?.minStreak).toBe(6);
  });

  it("gives Nova Overdrive a longer Vanguard window", () => {
    expect(VANGUARD_NOVA_DURATION).toBeGreaterThan(4.5);
  });
});
