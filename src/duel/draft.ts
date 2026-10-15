import { DUEL_ACTIONS } from "./actions";
import type {
  DuelActionCategory,
  DuelActionDefinition,
  DuelActionOffer,
  DuelMatchPhase,
  DuelPlayerId,
} from "./model";
import { DUEL_PRIVATE_OFFER_COUNT } from "./model";
import { DuelRng } from "./rng";
import { duelOfferLifetimeSeconds } from "./offer-lifecycle";
import {
  DuelWordDirector,
  type DuelWordDirectorDiagnostics,
} from "./word-director";

export const DUEL_PHASE_CATEGORY_WEIGHTS: Readonly<
  Record<DuelMatchPhase, Readonly<Record<DuelActionCategory, number>>>
> = {
  build: {
    attack: 25,
    defense: 34,
    support: 34,
    tactical: 5,
    fate: 0,
    mystery: 2,
  },
  skirmish: {
    attack: 35,
    defense: 25,
    support: 25,
    tactical: 10,
    fate: 3,
    mystery: 2,
  },
  war: {
    attack: 42,
    defense: 20,
    support: 18,
    tactical: 13,
    fate: 4,
    mystery: 3,
  },
  crisis: {
    attack: 47,
    defense: 13,
    support: 12,
    tactical: 17,
    fate: 6,
    mystery: 5,
  },
  cataclysm: {
    attack: 52,
    defense: 8,
    support: 8,
    tactical: 18,
    fate: 8,
    mystery: 6,
  },
};

export const DUEL_CORE_DRAFT_CATEGORIES = [
  "attack",
  "defense",
  "support",
] as const satisfies readonly DuelActionCategory[];

export type DuelOfferDraftConfig = {
  /** Auto-use combat must always have a free recovery word, never three unaffordable skills. */
  ensureEnergyOffer?: boolean;
  seed: number;
  actions?: readonly DuelActionDefinition[];
  enabledCategories?: readonly DuelActionCategory[];
  categoryMultiplier?: Partial<
    Readonly<Record<DuelActionCategory, number>>
  >;
};

type WeightedAction = {
  action: DuelActionDefinition;
  weight: number;
};

function firstChar(action: DuelActionDefinition): string {
  return action.answerToken[0] ?? "";
}

function categoryWeight(
  phase: DuelMatchPhase,
  category: DuelActionCategory,
): number {
  return DUEL_PHASE_CATEGORY_WEIGHTS[phase][category];
}

export function normalizedDuelCategoryWeights(
  phase: DuelMatchPhase,
  enabledCategories: readonly DuelActionCategory[],
  categoryMultiplier: Partial<
    Readonly<Record<DuelActionCategory, number>>
  > = {},
): Readonly<Record<DuelActionCategory, number>> {
  const enabled = new Set(enabledCategories);
  let total = 0;
  for (const category of enabled) {
    const multiplier = Math.max(
      0,
      Number.isFinite(categoryMultiplier[category])
        ? categoryMultiplier[category]!
        : 1,
    );
    total += Math.max(0, categoryWeight(phase, category)) * multiplier;
  }

  const result: Record<DuelActionCategory, number> = {
    attack: 0,
    defense: 0,
    support: 0,
    tactical: 0,
    fate: 0,
    mystery: 0,
  };
  if (total <= 0) return result;

  for (const category of enabled) {
    const multiplier = Math.max(
      0,
      Number.isFinite(categoryMultiplier[category])
        ? categoryMultiplier[category]!
        : 1,
    );
    result[category] =
      (Math.max(0, categoryWeight(phase, category)) * multiplier) /
      total;
  }
  return result;
}

export class DuelOfferDraft {
  private readonly ensureEnergyOffer: boolean;
  private readonly rng: DuelRng;
  private readonly actions: readonly DuelActionDefinition[];
  private readonly enabledCategories: readonly DuelActionCategory[];
  private readonly categoryMultiplier: Partial<
    Readonly<Record<DuelActionCategory, number>>
  >;
  private readonly words: DuelWordDirector;
  private nextInstance = 1;

  constructor(config: DuelOfferDraftConfig) {
    this.ensureEnergyOffer = config.ensureEnergyOffer ?? false;
    this.rng = new DuelRng(config.seed);
    this.actions = config.actions ?? DUEL_ACTIONS;
    this.enabledCategories =
      config.enabledCategories ?? DUEL_CORE_DRAFT_CATEGORIES;
    this.categoryMultiplier = config.categoryMultiplier ?? {};
    this.words = new DuelWordDirector({
      seed: config.seed,
      actions: this.actions,
    });
  }

