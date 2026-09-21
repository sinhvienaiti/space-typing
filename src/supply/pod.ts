import { clamp } from "../logic";
import type { PlayerResources } from "../stats/player";
import type { VocabularyEntry } from "../types";

export const SUPPLY_REWARDS = [
  "hull",
  "shield",
  "energy",
  "power",
] as const;

export type SupplyReward = (typeof SUPPLY_REWARDS)[number];

export type SupplyPod = {
  entry: VocabularyEntry;
  typed: number;
  reward: SupplyReward;
  x: number;
  y: number;
  speed: number;
  age: number;
  lifetime: number;
};

export type SupplyRewardResult = {
  resources: PlayerResources;
  power: number;
};

export function rollSupplyReward(random = Math.random()): SupplyReward {
  const roll = clamp(random, 0, 0.999999);
  if (roll < 0.22) return "hull";
  if (roll < 0.5) return "shield";
  if (roll < 0.76) return "energy";
  return "power";
}

export function supplyRewardLabel(reward: SupplyReward): string {
  if (reward === "hull") return "REPAIR";
  if (reward === "shield") return "SHIELD";
  if (reward === "energy") return "ENERGY";
  return "OVERDRIVE";
}

export function applySupplyReward(
  reward: SupplyReward,
  resources: PlayerResources,
  caps: PlayerResources,
  power: number,
): SupplyRewardResult {
  const next = { ...resources };
  let nextPower = clamp(power, 0, 100);

  if (reward === "hull") {
    next.hull = clamp(next.hull + caps.hull * 0.24, 0, caps.hull);
  } else if (reward === "shield") {
    next.shield = clamp(
      next.shield + caps.shield * 0.35,
      0,
      caps.shield,
    );
  } else if (reward === "energy") {
    next.energy = clamp(
      next.energy + caps.energy * 0.4,
      0,
      caps.energy,
    );
  } else {
    nextPower = clamp(nextPower + 28, 0, 100);
  }

  return {
    resources: next,
    power: nextPower,
  };
}
