import { clamp } from "../logic";
import type { StageConfig } from "../campaign/types";

export const STAGE_RANDOM_EVENT_IDS = [
  "fast-enemies",
  "armored-enemies",
  "low-shield",
  "double-supply",
  "projectile-storm",
] as const;

export type StageRandomEventId =
  (typeof STAGE_RANDOM_EVENT_IDS)[number];

export type StageRandomEventTone = "hazard" | "mixed" | "benefit";

export type StageRandomEventEffect = {
  enemySpeedMultiplier?: number;
  extraEnemyLayers?: number;
  startingShieldMultiplier?: number;
  supplyMultiplier?: number;
  projectilePressureMultiplier?: number;
};

export type StageRandomEventDefinition = {
  id: StageRandomEventId;
  name: string;
  description: string;
  tone: StageRandomEventTone;
  minStage: number;
  weight: number;
  effect: StageRandomEventEffect;
};

export const STAGE_RANDOM_EVENT_REGISTRY: Record<
  StageRandomEventId,
  StageRandomEventDefinition
> = {
  "fast-enemies": {
    id: "fast-enemies",
    name: "Fast Enemies",
    description: "Hostile ships cross the arena 18% faster.",
    tone: "hazard",
    minStage: 30,
    weight: 1.15,
    effect: { enemySpeedMultiplier: 1.18 },
  },
  "armored-enemies": {
    id: "armored-enemies",
    name: "Armored Enemies",
    description: "Standard enemies gain one additional typing layer.",
    tone: "hazard",
    minStage: 40,
    weight: 0.9,
    effect: { extraEnemyLayers: 1 },
  },
  "low-shield": {
    id: "low-shield",
    name: "Low Shield",
    description: "The stage starts with only 55% of maximum Shield.",
    tone: "hazard",
    minStage: 50,
    weight: 0.72,
    effect: { startingShieldMultiplier: 0.55 },
  },
  "double-supply": {
    id: "double-supply",
    name: "Double Supply",
    description: "Supply Pod opportunities are doubled for this stage.",
    tone: "benefit",
    minStage: 30,
    weight: 0.78,
    effect: { supplyMultiplier: 2 },
  },
  "projectile-storm": {
    id: "projectile-storm",
    name: "Projectile Storm",
    description: "Hostile projectile pressure is increased by 25%.",
    tone: "hazard",
    minStage: 80,
    weight: 0.62,
    effect: { projectilePressureMultiplier: 1.25 },
  },
};

export type StageRandomEventModifiers = {
  enemySpeedMultiplier: number;
  extraEnemyLayers: number;
  startingShieldMultiplier: number;
  supplyMultiplier: number;
  projectilePressureMultiplier: number;
};

export function createStageEventModifiers(): StageRandomEventModifiers {
  return {
    enemySpeedMultiplier: 1,
    extraEnemyLayers: 0,
    startingShieldMultiplier: 1,
    supplyMultiplier: 1,
    projectilePressureMultiplier: 1,
  };
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function eventChance(stage: number, slot: number): number {
  const progressBonus = Math.min(0.12, Math.max(0, stage - 30) * 0.0002);
  if (slot === 0) return 0.34 + progressBonus;
  if (slot === 1) return 0.17 + progressBonus * 0.6;
  return 0.08 + progressBonus * 0.35;
}

function weightedPick(
  candidates: readonly StageRandomEventDefinition[],
  luck: number,
  random: () => number,
): StageRandomEventDefinition | null {
  if (candidates.length === 0) return null;

  const safeLuck = clamp(luck, 0, 100);
  const weights = candidates.map((event) => {
    if (event.tone === "benefit") {
      return event.weight * (1 + safeLuck * 0.006);
    }
    return event.weight;
  });
  const total = weights.reduce((sum, value) => sum + value, 0);
  let cursor = random() * total;

  for (let index = 0; index < candidates.length; index += 1) {
    cursor -= weights[index] ?? 0;
    if (cursor < 0) return candidates[index] ?? null;
  }

  return candidates[candidates.length - 1] ?? null;
}

export function scheduleStageRandomEvents(
  stage: StageConfig,
  luck: number,
  random: (() => number) | null = null,
): StageRandomEventDefinition[] {
  if (stage.modifierSlots <= 0) return [];

  const nextRandom =
    random ?? seededRandom(stage.seed ^ 0x51a9e4d3);
  const selected: StageRandomEventDefinition[] = [];
  const limit = Math.min(3, stage.modifierSlots);

  for (let slot = 0; slot < limit; slot += 1) {
    if (nextRandom() >= eventChance(stage.stage, slot)) break;

    const candidates = STAGE_RANDOM_EVENT_IDS
      .map((id) => STAGE_RANDOM_EVENT_REGISTRY[id])
      .filter(
        (event) =>
          stage.stage >= event.minStage &&
          !selected.some((selectedEvent) => selectedEvent.id === event.id),
      );
    const event = weightedPick(candidates, luck, nextRandom);
    if (event === null) break;
    selected.push(event);
  }

  return selected;
}

export function combineStageEventEffects(
  events: readonly StageRandomEventDefinition[],
): StageRandomEventModifiers {
  const result = createStageEventModifiers();

  for (const event of events) {
    const effect = event.effect;
    result.enemySpeedMultiplier *= effect.enemySpeedMultiplier ?? 1;
    result.extraEnemyLayers += effect.extraEnemyLayers ?? 0;
    result.startingShieldMultiplier *=
      effect.startingShieldMultiplier ?? 1;
    result.supplyMultiplier *= effect.supplyMultiplier ?? 1;
    result.projectilePressureMultiplier *=
      effect.projectilePressureMultiplier ?? 1;
  }

  return result;
}
