import { applySkillRuntimeOverride } from "../admin/skill-runtime-policy";
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

export const BUNDLED_DEFENSIVE_SKILLS: readonly SkillDefinition[] = [
  {
    id: "barrier",
    name: "Hex Shield",
    description:
      "Raises a hexagonal energy dome for 7 s that absorbs incoming damage before it reaches the hull.",
    energyCost: 28,
    cooldown: 9,
    charges: 4,
    perStageLimit: 4,
    typingCondition: { minStreak: 8 },
  },
  {
    id: "reflect-field",
    name: "Mirror Field",
    description:
      "Prism shards orbit the ship for 4.5 s and send hostile shots back at whoever fired them.",
    energyCost: 34,
    cooldown: 13,
    charges: 3,
    perStageLimit: 3,
    typingCondition: { minAccuracy: 94 },
  },
  {
    id: "time-shell",
    name: "Stasis Field",
    description:
      "Bends local time for 5 s: enemies and their shots crawl at 42% speed while you keep typing at full speed.",
    energyCost: 40,
    cooldown: 18,
    charges: 2,
    perStageLimit: 2,
    typingCondition: { minStreak: 15 },
  },
  {
    id: "emergency-repair",
    name: "Nanite Repair",
    description:
      "A swarm of repair nanites rebuilds 30% of the Hull and 50% of the Shield.",
    energyCost: 45,
    cooldown: 24,
    charges: 2,
    perStageLimit: 2,
  },
  {
    id: "guardian-drone",
    name: "Sentinel Drones",
    description:
      "Launches 3 escort drones for 12 s; each one intercepts a hit that would have reached the ship.",
    energyCost: 36,
    cooldown: 20,
    charges: 2,
    perStageLimit: 2,
    typingCondition: { minAccuracy: 90 },
  },
];

export const DEFENSIVE_SKILLS: readonly SkillDefinition[] =
  BUNDLED_DEFENSIVE_SKILLS.map((definition) => applySkillRuntimeOverride(definition));

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
  effectScale = 1,
): PlayerResources {
  const scale = clamp(
    Number.isFinite(effectScale) ? effectScale : 1,
    1,
    1.5,
  );

  return {
    hull: clamp(
      resources.hull + caps.hull * 0.3 * scale,
      0,
      caps.hull,
    ),
    shield: clamp(
      resources.shield + caps.shield * 0.5 * scale,
      0,
      caps.shield,
    ),
    energy: clamp(resources.energy, 0, caps.energy),
  };
}
