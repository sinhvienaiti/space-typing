import type { DifficultyProfile } from "../campaign/types";
import type {
  ExpansionCurrencyReward,
} from "../economy/currencies";
import { clamp } from "../logic";
import type { HiddenDiscoveryState } from "./hidden-content";
import { sectorForStage } from "../campaign/expansion-state";
import { stageSeed } from "../campaign/stage";

export const HIDDEN_ENCOUNTER_KINDS = [
  "hidden-challenge",
  "hidden-world",
  "champion-hunt",
] as const;

export type HiddenEncounterKind =
  (typeof HIDDEN_ENCOUNTER_KINDS)[number];

export const HIDDEN_CHALLENGE_TIERS = [1, 2, 3] as const;
export type HiddenChallengeTier =
  (typeof HIDDEN_CHALLENGE_TIERS)[number];

export type HiddenEncounterOffer = {
  id: string;
  kind: HiddenEncounterKind;
  sourceStage: number;
  sectorStart: number;
  label: string;
  description: string;
};

export type HiddenWorldProfile = {
  id: string;
  name: string;
  environmentStage: number;
  rosterStage: number;
  bossStage: number;
  encounterCount: number;
};

export const HIDDEN_WORLD_PROFILES: readonly HiddenWorldProfile[] = [
  {
    id: "rift-expanse",
    name: "Rift Expanse",
    environmentStage: 401,
    rosterStage: 501,
    bossStage: 901,
    encounterCount: 3,
  },
  {
    id: "prism-abyss",
    name: "Prism Abyss",
    environmentStage: 41,
    rosterStage: 401,
    bossStage: 501,
    encounterCount: 3,
  },
  {
    id: "frozen-void",
    name: "Frozen Void",
    environmentStage: 241,
    rosterStage: 901,
    bossStage: 241,
    encounterCount: 4,
  },
] as const;

export type ActiveHiddenEncounter = {
  id: string;
  offerId: string;
  kind: HiddenEncounterKind;
  sourceStage: number;
  tier: HiddenChallengeTier;
  step: number;
  totalSteps: number;
  seed: number;
  hiddenWorldId: string | null;
};

export type HiddenEncounterState = {
  active: ActiveHiddenEncounter | null;
  resolvedOfferIds: string[];
};

export type HiddenEncounterReward = {
  credits: number;
  currencies: ExpansionCurrencyReward;
};
export type HiddenEncounterRuntime = {
  kind: HiddenEncounterKind;
  tier: HiddenChallengeTier;
  sourceStage: number;
  step: number;
  totalSteps: number;
  environmentStageOverride: number | null;
  rosterStageOverride: number | null;
  bossStageOverride: number | null;
  forcePriorityTargets: boolean;
  enemyBudgetMultiplier: number;
  killChainWindowSeconds: number;
};


export function createHiddenEncounterState(): HiddenEncounterState {
  return {
    active: null,
    resolvedOfferIds: [],
  };
}

function hiddenEncounterKind(
  value: unknown,
): value is HiddenEncounterKind {
  return (
    typeof value === "string" &&
    HIDDEN_ENCOUNTER_KINDS.includes(
      value as HiddenEncounterKind,
    )
  );
}

function challengeTier(
  value: unknown,
): value is HiddenChallengeTier {
  return (
    typeof value === "number" &&
    HIDDEN_CHALLENGE_TIERS.includes(
      value as HiddenChallengeTier,
    )
  );
}

