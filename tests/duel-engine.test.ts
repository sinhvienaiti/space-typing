import { describe, expect, it } from "vitest";
import { DuelEngine } from "../src/duel/engine";
import type {
  DuelActionOffer,
  DuelPlayerId,
} from "../src/duel/model";

function offer(
  ownerId: DuelPlayerId,
  slotIndex: number,
  actionId: string,
): DuelActionOffer {
  return {
    instanceId: ownerId + "-" + String(slotIndex) + "-" + actionId,
    actionId,
    ownerId,
    status: "available",
    typedPrefix: "",
    slotIndex,
    shared: false,
  };
}

function typeWord(
  engine: DuelEngine,
  playerId: DuelPlayerId,
  startSequence: number,
  word: string,
): void {
  let sequence = startSequence;
  for (const char of word) {
    engine.enqueueIntent({
      type: "TYPE_CHAR",
      playerId,
      sequence,
      char,
    });
    sequence += 1;
  }
}

describe("DuelEngine M-DUEL-01 local simulation", () => {
  it("tracks simultaneous typing for two logical players in one tick batch", () => {
    const engine = new DuelEngine();
    engine.setPrivateOffers("player-1", [
      offer("player-1", 0, "laser"),
    ]);
    engine.setPrivateOffers("player-2", [
      offer("player-2", 0, "repair"),
    ]);

    typeWord(engine, "player-1", 1, "laser");
    typeWord(engine, "player-2", 1, "repair");
    const events = engine.step(1 / 60);

    expect(
      events.filter((event) => event.type === "action-completed"),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          playerId: "player-1",
          actionId: "laser",
        }),
        expect.objectContaining({
          playerId: "player-2",
          actionId: "repair",
        }),
      ]),
    );
  });

  it("holds an ambiguous prefix until target ownership becomes deterministic", () => {
    const engine = new DuelEngine();
    engine.setPrivateOffers("player-1", [
      offer("player-1", 0, "laser"),
      offer("player-1", 1, "lock-on"),
    ]);

    engine.enqueueIntent({
      type: "TYPE_CHAR",
      playerId: "player-1",
      sequence: 1,
      char: "l",
    });
    engine.step(1 / 60);
    let player = engine.snapshot().players["player-1"];
    expect(player.targetInstanceId).toBeNull();
    expect(player.acquisitionPrefix).toBe("l");

    engine.enqueueIntent({
      type: "TYPE_CHAR",
      playerId: "player-1",
      sequence: 2,
      char: "a",
    });
    const events = engine.step(1 / 60);
    player = engine.snapshot().players["player-1"];
    expect(player.targetInstanceId).toContain("laser");
    expect(player.acquisitionPrefix).toBe("la");
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "target-locked",
        playerId: "player-1",
      }),
    );
  });

  it("does not advance on a wrong key and counts the miss", () => {
    const engine = new DuelEngine();
    engine.setPrivateOffers("player-1", [
      offer("player-1", 0, "laser"),
    ]);

    engine.enqueueIntent({
      type: "TYPE_CHAR",
      playerId: "player-1",
      sequence: 1,
      char: "l",
    });
    engine.enqueueIntent({
      type: "TYPE_CHAR",
      playerId: "player-1",
      sequence: 2,
      char: "x",
    });
    engine.step(1 / 60);

    const player = engine.snapshot().players["player-1"];
    expect(player.acquisitionPrefix).toBe("l");
    expect(player.correctChars).toBe(1);
    expect(player.wrongChars).toBe(1);
  });

  it("rejects stale or duplicate intent sequence numbers", () => {
    const engine = new DuelEngine();
    engine.setPrivateOffers("player-1", [
      offer("player-1", 0, "laser"),
    ]);

    engine.enqueueIntent({
      type: "TYPE_CHAR",
      playerId: "player-1",
      sequence: 4,
      char: "l",
    });
    engine.enqueueIntent({
      type: "TYPE_CHAR",
      playerId: "player-1",
      sequence: 4,
      char: "a",
    });
    const events = engine.step(1 / 60);

    expect(events).toContainEqual(
      expect.objectContaining({
        type: "intent-rejected",
        reason: "stale-sequence",
      }),
    );
    expect(
      engine.snapshot().players["player-1"].acquisitionPrefix,
    ).toBe("l");
  });

  it("keeps an acquired target locked until explicit cancel or completion", () => {
    const engine = new DuelEngine();
    const laser = offer("player-1", 0, "laser");
    const repair = offer("player-1", 1, "repair");
    engine.setPrivateOffers("player-1", [laser, repair]);

    engine.enqueueIntent({
      type: "SELECT_TARGET",
      playerId: "player-1",
      sequence: 1,
      targetInstanceId: laser.instanceId,
    });
    engine.enqueueIntent({
      type: "TYPE_CHAR",
      playerId: "player-1",
      sequence: 2,
      char: "l",
    });
    engine.step(1 / 60);

    expect(
      engine.snapshot().players["player-1"].targetInstanceId,
    ).toBe(laser.instanceId);

    engine.enqueueIntent({
      type: "CANCEL_TARGET",
      playerId: "player-1",
      sequence: 3,
      targetInstanceId: laser.instanceId,
    });
    engine.step(1 / 60);

    const player = engine.snapshot().players["player-1"];
    expect(player.targetInstanceId).toBeNull();
    expect(player.offers[0]?.status).toBe("available");
    expect(player.wrongChars).toBe(0);
  });

  it("resolves simultaneous lethal damage as a drawn round", () => {
    const engine = new DuelEngine({
      maxHull: 100,
      maxShield: 0,
      startingShield: 0,
    });

    const events = engine.applyTickEffects([
      { type: "damage", targetId: "player-1", amount: 100 },
      { type: "damage", targetId: "player-2", amount: 100 },
    ]);

    expect(engine.snapshot().round).toEqual({
      status: "draw",
      winnerId: null,
    });
    expect(events).toContainEqual({
      type: "round-ended",
      result: { status: "draw", winnerId: null },
    });
  });

  it("applies shield before Hull and evaluates terminal state after the batch", () => {
    const engine = new DuelEngine({
      maxHull: 100,
      maxShield: 40,
      startingShield: 20,
    });

    engine.applyTickEffects([
      { type: "damage", targetId: "player-2", amount: 50 },
    ]);
    const p2 = engine.snapshot().players["player-2"];
    expect(p2.shield).toBe(0);
    expect(p2.hull).toBe(70);
    expect(engine.snapshot().round.status).toBe("active");
  });

  it("enters Cataclysm after regulation and terminates at hard overtime ceiling", () => {
    const engine = new DuelEngine({
      regulationSeconds: 180,
      hardOvertimeSeconds: 45,
    });
    engine.step(180);
    expect(engine.snapshot().phase).toBe("cataclysm");
    expect(engine.snapshot().round.status).toBe("active");

    const events = engine.step(45);
    expect(engine.snapshot().round).toEqual({
      status: "draw",
      winnerId: null,
    });
    expect(events.at(-1)).toEqual(
      expect.objectContaining({ type: "round-ended" }),
    );
  });

  it("resetRound clears temporary Duel state for both players", () => {
    const engine = new DuelEngine();
    engine.setPrivateOffers("player-1", [
      offer("player-1", 0, "laser"),
    ]);
    engine.applyTickEffects([
      { type: "damage", targetId: "player-1", amount: 30 },
      { type: "energy", targetId: "player-2", amount: 30 },
    ]);
    engine.resetRound();

    const snapshot = engine.snapshot();
    expect(snapshot.elapsedSeconds).toBe(0);
    expect(snapshot.round.status).toBe("active");
    expect(snapshot.players["player-1"].hull).toBe(100);
    expect(snapshot.players["player-1"].offers).toEqual([]);
    expect(snapshot.players["player-2"].energy).toBe(25);
  });
});