  wordDiagnostics(): DuelWordDirectorDiagnostics {
    return this.words.diagnostics();
  }

  dealPrivateOffers(
    playerId: DuelPlayerId,
    phase: DuelMatchPhase,
    count = DUEL_PRIVATE_OFFER_COUNT,
  ): DuelActionOffer[] {
    const offers: DuelActionOffer[] = [];
    const safeCount = Math.max(0, Math.floor(count));
    for (let slotIndex = 0; slotIndex < safeCount; slotIndex += 1) {
      const next = this.refillPrivateOffer(
        playerId,
        slotIndex,
        phase,
        offers,
      );
      if (next === null) break;
      offers.push(next);
    }
    return offers;
  }

  refillPrivateOffer(
    playerId: DuelPlayerId,
    slotIndex: number,
    phase: DuelMatchPhase,
    existingOffers: readonly DuelActionOffer[],
    runtimeCategoryMultiplier: Partial<
      Readonly<Record<DuelActionCategory, number>>
    > = {},
    acquisitionPrefix = "",
  ): DuelActionOffer | null {
    const existingActionIds = new Set(
      existingOffers
        .filter(
          (offer) =>
            offer.status === "available" ||
            offer.status === "locked",
        )
        .map((offer) => offer.actionId),
    );
    const existingInitials = new Set(
      existingOffers
        .filter(
          (offer) =>
            offer.status === "available" ||
            offer.status === "locked",
        )
        .map((offer) =>
          this.actions.find((action) => action.id === offer.actionId),
        )
        .filter(
          (action): action is DuelActionDefinition =>
            action !== undefined,
        )
        .map(firstChar),
    );

    const eligible = this.actions.filter(
      (action) =>
        this.enabledCategories.includes(action.category) &&
        !existingActionIds.has(action.id),
    );
    const fallback = this.actions.filter((action) =>
      this.enabledCategories.includes(action.category),
    );
    const source = eligible.length > 0 ? eligible : fallback;
    if (source.length === 0) return null;

    const weighted = this.weightedActions(
      source,
      phase,
      existingInitials,
      runtimeCategoryMultiplier,
    );
    const recovery = this.ensureEnergyOffer && !existingActionIds.has("energy")
      ? source.find(action => action.id === "energy" && action.energyCost === 0 && action.cooldownSeconds === 0)
      : undefined;
    const action = recovery ?? this.pick(weighted);
    if (action === null) return null;

    const instanceId =
      "offer:" +
      playerId +
      ":" +
      String(this.nextInstance++);
    const typingPrompt = this.words.issuePrompt({
      instanceId,
      action,
      activeOffers: existingOffers,
      acquisitionPrefix,
    });
    if (typingPrompt === null) return null;

    return {
      instanceId,
      actionId: action.id,
      ownerId: playerId,
      status: "available",
      typedPrefix: "",
      slotIndex: Math.max(0, Math.floor(slotIndex)),
      shared: false,
      typingPrompt,
      remainingSeconds:
        duelOfferLifetimeSeconds(action.category),
    };
  }

  private weightedActions(
    actions: readonly DuelActionDefinition[],
    phase: DuelMatchPhase,
    usedInitials: ReadonlySet<string>,
    runtimeCategoryMultiplier: Partial<
      Readonly<Record<DuelActionCategory, number>>
    >,
  ): WeightedAction[] {
    const combinedMultiplier: Partial<
      Record<DuelActionCategory, number>
    > = {};
    for (const category of this.enabledCategories) {
      combinedMultiplier[category] =
        (this.categoryMultiplier[category] ?? 1) *
        (runtimeCategoryMultiplier[category] ?? 1);
    }
    const normalized = normalizedDuelCategoryWeights(
      phase,
      this.enabledCategories,
      combinedMultiplier,
    );
    return actions.map((action) => {
      const base = Math.max(0, normalized[action.category]);
      const prefixDiversity =
        usedInitials.has(firstChar(action)) ? 0.34 : 1;
      return {
        action,
        weight: base * prefixDiversity,
      };
    });
  }

  private pick(
    weighted: readonly WeightedAction[],
  ): DuelActionDefinition | null {
    let total = 0;
    for (const entry of weighted) {
      total += Math.max(0, entry.weight);
    }
    if (total <= 0) return null;

    let roll = this.rng.nextFloat() * total;
    for (const entry of weighted) {
      if (entry.weight <= 0) continue;
      roll -= entry.weight;
      if (roll <= 0) return entry.action;
    }
    return weighted.find((entry) => entry.weight > 0)?.action ?? null;
  }
}
