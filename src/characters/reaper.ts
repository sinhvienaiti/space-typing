import { clamp } from "../logic";
import type { SkillDefinition } from "../skills/engine";

export const REAPER_ACTIVE_SKILL_ID = "reaper-execute" as const;

export const REAPER_ACTIVE_SKILL: SkillDefinition = {
  id: REAPER_ACTIVE_SKILL_ID,
  name: "Execute",
  energyCost: 36,
  cooldown: 12,
  charges: null,
  perStageLimit: null,
  typingCondition: { minStreak: 12 },
};

export const REAPER_EXECUTE_BOSS_RATIO = 0.055;
export const REAPER_EXECUTE_ADVANCE = 3;
export const REAPER_DEATH_CHAIN_TARGETS = 7;
export const REAPER_DEATH_CHAIN_BOSS_RATIO = 0.1;
export const REAPER_DEATH_CHAIN_DURATION = 6;

export function reaperStreakDamageMultiplier(streak: number): number {
  const tiers = Math.floor(Math.max(0, streak) / 20);
  return clamp(1 + tiers * 0.06, 1, 1.48);
}
