import type { SkillDefinition } from "../skills/engine";

export const ZENITH_ACTIVE_SKILL_ID = "zenith-shift" as const;

export const ZENITH_ACTIVE_SKILL: SkillDefinition = {
  id: ZENITH_ACTIVE_SKILL_ID,
  name: "Zenith Shift",
  energyCost: 28,
  cooldown: 12,
  charges: null,
  perStageLimit: null,
  typingCondition: { minAccuracy: 93, minStreak: 8 },
};

export const ZENITH_CORE_STREAK = 25;
export const ZENITH_SHIFT_DURATION = 4.5;
export const ZENITH_PROTOCOL_DURATION = 10;
export const ZENITH_PROTOCOL_GUARD_BLOCKS = 3;
export const ZENITH_PROTOCOL_MARK_DURATION = 10;

export function shouldTriggerZenithCore(streak: number): boolean {
  return (
    Number.isInteger(streak) &&
    streak > 0 &&
    streak % ZENITH_CORE_STREAK === 0
  );
}
