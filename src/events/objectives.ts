import type {
  DifficultyProfile,
  StageConfig,
} from "../campaign/types";
import { stageSeed } from "../campaign/stage";
import type { EnemyKind } from "../types";
import { clamp } from "../logic";

export const STAGE_OBJECTIVE_TYPES = [
  "survive",
  "accuracy",
  "no-miss",
  "protect",
  "commander-first",
  "marked-target",
  "elite-hunt",
  "speed-clear",
] as const;

export type StageObjectiveType =
  (typeof STAGE_OBJECTIVE_TYPES)[number];

export type StageObjectiveStatus =
  | "active"
  | "complete"
  | "failed";

export type StageObjectiveDefinition = {
  id: string;
  type: StageObjectiveType;
  label: string;
  required: boolean;
  rewardFactor: number;
  targetSeconds?: number;
  targetAccuracy?: number;
  targetCount?: number;
  targetIntegrity?: number;
};

export type StageObjectiveState = {
  definition: StageObjectiveDefinition;
  status: StageObjectiveStatus;
  elapsedSeconds: number;
  hits: number;
  misses: number;
  progress: number;
  targetEnemyId: number | null;
  targetSpawned: boolean;
  integrity: number;
  firstKillRecorded: boolean;
};

export type StageObjectiveEvent =
  | { type: "tick"; dt: number }
  | { type: "correct-key" }
  | { type: "miss" }
  | {
      type: "enemy-spawn";
      enemyId: number;
      kind: EnemyKind;
      elite: boolean;
    }
  | {
      type: "enemy-kill";
      enemyId: number;
      kind: EnemyKind;
      elite: boolean;
    }
  | {
      type: "enemy-escaped";
      enemyId: number;
      kind: EnemyKind;
      elite: boolean;
    }
  | { type: "stage-clear" };

function objectiveId(
  stage: number,
  type: StageObjectiveType,
): string {
  return "objective:" + String(stage) + ":" + type;
}

function definition(
  stage: number,
  type: StageObjectiveType,
  required: boolean,
  rewardFactor: number,
  fields: Partial<StageObjectiveDefinition> = {},
): StageObjectiveDefinition {
  const labels: Record<StageObjectiveType, string> = {
    survive: "Survive the pressure window",
    accuracy: "Maintain target accuracy",
    "no-miss": "Clear without a typing miss",
    protect: "Protect the convoy beacon",
    "commander-first": "Eliminate the Commander first",
    "marked-target": "Destroy the marked target before escape",
    "elite-hunt": "Defeat the Elite quota",
    "speed-clear": "Clear before the objective timer",
  };

  return {
    id: objectiveId(stage, type),
    type,
    label: labels[type],
    required,
    rewardFactor,
    ...fields,
  };
}

function seededIndex(stage: number, length: number): number {
  if (length <= 0) return 0;
  return (stageSeed(stage) >>> 0) % length;
}

