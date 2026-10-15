import { describe, expect, it } from "vitest";
import { DuelEngine } from "../src/duel/engine";
import type { DuelPlayerId } from "../src/duel/model";
import { DUEL_CANNON_TRAVEL_MS, DUEL_PROJECTILE_BASE_TRAVEL_MS } from "../src/duel/presentation-timing";

const CANNON_S = DUEL_CANNON_TRAVEL_MS / 1000;
const ATTACK_S = DUEL_PROJECTILE_BASE_TRAVEL_MS / 1000;

function setup() {
  const engine = new DuelEngine({ typingCannon: true, startingShield: 0, hazardIntervalScale: 100 });
  for (const playerId of ["player-1", "player-2"] as const) {
    engine.setPrivateOffers(playerId, [{ instanceId: playerId + ":energy", actionId: "energy", ownerId: playerId, status: "available", slotIndex: 0, shared: false, typedPrefix: "", remainingSeconds: null }]);
  }
  return engine;
}
function type(engine: DuelEngine, char: string, sequence: number, playerId: DuelPlayerId = "player-1") {
  engine.enqueueIntent({ type: "TYPE_CHAR", playerId, sequence, char });
  return engine.step(0);
}

describe("authoritative typing cannon", () => {
  it("fires while typing support, but damage arrives only after flight", () => {
    const engine = setup();
    expect(type(engine, "e", 1).some(e => e.type === "cannon-fired")).toBe(false);
    expect(type(engine, "n", 2)).toContainEqual(expect.objectContaining({ type: "cannon-fired", travelMs: DUEL_CANNON_TRAVEL_MS }));
    expect(engine.snapshot().players["player-2"].hull).toBe(100);
    engine.step(CANNON_S - .001);
    expect(engine.snapshot().players["player-2"].hull).toBe(100);
    expect(engine.step(.001)).toContainEqual(expect.objectContaining({ type: "cannon-hit" }));
    expect(engine.snapshot().players["player-2"].hull).toBe(98.5);
    engine.step(.5);
    expect(engine.snapshot().players["player-2"].hull).toBe(98.5);
  });
  it("does not grant fire for wrong or replayed input", () => {
    const engine = setup();
    type(engine, "x", 1);
    type(engine, "e", 2);
    expect(type(engine, "n", 2).some(e => e.type === "cannon-fired")).toBe(false);
    engine.step(1);
    expect(engine.snapshot().players["player-2"].hull).toBe(100);
  });
  it("caps same-tick bursts and never fires queued charge while idle", () => {
    const engine = setup();
    const events = [..."energy"].flatMap((char, i) => type(engine, char, i + 1));
    expect(events.filter(e => e.type === "cannon-fired")).toHaveLength(1);
    expect(engine.step(1).filter(e => e.type === "cannon-hit")).toHaveLength(1);
    expect(engine.step(1).some(e => e.type === "cannon-fired")).toBe(false);
  });
  it("resolves opposing shots in one tick, independent of player order", () => {
    const engine = setup();
    for (const playerId of ["player-2", "player-1"] as const) {
      type(engine, "e", 1, playerId);
      type(engine, "n", 2, playerId);
    }
    expect(engine.step(CANNON_S).filter(e => e.type === "cannon-hit")).toHaveLength(2);
    const players = engine.snapshot().players;
    expect(players["player-1"].hull).toBe(players["player-2"].hull);
  });
  it("clears inflight damage on round reset", () => {
    const engine = setup();
    type(engine, "e", 1);
    type(engine, "n", 2);
    engine.resetRound();
    expect(engine.step(1).some(e => e.type === "cannon-hit")).toBe(false);
    expect(engine.snapshot().players["player-2"].hull).toBe(100);
  });
  it("cannot farm cannon damage by cancelling and retyping the same prefix", () => {
    const engine = setup();
    type(engine, "e", 1);
    type(engine, "n", 2);
    engine.step(CANNON_S);
    engine.enqueueIntent({ type: "CANCEL_TARGET", playerId: "player-1", targetInstanceId: "player-1:energy", sequence: 3 });
    engine.step(0);
    expect(type(engine, "e", 4).some(e => e.type === "cannon-fired")).toBe(false);
    expect(type(engine, "n", 5).some(e => e.type === "cannon-fired")).toBe(false);
    engine.step(CANNON_S);
    expect(engine.snapshot().players["player-2"].hull).toBe(98.5);
    type(engine, "e", 6);
    expect(type(engine, "r", 7).some(e => e.type === "cannon-fired")).toBe(true);
  });
  it("delays completed laser damage too, with no immediate HP loss", () => {
    const engine = setup();
    engine.setPrivateOffers("player-1", [{ instanceId: "laser", actionId: "laser", ownerId: "player-1", status: "available", slotIndex: 0, shared: false, typedPrefix: "", remainingSeconds: null }]);
    for (const [i, char] of [..."laser"].entries()) type(engine, char, i + 1);
    expect(engine.snapshot().players["player-2"].hull).toBe(100);
    engine.step(CANNON_S);
    expect(engine.snapshot().players["player-2"].hull).toBe(98.5);
    engine.step(ATTACK_S - CANNON_S);
    expect(engine.snapshot().players["player-2"].hull).toBe(88.5);
  });

  it.each(["direct", "intent"] as const)("delays combo damage on the %s path", (path) => {
    const engine = new DuelEngine({ typingCannon: true, startingShield: 0, startingEnergy: 100, hazardIntervalScale: 100 });
    let sequence = 0;
    for (const actionId of ["energy", "missile", "lock-on"]) {
      engine.setPrivateOffers("player-1", [{ instanceId: actionId, actionId, ownerId: "player-1", status: "available", slotIndex: 0, shared: false, typedPrefix: "", remainingSeconds: null }]);
      for (const char of actionId.replaceAll("-", "")) type(engine, char, ++sequence);
    }
    engine.step(1); // Let the primary cannon land before measuring the combo.
    const before = engine.snapshot().players["player-2"].hull;
    let events;
    if (path === "direct") {
      events = engine.useCombo("player-1", "homing-barrage");
    } else {
      engine.enqueueIntent({ type: "ACTIVATE_SKILL", playerId: "player-1", skillId: "combo:homing-barrage", sequence: ++sequence });
      events = engine.step(0);
    }
    expect(events).toContainEqual({ type: "combo-used", playerId: "player-1", comboId: "homing-barrage" });
    expect(engine.snapshot().players["player-2"].hull).toBe(before);
    engine.step(ATTACK_S - .001);
    expect(engine.snapshot().players["player-2"].hull).toBe(before);
    engine.step(.002);
    expect(engine.snapshot().players["player-2"].hull).toBe(before - 26);
  });
});
