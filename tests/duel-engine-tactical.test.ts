import { describe, expect, it } from "vitest";
import { DuelEngine } from "../src/duel/engine";
import type {
  DuelActionOffer,
  DuelPlayerId,
} from "../src/duel/model";

function offer(
  playerId: DuelPlayerId,
  slotIndex: number,
  actionId: string,
): DuelActionOffer {
  return {
    instanceId: playerId + ":" + String(slotIndex) + ":" + actionId,
    actionId,
    ownerId: playerId,
    status: "available",
    typedPrefix: "",
    slotIndex,
    shared: false,
  };
}

function typeTarget(
  engine: DuelEngine,
  playerId: DuelPlayerId,
  targetInstanceId: string,
  token: string,
  startSequence: number,
): number {
  engine.enqueueIntent({
    type: "SELECT_TARGET",
    playerId,
    sequence: startSequence,
    targetInstanceId,
  });
  let sequence = startSequence + 1;
  for (const char of token) {
    engine.enqueueIntent({
      type: "TYPE_CHAR",
      playerId,
      sequence,
      char,
      targetInstanceId,
    });
    sequence += 1;
  }
  return sequence;
}

describe("DuelEngine M-DUEL-04 integration", () => {
  it("banks a missile and consumes it through USE_ITEM", () => {
    const engine = new DuelEngine({
      maxShield: 0,
      startingShield: 0,
      startingEnergy: 100,
    });
    const missile = offer("player-1", 0, "missile");
    engine.setPrivateOffers("player-1", [missile]);

    let next = typeTarget(
      engine,
      "player-1",
      missile.instanceId,
      "missile",
      1,
    );
    let events = engine.step(1 / 60);

    expect(events).toContainEqual(
      expect.objectContaining({
        type: "action-banked",
        playerId: "player-1",
        actionId: "missile",
      }),
    );
    expect(engine.snapshot().inventories["player-1"].attack).toHaveLength(1);
    expect(engine.snapshot().players["player-2"].hull).toBe(100);

    engine.enqueueIntent({
      type: "USE_ITEM",
      playerId: "player-1",
      sequence: next,
      itemId: "missile",
    });
    events = engine.step(1 / 60);

    expect(events).toContainEqual(
      expect.objectContaining({
        type: "stored-action-used",
        actionId: "missile",
      }),
    );
    expect(engine.snapshot().inventories["player-1"].attack).toHaveLength(0);
    expect(engine.snapshot().players["player-2"].hull).toBe(82);
    expect(engine.snapshot().players["player-1"].energy).toBe(88);
  });

  it("keeps corrected words valid but reduces their deterministic effect quality", () => {
    const engine = new DuelEngine({
      maxShield: 0,
      startingShield: 0,
      startingEnergy: 100,
    });
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

    expect(engine.snapshot().players["player-2"].hull).toBeCloseTo(90.5);
  });

  it("preserves typing quality on banked actions until they are used", () => {
    const engine = new DuelEngine({
      maxShield: 0,
      startingShield: 0,
      startingEnergy: 100,
    });
    const missile = offer("player-1", 0, "missile");
    engine.setPrivateOffers("player-1", [missile]);

    engine.enqueueIntent({
      type: "SELECT_TARGET",
      playerId: "player-1",
      sequence: 1,
      targetInstanceId: missile.instanceId,
    });
    engine.enqueueIntent({
      type: "TYPE_CHAR",
      playerId: "player-1",
      sequence: 2,
      char: "x",
      targetInstanceId: missile.instanceId,
    });
    let sequence = 3;
    for (const char of "missile") {
      engine.enqueueIntent({
        type: "TYPE_CHAR",
        playerId: "player-1",
        sequence: sequence++,
        char,
        targetInstanceId: missile.instanceId,
      });
    }
    engine.step(0);

    expect(
      engine.snapshot().inventories["player-1"].attack[0]?.qualityScale,
    ).toBe(0.95);

    engine.enqueueIntent({
      type: "USE_ITEM",
      playerId: "player-1",
      sequence,
      itemId: "missile",
    });
    engine.step(0);

    expect(engine.snapshot().players["player-2"].hull).toBeCloseTo(82.9);
  });

  it("makes target-freeze block new private targets without turning into a full keyboard lock", () => {
    const engine = new DuelEngine({
      startingEnergy: 100,
    });
    const laser = offer("player-1", 0, "laser");
    engine.setPrivateOffers("player-1", [laser]);

    engine.applyHazardEvent({
      sequence: 1,
      mapId: "frost-wastes",
      hazardId: "freeze-lock",
      phase: "crisis",
      pressure: 1,
      telegraphSeconds: 1,
      protectionSeconds: 2,
      symmetry: "contest",
    });

    engine.enqueueIntent({
      type: "SELECT_TARGET",
      playerId: "player-1",
      sequence: 1,
      targetInstanceId: laser.instanceId,
    });
    let events = engine.step(0);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "intent-rejected",
        playerId: "player-1",
        reason: "target-frozen",
      }),
    );
    expect(
      engine.snapshot().players["player-1"].targetInstanceId,
    ).toBeNull();

    engine.step(2.3);
    engine.enqueueIntent({
      type: "SELECT_TARGET",
      playerId: "player-1",
      sequence: 2,
      targetInstanceId: laser.instanceId,
    });
    events = engine.step(0);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "target-locked",
        targetInstanceId: laser.instanceId,
      }),
    );
  });

  it("lets an already locked word finish during target-freeze", () => {
    const engine = new DuelEngine({
      startingEnergy: 100,
    });
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
      char: "l",
      targetInstanceId: laser.instanceId,
    });
    engine.step(0);

    engine.applyHazardEvent({
      sequence: 2,
      mapId: "frost-wastes",
      hazardId: "freeze-lock",
      phase: "crisis",
      pressure: 1,
      telegraphSeconds: 1,
      protectionSeconds: 2,
      symmetry: "contest",
    });

    let sequence = 3;
    for (const char of "aser") {
      engine.enqueueIntent({
        type: "TYPE_CHAR",
        playerId: "player-1",
        sequence: sequence++,
        char,
        targetInstanceId: laser.instanceId,
      });
    }
    const events = engine.step(0);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "action-completed",
        actionId: "laser",
      }),
    );
  });

  it("never lets target-freeze remove the guaranteed incoming-threat counter channel", () => {
    const engine = new DuelEngine({
      startingEnergy: 100,
    });
    const siege = offer("player-1", 0, "siege-lance");
    engine.setPrivateOffers("player-1", [siege]);
    typeTarget(
      engine,
      "player-1",
      siege.instanceId,
      "siegelance",
      1,
    );
    engine.step(0);

    engine.applyHazardEvent({
      sequence: 3,
      mapId: "frost-wastes",
      hazardId: "freeze-lock",
      phase: "crisis",
      pressure: 1,
      telegraphSeconds: 1,
      protectionSeconds: 2,
      symmetry: "contest",
    });

    const threat =
      engine.snapshot().incomingThreats["player-2"][0]!;
    engine.enqueueIntent({
      type: "SELECT_TARGET",
      playerId: "player-2",
      sequence: 1,
      targetInstanceId: threat.id,
    });
    let sequence = 2;
    for (const char of threat.answerToken) {
      engine.enqueueIntent({
        type: "TYPE_CHAR",
        playerId: "player-2",
        sequence: sequence++,
        char,
        targetInstanceId: threat.id,
      });
    }
    const events = engine.step(0);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "threat-countered",
        threatId: threat.id,
      }),
    );
  });

  it("blocks the final character when a bank is full instead of silently deleting value", () => {
    const engine = new DuelEngine({ startingEnergy: 100 });
    const offers = [0, 1, 2, 3].map((slot) =>
      offer("player-1", slot, "missile"),
    );
    engine.setPrivateOffers("player-1", offers);

    let sequence = 1;
    for (let index = 0; index < 3; index += 1) {
      sequence = typeTarget(
        engine,
        "player-1",
        offers[index]!.instanceId,
        "missile",
        sequence,
      );
      engine.step(1 / 60);
    }
    expect(engine.snapshot().inventories["player-1"].attack).toHaveLength(3);

    sequence = typeTarget(
      engine,
      "player-1",
      offers[3]!.instanceId,
      "missile",
      sequence,
    );
    const events = engine.step(1 / 60);
    const state = engine.snapshot().players["player-1"];
    const blocked = state.offers.find(
      (candidate) => candidate.instanceId === offers[3]!.instanceId,
    )!;

    expect(events).toContainEqual(
      expect.objectContaining({
        type: "action-blocked",
        actionId: "missile",
        reason: "inventory-full",
      }),
    );
    expect(blocked.status).toBe("locked");
    expect(blocked.typedPrefix).toBe("missil");
    expect(engine.snapshot().inventories["player-1"].attack).toHaveLength(3);
  });

  it("creates a guaranteed INTERCEPT response for a strong attack", () => {
    const engine = new DuelEngine({
      maxShield: 0,
      startingShield: 0,
      startingEnergy: 100,
    });
    const siege = offer("player-1", 0, "siege-lance");
    engine.setPrivateOffers("player-1", [siege]);

    typeTarget(
      engine,
      "player-1",
      siege.instanceId,
      "siegelance",
      1,
    );
    const events = engine.step(1 / 60);
    const threat = engine.snapshot().incomingThreats["player-2"][0];

    expect(events).toContainEqual(
      expect.objectContaining({
        type: "threat-created",
      }),
    );
    expect(threat).toEqual(
      expect.objectContaining({
        displayLabel: "INTERCEPT",
        answerToken: "intercept",
      }),
    );
    expect(engine.snapshot().players["player-2"].hull).toBe(100);
    expect(engine.snapshot().players["player-1"].energy).toBe(64);
  });

  it("lets the defender counter a threat through the same typing intent path", () => {
    const engine = new DuelEngine({
      maxShield: 0,
      startingShield: 0,
      startingEnergy: 100,
    });
    const siege = offer("player-1", 0, "siege-lance");
    engine.setPrivateOffers("player-1", [siege]);

    typeTarget(
      engine,
      "player-1",
      siege.instanceId,
      "siegelance",
      1,
    );
    engine.step(0);
    const threat = engine.snapshot().incomingThreats["player-2"][0]!;

    typeTarget(
      engine,
      "player-2",
      threat.id,
      "intercept",
      1,
    );
    const events = engine.step(0.1);

    expect(events).toContainEqual(
      expect.objectContaining({
        type: "threat-countered",
        threatId: threat.id,
      }),
    );
    expect(engine.snapshot().incomingThreats["player-2"]).toHaveLength(0);
    expect(engine.snapshot().players["player-2"].hull).toBe(100);
  });

  it("resolves an unanswered strong threat only after its counter window expires", () => {
    const engine = new DuelEngine({
      maxShield: 0,
      startingShield: 0,
      startingEnergy: 100,
    });
    const siege = offer("player-1", 0, "siege-lance");
    engine.setPrivateOffers("player-1", [siege]);

    typeTarget(
      engine,
      "player-1",
      siege.instanceId,
      "siegelance",
      1,
    );
    engine.step(0);
    expect(engine.snapshot().players["player-2"].hull).toBe(100);

    engine.step(2.79);
    expect(engine.snapshot().players["player-2"].hull).toBe(100);

    const events = engine.step(0.02);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "threat-resolved",
        actionId: "siege-lance",
      }),
    );
    expect(engine.snapshot().players["player-2"].hull).toBeCloseTo(
      69.3,
      5,
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "precision-firepower-fired",
        playerId: "player-1",
        actionId: "siege-lance",
        streak: 10,
      }),
    );
  });

  it("turns saved Initiative into a real but bounded projectile tempo edge", () => {
    const engine = new DuelEngine({
      maxShield: 0,
      startingShield: 0,
      startingEnergy: 100,
    });

    let sequence = 1;
    for (let index = 0; index < 25; index += 1) {
      const energy = offer("player-1", 0, "energy");
      energy.instanceId += ":tempo:" + String(index);
      engine.setPrivateOffers("player-1", [energy]);
      sequence = typeTarget(
        engine,
        "player-1",
        energy.instanceId,
        "energy",
        sequence,
      );
      engine.step(0);
    }

    expect(
      engine.snapshot().strategy["player-1"].initiative,
    ).toBe(100);

    const siege = offer("player-1", 0, "siege-lance");
    siege.instanceId += ":tempo";
    engine.setPrivateOffers("player-1", [siege]);
    typeTarget(
      engine,
      "player-1",
      siege.instanceId,
      "siegelance",
      sequence,
    );
    engine.step(0);

    const threat =
      engine.snapshot().incomingThreats["player-2"][0];
    expect(threat).toBeDefined();
    expect(threat!.remainingSeconds).toBeLessThan(2.8);
    expect(threat!.remainingSeconds).toBeCloseTo(
      2.8 / 1.06,
      6,
    );
  });

  it("turns projectile drag into a longer deterministic response window", () => {
    const engine = new DuelEngine({
      maxShield: 100,
      startingShield: 0,
      startingEnergy: 100,
    });
    const reflect = offer("player-2", 0, "reflect");
    const siege = offer("player-1", 0, "siege-lance");
    engine.setPrivateOffers("player-2", [reflect]);
    engine.setPrivateOffers("player-1", [siege]);

    let p2Sequence = typeTarget(
      engine,
      "player-2",
      reflect.instanceId,
      "reflect",
      1,
    );
    engine.step(0);
    engine.enqueueIntent({
      type: "USE_ITEM",
      playerId: "player-2",
      sequence: p2Sequence,
      itemId: "reflect",
    });
    engine.step(0);

    expect(
      engine.snapshot().tactical.projectileSpeedScale[
        "player-1"
      ],
    ).toBeLessThan(1);

    typeTarget(
      engine,
      "player-1",
      siege.instanceId,
      "siegelance",
      1,
    );
    engine.step(0);

    const threat =
      engine.snapshot().incomingThreats["player-2"][0];
    expect(threat).toBeDefined();
    expect(threat!.remainingSeconds).toBeGreaterThan(2.8);
    expect(threat!.remainingSeconds).toBeLessThanOrEqual(
      2.8 * 1.65,
    );
  });

  it("applies banked Tactical effects without keyboard lock", () => {
    const engine = new DuelEngine({ startingEnergy: 100 });
    const disrupt = offer("player-1", 0, "disrupt");
    engine.setPrivateOffers("player-1", [disrupt]);

    let sequence = typeTarget(
      engine,
      "player-1",
      disrupt.instanceId,
      "disrupt",
      1,
    );
    engine.step(0);

    engine.enqueueIntent({
      type: "USE_ITEM",
      playerId: "player-1",
      sequence,
      itemId: "disrupt",
    });
    engine.step(0);

    const snapshot = engine.snapshot();
    expect(
      snapshot.tactical.offerDriftScale["player-2"],
    ).toBeLessThan(1);
    expect(snapshot.tactical.offerDriftScale["player-1"]).toBe(1);
    expect(snapshot.players["player-2"].targetInstanceId).toBeNull();
    expect(snapshot.players["player-2"].wrongChars).toBe(0);
  });

  it("exposes Scan as a temporary information effect rather than hidden omniscience", () => {
    const engine = new DuelEngine({ startingEnergy: 100 });
    const scan = offer("player-1", 0, "scan");
    engine.setPrivateOffers("player-1", [scan]);

    typeTarget(
      engine,
      "player-1",
      scan.instanceId,
      "scan",
      1,
    );
    engine.step(0);

    expect(
      engine.snapshot().tactical.bankRevealFor["player-1"],
    ).toBe(true);
    engine.step(4.1);
    expect(
      engine.snapshot().tactical.bankRevealFor["player-1"],
    ).toBe(false);
  });
});
