import { clamp } from "../logic";
import {
  RELIC_IDS,
  RELIC_REGISTRY,
  isRelicId,
  type RelicId,
} from "./registry";

export const MAX_EQUIPPED_RELICS = 3;

export type RelicState = {
  version: 1;
  owned: RelicId[];
  equipped: RelicId[];
};

export type CompiledRelicEffects = {
  firstWordHullRatio: number;
  perfectWordChainRatio: number;
  perfectWordChainTargets: number;
  streakFreezeInterval: number;
  streakFreezeSeconds: number;
  longBossWordMinLength: number;
  longBossWordDamageMultiplier: number;
  mistakeGuardCharges: number;
  mistakeGuardShieldRatio: number;
};

export const EMPTY_COMPILED_RELIC_EFFECTS: CompiledRelicEffects = {
  firstWordHullRatio: 0,
  perfectWordChainRatio: 0,
  perfectWordChainTargets: 0,
  streakFreezeInterval: 0,
  streakFreezeSeconds: 0,
  longBossWordMinLength: 0,
  longBossWordDamageMultiplier: 1,
  mistakeGuardCharges: 0,
  mistakeGuardShieldRatio: 0,
};

export function createRelicState(): RelicState {
  return {
    version: 1,
    owned: [],
    equipped: [],
  };
}

export function sanitizeRelicState(value: unknown): RelicState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return createRelicState();
  }

  const raw = value as {
    owned?: unknown;
    equipped?: unknown;
  };

  const owned = Array.isArray(raw.owned)
    ? RELIC_IDS.filter((id) => raw.owned!.includes(id))
    : [];
  const ownedSet = new Set<RelicId>(owned);
  const equipped = Array.isArray(raw.equipped)
    ? RELIC_IDS.filter(
        (id) => raw.equipped!.includes(id) && ownedSet.has(id),
      ).slice(0, MAX_EQUIPPED_RELICS)
    : [];

  return {
    version: 1,
    owned,
    equipped,
  };
}

export function isValidRelicState(value: unknown): value is RelicState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const raw = value as {
    version?: unknown;
    owned?: unknown;
    equipped?: unknown;
  };

  if (
    raw.version !== 1 ||
    !Array.isArray(raw.owned) ||
    !Array.isArray(raw.equipped) ||
    raw.equipped.length > MAX_EQUIPPED_RELICS ||
    new Set(raw.owned).size !== raw.owned.length ||
    new Set(raw.equipped).size !== raw.equipped.length ||
    !raw.owned.every(isRelicId) ||
    !raw.equipped.every(isRelicId)
  ) {
    return false;
  }

  const owned = new Set(raw.owned as RelicId[]);
  return (raw.equipped as RelicId[]).every((id) => owned.has(id));
}

export function grantRelic(
  stateInput: RelicState,
  id: RelicId,
): { state: RelicState; changed: boolean } {
  const state = sanitizeRelicState(stateInput);
  if (state.owned.includes(id)) {
    return { state, changed: false };
  }

  return {
    state: {
      ...state,
      owned: [...state.owned, id],
    },
    changed: true,
  };
}

export function equipRelic(
  stateInput: RelicState,
  id: RelicId,
): { state: RelicState; changed: boolean } {
  const state = sanitizeRelicState(stateInput);
  if (
    !state.owned.includes(id) ||
    state.equipped.includes(id) ||
    state.equipped.length >= MAX_EQUIPPED_RELICS
  ) {
    return { state, changed: false };
  }

  return {
    state: {
      ...state,
      equipped: [...state.equipped, id],
    },
    changed: true,
  };
}

export function unequipRelic(
  stateInput: RelicState,
  id: RelicId,
): { state: RelicState; changed: boolean } {
  const state = sanitizeRelicState(stateInput);
  if (!state.equipped.includes(id)) {
    return { state, changed: false };
  }

  return {
    state: {
      ...state,
      equipped: state.equipped.filter((current) => current !== id),
    },
    changed: true,
  };
}

