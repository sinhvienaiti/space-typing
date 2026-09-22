import type { StageRole } from "../campaign/types";
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

export type ExpansionCurrencyReward = ExpansionCurrencyState;

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

export function addExpansionCurrencyReward(
  currentInput: ExpansionCurrencyState,
  rewardInput: Partial<ExpansionCurrencyReward>,
): ExpansionCurrencyState {
  const current = sanitizeExpansionCurrencyState(currentInput);
  const reward = sanitizeExpansionCurrencyState({
    alloy: rewardInput.alloy ?? 0,
    starCrystal: rewardInput.starCrystal ?? 0,
    quantumCore: rewardInput.quantumCore ?? 0,
  });

  return {
    alloy: sanitizeAmount(current.alloy + reward.alloy),
    starCrystal: sanitizeAmount(
      current.starCrystal + reward.starCrystal,
    ),
    quantumCore: sanitizeAmount(
      current.quantumCore + reward.quantumCore,
    ),
  };
}

export function stageClearExpansionCurrencyReward(
  stage: number,
  role: StageRole,
  accuracy: number,
): ExpansionCurrencyReward {
  const safeStage = Math.max(1, Math.min(1000, Math.floor(stage)));
  const safeAccuracy = clamp(accuracy, 0, 100);
  const galaxyBonus = Math.floor((safeStage - 1) / 100);

  const roleAlloy =
    role === "major-boss"
      ? 10
      : role === "boss"
        ? 6
        : role === "mini-boss"
          ? 4
          : role === "gauntlet"
            ? 4
            : role === "elite"
              ? 3
              : role === "special" || role === "hazard"
                ? 2
                : 1;

  const starCrystal =
    role === "major-boss"
      ? 4
      : role === "boss"
        ? 2
        : role === "mini-boss"
          ? 1
          : role === "special" &&
              safeStage >= 100 &&
              safeAccuracy >= 99
            ? 1
            : 0;

  const quantumCore =
    role === "major-boss"
      ? safeStage >= 1000
        ? 2
        : 1
      : 0;

  return {
    alloy: roleAlloy + galaxyBonus,
    starCrystal,
    quantumCore,
  };
}

export function expansionCurrencyRewardText(
  reward: ExpansionCurrencyReward,
): string {
  const parts: string[] = [];
  if (reward.alloy > 0) {
    parts.push("+" + reward.alloy.toLocaleString() + " Alloy");
  }
  if (reward.starCrystal > 0) {
    parts.push(
      "+" + reward.starCrystal.toLocaleString() + " Star Crystal",
    );
  }
  if (reward.quantumCore > 0) {
    parts.push(
      "+" + reward.quantumCore.toLocaleString() + " Quantum Core",
    );
  }
  return parts.join(" · ");
}
