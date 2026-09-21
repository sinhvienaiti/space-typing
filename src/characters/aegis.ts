import { clamp } from "../logic";
import type { SkillDefinition } from "../skills/engine";

export const AEGIS_ACTIVE_SKILL_ID = "aegis-reflect-field" as const;

export const AEGIS_ACTIVE_SKILL: SkillDefinition = {
  id: AEGIS_ACTIVE_SKILL_ID,
  name: "Reflect Field",
  energyCost: 34,
  cooldown: 14,
  charges: null,
  perStageLimit: null,
  typingCondition: { minAccuracy: 94 },
};

export const AEGIS_PASSIVE_SHIELD_RATIO = 0.06;
export const AEGIS_REFLECT_DURATION = 6;
export const AEGIS_FORTRESS_DURATION = 8;
export const AEGIS_FORTRESS_SHIELD_RATIO = 0.35;

export function restoreAegisShield(
  currentShield: number,
  maxShield: number,
  ratio = AEGIS_PASSIVE_SHIELD_RATIO,
): number {
  return clamp(
    currentShield + maxShield * ratio,
    0,
    maxShield,
  );
}
