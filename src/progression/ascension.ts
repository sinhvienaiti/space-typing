import type {
  CampaignProgress,
  DifficultyProfile,
} from "../campaign/types";
import { MAX_CAMPAIGN_STAGE } from "../campaign/stage";
import {
  createExpansionCurrencyState,
  type ExpansionCurrencyReward,
} from "../economy/currencies";

export const MAX_ASCENSION_TIER = 10;

export const ASCENSION_BOSS_MUTATION_IDS = [
  "fortified-core",
  "rapid-cycle",
  "projectile-echo",
  "apex-crown",
] as const;

export type AscensionBossMutationId =
  (typeof ASCENSION_BOSS_MUTATION_IDS)[number];

export type AscensionState = {
  version: 1;
  highestUnlockedTier: number;
  selectedTier: number;
  completedTiers: number[];
  frontierByTier: Record<string, number>;
};

export type AscensionProfile = {
  tier: number;
  enemyRankBonus: number;
  formationComplexityBonus: number;
  pressureMultiplier: number;
  wordScoreOffset: number;
  rewardMultiplier: number;
  bossMutations: AscensionBossMutationId[];
  bossHpMultiplier: number;
  bossActionRateMultiplier: number;
  bossProjectileBonus: number;
};

export type AscensionAdvanceResult = {
  state: AscensionState;
  advanced: boolean;
  checkpointCommitted: boolean;
  newlyCompleted: boolean;
  unlockedTier: number | null;
};

export type AscensionCompletionReward = {
  credits: number;
  currencies: ExpansionCurrencyReward;
};

function clampTier(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_ASCENSION_TIER, Math.floor(value)));
}

function clampStage(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(MAX_CAMPAIGN_STAGE, Math.floor(value)));
}

export function campaignCompleted(
  campaign: Pick<CampaignProgress, "clearedStages">,
): boolean {
  return campaign.clearedStages.includes(MAX_CAMPAIGN_STAGE);
}

function defaultFrontier(
  highestUnlockedTier: number,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (let tier = 1; tier <= highestUnlockedTier; tier += 1) {
    result[String(tier)] = 1;
  }
  return result;
}

export function createAscensionState(
  campaign?: Pick<CampaignProgress, "clearedStages">,
): AscensionState {
  const highestUnlockedTier =
    campaign !== undefined && campaignCompleted(campaign) ? 1 : 0;
  return {
    version: 1,
    highestUnlockedTier,
    selectedTier: 0,
    completedTiers: [],
    frontierByTier: defaultFrontier(highestUnlockedTier),
  };
}

export function sanitizeAscensionState(
  value: unknown,
  campaign?: Pick<CampaignProgress, "clearedStages">,
): AscensionState {
  const minimumUnlocked =
    campaign !== undefined && campaignCompleted(campaign) ? 1 : 0;
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return createAscensionState(campaign);
  }

  const raw = value as {
    highestUnlockedTier?: unknown;
    selectedTier?: unknown;
    completedTiers?: unknown;
    frontierByTier?: unknown;
  };
  const rawHighest =
    typeof raw.highestUnlockedTier === "number"
      ? clampTier(raw.highestUnlockedTier)
      : 0;
  const highestUnlockedTier = Math.max(minimumUnlocked, rawHighest);
  const selectedTier = Math.min(
    highestUnlockedTier,
    typeof raw.selectedTier === "number" ? clampTier(raw.selectedTier) : 0,
  );
  const rawCompleted = Array.isArray(raw.completedTiers)
    ? raw.completedTiers
    : [];
  const completedTiers = Array.from(
    new Set(
      rawCompleted
        .filter((tier): tier is number => typeof tier === "number")
        .map(clampTier)
        .filter((tier) => tier >= 1 && tier <= highestUnlockedTier),
    ),
  ).sort((a, b) => a - b);
  const completedSet = new Set(completedTiers);
  const rawFrontier =
    raw.frontierByTier !== null &&
    typeof raw.frontierByTier === "object" &&
    !Array.isArray(raw.frontierByTier)
      ? (raw.frontierByTier as Record<string, unknown>)
      : {};
  const frontierByTier: Record<string, number> = {};

  for (let tier = 1; tier <= highestUnlockedTier; tier += 1) {
    const stored = rawFrontier[String(tier)];
    frontierByTier[String(tier)] = completedSet.has(tier)
      ? MAX_CAMPAIGN_STAGE
      : clampStage(typeof stored === "number" ? stored : 1);
  }

  return {
    version: 1,
    highestUnlockedTier,
    selectedTier,
    completedTiers,
    frontierByTier,
  };
}

