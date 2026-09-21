import { clamp } from "../logic";
import type { SkillDefinition } from "../skills/engine";

export const VOLT_ACTIVE_SKILL_ID = "volt-emp-burst" as const;

export const VOLT_ACTIVE_SKILL: SkillDefinition = {
  id: VOLT_ACTIVE_SKILL_ID,
  name: "EMP Burst",
  energyCost: 30,
  cooldown: 12,
  charges: null,
  perStageLimit: null,
  typingCondition: { minStreak: 6 },
};

export const VOLT_LONG_WORD_LENGTH = 7;
export const VOLT_EMP_DELAY = 3.5;
export const VOLT_THUNDER_TARGETS = 6;
export const VOLT_THUNDER_BOSS_RATIO = 0.07;

export function voltEnergyGain(wordLength: number): number {
  if (wordLength < VOLT_LONG_WORD_LENGTH) return 0;
  return 5 + Math.min(7, wordLength - VOLT_LONG_WORD_LENGTH);
}

export function restoreVoltEnergy(
  currentEnergy: number,
  maxEnergy: number,
  wordLength: number,
): number {
  return clamp(
    currentEnergy + voltEnergyGain(wordLength),
    0,
    maxEnergy,
  );
}
