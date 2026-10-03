import { describe, expect, it } from "vitest";
import { duelMapProfile } from "../src/duel/maps";
import { DuelNeutralObjectiveSystem } from "../src/duel/objectives";

function type(
  system: DuelNeutralObjectiveSystem,
  playerId: "player-1" | "player-2",
  objectiveId: string,
  token: string,
): void {
  for (const char of token) {
    const result = system.typeChar(playerId, objectiveId, char);
    expect(result.kind).toBe("correct");
  }
}

describe("Duel M-DUEL-07 neutral objective core", () => {
  it("keeps one shared lane with mirrored progress", () => {
    const system = new DuelNeutralObjectiveSystem();
    const objective = system.spawn(
      "fate",
      duelMapProfile("frost-wastes"),
    )!;

    system.typeChar("player-1", objective.id, "f");
    system.typeChar("player-2", objective.id, "f");
    system.typeChar("player-1", objective.id, "a");

    expect(system.activeObjective()?.progress).toEqual({
      "player-1": "fa",
      "player-2": "f",
    });
  });

  it("uses the selected map control objective identity", () => {
    const system = new DuelNeutralObjectiveSystem();
    const objective = system.spawn(
      "map-control",
      duelMapProfile("tempest-prime"),
    )!;

    expect(objective.displayLabel).toBe("STORM CORE");
    expect(objective.answerToken).toBe("stormcore");
  });

  it("finalizes a single winner only after the tick batch", () => {
    const system = new DuelNeutralObjectiveSystem();
    const objective = system.spawn(
      "cache",
      duelMapProfile("terra-core"),
    )!;

    type(system, "player-1", objective.id, "weaponcache");
    expect(system.activeObjective()?.status).toBe("active");

    expect(system.finalizeTick()).toEqual({
      objectiveId: objective.id,
      kind: "cache",
      winnerId: "player-1",
      draw: false,
    });
  });

  it("does not use player ordering as a same-tick tie break", () => {
    const system = new DuelNeutralObjectiveSystem();
    const objective = system.spawn(
      "fate",
      duelMapProfile("celestial-void"),
    )!;

    type(system, "player-1", objective.id, "fatecrystal");
    type(system, "player-2", objective.id, "fatecrystal");

    expect(system.finalizeTick()).toEqual({
      objectiveId: objective.id,
      kind: "fate",
      winnerId: null,
      draw: true,
    });
  });

  it("does not advance objective progress on wrong input", () => {
    const system = new DuelNeutralObjectiveSystem();
    const objective = system.spawn(
      "cache",
      duelMapProfile("ocean-abyss"),
    )!;

    expect(
      system.typeChar("player-1", objective.id, "x"),
    ).toEqual({ kind: "wrong", completed: false });
    expect(
      system.activeObjective()?.progress["player-1"],
    ).toBe("");
  });
});
