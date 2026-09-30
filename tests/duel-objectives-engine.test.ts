import { describe, expect, it } from "vitest";
import { DuelMapDirector } from "../src/duel/director";
import { DuelEngine } from "../src/duel/engine";

function typeObjective(
  engine: DuelEngine,
  playerId: "player-1" | "player-2",
  objectiveId: string,
  token: string,
  startSequence = 1,
): number {
  let sequence = startSequence;
  engine.enqueueIntent({
    type: "SELECT_TARGET",
    playerId,
    sequence: sequence++,
    targetInstanceId: objectiveId,
  });
  for (const char of token) {
    engine.enqueueIntent({
      type: "TYPE_CHAR",
      playerId,
      sequence: sequence++,
      char,
      targetInstanceId: objectiveId,
    });
  }
  return sequence;
}

describe("Duel M-DUEL-07 neutral objective integration", () => {
  it("keeps exactly one shared objective lane active", () => {
    const engine = new DuelEngine({ mapId: "tempest-prime" });
    const first = engine.spawnNeutralObjective("map-control");
    const second = engine.spawnNeutralObjective("cache");

    expect(first).toHaveLength(1);
    expect(second).toEqual([]);
    expect(engine.snapshot().neutralObjective).toEqual(
      expect.objectContaining({
        kind: "map-control",
        displayLabel: "STORM CORE",
        answerToken: "stormcore",
      }),
    );
  });

  it("finalizes same-tick completion as a draw rather than player-order priority", () => {
    const engine = new DuelEngine({ matchSeed: 22 });
    const spawned = engine.spawnNeutralObjective("fate")[0];
    if (spawned?.type !== "objective-spawned") {
      throw new Error("Missing objective.");
    }
    const objective = spawned.objective;

    typeObjective(
      engine,
      "player-1",
      objective.id,
      objective.answerToken,
    );
    typeObjective(
      engine,
      "player-2",
      objective.id,
      objective.answerToken,
    );
    const events = engine.step(0);

    expect(events).toContainEqual({
      type: "objective-resolved",
      resolution: {
        objectiveId: objective.id,
        kind: "fate",
        winnerId: null,
        draw: true,
      },
    });
    expect(
      events.some((event) => event.type === "fate-resolved"),
    ).toBe(false);
  });

  it("awards a Fate roll to the skill winner after the contest batch", () => {
    const engine = new DuelEngine({
      matchSeed: 44,
      maxShield: 100,
      startingShield: 0,
      startingEnergy: 0,
    });
    const spawned = engine.spawnNeutralObjective("fate")[0];
    if (spawned?.type !== "objective-spawned") {
      throw new Error("Missing objective.");
    }

    typeObjective(
      engine,
      "player-1",
      spawned.objective.id,
      spawned.objective.answerToken,
    );
    const events = engine.step(0);

    expect(events).toContainEqual(
      expect.objectContaining({
        type: "objective-resolved",
        resolution: expect.objectContaining({
          winnerId: "player-1",
          kind: "fate",
        }),
      }),
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "fate-resolved",
        resolution: expect.objectContaining({
          playerId: "player-1",
        }),
      }),
    );
  });

  it("turns WEAPON CACHE into bounded resources without Campaign economy", () => {
    const engine = new DuelEngine({
      startingEnergy: 0,
      startingShield: 0,
      maxShield: 40,
    });
    const spawned = engine.spawnNeutralObjective("cache")[0];
    if (spawned?.type !== "objective-spawned") {
      throw new Error("Missing objective.");
    }

    typeObjective(
      engine,
      "player-2",
      spawned.objective.id,
      spawned.objective.answerToken,
    );
    engine.step(0);

    const state = engine.snapshot().players["player-2"];
    expect(state.energy).toBe(18);
    expect(state.shield).toBe(6);
  });

  it("turns map-control objective ownership into tactical pressure", () => {
    const engine = new DuelEngine({
      mapId: "celestial-void",
    });
    const spawned = engine.spawnNeutralObjective("map-control")[0];
    if (spawned?.type !== "objective-spawned") {
      throw new Error("Missing objective.");
    }

    typeObjective(
      engine,
      "player-1",
      spawned.objective.id,
      spawned.objective.answerToken,
    );
    engine.step(0);

    expect(
      engine.snapshot().tactical.controlPressure["player-1"],
    ).toBeGreaterThan(0);
    expect(
      engine.snapshot().tactical.controlPressure["player-2"],
    ).toBe(0);
  });

  it("lets the Director schedule objective opportunities after BUILD", () => {
    const director = new DuelMapDirector({
      mapId: "ocean-abyss",
      matchSeed: 818,
      contentVersion: "v3",
    });
    const objectiveKinds = [];

    for (let second = 0; second < 90; second += 1) {
      for (const event of director.update(1, "war")) {
        if (event.type === "objective") {
          objectiveKinds.push(event.objective.kind);
        }
      }
    }

    expect(objectiveKinds.length).toBeGreaterThan(0);
    expect(
      objectiveKinds.every((kind) =>
        ["fate", "map-control", "cache"].includes(kind),
      ),
    ).toBe(true);
  });

  it("keeps objective typing independent from private offer prefix locks", () => {
    const engine = new DuelEngine();
    const spawned = engine.spawnNeutralObjective("cache")[0];
    if (spawned?.type !== "objective-spawned") {
      throw new Error("Missing objective.");
    }

    engine.enqueueIntent({
      type: "SELECT_TARGET",
      playerId: "player-1",
      sequence: 1,
      targetInstanceId: spawned.objective.id,
    });
    engine.enqueueIntent({
      type: "TYPE_CHAR",
      playerId: "player-1",
      sequence: 2,
      char: "w",
      targetInstanceId: spawned.objective.id,
    });
    engine.step(0);

    const snapshot = engine.snapshot();
    expect(
      snapshot.neutralObjective?.progress["player-1"],
    ).toBe("w");
    expect(
      snapshot.neutralObjective?.progress["player-2"],
    ).toBe("");
  });
});