export function sanitizeHiddenEncounterState(
  value: unknown,
): HiddenEncounterState {
  const fallback = createHiddenEncounterState();
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return fallback;
  }

  const raw = value as Record<string, unknown>;
  const resolvedOfferIds = Array.isArray(raw.resolvedOfferIds)
    ? [
        ...new Set(
          raw.resolvedOfferIds.filter(
            (id): id is string =>
              typeof id === "string" &&
              id.length > 0 &&
              id.length <= 120,
          ),
        ),
      ].slice(-200)
    : [];

  let active: ActiveHiddenEncounter | null = null;
  if (
    raw.active !== null &&
    typeof raw.active === "object" &&
    !Array.isArray(raw.active)
  ) {
    const candidate = raw.active as Record<string, unknown>;
    if (
      typeof candidate.id === "string" &&
      candidate.id.length > 0 &&
      typeof candidate.offerId === "string" &&
      candidate.offerId.length > 0 &&
      hiddenEncounterKind(candidate.kind) &&
      Number.isInteger(candidate.sourceStage) &&
      typeof candidate.sourceStage === "number" &&
      candidate.sourceStage >= 1 &&
      candidate.sourceStage <= 1000 &&
      challengeTier(candidate.tier) &&
      Number.isInteger(candidate.step) &&
      typeof candidate.step === "number" &&
      Number.isInteger(candidate.totalSteps) &&
      typeof candidate.totalSteps === "number" &&
      candidate.totalSteps >= 1 &&
      candidate.totalSteps <= 5 &&
      candidate.step >= 1 &&
      candidate.step <= candidate.totalSteps &&
      Number.isInteger(candidate.seed) &&
      typeof candidate.seed === "number" &&
      candidate.seed >= 0 &&
      (candidate.hiddenWorldId === null ||
        (typeof candidate.hiddenWorldId === "string" &&
          HIDDEN_WORLD_PROFILES.some(
            (profile) => profile.id === candidate.hiddenWorldId,
          )))
    ) {
      active = {
        id: candidate.id,
        offerId: candidate.offerId,
        kind: candidate.kind,
        sourceStage: candidate.sourceStage,
        tier: candidate.tier,
        step: candidate.step,
        totalSteps: candidate.totalSteps,
        seed: candidate.seed,
        hiddenWorldId: candidate.hiddenWorldId,
      };
    }
  }

  return {
    active,
    resolvedOfferIds,
  };
}

export function isValidHiddenEncounterState(
  value: unknown,
): value is HiddenEncounterState {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const sanitized = sanitizeHiddenEncounterState(value);
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.resolvedOfferIds)) return false;

  if (raw.active === null) {
    return (
      sanitized.active === null &&
      sanitized.resolvedOfferIds.length ===
        raw.resolvedOfferIds.length
    );
  }

  return (
    sanitized.active !== null &&
    sanitized.resolvedOfferIds.length ===
      raw.resolvedOfferIds.length
  );
}

function offerId(
  kind: HiddenEncounterKind,
  sectorStart: number,
): string {
  return kind + ":sector:" + String(sectorStart);
}

function sectorIndex(stage: number): number {
  return Math.floor((stage - 1) / 10) + 1;
}

export function hiddenEncounterOffers(
  discovery: HiddenDiscoveryState,
  stateInput: HiddenEncounterState,
  stage: number,
): HiddenEncounterOffer[] {
  const state = sanitizeHiddenEncounterState(stateInput);
  if (state.active !== null) return [];

  const sector = sectorForStage(stage);
  const index = sectorIndex(stage);
  const discovered = new Set(discovery.discovered);
  const offers: HiddenEncounterOffer[] = [];

  if (discovered.has("echo-rift")) {
    offers.push({
      id: offerId("hidden-challenge", sector.startStage),
      kind: "hidden-challenge",
      sourceStage: stage,
      sectorStart: sector.startStage,
      label: "Hidden Challenge",
      description:
        "Choose Tier I-III risk without changing the numbered Campaign stage.",
    });
  }

  if (
    discovered.has("ghost-contract") &&
    index % 2 === 0
  ) {
    offers.push({
      id: offerId("champion-hunt", sector.startStage),
      kind: "champion-hunt",
      sourceStage: stage,
      sectorStart: sector.startStage,
      label: "Champion Hunt",
      description:
        "Priority targets only. Chain Elite/Champion kills for premium rewards.",
    });
  }

  if (
    discovered.has("void-warden") &&
    index % 3 === 0
  ) {
    offers.push({
      id: offerId("hidden-world", sector.startStage),
      kind: "hidden-world",
      sourceStage: stage,
      sectorStart: sector.startStage,
      label: "Hidden World",
      description:
        "A deterministic 3-4 encounter detour with its own composite theme, roster and boss.",
    });
  }

  const resolved = new Set(state.resolvedOfferIds);
  return offers.filter((offer) => !resolved.has(offer.id));
}