export function objectiveForStage(
  stage: StageConfig,
  difficulty: DifficultyProfile,
): StageObjectiveDefinition | null {
  if (
    stage.role === "mini-boss" ||
    stage.role === "boss" ||
    stage.role === "major-boss"
  ) {
    return null;
  }

  const reactionScale = clamp(
    difficulty.reactionWindow / 0.82,
    0.65,
    1.35,
  );

  if (
    stage.role === "special" ||
    stage.role === "hazard"
  ) {
    return definition(
      stage.stage,
      "survive",
      true,
      0.28,
      {
        targetSeconds: clamp(
          (7.5 + stage.stage / 180) *
            reactionScale,
          7,
          14,
        ),
      },
    );
  }

  if (stage.role === "gauntlet") {
    return definition(
      stage.stage,
      "elite-hunt",
      true,
      0.38,
      {
        targetCount: clamp(
          1 + Math.floor(stage.stage / 350),
          1,
          3,
        ),
      },
    );
  }

  if (stage.role === "elite" && stage.stage >= 130) {
    return definition(
      stage.stage,
      "commander-first",
      false,
      0.32,
    );
  }

  if (
    stage.role === "normal" &&
    stage.stage % 3 !== 0
  ) {
    return null;
  }

  const pool: StageObjectiveType[] =
    stage.stage >= 130
      ? [
          "accuracy",
          "no-miss",
          "protect",
          "commander-first",
          "marked-target",
          "speed-clear",
        ]
      : [
          "accuracy",
          "no-miss",
          "protect",
          "marked-target",
          "speed-clear",
        ];
  const type = pool[seededIndex(stage.stage, pool.length)]!;

  if (type === "accuracy") {
    return definition(
      stage.stage,
      type,
      false,
      0.22,
      {
        targetAccuracy: clamp(
          91 +
            difficulty.modeFactor * 3.2,
          92,
          98,
        ),
      },
    );
  }

  if (type === "protect") {
    return definition(
      stage.stage,
      type,
      false,
      0.24,
      {
        targetIntegrity:
          difficulty.urgentThreatCap <= 2 ? 3 : 2,
      },
    );
  }

  if (type === "speed-clear") {
    return definition(
      stage.stage,
      type,
      false,
      0.26,
      {
        targetSeconds: clamp(
          34 /
            Math.max(0.8, difficulty.modeFactor),
          16,
          38,
        ),
      },
    );
  }

  return definition(
    stage.stage,
    type,
    false,
    type === "commander-first" ? 0.32 : 0.24,
  );
}

export function createStageObjectiveState(
  definitionInput: StageObjectiveDefinition,
): StageObjectiveState {
  return {
    definition: { ...definitionInput },
    status: "active",
    elapsedSeconds: 0,
    hits: 0,
    misses: 0,
    progress: 0,
    targetEnemyId: null,
    targetSpawned: false,
    integrity:
      definitionInput.targetIntegrity ?? 0,
    firstKillRecorded: false,
  };
}

function accuracy(state: StageObjectiveState): number {
  const total = state.hits + state.misses;
  return total <= 0 ? 100 : (state.hits / total) * 100;
}

function complete(
  state: StageObjectiveState,
): StageObjectiveState {
  if (state.status !== "active") return state;
  return { ...state, status: "complete" };
}

function fail(
  state: StageObjectiveState,
): StageObjectiveState {
  if (state.status !== "active") return state;
  return { ...state, status: "failed" };
}

export function reduceStageObjective(
  stateInput: StageObjectiveState,
  event: StageObjectiveEvent,
): StageObjectiveState {
  let state: StageObjectiveState = {
    ...stateInput,
    definition: { ...stateInput.definition },
  };

  if (event.type === "tick") {
    state.elapsedSeconds += Math.max(0, event.dt);
    if (
      state.definition.type === "survive" &&
      state.elapsedSeconds >=
        (state.definition.targetSeconds ?? 0)
    ) {
      return complete(state);
    }
    if (
      state.definition.type === "speed-clear" &&
      state.elapsedSeconds >
        (state.definition.targetSeconds ?? Number.POSITIVE_INFINITY)
    ) {
      return fail(state);
    }
    return state;
  }

  if (event.type === "correct-key") {
    state.hits += 1;
    return state;
  }

  if (event.type === "miss") {
    state.misses += 1;
    if (state.definition.type === "no-miss") {
      return fail(state);
    }
    return state;
  }

  if (event.type === "enemy-spawn") {
    if (
      state.definition.type === "marked-target" &&
      state.targetEnemyId === null
    ) {
      state.targetEnemyId = event.enemyId;
      state.targetSpawned = true;
    }
    if (
      state.definition.type === "commander-first" &&
      event.kind === "commander"
    ) {
      state.targetSpawned = true;
    }
    return state;
  }

  if (event.type === "enemy-kill") {
    if (state.definition.type === "commander-first") {
      if (!state.firstKillRecorded) {
        state.firstKillRecorded = true;
        return event.kind === "commander"
          ? complete(state)
          : fail(state);
      }
      return state;
    }

    if (state.definition.type === "marked-target") {
      if (event.enemyId === state.targetEnemyId) {
        return complete(state);
      }
      return state;
    }

    if (
      state.definition.type === "elite-hunt" &&
      event.elite
    ) {
      state.progress += 1;
      if (
        state.progress >=
        (state.definition.targetCount ?? 1)
      ) {
        return complete(state);
      }
    }
    return state;
  }

  if (event.type === "enemy-escaped") {
    if (
      state.definition.type === "marked-target" &&
      event.enemyId === state.targetEnemyId
    ) {
      return fail(state);
    }

    if (state.definition.type === "protect") {
      state.integrity = Math.max(0, state.integrity - 1);
      if (state.integrity <= 0) return fail(state);
    }
    return state;
  }

  if (event.type === "stage-clear") {
    if (state.definition.type === "accuracy") {
      return accuracy(state) >=
        (state.definition.targetAccuracy ?? 0)
        ? complete(state)
        : fail(state);
    }
    if (state.definition.type === "no-miss") {
      return state.misses === 0
        ? complete(state)
        : fail(state);
    }
    if (state.definition.type === "protect") {
      return state.integrity > 0
        ? complete(state)
        : fail(state);
    }
    if (state.definition.type === "speed-clear") {
      return state.elapsedSeconds <=
        (state.definition.targetSeconds ??
          Number.POSITIVE_INFINITY)
        ? complete(state)
        : fail(state);
    }
  }

  return state;
}

