import type { DuelActionCategory } from "./model";
import type {
  DuelHazardLevel,
  DuelRoomModifier,
  DuelSpecialFrequency,
} from "./room";

export type DuelRuntimeRuleInput = {
  matchLengthSeconds: number;
  hazardLevel: DuelHazardLevel;
  mysteryFrequency: DuelSpecialFrequency;
  fateFrequency: DuelSpecialFrequency;
  modifier: DuelRoomModifier;
};

export type DuelRuntimeTuning = {
  categoryMultiplier: Partial<
    Readonly<Record<DuelActionCategory, number>>
  >;
  hazardIntervalScale: number;
  hazardPressureScale: number;
  escalationSeconds: number;
  maxHull?: number;
  maxShield?: number;
  startingShield?: number;
};

function specialFrequencyMultiplier(
  value: DuelSpecialFrequency,
): number {
  switch (value) {
    case "off":
      return 0;
    case "low":
      return 0.55;
    case "standard":
      return 1;
    case "high":
      return 1.65;
  }
}

function hazardLevelTuning(
  value: DuelHazardLevel,
): { interval: number; pressure: number } {
  switch (value) {
    case "low":
      return { interval: 1.35, pressure: 0.8 };
    case "standard":
      return { interval: 1, pressure: 1 };
    case "high":
      return { interval: 0.72, pressure: 1.18 };
  }
}

export function combineDuelCategoryMultipliers(
  ...sources: ReadonlyArray<
    Partial<Readonly<Record<DuelActionCategory, number>>>
  >
): Partial<Readonly<Record<DuelActionCategory, number>>> {
  const result: Partial<Record<DuelActionCategory, number>> = {};
  const categories: readonly DuelActionCategory[] = [
    "attack",
    "defense",
    "support",
    "tactical",
    "fate",
    "mystery",
  ];
  for (const category of categories) {
    let value = 1;
    let seen = false;
    for (const source of sources) {
      const next = source[category];
      if (next === undefined || !Number.isFinite(next)) continue;
      value *= Math.max(0, next);
      seen = true;
    }
    if (seen) result[category] = value;
  }
  return result;
}

export function duelRuntimeTuning(
  input: DuelRuntimeRuleInput,
): DuelRuntimeTuning {
  const hazard = hazardLevelTuning(input.hazardLevel);
  const categoryMultiplier: Partial<
    Record<DuelActionCategory, number>
  > = {
    fate: specialFrequencyMultiplier(input.fateFrequency),
    mystery: specialFrequencyMultiplier(input.mysteryFrequency),
  };
  let hazardIntervalScale = hazard.interval;
  let hazardPressureScale = hazard.pressure;
  let escalationSeconds = Math.max(1, input.matchLengthSeconds);
  let maxHull: number | undefined;
  let maxShield: number | undefined;
  let startingShield: number | undefined;

  switch (input.modifier) {
    case "standard":
      break;
    case "high-hazard":
      hazardIntervalScale *= 0.75;
      hazardPressureScale *= 1.15;
      break;
    case "mystery-storm":
      categoryMultiplier.mystery =
        (categoryMultiplier.mystery ?? 1) * 1.9;
      categoryMultiplier.fate =
        (categoryMultiplier.fate ?? 1) * 1.08;
      break;
    case "weapon-frenzy":
      categoryMultiplier.attack = 1.5;
      break;
    case "support-rich":
      categoryMultiplier.support = 1.5;
      categoryMultiplier.defense = 1.08;
      break;
    case "sudden-death":
      categoryMultiplier.attack = 1.25;
      categoryMultiplier.defense = 0.72;
      categoryMultiplier.support = 0.75;
      maxHull = 75;
      maxShield = 20;
      startingShield = 10;
      break;
    case "cataclysm-rush":
      escalationSeconds = Math.max(
        1,
        input.matchLengthSeconds * 0.7,
      );
      hazardIntervalScale *= 0.9;
      hazardPressureScale *= 1.08;
      break;
  }

  return {
    categoryMultiplier,
    hazardIntervalScale: Math.max(0.5, hazardIntervalScale),
    hazardPressureScale: Math.max(0.5, hazardPressureScale),
    escalationSeconds,
    ...(maxHull === undefined ? {} : { maxHull }),
    ...(maxShield === undefined ? {} : { maxShield }),
    ...(startingShield === undefined ? {} : { startingShield }),
  };
}
