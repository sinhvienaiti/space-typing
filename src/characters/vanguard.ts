import { clamp } from "../logic";
import type { SkillDefinition } from "../skills/engine";

export const VANGUARD_ACTIVE_SKILL_ID =
  "vanguard-barrier-pulse" as const;

export const VANGUARD_ACTIVE_SKILL: SkillDefinition = {
  id: VANGUARD_ACTIVE_SKILL_ID,
  name: "Barrier Pulse",
  energyCost: 30,
  cooldown: 12,
  charges: null,
  perStageLimit: null,
  typingCondition: { minStreak: 6 },
};

export const VANGUARD_PASSIVE_STREAK = 20;
export const VANGUARD_PASSIVE_SHIELD_RATIO = 0.08;
export const VANGUARD_ACTIVE_BARRIER_SHIELD_RATIO = 0.12;
export const VANGUARD_ACTIVE_BARRIER_DURATION = 7.5;
export const VANGUARD_NOVA_SHIELD_RATIO = 0.2;
export const VANGUARD_NOVA_DURATION = 6;

export function shouldTriggerVanguardShieldRhythm(
  streak: number,
): boolean {
  return (
    Number.isInteger(streak) &&
    streak > 0 &&
    streak % VANGUARD_PASSIVE_STREAK === 0
  );
}

export function restoreVanguardShield(
  currentShield: number,
  maxShield: number,
  ratio = VANGUARD_PASSIVE_SHIELD_RATIO,
): number {
  return clamp(
    currentShield + maxShield * ratio,
    0,
    maxShield,
  );
}
