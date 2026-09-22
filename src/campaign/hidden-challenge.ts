import type { DifficultyProfile } from "./types";
import { clamp } from "../logic";
import { stageSeed } from "./stage";

export const HIDDEN_CHALLENGE_KINDS = [
  "hidden-challenge",
  "hidden-world",
  "champion-hunt",
  "apex-gauntlet",
] as const;

export type HiddenChallengeKind =
  (typeof HIDDEN_CHALLENGE_KINDS)[number];

export const HIDDEN_CHALLENGE_TIERS = [
  "I",
  "II",
  "III",
] as const;

export type HiddenChallengeTier =
  (typeof HIDDEN_CHALLENGE_TIERS)[number];

export type HiddenChallengeOffer = {
  id: string;
  sourceStage: number;
  routeNodeId: string;
  seed: number;
  kind: HiddenChallengeKind;
  hiddenWorldStage: number | null;
  encounterCount: number;
};

export type ActiveHiddenChallenge = {
  offerId: string;
  tier: HiddenChallengeTier;
  encounterIndex: number;
};

export type HiddenChallengeState = {
  version: 1;
  offers: Record<string, HiddenChallengeOffer>;
  active: ActiveHiddenChallenge | null;
  completedOfferIds: string[];
  skippedOfferIds: string[];
};

export type HiddenChallengeTierDefinition = {
  tier: HiddenChallengeTier;
  pressureMultiplier: number;
  rewardMultiplier: number;
  wordScoreBonus: number;
  eliteChanceBonus: number;
  priorityTargetRate: number;
};

export type ChallengeEncounterProfile = {
  kind: HiddenChallengeKind;
  tier: HiddenChallengeTier;
  offerId: string;
  encounterIndex: number;
  encounterCount: number;
  worldStage: number | null;
  priorityTargetMode: "none" | "champion" | "apex";
  forceBoss: boolean;
  rewardMultiplier: number;
};

export const HIDDEN_CHALLENGE_TIER_REGISTRY: Readonly<
  Record<HiddenChallengeTier, HiddenChallengeTierDefinition>
> = {
  I: {
    tier: "I",
    pressureMultiplier: 1.12,
    rewardMultiplier: 1.35,
    wordScoreBonus: 4,
    eliteChanceBonus: 0.08,
    priorityTargetRate: 0.28,
  },
  II: {
    tier: "II",
    pressureMultiplier: 1.28,
    rewardMultiplier: 1.8,
    wordScoreBonus: 9,
    eliteChanceBonus: 0.16,
    priorityTargetRate: 0.48,
  },
  III: {
    tier: "III",
    pressureMultiplier: 1.48,
    rewardMultiplier: 2.45,
    wordScoreBonus: 15,
    eliteChanceBonus: 0.26,
    priorityTargetRate: 0.7,
  },
};

const HIDDEN_WORLD_THEME_STAGES = [
  401,
  421,
  701,
  721,
  901,
  921,
] as const;

function hashText(value: string, seed: number): number {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x45d9f3b);
    hash ^= hash >>> 16;
  }
  return hash >>> 0;
}

function normalizedRoll(seed: number): number {
  let value = seed >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967296;
}

export function createHiddenChallengeState(): HiddenChallengeState {
  return {
    version: 1,
    offers: {},
    active: null,
    completedOfferIds: [],
    skippedOfferIds: [],
  };
}

function validTier(value: unknown): value is HiddenChallengeTier {
  return (
    typeof value === "string" &&
    HIDDEN_CHALLENGE_TIERS.includes(
      value as HiddenChallengeTier,
    )
  );
}

function validKind(value: unknown): value is HiddenChallengeKind {
  return (
    typeof value === "string" &&
    HIDDEN_CHALLENGE_KINDS.includes(
      value as HiddenChallengeKind,
    )
  );
}

function sanitizeOffer(value: unknown): HiddenChallengeOffer | null {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  if (
    typeof raw.id !== "string" ||
    raw.id.length === 0 ||
    !Number.isInteger(raw.sourceStage) ||
    typeof raw.sourceStage !== "number" ||
    raw.sourceStage < 1 ||
    raw.sourceStage > 1000 ||
    typeof raw.routeNodeId !== "string" ||
    raw.routeNodeId.length === 0 ||
    !Number.isInteger(raw.seed) ||
    typeof raw.seed !== "number" ||
    raw.seed < 0 ||
    !validKind(raw.kind) ||
    !Number.isInteger(raw.encounterCount) ||
    typeof raw.encounterCount !== "number" ||
    raw.encounterCount < 1 ||
    raw.encounterCount > 5
  ) {
    return null;
  }

  const hiddenWorldStage =
    raw.hiddenWorldStage === null
      ? null
      : Number.isInteger(raw.hiddenWorldStage) &&
          typeof raw.hiddenWorldStage === "number" &&
          raw.hiddenWorldStage >= 1 &&
          raw.hiddenWorldStage <= 1000
        ? raw.hiddenWorldStage
        : null;

  if (
    raw.kind === "hidden-world" &&
    hiddenWorldStage === null
  ) {
    return null;
  }

  return {
    id: raw.id,
    sourceStage: raw.sourceStage,
    routeNodeId: raw.routeNodeId,
    seed: raw.seed >>> 0,
    kind: raw.kind,
    hiddenWorldStage,
    encounterCount: raw.encounterCount,
  };
}

