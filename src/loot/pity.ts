import { clamp } from "../logic";

export const LUCK_PITY_KEYS = [
  "golden",
  "treasure",
  "choice",
  "anomaly",
] as const;

export type LuckPityKey = (typeof LUCK_PITY_KEYS)[number];
export type LuckPityState = Record<LuckPityKey, number>;

export type LuckPityRoll = {
  triggered: boolean;
  chance: number;
  nextPity: number;
};

export function createLuckPityState(): LuckPityState {
  return {
    golden: 0,
    treasure: 0,
    choice: 0,
    anomaly: 0,
  };
}

export function sanitizeLuckPityState(value: unknown): LuckPityState {
  const result = createLuckPityState();
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return result;
  }

  const raw = value as Partial<Record<LuckPityKey, unknown>>;
  for (const key of LUCK_PITY_KEYS) {
    const counter = raw[key];
    if (typeof counter === "number" && Number.isFinite(counter)) {
      result[key] = Math.floor(clamp(counter, 0, 50));
    }
  }

  return result;
}

export function isValidLuckPityState(
  value: unknown,
): value is LuckPityState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const raw = value as LuckPityState;
  const keys = Object.keys(raw);
  if (
    keys.length !== LUCK_PITY_KEYS.length ||
    !LUCK_PITY_KEYS.every((key) => keys.includes(key))
  ) {
    return false;
  }

  return LUCK_PITY_KEYS.every(
    (key) =>
      Number.isInteger(raw[key]) &&
      raw[key] >= 0 &&
      raw[key] <= 50,
  );
}

export function luckAdjustedChance(
  baseChance: number,
  luck: number,
  pity: number,
  maxChance: number,
): number {
  const base = clamp(baseChance, 0, 1);
  if (base <= 0) return 0;

  const safeLuck = clamp(luck, 0, 100);
  const safePity = clamp(Math.floor(pity), 0, 50);
  const cap = clamp(maxChance, base, 1);

  const luckMultiplier = 1 + safeLuck * 0.008;
  const pityBonus = base * safePity * 0.085;

  return clamp(base * luckMultiplier + pityBonus, base, cap);
}

export function rollLuckPity(
  baseChance: number,
  luck: number,
  pity: number,
  maxChance: number,
  random = Math.random(),
): LuckPityRoll {
  const chance = luckAdjustedChance(
    baseChance,
    luck,
    pity,
    maxChance,
  );

  if (chance <= 0) {
    return {
      triggered: false,
      chance: 0,
      nextPity: Math.floor(clamp(pity, 0, 50)),
    };
  }

  const triggered = clamp(random, 0, 0.999999) < chance;
  return {
    triggered,
    chance,
    nextPity: triggered
      ? 0
      : Math.min(50, Math.floor(Math.max(0, pity)) + 1),
  };
}
