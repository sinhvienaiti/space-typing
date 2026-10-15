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
    instanceId:
      playerId + ":" + String(slotIndex) + ":" + actionId,
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

describe("Duel authoritative action cooldowns", () => {
  it("starts cooldown on an instant action and rejects a second copy until server time expires", () => {
    const engine = new DuelEngine({
      maxHull: 150,
      startingEnergy: 100,
    });
    const first = offer("player-1", 0, "repair");
    engine.setPrivateOffers("player-1", [first]);

    let sequence = typeTarget(
      engine,
      "player-1",
      first.instanceId,
      "repair",
      1,
    );
    engine.step(0);

    expect(
      engine.snapshot().cooldowns["player-1"].repair,
    ).toBeCloseTo(6, 8);

    const second = offer("player-1", 0, "repair");
    second.instanceId = "player-1:second:repair";
    engine.setPrivateOffers("player-1", [second]);
    engine.enqueueIntent({
      type: "SELECT_TARGET",
      playerId: "player-1",
      sequence,
      targetInstanceId: second.instanceId,
    });
    let events = engine.step(0);

    expect(events).toContainEqual(
      expect.objectContaining({
        type: "intent-rejected",
        playerId: "player-1",
        reason: "action-cooldown",
      }),
    );
    expect(
      engine.snapshot().players["player-1"].targetInstanceId,
    ).toBeNull();

    engine.step(5.9);
    expect(
      engine.snapshot().cooldowns["player-1"].repair,
    ).toBeGreaterThan(0);

    engine.step(0.11);
    expect(
      engine.snapshot().cooldowns["player-1"].repair,
    ).toBeUndefined();

    sequence += 1;
    engine.enqueueIntent({
      type: "SELECT_TARGET",
      playerId: "player-1",
      sequence,
      targetInstanceId: second.instanceId,
    });
    events = engine.step(0);
    expect(
      events.some(
        (event) =>
          event.type === "intent-rejected" &&
          event.reason === "action-cooldown",
      ),
    ).toBe(false);
    expect(
      engine.snapshot().players["player-1"].targetInstanceId,
    ).toBe(second.instanceId);
  });

  it("keeps opponent cooldowns authoritative but separable by player", () => {
    const engine = new DuelEngine({
      maxHull: 150,
      startingEnergy: 100,
    });
    const repair = offer("player-1", 0, "repair");
    engine.setPrivateOffers("player-1", [repair]);

    typeTarget(
      engine,
      "player-1",
      repair.instanceId,
      "repair",
      1,
    );
    engine.step(0);

    const snapshot = engine.snapshot();
    expect(snapshot.cooldowns["player-1"].repair).toBe(6);
    expect(snapshot.cooldowns["player-2"]).toEqual({});
  });

  it("makes Cooldown Spark actually reduce active server cooldowns", () => {
    const engine = new DuelEngine({
      matchSeed: 123,
      mapId: "frost-wastes",
      maxHull: 10000,
      startingEnergy: 100,
    });
    const repair = offer("player-1", 0, "repair");
    engine.setPrivateOffers("player-1", [repair]);
    typeTarget(
      engine,
      "player-1",
      repair.instanceId,
      "repair",
      1,
    );
    engine.step(0);

    let sawSpark = false;
    for (let index = 0; index < 200; index += 1) {
      const before =
        engine.snapshot().cooldowns["player-1"].repair ?? 0;
      const events = engine.resolveFate("player-1");
      const fate = events.find(
        (event) => event.type === "fate-resolved",
      );
      if (
        fate?.type === "fate-resolved" &&
        fate.resolution.outcome.id === "cooldown-spark"
      ) {
        const after =
          engine.snapshot().cooldowns["player-1"].repair ?? 0;
        expect(after).toBeLessThan(before);
        expect(after).toBeCloseTo(
          Math.max(
            0,
            before -
              (fate.resolution.outcome
                .cooldownReductionSeconds ?? 0),
          ),
          8,
        );
        sawSpark = true;
        break;
      }
    }

    expect(sawSpark).toBe(true);
  });

  it("clears cooldowns on round reset", () => {
    const engine = new DuelEngine({
      maxHull: 150,
      startingEnergy: 100,
    });
    const repair = offer("player-1", 0, "repair");
    engine.setPrivateOffers("player-1", [repair]);
    typeTarget(
      engine,
      "player-1",
      repair.instanceId,
      "repair",
      1,
    );
    engine.step(0);
    expect(
      engine.snapshot().cooldowns["player-1"].repair,
    ).toBeGreaterThan(0);

    engine.resetRound();

    expect(engine.snapshot().cooldowns).toEqual({
      "player-1": {},
      "player-2": {},
    });
  });
});