export function compileRelicEffects(
  stateInput: RelicState,
): CompiledRelicEffects {
  const state = sanitizeRelicState(stateInput);
  let firstWordHullRatio = 0;
  let perfectWordChainRatio = 0;
  let perfectWordChainTargets = 0;
  let streakFreezeInterval = 0;
  let streakFreezeSeconds = 0;
  let longBossWordMinLength = 0;
  let longBossWordDamageMultiplier = 1;
  let mistakeGuardCharges = 0;
  let mistakeGuardShieldRatio = 0;

  // Compilation happens only when the loadout changes. Combat consumes the
  // resolved scalar fields directly and never scans the relic inventory.
  for (const id of state.equipped) {
    const effect = RELIC_REGISTRY[id].effects;

    firstWordHullRatio += effect.firstWordHullRatio ?? 0;
    perfectWordChainRatio += effect.perfectWordChainRatio ?? 0;
    perfectWordChainTargets += effect.perfectWordChainTargets ?? 0;

    const freezeInterval = effect.streakFreezeInterval ?? 0;
    if (freezeInterval > 0) {
      streakFreezeInterval =
        streakFreezeInterval === 0
          ? freezeInterval
          : Math.min(streakFreezeInterval, freezeInterval);
      streakFreezeSeconds = Math.max(
        streakFreezeSeconds,
        effect.streakFreezeSeconds ?? 0,
      );
    }

    const longWordMin = effect.longBossWordMinLength ?? 0;
    if (longWordMin > 0) {
      longBossWordMinLength =
        longBossWordMinLength === 0
          ? longWordMin
          : Math.min(longBossWordMinLength, longWordMin);
      longBossWordDamageMultiplier *=
        effect.longBossWordDamageMultiplier ?? 1;
    }

    mistakeGuardCharges += effect.mistakeGuardCharges ?? 0;
    const guardCost = effect.mistakeGuardShieldRatio ?? 0;
    if (guardCost > 0) {
      mistakeGuardShieldRatio =
        mistakeGuardShieldRatio === 0
          ? guardCost
          : Math.min(mistakeGuardShieldRatio, guardCost);
    }
  }

  return {
    firstWordHullRatio: clamp(firstWordHullRatio, 0, 0.15),
    perfectWordChainRatio: clamp(perfectWordChainRatio, 0, 0.5),
    perfectWordChainTargets: Math.min(
      5,
      Math.max(0, Math.floor(perfectWordChainTargets)),
    ),
    streakFreezeInterval: Math.max(
      0,
      Math.floor(streakFreezeInterval),
    ),
    streakFreezeSeconds: clamp(streakFreezeSeconds, 0, 3),
    longBossWordMinLength: Math.max(
      0,
      Math.floor(longBossWordMinLength),
    ),
    longBossWordDamageMultiplier: clamp(
      longBossWordDamageMultiplier,
      1,
      1.6,
    ),
    mistakeGuardCharges: Math.min(
      2,
      Math.max(0, Math.floor(mistakeGuardCharges)),
    ),
    mistakeGuardShieldRatio: clamp(
      mistakeGuardShieldRatio,
      0,
      0.25,
    ),
  };
}

function rewardHash(sourceKey: string, sourceStage: number): number {
  let hash = 2166136261 ^ Math.max(1, Math.floor(sourceStage));
  for (const char of sourceKey) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  }
  return hash >>> 0;
}

export function selectRelicReward(
  stateInput: RelicState,
  sourceStage: number,
  sourceKey: string,
): RelicId | null {
  const state = sanitizeRelicState(stateInput);
  const safeStage = Math.max(1, Math.min(1000, Math.floor(sourceStage)));
  const available = RELIC_IDS.filter(
    (id) =>
      !state.owned.includes(id) &&
      RELIC_REGISTRY[id].unlockStage <= safeStage,
  );
  if (available.length === 0) return null;

  const index = rewardHash(sourceKey, safeStage) % available.length;
  return available[index] ?? null;
}
