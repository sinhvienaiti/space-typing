import type { SkillDefinition } from "../skills/engine";

export const ARSENAL_ACTIVE_SKILL_ID = "arsenal-weapon-overclock" as const;

export const ARSENAL_ACTIVE_SKILL: SkillDefinition = {
  id: ARSENAL_ACTIVE_SKILL_ID,
  name: "Weapon Overclock",
  energyCost: 34,
  cooldown: 12,
  charges: null,
  perStageLimit: null,
  typingCondition: { minStreak: 8 },
};

export const ARSENAL_OVERCLOCK_DURATION = 7;
export const ARSENAL_PROTOCOL_DURATION = 12;
export const ARSENAL_PROTOCOL_BOSS_RATIO = 0.06;
export const ARSENAL_PROTOCOL_TARGETS = 5;
