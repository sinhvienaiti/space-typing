import { describe, expect, it } from "vitest";
import { DUEL_ACTIONS_BY_ID } from "../src/duel/actions";
import { DuelOfferDraft } from "../src/duel/draft";
import { DuelEngine } from "../src/duel/engine";
import {
  DUEL_OFFER_LIFETIME_SECONDS,
  duelOfferLifetimeSeconds,
} from "../src/duel/offer-lifecycle";
import type { DuelActionOffer } from "../src/duel/model";

describe("Duel offer lifetime and expiration", () => {
  it("uses explicit category-specific production lifetimes", () => {
    expect(DUEL_OFFER_LIFETIME_SECONDS).toEqual({
      attack: 18,
      defense: 22,
      support: 20,
      tactical: 22,
      fate: 24,
      mystery: 24,
    });
  });

  it("drafts every offer with the lifetime of its action category", () => {
    const draft = new DuelOfferDraft({
      seed: 1201,
      enabledCategories: [
        "attack",
        "defense",
        "support",
        "tactical",
        "fate",
        "mystery",
      ],
    });
    const offers = draft.dealPrivateOffers(
      "player-1",
      "cataclysm",
    );

    for (const offer of offers) {
      const action = DUEL_ACTIONS_BY_ID.get(
        offer.actionId,
      )!;
      expect(offer.remainingSeconds).toBe(
        duelOfferLifetimeSeconds(action.category),
      );
    }
  });

  it("expires only available offers and never counts expiration as a typing miss", () => {
    const engine = new DuelEngine();
    const offer: DuelActionOffer = {
      instanceId: "expiring:laser",
      actionId: "laser",
      ownerId: "player-1",
      status: "available",
      typedPrefix: "",
      slotIndex: 0,
      shared: false,
      remainingSeconds: 0.05,
    };
    engine.setPrivateOffers("player-1", [offer]);

    expect(engine.step(0.04)).not.toContainEqual(
      expect.objectContaining({
        type: "offer-expired",
      }),
    );
    const events = engine.step(0.02);
    expect(events).toContainEqual({
      type: "offer-expired",
      playerId: "player-1",
      targetInstanceId: offer.instanceId,
      actionId: "laser",
      slotIndex: 0,
    });

    const state = engine.snapshot().players["player-1"];
    expect(state.offers[0]?.status).toBe("expired");
    expect(state.wrongChars).toBe(0);
  });

  it("pauses offer lifetime while the player owns a typing lock", () => {
    const engine = new DuelEngine();
    const offer: DuelActionOffer = {
      instanceId: "locked:laser",
      actionId: "laser",
      ownerId: "player-1",
      status: "available",
      typedPrefix: "",
      slotIndex: 0,
      shared: false,
      remainingSeconds: 0.05,
    };
    engine.setPrivateOffers("player-1", [offer]);
    engine.enqueueIntent({
      type: "SELECT_TARGET",
      playerId: "player-1",
      sequence: 1,
      targetInstanceId: offer.instanceId,
    });
    engine.step(0);

    const before =
      engine.snapshot().players["player-1"].offers[0]
        ?.remainingSeconds;
    const events = engine.step(10);

    expect(
      events.some(
        (event) => event.type === "offer-expired",
      ),
    ).toBe(false);
    const locked =
      engine.snapshot().players["player-1"].offers[0]!;
    expect(locked.status).toBe("locked");
    expect(locked.remainingSeconds).toBe(before);
    expect(
      engine.snapshot().players["player-1"].targetInstanceId,
    ).toBe(offer.instanceId);
  });

  it("resumes the remaining lifetime after voluntary cancel", () => {
    const engine = new DuelEngine();
    const offer: DuelActionOffer = {
      instanceId: "cancel:laser",
      actionId: "laser",
      ownerId: "player-1",
      status: "available",
      typedPrefix: "",
      slotIndex: 0,
      shared: false,
      remainingSeconds: 0.2,
    };
    engine.setPrivateOffers("player-1", [offer]);
    engine.enqueueIntent({
      type: "SELECT_TARGET",
      playerId: "player-1",
      sequence: 1,
      targetInstanceId: offer.instanceId,
    });
    engine.step(0);
    engine.enqueueIntent({
      type: "CANCEL_TARGET",
      playerId: "player-1",
      sequence: 2,
      targetInstanceId: offer.instanceId,
    });
    engine.step(0);

    expect(
      engine.snapshot().players["player-1"].offers[0]?.status,
    ).toBe("available");
    const events = engine.step(0.21);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "offer-expired",
        targetInstanceId: offer.instanceId,
      }),
    );
  });
});
