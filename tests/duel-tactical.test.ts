import { describe, expect, it } from "vitest";
import { DUEL_ACTIONS_BY_ID } from "../src/duel/actions";
import { DuelCombatInventory } from "../src/duel/inventory";
import { DuelTacticalMapState } from "../src/duel/tactical";
import { DuelThreatSystem } from "../src/duel/threats";

describe("Duel M-DUEL-04 tactical contracts", () => {
  it("enforces the FINAL V3 3/2/2 stored inventory capacity", () => {
    const inventory = new DuelCombatInventory();
    const missile = DUEL_ACTIONS_BY_ID.get("missile")!;
    const barrier = DUEL_ACTIONS_BY_ID.get("barrier")!;
    const disrupt = DUEL_ACTIONS_BY_ID.get("disrupt")!;

    expect(inventory.store(missile, 1).stored).toBe(true);
    expect(inventory.store(missile, 2).stored).toBe(true);
    expect(inventory.store(missile, 3).stored).toBe(true);
    expect(inventory.store(missile, 4)).toEqual({
      stored: false,
      bucket: "attack",
      reason: "full",
    });

    expect(inventory.store(barrier, 5).stored).toBe(true);
    expect(inventory.store(barrier, 6).stored).toBe(true);
    expect(inventory.store(barrier, 7)).toEqual({
      stored: false,
      bucket: "defense",
      reason: "full",
    });

    expect(inventory.store(disrupt, 8).stored).toBe(true);
    expect(inventory.store(disrupt, 9).stored).toBe(true);
    expect(inventory.store(disrupt, 10)).toEqual({
      stored: false,
      bucket: "tactical",
      reason: "full",
    });
  });

  it("does not bank instant actions", () => {
    const inventory = new DuelCombatInventory();
    const laser = DUEL_ACTIONS_BY_ID.get("laser")!;
    expect(inventory.store(laser, 1)).toEqual({
      stored: false,
      bucket: null,
      reason: "not-bankable",
    });
  });

  it("gives a strong attack its own deterministic counter token", () => {
    const threats = new DuelThreatSystem();
    const siege = DUEL_ACTIONS_BY_ID.get("siege-lance")!;
    const threat = threats.create(
      siege,
      "player-1",
      "player-2",
    );

    expect(threat).toEqual(
      expect.objectContaining({
        displayLabel: "INTERCEPT",
        answerToken: "intercept",
        remainingSeconds: 2.8,
      }),
    );

    for (const char of "intercept") {
      threats.typeChar("player-2", threat!.id, char);
    }
    expect(threats.update(0)).toEqual([
      expect.objectContaining({
        threatId: threat!.id,
        outcome: "countered",
      }),
    ]);
  });

  it("expires an unanswered threat instead of depending on random Defense offers", () => {
    const threats = new DuelThreatSystem();
    const siege = DUEL_ACTIONS_BY_ID.get("siege-lance")!;
    const threat = threats.create(
      siege,
      "player-1",
      "player-2",
    )!;

    expect(threats.update(2.79)).toEqual([]);
    expect(threats.snapshotFor("player-2")).toHaveLength(1);
    expect(threats.update(0.02)).toEqual([
      expect.objectContaining({
        threatId: threat.id,
        outcome: "expired",
      }),
    ]);
  });

  it("does not advance a counter token on wrong typing", () => {
    const threats = new DuelThreatSystem();
    const siege = DUEL_ACTIONS_BY_ID.get("siege-lance")!;
    const threat = threats.create(
      siege,
      "player-1",
      "player-2",
    )!;

    expect(
      threats.typeChar("player-2", threat.id, "x"),
    ).toEqual({ kind: "wrong", completed: false });
    expect(
      threats.snapshotFor("player-2")[0]?.typedPrefix,
    ).toBe("");
  });

  it("keeps tactical map effects bounded and temporary", () => {
    const state = new DuelTacticalMapState();
    state.apply({
      effectId: "projectile-drag",
      sourcePlayerId: "player-1",
      targetPlayerId: "player-2",
      strength: 1,
      remainingSeconds: 2,
    });
    state.apply({
      effectId: "control-pressure",
      sourcePlayerId: "player-1",
      targetPlayerId: null,
      strength: 0.7,
      remainingSeconds: 3,
    });

    let snapshot = state.snapshot();
    expect(snapshot.projectileSpeedScale).toBeGreaterThanOrEqual(0.5);
    expect(snapshot.projectileSpeedScale).toBeLessThan(1);
    expect(snapshot.controlPressure["player-1"]).toBeCloseTo(0.7);

    state.update(3.1);
    snapshot = state.snapshot();
    expect(snapshot.projectileSpeedScale).toBe(1);
    expect(snapshot.controlPressure["player-1"]).toBe(0);
  });
});