export function sanitizeHiddenChallengeState(
  value: unknown,
): HiddenChallengeState {
  const result = createHiddenChallengeState();
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return result;
  }

  const raw = value as Record<string, unknown>;
  if (
    raw.offers !== null &&
    typeof raw.offers === "object" &&
    !Array.isArray(raw.offers)
  ) {
    for (const candidate of Object.values(
      raw.offers as Record<string, unknown>,
    )) {
      const offer = sanitizeOffer(candidate);
      if (offer !== null) result.offers[offer.id] = offer;
    }
  }

  const known = new Set(Object.keys(result.offers));
  const completed = Array.isArray(raw.completedOfferIds)
    ? raw.completedOfferIds.filter(
        (id): id is string =>
          typeof id === "string" && known.has(id),
      )
    : [];
  const skipped = Array.isArray(raw.skippedOfferIds)
    ? raw.skippedOfferIds.filter(
        (id): id is string =>
          typeof id === "string" && known.has(id),
      )
    : [];

  result.completedOfferIds = [...new Set(completed)];
  result.skippedOfferIds = [...new Set(skipped)].filter(
    (id) => !result.completedOfferIds.includes(id),
  );

  if (
    raw.active !== null &&
    typeof raw.active === "object" &&
    !Array.isArray(raw.active)
  ) {
    const active = raw.active as Record<string, unknown>;
    const offer =
      typeof active.offerId === "string"
        ? result.offers[active.offerId]
        : undefined;
    if (
      offer !== undefined &&
      validTier(active.tier) &&
      Number.isInteger(active.encounterIndex) &&
      typeof active.encounterIndex === "number" &&
      active.encounterIndex >= 0 &&
      active.encounterIndex < offer.encounterCount &&
      !result.completedOfferIds.includes(offer.id) &&
      !result.skippedOfferIds.includes(offer.id)
    ) {
      result.active = {
        offerId: offer.id,
        tier: active.tier,
        encounterIndex: active.encounterIndex,
      };
    }
  }

  return result;
}

export function isValidHiddenChallengeState(
  value: unknown,
): value is HiddenChallengeState {
  const sanitized = sanitizeHiddenChallengeState(value);
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }
  return JSON.stringify(sanitized) === JSON.stringify(value);
}

function kindForStage(stage: number, roll: number): HiddenChallengeKind {
  if (stage >= 300 && roll >= 0.82) return "apex-gauntlet";
  if (stage >= 75 && roll >= 0.58) return "hidden-world";
  if (stage >= 55 && roll >= 0.28) return "champion-hunt";
  return "hidden-challenge";
}

export function createHiddenChallengeOffer(
  stageInput: number,
  routeNodeId: string,
): HiddenChallengeOffer {
  const sourceStage = Math.floor(clamp(stageInput, 1, 1000));
  const seed = hashText(
    routeNodeId,
    stageSeed(sourceStage) ^ 0x48494444,
  );
  const roll = normalizedRoll(seed);
  const kind = kindForStage(sourceStage, roll);
  const hiddenWorldStage =
    kind === "hidden-world"
      ? HIDDEN_WORLD_THEME_STAGES[
          seed % HIDDEN_WORLD_THEME_STAGES.length
        ]!
      : null;
  const encounterCount =
    kind === "hidden-world"
      ? 1 + ((seed >>> 5) % 5)
      : 1;

  return {
    id:
      "challenge-" +
      String(sourceStage) +
      "-" +
      seed.toString(36),
    sourceStage,
    routeNodeId,
    seed,
    kind,
    hiddenWorldStage,
    encounterCount,
  };
}

export function registerHiddenChallengeOffer(
  input: HiddenChallengeState,
  offer: HiddenChallengeOffer,
): HiddenChallengeState {
  const state = sanitizeHiddenChallengeState(input);
  const existing = state.offers[offer.id];
  if (existing !== undefined) return state;

  return {
    ...state,
    offers: {
      ...state.offers,
      [offer.id]: offer,
    },
  };
}

export function startHiddenChallenge(
  input: HiddenChallengeState,
  offerId: string,
  tier: HiddenChallengeTier,
): HiddenChallengeState {
  const state = sanitizeHiddenChallengeState(input);
  const offer = state.offers[offerId];
  if (
    offer === undefined ||
    state.completedOfferIds.includes(offerId) ||
    state.skippedOfferIds.includes(offerId)
  ) {
    return state;
  }

  return {
    ...state,
    active: {
      offerId,
      tier,
      encounterIndex: 0,
    },
  };
}

export function skipHiddenChallenge(
  input: HiddenChallengeState,
  offerId: string,
): HiddenChallengeState {
  const state = sanitizeHiddenChallengeState(input);
  if (
    state.offers[offerId] === undefined ||
    state.completedOfferIds.includes(offerId)
  ) {
    return state;
  }

  return {
    ...state,
    active:
      state.active?.offerId === offerId
        ? null
        : state.active,
    skippedOfferIds: [
      ...new Set([...state.skippedOfferIds, offerId]),
    ],
  };
}