function hiddenSeed(
  offer: HiddenEncounterOffer,
): number {
  let hash = stageSeed(offer.sectorStart) ^ 0x48494444;
  for (const char of offer.kind) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  }
  return hash >>> 0;
}

export function hiddenWorldProfileForSeed(
  seed: number,
): HiddenWorldProfile {
  const index =
    Math.abs(Math.floor(seed)) %
    HIDDEN_WORLD_PROFILES.length;
  return HIDDEN_WORLD_PROFILES[index] ?? HIDDEN_WORLD_PROFILES[0]!;
}

export function startHiddenEncounter(
  stateInput: HiddenEncounterState,
  offer: HiddenEncounterOffer,
  tier: HiddenChallengeTier,
): HiddenEncounterState {
  const state = sanitizeHiddenEncounterState(stateInput);
  if (
    state.active !== null ||
    state.resolvedOfferIds.includes(offer.id)
  ) {
    return state;
  }

  const seed = hiddenSeed(offer);
  const world =
    offer.kind === "hidden-world"
      ? hiddenWorldProfileForSeed(seed)
      : null;
  const totalSteps =
    world?.encounterCount ?? 1;

  return {
    ...state,
    active: {
      id:
        offer.kind +
        ":" +
        String(offer.sectorStart) +
        ":" +
        String(seed),
      offerId: offer.id,
      kind: offer.kind,
      sourceStage: offer.sourceStage,
      tier,
      step: 1,
      totalSteps,
      seed,
      hiddenWorldId: world?.id ?? null,
    },
  };
}

export function skipHiddenEncounter(
  stateInput: HiddenEncounterState,
  offerIdInput: string,
): HiddenEncounterState {
  const state = sanitizeHiddenEncounterState(stateInput);
  if (state.active !== null) return state;

  return {
    ...state,
    resolvedOfferIds: [
      ...new Set([
        ...state.resolvedOfferIds,
        offerIdInput,
      ]),
    ].slice(-200),
  };
}

export function advanceHiddenEncounter(
  stateInput: HiddenEncounterState,
): {
  state: HiddenEncounterState;
  completed: boolean;
} {
  const state = sanitizeHiddenEncounterState(stateInput);
  const active = state.active;
  if (active === null) {
    return { state, completed: false };
  }

  if (active.step < active.totalSteps) {
    return {
      state: {
        ...state,
        active: {
          ...active,
          step: active.step + 1,
        },
      },
      completed: false,
    };
  }

  return {
    state: {
      active: null,
      resolvedOfferIds: [
        ...new Set([
          ...state.resolvedOfferIds,
          active.offerId,
        ]),
      ].slice(-200),
    },
    completed: true,
  };
}

export function hiddenEncounterDifficulty(
  base: DifficultyProfile,
  kind: HiddenEncounterKind,
  tier: HiddenChallengeTier,
): DifficultyProfile {
  const tierPressure =
    tier === 1 ? 1.1 : tier === 2 ? 1.23 : 1.38;
  const kindPressure =
    kind === "champion-hunt"
      ? 1.12
      : kind === "hidden-world"
        ? 1.08
        : 1;

  const pressure = tierPressure * kindPressure;
  return {
    ...base,
    combatPressure: clamp(
      base.combatPressure * pressure,
      0.55,
      3.6,
    ),
    enemySpeed: clamp(
      base.enemySpeed * Math.sqrt(pressure),
      0.78,
      2.08,
    ),
    spawnInterval: clamp(
      base.spawnInterval / Math.sqrt(pressure),
      0.32,
      base.spawnInterval,
    ),
    maxEnemies: Math.min(
      16,
      base.maxEnemies + (tier >= 2 ? 1 : 0),
    ),
    projectilePressure: clamp(
      base.projectilePressure * pressure,
      0.65,
      3.15,
    ),
    bossPressure: clamp(
      base.bossPressure * pressure,
      0.75,
      3.15,
    ),
    pressureBudget: base.pressureBudget * Math.sqrt(pressure),
    urgentThreatCap: Math.min(
      6,
      base.urgentThreatCap + (tier === 3 ? 1 : 0),
    ),
    wordScoreOffset:
      base.wordScoreOffset +
      (tier === 1 ? 4 : tier === 2 ? 9 : 15),
    rewardMultiplier:
      base.rewardMultiplier *
      (tier === 1 ? 1.35 : tier === 2 ? 1.75 : 2.35),
    reactionWindow: Math.max(
      0.42,
      base.reactionWindow /
        Math.sqrt(pressure),
    ),
  };
}