export function isValidAscensionState(value: unknown): value is AscensionState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const raw = value as Record<string, unknown>;
  if (
    raw.version !== 1 ||
    !Number.isInteger(raw.highestUnlockedTier) ||
    !Number.isInteger(raw.selectedTier) ||
    typeof raw.highestUnlockedTier !== "number" ||
    typeof raw.selectedTier !== "number" ||
    raw.highestUnlockedTier < 0 ||
    raw.highestUnlockedTier > MAX_ASCENSION_TIER ||
    raw.selectedTier < 0 ||
    raw.selectedTier > raw.highestUnlockedTier ||
    !Array.isArray(raw.completedTiers) ||
    raw.frontierByTier === null ||
    typeof raw.frontierByTier !== "object" ||
    Array.isArray(raw.frontierByTier)
  ) {
    return false;
  }

  const completed = raw.completedTiers as unknown[];
  if (
    new Set(completed).size !== completed.length ||
    !completed.every(
      (tier) =>
        typeof tier === "number" &&
        Number.isInteger(tier) &&
        tier >= 1 &&
        tier <= raw.highestUnlockedTier,
    )
  ) {
    return false;
  }

  const frontiers = raw.frontierByTier as Record<string, unknown>;
  const completedSet = new Set(completed as number[]);
  const expectedKeys = Array.from(
    { length: raw.highestUnlockedTier },
    (_, index) => String(index + 1),
  );
  const keys = Object.keys(frontiers).sort(
    (left, right) => Number(left) - Number(right),
  );
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key, index) => key !== expectedKeys[index])
  ) {
    return false;
  }

  return expectedKeys.every((key) => {
    const tier = Number(key);
    const stage = frontiers[key];
    return (
      typeof stage === "number" &&
      Number.isInteger(stage) &&
      stage >= 1 &&
      stage <= MAX_CAMPAIGN_STAGE &&
      (!completedSet.has(tier) || stage === MAX_CAMPAIGN_STAGE)
    );
  });
}

export function selectAscensionTier(
  input: AscensionState,
  tier: number,
): AscensionState {
  const state = sanitizeAscensionState(input);
  const safeTier = clampTier(tier);
  if (safeTier > state.highestUnlockedTier) return state;
  return {
    ...state,
    selectedTier: safeTier,
  };
}

export function currentAscensionStage(
  input: AscensionState,
): number | null {
  const state = sanitizeAscensionState(input);
  if (state.selectedTier <= 0) return null;
  return state.frontierByTier[String(state.selectedTier)] ?? 1;
}

export function advanceAscensionOnStageClear(
  input: AscensionState,
  clearedStageInput: number,
): AscensionAdvanceResult {
  const state = sanitizeAscensionState(input);
  const clearedStage = clampStage(clearedStageInput);

  if (state.selectedTier === 0) {
    if (clearedStage !== MAX_CAMPAIGN_STAGE) {
      return {
        state,
        advanced: false,
        checkpointCommitted: false,
        newlyCompleted: false,
        unlockedTier: null,
      };
    }

    const highestUnlockedTier = Math.max(state.highestUnlockedTier, 1);
    return {
      state: {
        ...state,
        highestUnlockedTier,
        frontierByTier: {
          ...state.frontierByTier,
          ...(highestUnlockedTier >= 1 && state.frontierByTier["1"] === undefined
            ? { "1": 1 }
            : {}),
        },
      },
      advanced: highestUnlockedTier > state.highestUnlockedTier,
      checkpointCommitted: false,
      newlyCompleted: false,
      unlockedTier:
        highestUnlockedTier > state.highestUnlockedTier ? 1 : null,
    };
  }

  const tier = state.selectedTier;
  const key = String(tier);
  const expectedStage = state.frontierByTier[key] ?? 1;
  if (
    clearedStage !== expectedStage ||
    state.completedTiers.includes(tier)
  ) {
    return {
      state,
      advanced: false,
      checkpointCommitted: false,
      newlyCompleted: false,
      unlockedTier: null,
    };
  }

  if (clearedStage < MAX_CAMPAIGN_STAGE) {
    return {
      state: {
        ...state,
        frontierByTier: {
          ...state.frontierByTier,
          [key]: clearedStage + 1,
        },
      },
      advanced: true,
      checkpointCommitted: clearedStage % 10 === 0,
      newlyCompleted: false,
      unlockedTier: null,
    };
  }

  const completedTiers = [...state.completedTiers, tier].sort(
    (left, right) => left - right,
  );
  const nextTier =
    tier >= MAX_ASCENSION_TIER
      ? MAX_ASCENSION_TIER
      : tier + 1;
  const highestUnlockedTier = Math.max(
    state.highestUnlockedTier,
    nextTier,
  );
  const frontierByTier = {
    ...state.frontierByTier,
    [key]: MAX_CAMPAIGN_STAGE,
  };
  if (
    nextTier > tier &&
    frontierByTier[String(nextTier)] === undefined
  ) {
    frontierByTier[String(nextTier)] = 1;
  }

  return {
    state: {
      ...state,
      highestUnlockedTier,
      completedTiers,
      frontierByTier,
    },
    advanced: true,
    checkpointCommitted: true,
    newlyCompleted: true,
    unlockedTier:
      nextTier > tier &&
      highestUnlockedTier > state.highestUnlockedTier
        ? nextTier
        : null,
  };
}

