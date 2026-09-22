import type { GradeId } from "../grades";

export const RELIC_IDS = [
  "first-light-seed",
  "storm-script",
  "frost-rhythm",
  "giant-word-lens",
  "mirror-vow",
  "cosmic-conductor",
] as const;

export type RelicId = (typeof RELIC_IDS)[number];

export type RelicEffectContribution = {
  firstWordHullRatio?: number;
  perfectWordChainRatio?: number;
  perfectWordChainTargets?: number;
  streakFreezeInterval?: number;
  streakFreezeSeconds?: number;
  longBossWordMinLength?: number;
  longBossWordDamageMultiplier?: number;
  mistakeGuardCharges?: number;
  mistakeGuardShieldRatio?: number;
};

export type RelicDefinition = {
  id: RelicId;
  name: string;
  description: string;
  grade: GradeId;
  unlockStage: number;
  effects: RelicEffectContribution;
};

export const RELIC_REGISTRY: Record<RelicId, RelicDefinition> = {
  "first-light-seed": {
    id: "first-light-seed",
    name: "First Light Seed",
    description:
      "The first combat word completed each stage restores 5% max Hull.",
    grade: "silver",
    unlockStage: 1,
    effects: {
      firstWordHullRatio: 0.05,
    },
  },
  "storm-script": {
    id: "storm-script",
    name: "Storm Script",
    description:
      "Perfect enemy words arc into up to 3 nearby normal enemies and advance their typing damage.",
    grade: "silver",
    unlockStage: 21,
    effects: {
      perfectWordChainRatio: 0.22,
      perfectWordChainTargets: 3,
    },
  },
  "frost-rhythm": {
    id: "frost-rhythm",
    name: "Frost Rhythm",
    description:
      "Every 20-hit streak freezes nearby normal enemies for 1.4 seconds.",
    grade: "silver",
    unlockStage: 51,
    effects: {
      streakFreezeInterval: 20,
      streakFreezeSeconds: 1.4,
    },
  },
  "giant-word-lens": {
    id: "giant-word-lens",
    name: "Giant Word Lens",
    description:
      "Boss words with 8+ typed characters deal 25% more word damage.",
    grade: "gold",
    unlockStage: 101,
    effects: {
      longBossWordMinLength: 8,
      longBossWordDamageMultiplier: 1.25,
    },
  },
  "mirror-vow": {
    id: "mirror-vow",
    name: "Mirror Vow",
    description:
      "Once per stage, a typing mistake spends 12% max Shield instead of breaking streak and Power.",
    grade: "gold",
    unlockStage: 201,
    effects: {
      mistakeGuardCharges: 1,
      mistakeGuardShieldRatio: 0.12,
    },
  },
  "cosmic-conductor": {
    id: "cosmic-conductor",
    name: "Cosmic Conductor",
    description:
      "Perfect words arc farther and long boss words gain an additional damage bonus.",
    grade: "diamond",
    unlockStage: 401,
    effects: {
      perfectWordChainRatio: 0.12,
      perfectWordChainTargets: 1,
      longBossWordMinLength: 8,
      longBossWordDamageMultiplier: 1.12,
    },
  },
};

export function isRelicId(value: unknown): value is RelicId {
  return (
    typeof value === "string" &&
    (RELIC_IDS as readonly string[]).includes(value)
  );
}

export function getRelicDefinition(id: RelicId): RelicDefinition {
  return RELIC_REGISTRY[id];
}
