import type { DuelPlayerId } from "./model";
import type { DuelMapProfile } from "./maps";

export type DuelNeutralObjectiveKind =
  | "fate"
  | "map-control"
  | "cache";

export type DuelNeutralObjectiveStatus =
  | "active"
  | "resolved";

export type DuelNeutralObjective = {
  id: string;
  kind: DuelNeutralObjectiveKind;
  displayLabel: string;
  answerToken: string;
  status: DuelNeutralObjectiveStatus;
  winnerId: DuelPlayerId | null;
  draw: boolean;
  progress: Readonly<Record<DuelPlayerId, string>>;
};

export type DuelObjectiveTypingResult =
  | { kind: "correct"; completed: boolean }
  | { kind: "wrong"; completed: false }
  | { kind: "unavailable"; completed: false };

export type DuelObjectiveResolution = {
  objectiveId: string;
  kind: DuelNeutralObjectiveKind;
  winnerId: DuelPlayerId | null;
  draw: boolean;
};

type MutableObjective = Omit<
  DuelNeutralObjective,
  "progress"
> & {
  progress: Record<DuelPlayerId, string>;
  completedThisTick: Set<DuelPlayerId>;
};

function objectiveDefinition(
  kind: DuelNeutralObjectiveKind,
  map: DuelMapProfile,
): {
  displayLabel: string;
  answerToken: string;
} {
  switch (kind) {
    case "fate":
      return {
        displayLabel: "FATE CRYSTAL",
        answerToken: "fatecrystal",
      };
    case "map-control":
      return {
        displayLabel: map.controlObjective.displayLabel,
        answerToken: map.controlObjective.answerToken,
      };
    case "cache":
      return {
        displayLabel: "WEAPON CACHE",
        answerToken: "weaponcache",
      };
  }
}

export class DuelNeutralObjectiveSystem {
  private active: MutableObjective | null = null;
  private sequence = 0;

  spawn(
    kind: DuelNeutralObjectiveKind,
    map: DuelMapProfile,
  ): DuelNeutralObjective | null {
    if (this.active !== null && this.active.status === "active") {
      return null;
    }
    const definition = objectiveDefinition(kind, map);
    this.active = {
      id: "objective:" + String(++this.sequence),
      kind,
      displayLabel: definition.displayLabel,
      answerToken: definition.answerToken,
      status: "active",
      winnerId: null,
      draw: false,
      progress: {
        "player-1": "",
        "player-2": "",
      },
      completedThisTick: new Set(),
    };
    return this.snapshot();
  }

  typeChar(
    playerId: DuelPlayerId,
    objectiveId: string,
    rawChar: string,
  ): DuelObjectiveTypingResult {
    const objective = this.active;
    if (
      objective === null ||
      objective.id !== objectiveId ||
      objective.status !== "active"
    ) {
      return { kind: "unavailable", completed: false };
    }

    const char = rawChar.toLocaleLowerCase("en-US");
    const prefix = objective.progress[playerId];
    const expected = objective.answerToken[prefix.length];
    if (!/^[a-z]$/.test(char) || expected !== char) {
      return { kind: "wrong", completed: false };
    }

    objective.progress[playerId] = prefix + char;
    const completed =
      objective.progress[playerId] === objective.answerToken;
    if (completed) objective.completedThisTick.add(playerId);
    return { kind: "correct", completed };
  }

  finalizeTick(): DuelObjectiveResolution | null {
    const objective = this.active;
    if (
      objective === null ||
      objective.status !== "active" ||
      objective.completedThisTick.size === 0
    ) {
      return null;
    }

    objective.status = "resolved";
    if (objective.completedThisTick.size === 1) {
      objective.winnerId = [...objective.completedThisTick][0]!;
      objective.draw = false;
    } else {
      objective.winnerId = null;
      objective.draw = true;
    }
    objective.completedThisTick.clear();
    return {
      objectiveId: objective.id,
      kind: objective.kind,
      winnerId: objective.winnerId,
      draw: objective.draw,
    };
  }

  activeObjective(): DuelNeutralObjective | null {
    return this.snapshot();
  }

  isActiveTarget(objectiveId: string): boolean {
    return (
      this.active !== null &&
      this.active.id === objectiveId &&
      this.active.status === "active"
    );
  }

  progressFor(
    playerId: DuelPlayerId,
    objectiveId: string,
  ): string | null {
    if (!this.isActiveTarget(objectiveId)) return null;
    return this.active?.progress[playerId] ?? null;
  }

  clear(): void {
    this.active = null;
  }

  resetRound(): void {
    this.active = null;
    this.sequence = 0;
  }

  private snapshot(): DuelNeutralObjective | null {
    if (this.active === null) return null;
    return {
      id: this.active.id,
      kind: this.active.kind,
      displayLabel: this.active.displayLabel,
      answerToken: this.active.answerToken,
      status: this.active.status,
      winnerId: this.active.winnerId,
      draw: this.active.draw,
      progress: {
        "player-1": this.active.progress["player-1"],
        "player-2": this.active.progress["player-2"],
      },
    };
  }
}
