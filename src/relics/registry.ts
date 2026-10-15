import type { GradeId } from "../grades";

export const RELIC_IDS = [
  "first-light-seed",
  "storm-script",
  "frost-rhythm",
  "giant-word-lens",
  "mirror-vow",
  "cosmic-conductor",
  "precision-lens",
  "perfect-capacitor",
  "combo-coil",
  "heavy-core",
  "syllable-forge",
  "echo-core",
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
  perfectWordEnergy?: number;
  perfectWordPower?: number;
  perfectWordInterval?: number;
  perfectWordIntervalPower?: number;
  longWordShield?: number;
  longWordPower?: number;
  recoveryPerfectEnergy?: number;
};

export type RelicDefinition = {
  id: RelicId;
  name: string;
  description: string;
  grade: GradeId;
  unlockStage: number;
  runOnly?: boolean;
  artFile?: string;
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
  "precision-lens": {
    id: "precision-lens",
    name: "Precision Lens",
    description:
      "Perfect direct-typed words restore up to 2 Energy, scaled by meaningful typed length.",
    grade: "silver",
    unlockStage: 1,
    runOnly: true,
    artFile: "icons/relics/relic-precision-lens.webp",
    effects: {
      perfectWordEnergy: 2,
    },
  },
  "perfect-capacitor": {
    id: "perfect-capacitor",
    name: "Perfect Capacitor",
    description:
      "Perfect direct-typed words add up to 1.2 Power, scaled by meaningful typed length.",
    grade: "silver",
    unlockStage: 1,
    runOnly: true,
    artFile: "icons/relics/relic-perfect-capacitor.webp",
    effects: {
      perfectWordPower: 1.2,
    },
  },
  "combo-coil": {
    id: "combo-coil",
    name: "Combo Coil",
    description:
      "Every 5 perfect completed words releases a controlled +6 Power pulse.",
    grade: "gold",
    unlockStage: 1,
    runOnly: true,
    artFile: "icons/relics/relic-combo-coil.webp",
    effects: {
      perfectWordInterval: 5,
      perfectWordIntervalPower: 6,
    },
  },
  "heavy-core": {
    id: "heavy-core",
    name: "Heavy Core",
    description:
      "Words with 8+ meaningful typed letters restore 4 Shield.",
    grade: "gold",
    unlockStage: 1,
    runOnly: true,
    artFile: "icons/relics/relic-heavy-core.webp",
    effects: {
      longWordShield: 4,
    },
  },
  "syllable-forge": {
    id: "syllable-forge",
    name: "Syllable Forge",
    description:
      "Words with 8+ meaningful typed letters forge +3 Power.",
    grade: "gold",
    unlockStage: 1,
    runOnly: true,
    artFile: "icons/relics/relic-syllable-forge.webp",
    effects: {
      longWordPower: 3,
    },
  },
  "echo-core": {
    id: "echo-core",
    name: "Echo Core",
    description:
      "After a typing mistake, the next perfect completed word restores 5 Energy.",
    grade: "diamond",
    unlockStage: 1,
    runOnly: true,
    artFile: "icons/relics/relic-echo-core.webp",
    effects: {
      recoveryPerfectEnergy: 5,
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
