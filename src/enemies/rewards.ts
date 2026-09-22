export const ENEMY_REWARD_IDS = [
  "heal-burst",
  "shield-burst",
  "damage-up",
  "fire-rate-up",
  "freeze-nearby",
  "slow-nearby",
  "explosion-burst",
  "chain-lightning",
  "clear-normal",
  "clear-projectiles",
  "score-x2",
  "credits-x2",
  "luck-up",
  "cooldown-charge",
  "energy-burst",
  "overdrive-charge",
] as const;

export type EnemyRewardId = (typeof ENEMY_REWARD_IDS)[number];

export type EnemyRewardCategory =
  | "sustain"
  | "offensive"
  | "control"
  | "burst"
  | "economy"
  | "resource";

export type EnemyRewardDefinition = {
  id: EnemyRewardId;
  category: EnemyRewardCategory;
  marker: string;
};

export const ENEMY_REWARD_DEFINITIONS: Record<
  EnemyRewardId,
  EnemyRewardDefinition
> = {
  "heal-burst": {
    id: "heal-burst",
    category: "sustain",
    marker: "heart",
  },
  "shield-burst": {
    id: "shield-burst",
    category: "sustain",
    marker: "shield",
  },
  "damage-up": {
    id: "damage-up",
    category: "offensive",
    marker: "sword",
  },
  "fire-rate-up": {
    id: "fire-rate-up",
    category: "offensive",
    marker: "lightning",
  },
  "freeze-nearby": {
    id: "freeze-nearby",
    category: "control",
    marker: "snowflake",
  },
  "slow-nearby": {
    id: "slow-nearby",
    category: "control",
    marker: "clock",
  },
  "explosion-burst": {
    id: "explosion-burst",
    category: "burst",
    marker: "burst",
  },
  "chain-lightning": {
    id: "chain-lightning",
    category: "burst",
    marker: "lightning",
  },
  "clear-normal": {
    id: "clear-normal",
    category: "burst",
    marker: "nova",
  },
  "clear-projectiles": {
    id: "clear-projectiles",
    category: "burst",
    marker: "shield-star",
  },
  "score-x2": {
    id: "score-x2",
    category: "economy",
    marker: "star-x2",
  },
  "credits-x2": {
    id: "credits-x2",
    category: "economy",
    marker: "coin-x2",
  },
  "luck-up": {
    id: "luck-up",
    category: "economy",
    marker: "luck-star",
  },
  "cooldown-charge": {
    id: "cooldown-charge",
    category: "resource",
    marker: "clock-bolt",
  },
  "energy-burst": {
    id: "energy-burst",
    category: "resource",
    marker: "energy",
  },
  "overdrive-charge": {
    id: "overdrive-charge",
    category: "resource",
    marker: "power",
  },
};

export function isEnemyRewardId(value: unknown): value is EnemyRewardId {
  return (
    typeof value === "string" &&
    ENEMY_REWARD_IDS.includes(value as EnemyRewardId)
  );
}
