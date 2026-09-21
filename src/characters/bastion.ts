import { clamp } from "../logic";
import type { SkillDefinition } from "../skills/engine";

export const BASTION_ACTIVE_SKILL_ID = "bastion-guardian-matrix" as const;

export const BASTION_ACTIVE_SKILL: SkillDefinition = {
  id: BASTION_ACTIVE_SKILL_ID,
  name: "Guardian Matrix",
  energyCost: 32,
  cooldown: 15,
  charges: null,
  perStageLimit: null,
  typingCondition: { minAccuracy: 90 },
};

export const BASTION_MATRIX_DURATION = 8;
export const BASTION_MATRIX_BLOCKS = 4;
export const BASTION_RECYCLE_SHIELD_RATIO = 0.08;
export const BASTION_SANCTUARY_DURATION = 10;
export const BASTION_SANCTUARY_BLOCKS = 7;
export const BASTION_SANCTUARY_SHIELD_RATIO = 0.4;

export function recycleBastionShield(
  currentShield: number,
  maxShield: number,
  ratio = BASTION_RECYCLE_SHIELD_RATIO,
): number {
  return clamp(currentShield + maxShield * ratio, 0, maxShield);
}