const MUTATION_EFFECTS: Record<
  AscensionBossMutationId,
  {
    hpMultiplier: number;
    actionRateMultiplier: number;
    projectileBonus: number;
  }
> = {
  "fortified-core": {
    hpMultiplier: 1.12,
    actionRateMultiplier: 1,
    projectileBonus: 0,
  },
  "rapid-cycle": {
    hpMultiplier: 1,
    actionRateMultiplier: 1.1,
    projectileBonus: 0,
  },
  "projectile-echo": {
    hpMultiplier: 1,
    actionRateMultiplier: 1,
    projectileBonus: 1,
  },
  "apex-crown": {
    hpMultiplier: 1.08,
    actionRateMultiplier: 1.06,
    projectileBonus: 1,
  },
};

function mutationCountForTier(tier: number): number {
  if (tier >= 9) return 3;
  if (tier >= 5) return 2;
  return tier >= 1 ? 1 : 0;
}

export function bossMutationsForAscension(
  tierInput: number,
  stageInput: number,
): AscensionBossMutationId[] {
  const tier = clampTier(tierInput);
  const count = mutationCountForTier(tier);
  if (count === 0) return [];

  const stage = clampStage(stageInput);
  const offset =
    (Math.imul(stage, 17) + Math.imul(tier, 31)) %
    ASCENSION_BOSS_MUTATION_IDS.length;
  return Array.from({ length: count }, (_, index) =>
    ASCENSION_BOSS_MUTATION_IDS[
      (offset + index) % ASCENSION_BOSS_MUTATION_IDS.length
    ]!
  );
}

export function ascensionProfile(
  tierInput: number,
  stageInput: number,
): AscensionProfile {
  const tier = clampTier(tierInput);
  const bossMutations = bossMutationsForAscension(tier, stageInput);
  let bossHpMultiplier = 1;
  let bossActionRateMultiplier = 1;
  let bossProjectileBonus = 0;

  for (const id of bossMutations) {
    const effect = MUTATION_EFFECTS[id];
    bossHpMultiplier *= effect.hpMultiplier;
    bossActionRateMultiplier *= effect.actionRateMultiplier;
    bossProjectileBonus += effect.projectileBonus;
  }

  return {
    tier,
    enemyRankBonus: Math.min(3, Math.ceil(tier / 3)),
    formationComplexityBonus: Math.min(2, Math.ceil(tier / 4)),
    pressureMultiplier: 1 + Math.min(0.25, tier * 0.025),
    wordScoreOffset: Math.min(15, tier * 1.5),
    rewardMultiplier: 1 + Math.min(0.75, tier * 0.075),
    bossMutations,
    bossHpMultiplier: Math.min(1.55, bossHpMultiplier),
    bossActionRateMultiplier: Math.min(1.35, bossActionRateMultiplier),
    bossProjectileBonus: Math.min(2, bossProjectileBonus),
  };
}

export function applyAscensionDifficulty(
  base: DifficultyProfile,
  tier: number,
  stage: number,
): DifficultyProfile {
  const profile = ascensionProfile(tier, stage);
  if (profile.tier === 0) return { ...base };

  return {
    ...base,
    combatPressure: Math.min(
      3.6,
      base.combatPressure * profile.pressureMultiplier,
    ),
    enemySpeed: Math.min(
      2.08,
      base.enemySpeed * Math.sqrt(profile.pressureMultiplier),
    ),
    projectilePressure: Math.min(
      3.15,
      base.projectilePressure * profile.pressureMultiplier,
    ),
    bossPressure: Math.min(
      3.15,
      base.bossPressure * profile.pressureMultiplier,
    ),
    pressureBudget:
      base.pressureBudget *
      (1 + Math.min(0.12, profile.tier * 0.012)),
    wordScoreOffset: base.wordScoreOffset + profile.wordScoreOffset,
    formationComplexity: Math.min(
      5,
      base.formationComplexity + profile.formationComplexityBonus,
    ),
    rewardMultiplier: base.rewardMultiplier * profile.rewardMultiplier,
    ascensionTier: profile.tier,
    enemyRankBonus: profile.enemyRankBonus,
    bossHpMultiplier: profile.bossHpMultiplier,
    bossActionRateMultiplier: profile.bossActionRateMultiplier,
    bossProjectileBonus: profile.bossProjectileBonus,
    ascensionRewardMultiplier: profile.rewardMultiplier,
    bossMutationLabel:
      profile.bossMutations.length === 0
        ? undefined
        : profile.bossMutations.join(" + "),
  };
}

export function ascensionCompletionReward(
  tierInput: number,
): AscensionCompletionReward {
  const tier = clampTier(tierInput);
  if (tier <= 0) {
    return {
      credits: 0,
      currencies: createExpansionCurrencyState(),
    };
  }

  return {
    credits: 1000 + tier * 350,
    currencies: {
      alloy: 20 + tier * 3,
      starCrystal: 4 + Math.ceil(tier / 2),
      quantumCore: 1 + Math.floor((tier - 1) / 4),
    },
  };
}
