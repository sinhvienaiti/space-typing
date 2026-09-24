import { clamp } from "../logic";
import type { PlayerResources } from "../stats/player";

export type RecoveryItemId =
  | "repair-kit"
  | "shield-cell"
  | "energy-cell";

export const COMBAT_CONSUMABLE_IDS = [
  "repair-kit",
  "shield-cell",
  "energy-cell",
  "nova-bomb",
  "emp-charge",
  "time-crystal",
  "word-bomb",
  "supply-beacon",
  "lucky-dice",
] as const;

export type CombatConsumableId =
  (typeof COMBAT_CONSUMABLE_IDS)[number];

export const EMP_CHARGE_DELAY_SECONDS = 3.5;
export const TIME_CRYSTAL_DURATION_SECONDS = 5;
export const LUCKY_DICE_PITY_BOOST = 6;

export type ResourceCaps = {
  hull: number;
  shield: number;
  energy: number;
};

export type ConsumableResult = {
  resources: PlayerResources;
  applied: boolean;
  restored: number;
};

export function isRecoveryItemId(
  value: string,
): value is RecoveryItemId {
  return (
    value === "repair-kit" ||
    value === "shield-cell" ||
    value === "energy-cell"
  );
}

export function isCombatConsumableId(
  value: string,
): value is CombatConsumableId {
  return COMBAT_CONSUMABLE_IDS.includes(
    value as CombatConsumableId,
  );
}

export function useRecoveryItem(
  id: RecoveryItemId,
  resources: PlayerResources,
  caps: ResourceCaps,
): ConsumableResult {
  const next = { ...resources };

  if (id === "repair-kit") {
    const before = next.hull;
    next.hull = clamp(
      next.hull + caps.hull * 0.35,
      0,
      caps.hull,
    );
    return {
      resources: next,
      applied: next.hull > before,
      restored: next.hull - before,
    };
  }

  if (id === "shield-cell") {
    const before = next.shield;
    next.shield = clamp(
      next.shield + caps.shield * 0.5,
      0,
      caps.shield,
    );
    return {
      resources: next,
      applied: next.shield > before,
      restored: next.shield - before,
    };
  }

  const before = next.energy;
  next.energy = clamp(
    next.energy + caps.energy * 0.5,
    0,
    caps.energy,
  );
  return {
    resources: next,
    applied: next.energy > before,
    restored: next.energy - before,
  };
}
