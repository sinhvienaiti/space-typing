import { describe, expect, it } from "vitest";
import { DUEL_ACTIONS_BY_ID } from "../src/duel/actions";
import {
  DUEL_CORE_DRAFT_CATEGORIES,
  DUEL_PHASE_CATEGORY_WEIGHTS,
  DuelOfferDraft,
  normalizedDuelCategoryWeights,
} from "../src/duel/draft";
import { DuelEngine } from "../src/duel/engine";

describe("Duel M-DUEL-03 core word draft", () => {
  it("keeps the FINAL V3 phase distributions", () => {
    expect(DUEL_PHASE_CATEGORY_WEIGHTS.build).toEqual({
      attack: 25,
      defense: 34,
      support: 34,
      tactical: 5,
      fate: 0,
      mystery: 2,
    });
    expect(DUEL_PHASE_CATEGORY_WEIGHTS.cataclysm).toEqual({
      attack: 52,
      defense: 8,
      support: 8,
      tactical: 18,
      fate: 8,
      mystery: 6,
    });
  });

  it("treats a zero category multiplier as truly disabled", () => {
    const weights = normalizedDuelCategoryWeights(
      "cataclysm",
      ["attack", "mystery"],
      { attack: 1, mystery: 0 },
    );
    expect(weights.attack).toBe(1);
    expect(weights.mystery).toBe(0);

    const disabled = new DuelOfferDraft({
      seed: 12,
      actions: [
        DUEL_ACTIONS_BY_ID.get("laser")!,
        DUEL_ACTIONS_BY_ID.get("black-hole")!,
      ],
      enabledCategories: ["attack", "mystery"],
      categoryMultiplier: { mystery: 0 },
    });
    for (let slot = 0; slot < 20; slot += 1) {
      expect(
        disabled.refillPrivateOffer(
          "player-1",
          slot,
          "cataclysm",
          [],
        )?.actionId,
      ).toBe("laser");
    }
  });

  it("renormalizes phase weights when only core categories are enabled", () => {
    const build = normalizedDuelCategoryWeights(
      "build",
      DUEL_CORE_DRAFT_CATEGORIES,
    );
    const crisis = normalizedDuelCategoryWeights(
      "crisis",
      DUEL_CORE_DRAFT_CATEGORIES,
    );

    expect(
      build.attack + build.defense + build.support,
    ).toBeCloseTo(1, 8);
    expect(
      crisis.attack + crisis.defense + crisis.support,
    ).toBeCloseTo(1, 8);
    expect(crisis.attack).toBeGreaterThan(build.attack);
    expect(crisis.defense).toBeLessThan(build.defense);
  });

  it("deals five deterministic private offers from Attack/Defense/Support", () => {
    const left = new DuelOfferDraft({ seed: 12345 });
    const right = new DuelOfferDraft({ seed: 12345 });

    const a = left.dealPrivateOffers("player-1", "build");
    const b = right.dealPrivateOffers("player-1", "build");

    expect(a).toHaveLength(5);
    expect(a.map((offer) => offer.actionId)).toEqual(
      b.map((offer) => offer.actionId),
    );
    expect(
      a.every((offer) => {
        const action = DUEL_ACTIONS_BY_ID.get(offer.actionId);
        return (
          action !== undefined &&
          DUEL_CORE_DRAFT_CATEGORIES.includes(
            action.category as (typeof DUEL_CORE_DRAFT_CATEGORIES)[number],
          )
        );
      }),
    ).toBe(true);
  });

  it("avoids duplicate actions while enough core definitions are available", () => {
    const draft = new DuelOfferDraft({ seed: 99 });
    const offers = draft.dealPrivateOffers(
      "player-1",
      "skirmish",
    );
    expect(new Set(offers.map((offer) => offer.actionId)).size).toBe(
      offers.length,
    );
  });

  it("prefers prefix-diverse visible offers without indefinite rerolls", () => {
    const draft = new DuelOfferDraft({ seed: 3 });
    const offers = draft.dealPrivateOffers("player-1", "war");
    const initials = offers.map(
      (offer) =>
        DUEL_ACTIONS_BY_ID.get(offer.actionId)?.answerToken[0],
    );
    expect(new Set(initials).size).toBeGreaterThanOrEqual(4);
  });

  it("lets runtime strategy affinity bias a refill without replacing phase rules", () => {
    const actions = [
      DUEL_ACTIONS_BY_ID.get("laser")!,
      DUEL_ACTIONS_BY_ID.get("scan")!,
    ];
    const base = new DuelOfferDraft({
      seed: 9,
      actions,
      enabledCategories: ["attack", "tactical"],
    });
    const tactical = new DuelOfferDraft({
      seed: 9,
      actions,
      enabledCategories: ["attack", "tactical"],
    });

    const baseOffer = base.refillPrivateOffer(
      "player-1",
      0,
      "war",
      [],
    );
    const tacticalOffer = tactical.refillPrivateOffer(
      "player-1",
      0,
      "war",
      [],
      { attack: 0, tactical: 1 },
    );

    expect(baseOffer).not.toBeNull();
    expect(tacticalOffer?.actionId).toBe("scan");
  });

  it("refills a specific slot deterministically after completion", () => {
    const draft = new DuelOfferDraft({ seed: 42 });
    const offers = draft.dealPrivateOffers("player-1", "build");
    const completed = { ...offers[2]!, status: "completed" as const };
    const existing = offers.map((offer, index) =>
      index === 2 ? completed : offer,
    );
    const refill = draft.refillPrivateOffer(
      "player-1",
      2,
      "build",
      existing,
    );

    expect(refill).not.toBeNull();
    expect(refill?.slotIndex).toBe(2);
    expect(refill?.status).toBe("available");
    expect(refill?.shared).toBe(false);
  });

  it("plugs drafted offers directly into the deterministic DuelEngine", () => {
    const draft = new DuelOfferDraft({ seed: 765 });
    const offers = draft.dealPrivateOffers(
      "player-1",
      "build",
    );
    const engine = new DuelEngine();
    engine.setPrivateOffers("player-1", offers);

    const snapshot = engine.snapshot();
    expect(snapshot.players["player-1"].offers).toHaveLength(5);
    expect(
      snapshot.players["player-1"].offers.map(
        (offer) => offer.instanceId,
      ),
    ).toEqual(offers.map((offer) => offer.instanceId));
  });
});