export function objectiveForcesCommander(
  state: StageObjectiveState | null,
): boolean {
  return (
    state?.status === "active" &&
    state.definition.type === "commander-first" &&
    !state.targetSpawned &&
    !state.firstKillRecorded
  );
}

export function objectiveForcesElite(
  state: StageObjectiveState | null,
): boolean {
  return (
    state?.status === "active" &&
    state.definition.type === "elite-hunt" &&
    state.progress <
      (state.definition.targetCount ?? 1)
  );
}

export function requiredObjectiveAllowsFinish(
  state: StageObjectiveState | null,
): boolean {
  return (
    state === null ||
    !state.definition.required ||
    state.status === "complete"
  );
}

export function objectiveProgressText(
  state: StageObjectiveState,
): string {
  const definition = state.definition;
  if (definition.type === "survive") {
    return (
      Math.min(
        state.elapsedSeconds,
        definition.targetSeconds ?? 0,
      ).toFixed(1) +
      " / " +
      (definition.targetSeconds ?? 0).toFixed(1) +
      "s"
    );
  }
  if (definition.type === "accuracy") {
    return (
      accuracy(state).toFixed(1) +
      "% / " +
      (definition.targetAccuracy ?? 0).toFixed(1) +
      "%"
    );
  }
  if (definition.type === "protect") {
    return (
      "Integrity " +
      String(state.integrity) +
      " / " +
      String(definition.targetIntegrity ?? 0)
    );
  }
  if (definition.type === "elite-hunt") {
    return (
      String(state.progress) +
      " / " +
      String(definition.targetCount ?? 1) +
      " Elite"
    );
  }
  if (definition.type === "speed-clear") {
    return (
      state.elapsedSeconds.toFixed(1) +
      " / " +
      (definition.targetSeconds ?? 0).toFixed(1) +
      "s"
    );
  }
  if (definition.type === "marked-target") {
    return state.targetEnemyId === null
      ? "Awaiting marked target"
      : "Marked target active";
  }
  if (definition.type === "commander-first") {
    return state.targetSpawned
      ? "Commander active"
      : "Commander incoming";
  }
  return state.misses === 0
    ? "Perfect so far"
    : String(state.misses) + " miss";
}

export function objectiveRewardFactor(
  state: StageObjectiveState | null,
  difficulty: DifficultyProfile,
): number {
  if (state?.status !== "complete") return 0;
  return (
    state.definition.rewardFactor *
    clamp(difficulty.rewardMultiplier, 0.75, 2)
  );
}
