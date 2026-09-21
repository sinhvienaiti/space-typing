import { clamp } from "../logic";
import type { SkillDefinition } from "../skills/engine";

export const FORTUNE_ACTIVE_SKILL_ID = "fortune-lucky-star" as const;

export const FORTUNE_ACTIVE_SKILL: SkillDefinition = {
  id: FORTUNE_ACTIVE_SKILL_ID,
  name: "Lucky Star",
  energyCost: 24,
  cooldown: 15,
  charges: null,
  perStageLimit: null,
  typingCondition: { minAccuracy: 92 },
};

export const FORTUNE_ACTIVE_POWER_GAIN = 28;
export const FORTUNE_ACTIVE_SHIELD_RATIO = 0.12;
export const FORTUNE_JACKPOT_SHIELD_RATIO = 0.45;
export const FORTUNE_JACKPOT_DURATION = 6;

export function fortunePower(currentPower: number): number {
  return clamp(currentPower + FORTUNE_ACTIVE_POWER_GAIN, 0, 100);
}