export function hiddenEncounterReward(
  active: ActiveHiddenEncounter,
  accuracy: number,
): HiddenEncounterReward {
  const stageFactor =
    1 + Math.floor((active.sourceStage - 1) / 100) * 0.18;
  const tierFactor =
    active.tier === 1 ? 1 : active.tier === 2 ? 1.65 : 2.45;
  const kindFactor =
    active.kind === "hidden-world"
      ? 1.45
      : active.kind === "champion-hunt"
        ? 1.3
        : 1;
  const accuracyFactor =
    clamp(accuracy, 0, 100) >= 98 ? 1.18 : 1;

  const multiplier =
    stageFactor *
    tierFactor *
    kindFactor *
    accuracyFactor;

  return {
    credits: Math.max(
      120,
      Math.round(
        (180 + active.sourceStage * 4.5) *
          multiplier,
      ),
    ),
    currencies: {
      alloy: Math.max(2, Math.round(3 * multiplier)),
      starCrystal: Math.max(
        1,
        Math.round(
          (active.tier + (active.kind === "hidden-world" ? 1 : 0)) *
            stageFactor,
        ),
      ),
      quantumCore:
        active.tier === 3 &&
        (active.kind === "hidden-world" ||
          active.kind === "champion-hunt") &&
        active.sourceStage >= 500
          ? 1
          : 0,
    },
  };
}

export function hiddenEncounterRuntime(
  active: ActiveHiddenEncounter,
  difficulty: DifficultyProfile,
): HiddenEncounterRuntime {
  const world =
    active.hiddenWorldId === null
      ? null
      : HIDDEN_WORLD_PROFILES.find(
          (entry) => entry.id === active.hiddenWorldId,
        ) ?? null;

  return {
    kind: active.kind,
    tier: active.tier,
    sourceStage: active.sourceStage,
    step: active.step,
    totalSteps: active.totalSteps,
    environmentStageOverride:
      world?.environmentStage ?? null,
    rosterStageOverride:
      world?.rosterStage ?? null,
    bossStageOverride:
      world?.bossStage ?? null,
    forcePriorityTargets:
      active.kind === "champion-hunt",
    enemyBudgetMultiplier:
      active.kind === "champion-hunt"
        ? 0.72
        : active.kind === "hidden-world"
          ? 1.05
          : 0.92 + active.tier * 0.08,
    killChainWindowSeconds:
      priorityKillChainWindowSeconds(
        difficulty,
        active.tier,
      ),
  };
}

export function hiddenEncounterLabel(
  active: ActiveHiddenEncounter,
): string {
  if (active.kind === "hidden-world") {
    const profile = HIDDEN_WORLD_PROFILES.find(
      (entry) => entry.id === active.hiddenWorldId,
    );
    return (
      (profile?.name ?? "Hidden World") +
      " · " +
      String(active.step) +
      "/" +
      String(active.totalSteps)
    );
  }

  if (active.kind === "champion-hunt") {
    return "Champion Hunt";
  }

  return "Hidden Challenge · Tier " + String(active.tier);
}

export function priorityKillChainWindowSeconds(
  difficulty: DifficultyProfile,
  tier: HiddenChallengeTier = 1,
): number {
  return clamp(
    5.2 +
      difficulty.reactionWindow * 2.6 -
      (tier - 1) * 0.55,
    4.5,
    9,
  );
}
