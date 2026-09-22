import type { StatusId } from "../status/engine";
import type { EnemyRewardId } from "./rewards";

type RewardStatusId = Extract<StatusId, "lucky" | "overcharged">;

export type EnemyRewardSystems = {
  restoreHull: (ratio: number) => void;
  restoreShield: (ratio: number) => void;
  applyPlayerStatus: (id: RewardStatusId, duration: number) => void;
  setFireRateBoost: (duration: number) => void;
  freezeNearby: (duration: number) => void;
  slowNearby: (duration: number) => void;
  damageNearby: (power: number) => void;
  chainDamage: (power: number) => void;
  clearNormalEnemies: () => void;
  clearProjectiles: () => void;
  setScoreMultiplier: (multiplier: number, duration: number) => void;
  setCreditsMultiplier: (multiplier: number, duration: number) => void;
  reduceSkillCooldowns: (seconds: number) => void;
  restoreEnergy: (ratio: number) => void;
  addPower: (amount: number) => void;
};

export type EnemyRewardEffect = {
  id: EnemyRewardId;
  label: string;
};

function positive(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

export function applyEnemyRewardEffect(
  id: EnemyRewardId,
  systems: EnemyRewardSystems,
  power?: number,
): EnemyRewardEffect {
  if (id === "heal-burst") {
    systems.restoreHull(positive(power, 0.15));
    return { id, label: "HEAL" };
  }

  if (id === "shield-burst") {
    systems.restoreShield(positive(power, 0.22));
    return { id, label: "SHIELD" };
  }

  if (id === "damage-up") {
    systems.applyPlayerStatus("overcharged", positive(power, 8));
    return { id, label: "DAMAGE UP" };
  }

  if (id === "fire-rate-up") {
    systems.setFireRateBoost(positive(power, 8));
    return { id, label: "FIRE RATE" };
  }

  if (id === "freeze-nearby") {
    systems.freezeNearby(positive(power, 3));
    return { id, label: "FREEZE" };
  }

  if (id === "slow-nearby") {
    systems.slowNearby(positive(power, 6));
    return { id, label: "SLOW" };
  }

  if (id === "explosion-burst") {
    systems.damageNearby(positive(power, 0.35));
    return { id, label: "BURST" };
  }

  if (id === "chain-lightning") {
    systems.chainDamage(positive(power, 0.25));
    return { id, label: "CHAIN" };
  }

  if (id === "clear-normal") {
    systems.clearNormalEnemies();
    return { id, label: "NOVA" };
  }

  if (id === "clear-projectiles") {
    systems.clearProjectiles();
    return { id, label: "CLEAR" };
  }

  if (id === "score-x2") {
    systems.setScoreMultiplier(2, positive(power, 10));
    return { id, label: "SCORE x2" };
  }

  if (id === "credits-x2") {
    systems.setCreditsMultiplier(2, positive(power, 10));
    return { id, label: "CREDITS x2" };
  }

  if (id === "luck-up") {
    systems.applyPlayerStatus("lucky", positive(power, 15));
    return { id, label: "LUCK" };
  }

  if (id === "cooldown-charge") {
    systems.reduceSkillCooldowns(positive(power, 4));
    return { id, label: "COOLDOWN" };
  }

  if (id === "energy-burst") {
    systems.restoreEnergy(positive(power, 0.3));
    return { id, label: "ENERGY" };
  }

  systems.addPower(positive(power, 24));
  return { id, label: "POWER" };
}
