import { clamp } from "../logic";
import type { SkillDefinition } from "../skills/engine";

export const CELESTIAL_ACTIVE_SKILL_ID = "celestial-stance" as const;

export const CELESTIAL_ACTIVE_SKILL: SkillDefinition = {
  id: CELESTIAL_ACTIVE_SKILL_ID,
  name: "Celestial Stance",
  energyCost: 30,
  cooldown: 13,
  charges: null,
  perStageLimit: null,
  typingCondition: { minAccuracy: 94 },
};

export const CELESTIAL_CHARGE_PERFECT_WORD = 12;
export const CELESTIAL_STANCE_CHARGE_COST = 30;
export const CELESTIAL_STANCE_DURATION = 5;
export const CELESTIAL_STARFALL_TARGETS = 6;
export const CELESTIAL_STARFALL_BOSS_RATIO = 0.07;

export function addCelestialCharge(
  currentCharge: number,
  perfectWord: boolean,
): number {
  if (!perfectWord) return clamp(currentCharge, 0, 100);
  return clamp(currentCharge + CELESTIAL_CHARGE_PERFECT_WORD, 0, 100);
}

export function spendCelestialCharge(
  currentCharge: number,
  amount = CELESTIAL_STANCE_CHARGE_COST,
): number {
  return clamp(currentCharge - amount, 0, 100);
}
