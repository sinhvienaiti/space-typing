import { describe, expect, it } from "vitest";
import { DuelEngine } from "../src/duel/engine";
import { DUEL_ACTIONS_BY_ID } from "../src/duel/actions";
import { DuelCombatInventory } from "../src/duel/inventory";
import { duelFullBank, duelFullBankLabel } from "../src/duel/offer-availability";
import { duelHorizontalLayout } from "../src/duel/combat-layout";
import type { DuelActionOffer, DuelIntent } from "../src/duel/model";

function setup() {
  const engine = new DuelEngine({ startingEnergy: 100, typingCannon: true });
  const make = (id: string, actionId: string, token: string): DuelActionOffer => ({
    instanceId: id, actionId, ownerId: "player-1", slotIndex: 0, status: "available", typedPrefix: "", shared: false,
    typingPrompt: { promptId: id, wordId: token, answerToken: token, lexiconVersion: "test", difficultyClass: "core" },
  });
  engine.setPrivateOffers("player-1", [make("a", "reflect", "alpha"), make("b", "reflect", "bravo"), make("c", "shield", "provide"), make("d", "repair", "better")]);
  let sequence = 0;
  const send = (intent: Omit<Extract<DuelIntent, { type: "TYPE_CHAR" }>, "playerId" | "sequence"> | Omit<Extract<DuelIntent, { type: "USE_ITEM" }>, "playerId" | "sequence"> | Omit<Extract<DuelIntent, { type: "SELECT_TARGET" }>, "playerId" | "sequence">) => {
    engine.enqueueIntent({ ...intent, playerId: "player-1", sequence: ++sequence });
    return engine.step(0);
  };
  for (const [id, token] of [["a", "alpha"], ["b", "bravo"]]) {
    for (const char of token!) send({ type: "TYPE_CHAR", targetInstanceId: id!, char });
  }
  return { engine, send };
}

describe("full-bank offer availability", () => {
  it("greys only banked offers in the full bucket, not repair or another bank", () => {
    const bank = new DuelCombatInventory();
    const reflect = DUEL_ACTIONS_BY_ID.get("reflect")!;
    bank.store(reflect, 1); bank.store(reflect, 2);
    const full = duelFullBank(DUEL_ACTIONS_BY_ID.get("shield"), bank.snapshot());
    expect(full).toEqual({ bucket: "defense", count: 2, capacity: 2 });
    expect(duelFullBankLabel(full!)).toBe("KHO PHÒNG THỦ ĐẦY 2/2");
    expect(duelFullBank(DUEL_ACTIONS_BY_ID.get("repair"), bank.snapshot())).toBeNull();
    expect(duelFullBank(DUEL_ACTIONS_BY_ID.get("missile"), bank.snapshot())).toBeNull();
    bank.consumeFirstByAction("reflect");
    expect(duelFullBank(DUEL_ACTIONS_BY_ID.get("shield"), bank.snapshot())).toBeNull();
  });

  it("rejects click and explicit typing immediately without spelling penalties or phantom fire", () => {
    const { engine, send } = setup();
    const before = engine.snapshot().players["player-1"];
    const events = [...send({ type: "SELECT_TARGET", targetInstanceId: "c" }), ...send({ type: "TYPE_CHAR", targetInstanceId: "c", char: "p" })];
    expect(events).toContainEqual(expect.objectContaining({ type: "action-blocked", reason: "inventory-full" }));
    expect(events.some(e => e.type === "cannon-fired")).toBe(false);
    const after = engine.snapshot().players["player-1"];
    expect(after.targetInstanceId).toBeNull();
    expect(after.correctChars).toBe(before.correctChars);
    expect(after.wrongChars).toBe(before.wrongChars);
  });

  it("does not acquire a grey target from a keyboard prefix; re-enables after using an item", () => {
    const { engine, send } = setup();
    send({ type: "TYPE_CHAR", char: "p" });
    expect(engine.snapshot().players["player-1"].targetInstanceId).toBeNull();
    send({ type: "USE_ITEM", itemId: "reflect" });
    expect(engine.snapshot().inventories["player-1"].defense).toHaveLength(1);
    for (const char of "provide") send({ type: "TYPE_CHAR", char });
    expect(engine.snapshot().players["player-1"].offers.find(o => o.instanceId === "c")?.status).toBe("completed");
    expect(engine.snapshot().inventories["player-1"].defense).toHaveLength(2);
  });

  it("uses horizontal layout only for wide desktop containers", () => {
    expect(duelHorizontalLayout(1642, 799)).toBe(true);
    expect(duelHorizontalLayout(960, 720)).toBe(true);
    expect(duelHorizontalLayout(844, 390)).toBe(false);
    expect(duelHorizontalLayout(1024, 1366)).toBe(false);
  });

  it("preserves a locked prefix if inventory fills, then accepts the final character after use", () => {
    const { engine, send } = setup();
    send({ type: "USE_ITEM", itemId: "reflect" });
    for (const char of "provid") send({ type: "TYPE_CHAR", targetInstanceId: "c", char });
    // Simulate a bank update while a target is already locked (including legacy state).
    const inventories = (engine as unknown as { inventories: Record<string, DuelCombatInventory> }).inventories;
    inventories["player-1"]!.store(DUEL_ACTIONS_BY_ID.get("reflect")!, 1);
    const before = engine.snapshot().players["player-1"];
    const events = send({ type: "TYPE_CHAR", char: "e" });
    expect(events).toContainEqual(expect.objectContaining({ type: "action-blocked", reason: "inventory-full" }));
    expect(engine.snapshot().players["player-1"].acquisitionPrefix).toBe("provid");
    expect(engine.snapshot().players["player-1"].wrongChars).toBe(before.wrongChars);
    send({ type: "USE_ITEM", itemId: "reflect" });
    send({ type: "TYPE_CHAR", char: "e" });
    expect(engine.snapshot().players["player-1"].offers.find(o => o.instanceId === "c")?.status).toBe("completed");
  });
});