export function completeHiddenChallengeEncounter(
  input: HiddenChallengeState,
): HiddenChallengeState {
  const state = sanitizeHiddenChallengeState(input);
  const active = state.active;
  if (active === null) return state;
  const offer = state.offers[active.offerId];
  if (offer === undefined) {
    return { ...state, active: null };
  }

  const nextIndex = active.encounterIndex + 1;
  if (nextIndex < offer.encounterCount) {
    return {
      ...state,
      active: {
        ...active,
        encounterIndex: nextIndex,
      },
    };
  }

  return {
    ...state,
    active: null,
    completedOfferIds: [
      ...new Set([
        ...state.completedOfferIds,
        offer.id,
      ]),
    ],
  };
}

export function hiddenChallengeTierDefinition(
  tier: HiddenChallengeTier,
): HiddenChallengeTierDefinition {
  return HIDDEN_CHALLENGE_TIER_REGISTRY[tier];
}

export function activeHiddenChallengeOffer(
  stateInput: HiddenChallengeState,
): HiddenChallengeOffer | null {
  const state = sanitizeHiddenChallengeState(stateInput);
  if (state.active === null) return null;
  return state.offers[state.active.offerId] ?? null;
}

export function hiddenChallengeHandled(
  stateInput: HiddenChallengeState,
  offerId: string,
): boolean {
  const state = sanitizeHiddenChallengeState(stateInput);
  return (
    state.completedOfferIds.includes(offerId) ||
    state.skippedOfferIds.includes(offerId)
  );
}

export function hiddenChallengeEncounterProfile(
  stateInput: HiddenChallengeState,
): ChallengeEncounterProfile | null {
  const state = sanitizeHiddenChallengeState(stateInput);
  const active = state.active;
  if (active === null) return null;
  const offer = state.offers[active.offerId];
  if (offer === undefined) return null;

  const tier = hiddenChallengeTierDefinition(active.tier);
  const isLast =
    active.encounterIndex === offer.encounterCount - 1;

  return {
    kind: offer.kind,
    tier: active.tier,
    offerId: offer.id,
    encounterIndex: active.encounterIndex,
    encounterCount: offer.encounterCount,
    worldStage: offer.hiddenWorldStage,
    priorityTargetMode:
      offer.kind === "apex-gauntlet"
        ? "apex"
        : offer.kind === "champion-hunt"
          ? "champion"
          : "none",
    forceBoss:
      offer.kind === "hidden-world" && isLast,
    rewardMultiplier: tier.rewardMultiplier,
  };
}

export function scaleHiddenChallengeDifficulty(
  input: DifficultyProfile,
  tier: HiddenChallengeTier,
): DifficultyProfile {
  const definition = hiddenChallengeTierDefinition(tier);
  const pressure =
    definition.pressureMultiplier *
    input.hiddenChallengeMultiplier;
  const sqrtPressure = Math.sqrt(pressure);

  return {
    ...input,
    combatPressure: clamp(
      input.combatPressure * pressure,
      0.55,
      4.4,
    ),
    enemySpeed: clamp(
      input.enemySpeed * (0.92 + sqrtPressure * 0.08),
      0.78,
      2.35,
    ),
    spawnInterval: clamp(
      input.spawnInterval / sqrtPressure,
      0.28,
      input.spawnInterval,
    ),
    projectilePressure: clamp(
      input.projectilePressure * sqrtPressure,
      0.65,
      3.6,
    ),
    bossPressure: clamp(
      input.bossPressure * sqrtPressure,
      0.75,
      3.6,
    ),
    pressureBudget:
      input.pressureBudget *
      (0.96 + definition.pressureMultiplier * 0.08),
    wordScoreOffset: clamp(
      input.wordScoreOffset + definition.wordScoreBonus,
      -20,
      25,
    ),
    hardCcDurationFactor: clamp(
      input.hardCcDurationFactor * sqrtPressure,
      0.55,
      1.2,
    ),
    rewardMultiplier:
      input.rewardMultiplier *
      definition.rewardMultiplier,
  };
}

export function challengeEliteChance(
  baseChance: number,
  tier: HiddenChallengeTier,
): number {
  return clamp(
    baseChance +
      hiddenChallengeTierDefinition(tier).eliteChanceBonus,
    0,
    0.88,
  );
}

export function priorityKillWindowSeconds(
  difficulty: DifficultyProfile,
): number {
  const wpmFactor = clamp(
    difficulty.targetWpm / 70,
    0.55,
    4.3,
  );
  return clamp(
    10.5 / Math.sqrt(wpmFactor) +
      difficulty.reactionWindow * 2,
    4.5,
    13,
  );
}

export function hiddenChallengeKindLabel(
  kind: HiddenChallengeKind,
): string {
  if (kind === "hidden-world") return "Hidden World";
  if (kind === "champion-hunt") return "Champion Hunt";
  if (kind === "apex-gauntlet") return "Apex Gauntlet";
  return "Hidden Challenge";
}
