export const DUEL_CONTENT_VERSION = "duel-final-v4";

export const DUEL_PRIVATE_OFFER_COUNT = 5;
export const DUEL_SHARED_OBJECTIVE_LANES = 1;

export const DUEL_INVENTORY_CAPACITY = Object.freeze({
  attack: 3,
  defense: 2,
  tactical: 2,
});

export const DUEL_DEFAULT_REGULATION_SECONDS = 240;
export const DUEL_HARD_OVERTIME_SECONDS = 45;

export type DuelPlayerId = "player-1" | "player-2";

export type DuelActionCategory =
  | "attack"
  | "defense"
  | "support"
  | "tactical"
  | "fate"
  | "mystery";

export type DuelTypingCostBand =
  | "short"
  | "medium"
  | "long"
  | "epic";

export type DuelResolveMode = "instant" | "banked";

export type DuelTargetPolicy =
  | "self"
  | "opponent"
  | "shared"
  | "incoming-threat"
  | "map";

export type DuelCapacityPolicy =
  | "none"
  | "attack-bank"
  | "defense-reserve"
  | "tactical-reserve";

export type DuelResponseOpportunity = {
  mode: "attached-token" | "guaranteed-defense";
  counterTags: readonly string[];
  windowSeconds: number;
  displayLabel: string;
  answerToken: string;
};

export type DuelActionDefinition = {
  id: string;
  category: DuelActionCategory;
  displayLabel: string;
  answerToken: string;
  typingCostBand: DuelTypingCostBand;
  resolveMode: DuelResolveMode;
  targetPolicy: DuelTargetPolicy;
  capacityPolicy: DuelCapacityPolicy;
  energyCost: number;
  cooldownSeconds: number;
  effectId: string;
  counterTags: readonly string[];
  responseOpportunity?: DuelResponseOpportunity;
  mapPresentationId?: string;
  contentVersion: string;
};

export type DuelMatchPhase =
  | "build"
  | "skirmish"
  | "war"
  | "crisis"
  | "cataclysm";

export type DuelOfferStatus =
  | "available"
  | "locked"
  | "completed"
  | "expired"
  | "destroyed"
  | "cancelled";

export type DuelTypingPrompt = {
  promptId: string;
  wordId: string;
  answerToken: string;
  lexiconVersion: string;
  difficultyClass: "core";
};

export type DuelActionOffer = {
  instanceId: string;
  actionId: string;
  ownerId: DuelPlayerId;
  status: DuelOfferStatus;
  typedPrefix: string;
  slotIndex: number;
  shared: boolean;
  /**
   * Production Duel offers carry an authority-issued immutable prompt.
   * Optional only for legacy replay/test fixtures during FINAL V4 migration.
   */
  typingPrompt?: DuelTypingPrompt;
  remainingSeconds?: number | null;
};

export type DuelIntent =
  | {
      type: "TYPE_CHAR";
      playerId: DuelPlayerId;
      sequence: number;
      char: string;
      targetInstanceId?: string;
    }
  | {
      type: "CANCEL_TARGET";
      playerId: DuelPlayerId;
      sequence: number;
      targetInstanceId: string;
    }
  | {
      type: "SELECT_TARGET";
      playerId: DuelPlayerId;
      sequence: number;
      targetInstanceId: string;
    }
  | {
      type: "USE_ITEM";
      playerId: DuelPlayerId;
      sequence: number;
      itemId: string;
    }
  | {
      type: "ACTIVATE_SKILL";
      playerId: DuelPlayerId;
      sequence: number;
      skillId: string;
    };

export type DuelInventoryBucket =
  | "attack"
  | "defense"
  | "tactical";

export function duelInventoryBucketFor(
  action: DuelActionDefinition,
): DuelInventoryBucket | null {
  switch (action.capacityPolicy) {
    case "attack-bank":
      return "attack";
    case "defense-reserve":
      return "defense";
    case "tactical-reserve":
      return "tactical";
    case "none":
      return null;
  }
}

export function duelPhaseForProgress(
  regulationProgress: number,
): DuelMatchPhase {
  const progress = Number.isFinite(regulationProgress)
    ? regulationProgress
    : 0;
  if (progress >= 1) return "cataclysm";
  if (progress >= 0.8) return "crisis";
  if (progress >= 0.5) return "war";
  if (progress >= 0.25) return "skirmish";
  return "build";
}

export function duelRegulationProgress(
  elapsedSeconds: number,
  regulationSeconds = DUEL_DEFAULT_REGULATION_SECONDS,
): number {
  const elapsed = Math.max(
    0,
    Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0,
  );
  const duration = Math.max(
    1,
    Number.isFinite(regulationSeconds) ? regulationSeconds : 1,
  );
  return elapsed / duration;
}
