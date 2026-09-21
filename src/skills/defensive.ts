import { clamp } from "../logic";
import type { PlayerResources } from "../stats/player";
import type { SkillDefinition } from "./engine";

export const DEFENSIVE_SKILL_IDS = [
  "barrier",
  "reflect-field",
  "time-shell",
  "emergency-repair",
  "guardian-drone",
] as const;

export type DefensiveSkillId =
  (typeof DEFENSIVE_SKILL_IDS)[number];

export const DEFENSIVE_SKILLS: readonly SkillDefinition[] = [
  {
    id: "barrier",
    name: "Barrier",
    energyCost: 28,
    cooldown: 9,
    charges: 4,
    perStageLimit: 4,
    typingCondition: { minStreak: 8 },
  },
  {
    id: "reflect-field",
    name: "Reflect",
    energyCost: 34,
    cooldown: 13,
    charges: 3,
    perStageLimit: 3,
    typingCondition: { minAccuracy: 94 },
  },
  {
    id: "time-shell",
    name: "Time Shell",
    energyCost: 40,
    cooldown: 18,
    charges: 2,
    perStageLimit: 2,
    typingCondition: { minStreak: 15 },
  },
  {
    id: "emergency-repair",
    name: "Repair",
    energyCost: 45,
    cooldown: 24,
    charges: 2,
    perStageLimit: 2,
  },
  {
    id: "guardian-drone",
    name: "Guardian",
    energyCost: 36,
    cooldown: 20,
    charges: 2,
    perStageLimit: 2,
    typingCondition: { minAccuracy: 90 },
  },
];

export function isDefensiveSkillId(
  value: string,
): value is DefensiveSkillId {
  return (DEFENSIVE_SKILL_IDS as readonly string[]).includes(value);
}

export type BarrierDamageResult = {
  barrierHp: number;
  damageRemaining: number;
  absorbed: number;
};

export function absorbBarrierDamage(
  barrierHp: number,
  rawDamage: number,
): BarrierDamageResult {
  const safeBarrier = Math.max(0, barrierHp);
  const safeDamage = Math.max(0, rawDamage);
  const absorbed = Math.min(safeBarrier, safeDamage);

  return {
    barrierHp: safeBarrier - absorbed,
    damageRemaining: safeDamage - absorbed,
    absorbed,
  };
}

export function emergencyRepair(
  resources: PlayerResources,
  caps: PlayerResources,
): PlayerResources {
  return {
    hull: clamp(
      resources.hull + caps.hull * 0.3,
      0,
      caps.hull,
    ),
    shield: clamp(
      resources.shield + caps.shield * 0.5,
      0,
      caps.shield,
    ),
    energy: clamp(resources.energy, 0, caps.energy),
  };
}
