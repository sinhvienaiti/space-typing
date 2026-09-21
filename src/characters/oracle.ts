import type { SkillDefinition } from "../skills/engine";

export const ORACLE_ACTIVE_SKILL_ID = "oracle-mark-of-weakness" as const;

export const ORACLE_ACTIVE_SKILL: SkillDefinition = {
  id: ORACLE_ACTIVE_SKILL_ID,
  name: "Mark of Weakness",
  energyCost: 28,
  cooldown: 13,
  charges: null,
  perStageLimit: null,
  typingCondition: { minAccuracy: 96 },
};

export const ORACLE_MARK_DURATION = 10;
export const ORACLE_PERFECT_MARK_DURATION = 2.5;
export const ORACLE_PERFECT_POWER_GAIN = 3;
export const ORACLE_ULTIMATE_MARK_DURATION = 14;
export const ORACLE_ULTIMATE_BOSS_RATIO = 0.08;
export const ORACLE_ULTIMATE_TARGETS = 5;
