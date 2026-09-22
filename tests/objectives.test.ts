import { describe, expect, it } from "vitest";
import { difficultyFor } from "../src/campaign/difficulty";
import { createStageConfig } from "../src/campaign/stage";
import {
  createStageObjectiveState,
  objectiveForcesCommander,
  objectiveForcesElite,
  objectiveForStage,
  objectiveProgressText,
  objectiveRewardFactor,
  reduceStageObjective,
  requiredObjectiveAllowsFinish,
  type StageObjectiveDefinition,
} from "../src/events/objectives";

function definition(
  type: StageObjectiveDefinition["type"],
  overrides: Partial<StageObjectiveDefinition> = {},
): StageObjectiveDefinition {
  return {
    id: "test:" + type,
    type,
    label: type,
    required: false,
    rewardFactor: 0.25,
    ...overrides,
  };
}

describe("M16 Stage Objectives", () => {
  it("skips boss stages and creates deterministic Campaign objectives", () => {
    const difficulty = difficultyFor({
      stage: 55,
      mode: "balanced",
      vocabularyLevel: 20,
      recentWpm: 60,
      recentAccuracy: 96,
    });

    expect(
      objectiveForStage(createStageConfig(60), difficulty),
    ).toBeNull();

    const hazard = objectiveForStage(
      createStageConfig(55),
      difficulty,
    );
    expect(hazard?.type).toBe("survive");
    expect(hazard?.required).toBe(true);

    const gauntlet = objectiveForStage(
      createStageConfig(95),
      difficulty,
    );
    expect(gauntlet?.type).toBe("elite-hunt");
    expect(gauntlet?.required).toBe(true);
  });

  it("completes required survive through tick events and gates stage finish", () => {
    let state = createStageObjectiveState(
      definition("survive", {
        required: true,
        targetSeconds: 5,
      }),
    );

    expect(requiredObjectiveAllowsFinish(state)).toBe(false);
    state = reduceStageObjective(state, {
      type: "tick",
      dt: 4.9,
    });
    expect(state.status).toBe("active");
    state = reduceStageObjective(state, {
      type: "tick",
      dt: 0.2,
    });

    expect(state.status).toBe("complete");
    expect(requiredObjectiveAllowsFinish(state)).toBe(true);
    expect(objectiveProgressText(state)).toContain("5.0");
  });

  it("evaluates accuracy from stage-clear aggregate stats", () => {
    let state = createStageObjectiveState(
      definition("accuracy", {
        targetAccuracy: 95,
      }),
    );

    state = reduceStageObjective(state, {
      type: "stage-clear",
      hits: 96,
      misses: 4,
    });
    expect(state.status).toBe("complete");

    let failed = createStageObjectiveState(
      definition("accuracy", {
        targetAccuracy: 98,
      }),
    );
    failed = reduceStageObjective(failed, {
      type: "stage-clear",
      hits: 96,
      misses: 4,
    });
    expect(failed.status).toBe("failed");
  });

  it("fails a no-miss objective immediately on typing miss", () => {
    let state = createStageObjectiveState(
      definition("no-miss"),
    );
    state = reduceStageObjective(state, {
      type: "miss",
    });
    expect(state.status).toBe("failed");
  });

  it("treats escaped enemies as protect integrity loss", () => {
    let state = createStageObjectiveState(
      definition("protect", {
        targetIntegrity: 2,
      }),
    );
    state = reduceStageObjective(state, {
      type: "enemy-escaped",
      enemyId: 1,
      kind: "scout",
      elite: false,
    });
    expect(state.integrity).toBe(1);
    expect(state.status).toBe("active");

    state = reduceStageObjective(state, {
      type: "enemy-escaped",
      enemyId: 2,
      kind: "tank",
      elite: false,
    });
    expect(state.status).toBe("failed");
  });

  it("enforces Commander-first through spawn and first-kill events", () => {
    let state = createStageObjectiveState(
      definition("commander-first"),
    );
    expect(objectiveForcesCommander(state)).toBe(true);

    state = reduceStageObjective(state, {
      type: "enemy-spawn",
      enemyId: 10,
      kind: "commander",
      elite: false,
    });
    expect(objectiveForcesCommander(state)).toBe(false);

    state = reduceStageObjective(state, {
      type: "enemy-kill",
      enemyId: 10,
      kind: "commander",
      elite: false,
    });
    expect(state.status).toBe("complete");

    let failed = createStageObjectiveState(
      definition("commander-first"),
    );
    failed = reduceStageObjective(failed, {
      type: "enemy-kill",
      enemyId: 2,
      kind: "scout",
      elite: false,
    });
    expect(failed.status).toBe("failed");
  });

  it("marks the first spawned target and fails if it escapes", () => {
    let state = createStageObjectiveState(
      definition("marked-target"),
    );
    state = reduceStageObjective(state, {
      type: "enemy-spawn",
      enemyId: 7,
      kind: "sniper",
      elite: false,
    });
    expect(state.targetEnemyId).toBe(7);

    state = reduceStageObjective(state, {
      type: "enemy-escaped",
      enemyId: 7,
      kind: "sniper",
      elite: false,
    });
    expect(state.status).toBe("failed");
  });

  it("forces and counts Elite quota until complete", () => {
    let state = createStageObjectiveState(
      definition("elite-hunt", {
        required: true,
        targetCount: 2,
      }),
    );
    expect(objectiveForcesElite(state)).toBe(true);

    state = reduceStageObjective(state, {
      type: "enemy-kill",
      enemyId: 1,
      kind: "tank",
      elite: true,
    });
    expect(state.progress).toBe(1);
    expect(objectiveForcesElite(state)).toBe(true);

    state = reduceStageObjective(state, {
      type: "enemy-kill",
      enemyId: 2,
      kind: "destroyer",
      elite: true,
    });
    expect(state.status).toBe("complete");
    expect(objectiveForcesElite(state)).toBe(false);
  });

  it("evaluates speed-clear from event time without scanning game state", () => {
    let fast = createStageObjectiveState(
      definition("speed-clear", {
        targetSeconds: 20,
      }),
    );
    fast = reduceStageObjective(fast, {
      type: "tick",
      dt: 18,
    });
    fast = reduceStageObjective(fast, {
      type: "stage-clear",
    });
    expect(fast.status).toBe("complete");

    let slow = createStageObjectiveState(
      definition("speed-clear", {
        targetSeconds: 20,
      }),
    );
    slow = reduceStageObjective(slow, {
      type: "tick",
      dt: 20.1,
    });
    expect(slow.status).toBe("failed");
  });

  it("scales completed objective reward with global difficulty", () => {
    const completed = {
      ...createStageObjectiveState(
        definition("no-miss", {
          rewardFactor: 0.25,
        }),
      ),
      status: "complete" as const,
    };
    const relax = difficultyFor({
      stage: 300,
      mode: "relax",
      vocabularyLevel: 30,
      recentWpm: 25,
      recentAccuracy: 95,
    });
    const impossible = difficultyFor({
      stage: 300,
      mode: "impossible",
      vocabularyLevel: 30,
      recentWpm: 280,
      recentAccuracy: 99,
    });

    expect(
      objectiveRewardFactor(completed, impossible),
    ).toBeGreaterThan(
      objectiveRewardFactor(completed, relax),
    );
    expect(
      objectiveRewardFactor(
        { ...completed, status: "failed" },
        impossible,
      ),
    ).toBe(0);
  });
});
