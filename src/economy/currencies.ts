import { clamp } from "../logic";

export const EXPANSION_CURRENCY_IDS = [
  "alloy",
  "star-crystal",
  "quantum-core",
] as const;

export type ExpansionCurrencyId =
  (typeof EXPANSION_CURRENCY_IDS)[number];

export type ExpansionCurrencyState = {
  alloy: number;
  starCrystal: number;
  quantumCore: number;
};

export const MAX_EXPANSION_CURRENCY = 999_999_999;

function sanitizeAmount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.floor(clamp(value, 0, MAX_EXPANSION_CURRENCY));
}

export function createExpansionCurrencyState(): ExpansionCurrencyState {
  return {
    alloy: 0,
    starCrystal: 0,
    quantumCore: 0,
  };
}

export function sanitizeExpansionCurrencyState(
  value: unknown,
): ExpansionCurrencyState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return createExpansionCurrencyState();
  }

  const raw = value as Record<string, unknown>;
  return {
    alloy: sanitizeAmount(raw.alloy),
    starCrystal: sanitizeAmount(raw.starCrystal),
    quantumCore: sanitizeAmount(raw.quantumCore),
  };
}

export function isValidExpansionCurrencyState(
  value: unknown,
): value is ExpansionCurrencyState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const raw = value as Record<string, unknown>;
  return [raw.alloy, raw.starCrystal, raw.quantumCore].every(
    (amount) =>
      typeof amount === "number" &&
      Number.isInteger(amount) &&
      amount >= 0 &&
      amount <= MAX_EXPANSION_CURRENCY,
  );
}
