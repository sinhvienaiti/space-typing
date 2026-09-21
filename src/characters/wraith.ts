import type { SkillDefinition } from "../skills/engine";

export const WRAITH_ACTIVE_SKILL_ID = "wraith-phase-cloak" as const;

export const WRAITH_ACTIVE_SKILL: SkillDefinition = {
  id: WRAITH_ACTIVE_SKILL_ID,
  name: "Phase Cloak",
  energyCost: 32,
  cooldown: 14,
  charges: null,
  perStageLimit: null,
  typingCondition: { minStreak: 10 },
};

export const WRAITH_PASSIVE_STREAK = 30;
export const WRAITH_PASSIVE_CLOAK_DURATION = 2.2;
export const WRAITH_ACTIVE_CLOAK_DURATION = 5.5;
export const WRAITH_TIME_COLLAPSE_DURATION = 8;

export function shouldTriggerWraithCloak(streak: number): boolean {
  return (
    Number.isInteger(streak) &&
    streak > 0 &&
    streak % WRAITH_PASSIVE_STREAK === 0
  );
}
