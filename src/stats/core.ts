export const CORE_STAT_KEYS = [
  "hull",
  "shield",
  "firepower",
  "armor",
  "energy",
  "reactor",
  "focus",
  "ward",
  "luck",
  "salvage",
] as const;

export type CoreStatKey = (typeof CORE_STAT_KEYS)[number];

export type CoreStats = Record<CoreStatKey, number>;

export type StatBonus = Partial<Record<CoreStatKey, number>>;

export type EffectiveStatInput = {
  base: CoreStats;
  character?: StatBonus;
  level?: StatBonus;
  equipment?: StatBonus;
  talent?: StatBonus;
  temporary?: StatBonus;
  stage?: StatBonus;
};

export const ZERO_CORE_STATS: CoreStats = {
  hull: 0,
  shield: 0,
  firepower: 0,
  armor: 0,
  energy: 0,
  reactor: 0,
  focus: 0,
  ward: 0,
  luck: 0,
  salvage: 0,
};

export function createCoreStats(
  values: StatBonus = {},
): CoreStats {
  const result = { ...ZERO_CORE_STATS };

  for (const key of CORE_STAT_KEYS) {
    const value = values[key];
    if (value !== undefined && Number.isFinite(value)) {
      result[key] = value;
    }
  }

  return result;
}

export function addStatBonus(
  target: CoreStats,
  bonus: StatBonus | undefined,
): void {
  if (bonus === undefined) return;

  for (const key of CORE_STAT_KEYS) {
    const value = bonus[key];
    if (value !== undefined && Number.isFinite(value)) {
      target[key] += value;
    }
  }
}

export function calculateEffectiveStats(
  input: EffectiveStatInput,
): CoreStats {
  const result = createCoreStats(input.base);

  addStatBonus(result, input.character);
  addStatBonus(result, input.level);
  addStatBonus(result, input.equipment);
  addStatBonus(result, input.talent);
  addStatBonus(result, input.temporary);
  addStatBonus(result, input.stage);

  for (const key of CORE_STAT_KEYS) {
    result[key] = Math.max(0, result[key]);
  }

  return result;
}
