import { describe, expect, it } from "vitest";
import { DuelEngine } from "../src/duel/engine";
import type {
  DuelActionOffer,
  DuelPlayerId,
} from "../src/duel/model";

function offer(
  playerId: DuelPlayerId,
  slot: number,
  actionId: string,
): DuelActionOffer {
  return {
    instanceId: playerId + ":" + String(slot) + ":" + actionId,
    actionId,
    ownerId: playerId,
    status: "available",
    typedPrefix: "",
    slotIndex: slot,
    shared: false,
  };
}

function typeTarget(
  engine: DuelEngine,
  playerId: DuelPlayerId,
  target: DuelActionOffer,
  token: string,
  startSequence: number,
): number {
  let sequence = startSequence;
  engine.enqueueIntent({
    type: "SELECT_TARGET",
    playerId,
    sequence: sequence++,
    targetInstanceId: target.instanceId,
  });
  for (const char of token) {
    engine.enqueueIntent({
      type: "TYPE_CHAR",
      playerId,
      sequence: sequence++,
      char,
      targetInstanceId: target.instanceId,
    });
  }
  return sequence;
}

describe("Duel M-DUEL-08 strategy integration", () => {
  it("awards Initiative for a perfect completed action", () => {
    const engine = new DuelEngine();
    const laser = offer("player-1", 0, "laser");
    engine.setPrivateOffers("player-1", [laser]);

    typeTarget(
      engine,
      "player-1",
      laser,
      "laser",
      1,
    );
    engine.step(0);

    expect(
      engine.snapshot().strategy["player-1"].initiative,
    ).toBe(4);
  });

  it("does not award perfect-word Initiative after a typing mistake", () => {
    const engine = new DuelEngine();
    const laser = offer("player-1", 0, "laser");
    engine.setPrivateOffers("player-1", [laser]);

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
      char: "x",
      targetInstanceId: laser.instanceId,
    });
    let sequence = 3;
    for (const char of "laser") {
      engine.enqueueIntent({
        type: "TYPE_CHAR",
        playerId: "player-1",
        sequence: sequence++,
        char,
        targetInstanceId: laser.instanceId,
      });
    }
    engine.step(0);

    expect(
      engine.snapshot().strategy["player-1"].initiative,
    ).toBe(0);
  });

  it("builds and consumes HOMING BARRAGE from typed actions", () => {
    const engine = new DuelEngine({
      maxShield: 0,
      startingShield: 0,
      startingEnergy: 100,
    });
    const energy = offer("player-1", 0, "energy");
    const missile = offer("player-1", 1, "missile");
    const lockOn = offer("player-1", 2, "lock-on");
    engine.setPrivateOffers("player-1", [
      energy,
      missile,
      lockOn,
    ]);

    let sequence = typeTarget(
      engine,
      "player-1",
      energy,
      "energy",
      1,
    );
    sequence = typeTarget(
      engine,
      "player-1",
      missile,
      "missile",
      sequence,
    );
    typeTarget(
      engine,
      "player-1",
      lockOn,
      "lockon",
      sequence,
    );
    const events = engine.step(0);

    expect(events).toContainEqual({
      type: "combo-ready",
      playerId: "player-1",
      comboId: "homing-barrage",
    });
    expect(
      engine.snapshot().strategy["player-1"].readyCombos,
    ).toContainEqual(
      expect.objectContaining({ id: "homing-barrage" }),
    );

    const comboEvents = engine.useCombo(
      "player-1",
      "homing-barrage",
    );
    expect(comboEvents).toEqual([
      {
        type: "combo-used",
        playerId: "player-1",
        comboId: "homing-barrage",
      },
    ]);
    expect(engine.snapshot().players["player-2"].hull).toBe(74);
    expect(
      engine.snapshot().strategy["player-1"].readyCombos,
    ).toHaveLength(0);
  });

  it("validates conversion resources before applying temporary buffs", () => {
    const engine = new DuelEngine({
      startingShield: 0,
      maxShield: 40,
    });

    expect(engine.useConversion("player-1", "overload")).toEqual([]);
    expect(
      engine.snapshot().strategy["player-1"].attackScale,
    ).toBe(1);
  });

  it("applies conversion tradeoffs and expires temporary Berserk modifiers", () => {
    const engine = new DuelEngine({
      maxShield: 0,
      startingShield: 0,
    });

    expect(engine.useConversion("player-1", "berserk")).toEqual([
      {
        type: "conversion-used",
        playerId: "player-1",
        conversionId: "berserk",
      },
    ]);
    let snapshot = engine.snapshot();
    expect(snapshot.players["player-1"].hull).toBe(92);
    expect(
      snapshot.strategy["player-1"].attackScale,
    ).toBeCloseTo(1.2);
    expect(
      snapshot.strategy["player-1"].defenseScale,
    ).toBeCloseTo(0.88);

    engine.step(8.1);
    snapshot = engine.snapshot();
    expect(snapshot.strategy["player-1"].attackScale).toBe(1);
    expect(snapshot.strategy["player-1"].defenseScale).toBe(1);
  });

  it("shows a readable generic trap hint without exposing trap type", () => {
    const engine = new DuelEngine();

    expect(engine.armTrap("player-1", "minefield")).toEqual([
      {
        type: "trap-armed",
        playerId: "player-1",
        trapId: "minefield",
        publicHint: "TRAP ARMED",
      },
    ]);

    const snapshot = engine.snapshot();
    expect(snapshot.publicTrapHints["player-2"]).toEqual([
      "TRAP ARMED",
    ]);
    expect(snapshot.publicTrapHints["player-1"]).toEqual([]);
  });

  it("consumes an armed trap when the opponent deploys a hostile action", () => {
    const engine = new DuelEngine({
      maxShield: 0,
      startingShield: 0,
    });
    engine.armTrap("player-1", "minefield");
    const laser = offer("player-2", 0, "laser");
    engine.setPrivateOffers("player-2", [laser]);

    typeTarget(
      engine,
      "player-2",
      laser,
      "laser",
      1,
    );
    const events = engine.step(0);

    expect(events).toContainEqual({
      type: "trap-triggered",
      playerId: "player-1",
      trapId: "minefield",
      triggeredByPlayerId: "player-2",
    });
    expect(engine.snapshot().players["player-2"].hull).toBe(94);
    expect(engine.snapshot().publicTrapHints["player-2"]).toEqual([]);
  });

  it("routes ACTIVATE_SKILL through authoritative combo/conversion/trap handling", () => {
    const engine = new DuelEngine({
      startingEnergy: 100,
      startingShield: 20,
      maxShield: 40,
    });

    engine.enqueueIntent({
      type: "ACTIVATE_SKILL",
      playerId: "player-1",
      sequence: 1,
      skillId: "conversion:berserk",
    });
    let events = engine.step(0);
    expect(events).toContainEqual({
      type: "conversion-used",
      playerId: "player-1",
      conversionId: "berserk",
    });
    expect(
      engine.snapshot().strategy["player-1"].attackScale,
    ).toBeCloseTo(1.2);

    engine.enqueueIntent({
      type: "ACTIVATE_SKILL",
      playerId: "player-1",
      sequence: 2,
      skillId: "trap:minefield",
    });
    events = engine.step(0);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "intent-rejected",
        playerId: "player-1",
        reason: "skill-unavailable",
      }),
    );

    let sequence = 3;
    for (let index = 0; index < 2; index += 1) {
      const energy = offer(
        "player-1",
        index,
        "energy",
      );
      energy.instanceId += ":initiative:" + String(index);
      engine.setPrivateOffers("player-1", [energy]);
      sequence = typeTarget(
        engine,
        "player-1",
        energy,
        "energy",
        sequence,
      );
      engine.step(0);
    }
    expect(
      engine.snapshot().strategy["player-1"].initiative,
    ).toBe(8);

    engine.enqueueIntent({
      type: "ACTIVATE_SKILL",
      playerId: "player-1",
      sequence: sequence++,
      skillId: "trap:minefield",
    });
    events = engine.step(0);
    expect(events).toContainEqual({
      type: "trap-armed",
      playerId: "player-1",
      trapId: "minefield",
      publicHint: "TRAP ARMED",
    });
    expect(
      engine.snapshot().strategy["player-1"].initiative,
    ).toBe(0);

    engine.enqueueIntent({
      type: "ACTIVATE_SKILL",
      playerId: "player-1",
      sequence,
      skillId: "combo:not-real",
    });
    events = engine.step(0);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "intent-rejected",
        playerId: "player-1",
        reason: "skill-unavailable",
      }),
    );
  });

  it("builds materially different adaptive strategy paths", () => {
    const engine = new DuelEngine({
      startingEnergy: 100,
    });
    const attacks = [
      offer("player-1", 0, "laser"),
      offer("player-1", 1, "missile"),
      offer("player-1", 2, "siege-lance"),
    ];
    engine.setPrivateOffers("player-1", attacks);

    let sequence = 1;
    sequence = typeTarget(
      engine,
      "player-1",
      attacks[0]!,
      "laser",
      sequence,
    );
    sequence = typeTarget(
      engine,
      "player-1",
      attacks[1]!,
      "missile",
      sequence,
    );
    typeTarget(
      engine,
      "player-1",
      attacks[2]!,
      "siegelance",
      sequence,
    );
    engine.step(0);

    expect(
      engine.snapshot().strategy["player-1"].path,
    ).toBe("arsenal");
  });
});
