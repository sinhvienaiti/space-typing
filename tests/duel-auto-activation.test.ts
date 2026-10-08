import { describe, expect, it } from "vitest";
import { DuelEngine, type DuelEngineEvent } from "../src/duel/engine";
import { DUEL_ACTIONS, DUEL_ACTIONS_BY_ID } from "../src/duel/actions";
import { DuelOfferDraft } from "../src/duel/draft";
import { duelLiveActionMapForMap } from "../src/duel/map-actions";
import { duelAutoActionBlock } from "../src/duel/offer-availability";
import type { DuelActionOffer } from "../src/duel/model";

const offer = (id: string, actionId: string): DuelActionOffer => ({ instanceId: id, actionId, ownerId: "player-1", status: "available", typedPrefix: "", slotIndex: 0, shared: false });

describe("Duel immediate item activation", () => {
  it.each(DUEL_ACTIONS.filter(action => action.resolveMode === "banked"))("activates $id once on completion, without storing or pressing another key", action => {
    const engine = new DuelEngine({ autoActivateItems: true, startingEnergy: 100 });
    engine.setPrivateOffers("player-1", [offer("a", action.id)]);
    let sequence = 0;
    const events: DuelEngineEvent[] = [];
    for (const char of action.answerToken) {
      engine.enqueueIntent({ type: "TYPE_CHAR", playerId: "player-1", sequence: ++sequence, targetInstanceId: "a", char });
      events.push(...engine.step(0));
    }
    expect(events.filter(e => e.type === "action-completed")).toHaveLength(1);
    expect(events.filter(e => e.type === "action-fired")).toHaveLength(1);
    expect(events.some(e => e.type === "action-banked" || e.type === "stored-action-used")).toBe(false);
    expect(engine.snapshot().inventories["player-1"]).toEqual({ attack: [], defense: [], tactical: [] });
    expect(engine.snapshot().players["player-1"].energy).toBe(100 - action.energyCost);
    engine.enqueueIntent({ type: "TYPE_CHAR", playerId: "player-1", sequence, targetInstanceId: "a", char: action.answerToken.at(-1)! });
    expect(engine.step(0).some(e => e.type === "action-fired")).toBe(false);
  });

  it("keeps skill damage on the flight clock, not on completion", () => {
    const engine = new DuelEngine({ autoActivateItems: true, typingCannon: true, startingEnergy: 100, startingShield: 0 });
    engine.setPrivateOffers("player-1", [offer("a", "missile")]);
    let sequence = 0;
    for (const char of "missile") {
      engine.enqueueIntent({ type: "TYPE_CHAR", playerId: "player-1", sequence: ++sequence, char });
      engine.step(0);
    }
    expect(engine.snapshot().players["player-2"].hull).toBe(100);
    engine.step(1);
    expect(engine.snapshot().players["player-2"].hull).toBeLessThan(100);
  });

  it("blocks unaffordable acquisition immediately without charging cannon or recording a typo", () => {
    const engine = new DuelEngine({ autoActivateItems: true, typingCannon: true, startingEnergy: 0 });
    engine.setPrivateOffers("player-1", [offer("a", "missile")]);
    engine.enqueueIntent({ type: "TYPE_CHAR", playerId: "player-1", sequence: 1, char: "m" });
    expect(engine.step(0)).toContainEqual(expect.objectContaining({ type: "action-blocked", reason: "insufficient-energy" }));
    const player = engine.snapshot().players["player-1"];
    expect(player.targetInstanceId).toBeNull();
    expect(player.wrongChars).toBe(0);
    expect(player.correctChars).toBe(0);
    expect(duelAutoActionBlock(DUEL_ACTIONS_BY_ID.get("missile"), 0)).toContain("12");
  });

  it("reserves energy across multiple completions in one authority tick", () => {
    const engine = new DuelEngine({ autoActivateItems: true, startingEnergy: 18 });
    engine.setPrivateOffers("player-1", [offer("a", "missile"), { ...offer("b", "missile"), slotIndex: 1 }]);
    let sequence = 0;
    for (const id of ["a", "b"]) for (const char of "missile") engine.enqueueIntent({ type: "TYPE_CHAR", playerId: "player-1", sequence: ++sequence, targetInstanceId: id, char });
    const events = engine.step(0);
    expect(events.filter(e => e.type === "action-fired")).toHaveLength(1);
    expect(engine.snapshot().players["player-1"].energy).toBe(6);
  });

  it("uses instant definitions in client prediction but preserves costs and map appearance", () => {
    for (const action of duelLiveActionMapForMap("frost-wastes").values()) {
      expect(action.resolveMode).toBe("instant");
      expect(action.energyCost).toBe(DUEL_ACTIONS_BY_ID.get(action.id)!.energyCost);
    }
  });

  it("always provides a free energy recovery word with fresh random prompts", () => {
    const draft = new DuelOfferDraft({ seed: 73, ensureEnergyOffer: true });
    let offers = draft.dealPrivateOffers("player-1", "war");
    const words = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const energy = offers.find(o => o.actionId === "energy")!;
      expect(energy).toBeDefined();
      words.add(energy.typingPrompt!.answerToken);
      const others = offers.filter(o => o !== energy);
      offers = [...others, draft.refillPrivateOffer("player-1", energy.slotIndex, "war", others)!];
    }
    expect(words.size).toBeGreaterThan(15);
  });
});
