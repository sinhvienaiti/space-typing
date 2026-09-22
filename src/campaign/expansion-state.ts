import { MAX_CAMPAIGN_STAGE, normalizeStage } from "./stage";
import type { CampaignProgress } from "./types";

export const STAGES_PER_SECTOR = 10;

export type CampaignSector = {
  startStage: number;
  endStage: number;
};

export type CommittedCheckpointState = {
  stage: number;
  committedAt: string;
};

export type ActiveSegmentState = {
  checkpointStage: number;
  currentStage: number;
  highestReachedStage: number;
  startedAt: string;
};

export const CRASH_RECOVERY_REASONS = [
  "stage-clear",
  "route-choice",
  "shop",
  "upgrade",
  "hidden-transition",
  "pagehide",
  "manual",
] as const;

export type CrashRecoveryReason =
  (typeof CRASH_RECOVERY_REASONS)[number];

export type CrashRecoveryState = {
  stage: number;
  savedAt: string;
  reason: CrashRecoveryReason;
  deathInvalidated: boolean;
};

export type CampaignExpansionState = {
  sector: CampaignSector;
  checkpoint: CommittedCheckpointState;
  activeSegment: ActiveSegmentState;
  crashRecovery: CrashRecoveryState | null;
};

export type StageClearExpansionResult = {
  state: CampaignExpansionState;
  checkpointCommitted: boolean;
};

export function sectorForStage(stage: number): CampaignSector {
  const safeStage = normalizeStage(stage);
  const startStage =
    Math.floor((safeStage - 1) / STAGES_PER_SECTOR) *
      STAGES_PER_SECTOR +
    1;

  return {
    startStage,
    endStage: Math.min(
      MAX_CAMPAIGN_STAGE,
      startStage + STAGES_PER_SECTOR - 1,
    ),
  };
}

function highestReachedStage(progress: CampaignProgress): number {
  const highestCleared =
    progress.clearedStages.length === 0
      ? 1
      : progress.clearedStages[progress.clearedStages.length - 1] ?? 1;

  return normalizeStage(
    Math.max(
      progress.highestUnlockedStage,
      progress.selectedStage,
      highestCleared,
    ),
  );
}

export function createCampaignExpansionState(
  progress: CampaignProgress,
  timestamp = "",
): CampaignExpansionState {
  // M02 treats highestUnlockedStage as the progression frontier.
  // selectedStage may point at an older replay stage and must not move
  // the gameplay checkpoint.
  const currentStage = normalizeStage(progress.highestUnlockedStage);
  const sector = sectorForStage(currentStage);

  return {
    sector,
    checkpoint: {
      stage: sector.startStage,
      committedAt: timestamp,
    },
    activeSegment: {
      checkpointStage: sector.startStage,
      currentStage,
      highestReachedStage: highestReachedStage(progress),
      startedAt: timestamp,
    },
    crashRecovery: null,
  };
}

function isCrashRecoveryReason(
  value: unknown,
): value is CrashRecoveryReason {
  return (
    typeof value === "string" &&
    CRASH_RECOVERY_REASONS.includes(value as CrashRecoveryReason)
  );
}

function validStage(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_CAMPAIGN_STAGE
  );
}

export function isValidCampaignExpansionState(
  value: unknown,
): value is CampaignExpansionState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const raw = value as Record<string, unknown>;
  const sector = raw.sector;
  const checkpoint = raw.checkpoint;
  const active = raw.activeSegment;

  if (
    sector === null ||
    typeof sector !== "object" ||
    Array.isArray(sector) ||
    checkpoint === null ||
    typeof checkpoint !== "object" ||
    Array.isArray(checkpoint) ||
    active === null ||
    typeof active !== "object" ||
    Array.isArray(active)
  ) {
    return false;
  }

  const sectorRaw = sector as Record<string, unknown>;
  const checkpointRaw = checkpoint as Record<string, unknown>;
  const activeRaw = active as Record<string, unknown>;

  if (
    !validStage(sectorRaw.startStage) ||
    !validStage(sectorRaw.endStage) ||
    !validStage(checkpointRaw.stage) ||
    typeof checkpointRaw.committedAt !== "string" ||
    !validStage(activeRaw.checkpointStage) ||
    !validStage(activeRaw.currentStage) ||
    !validStage(activeRaw.highestReachedStage) ||
    typeof activeRaw.startedAt !== "string"
  ) {
    return false;
  }

  const expectedSector = sectorForStage(activeRaw.currentStage);
  const terminalCheckpoint =
    activeRaw.currentStage === MAX_CAMPAIGN_STAGE &&
    checkpointRaw.stage === MAX_CAMPAIGN_STAGE &&
    activeRaw.checkpointStage === MAX_CAMPAIGN_STAGE;
  if (
    sectorRaw.startStage !== expectedSector.startStage ||
    sectorRaw.endStage !== expectedSector.endStage ||
    (!terminalCheckpoint &&
      checkpointRaw.stage !== expectedSector.startStage) ||
    (!terminalCheckpoint &&
      activeRaw.checkpointStage !== expectedSector.startStage) ||
    activeRaw.highestReachedStage < activeRaw.currentStage
  ) {
    return false;
  }

  if (raw.crashRecovery === null) return true;
  if (
    raw.crashRecovery === undefined ||
    typeof raw.crashRecovery !== "object" ||
    Array.isArray(raw.crashRecovery)
  ) {
    return false;
  }

  const recovery = raw.crashRecovery as Record<string, unknown>;
  return (
    validStage(recovery.stage) &&
    typeof recovery.savedAt === "string" &&
    isCrashRecoveryReason(recovery.reason) &&
    typeof recovery.deathInvalidated === "boolean"
  );
}

export function sanitizeCampaignExpansionState(
  value: unknown,
  progress: CampaignProgress,
  timestamp = "",
): CampaignExpansionState {
  if (!isValidCampaignExpansionState(value)) {
    return createCampaignExpansionState(progress, timestamp);
  }

  const frontier = normalizeStage(progress.highestUnlockedStage);
  const minimumHighest = Math.max(
    value.activeSegment.highestReachedStage,
    frontier,
  );

  // M01 had no runtime checkpoint behavior. If a v15 value was based on
  // a replay-selected stage, rebuild it around the real progression frontier.
  if (
    value.activeSegment.currentStage !== frontier &&
    progress.selectedStage !== frontier
  ) {
    const rebuilt = createCampaignExpansionState(progress, timestamp);
    rebuilt.activeSegment.highestReachedStage = normalizeStage(
      Math.max(
        minimumHighest,
        rebuilt.activeSegment.highestReachedStage,
      ),
    );
    return rebuilt;
  }

  return {
    sector: { ...value.sector },
    checkpoint: { ...value.checkpoint },
    activeSegment: {
      ...value.activeSegment,
      highestReachedStage: normalizeStage(minimumHighest),
    },
    crashRecovery:
      value.crashRecovery === null
        ? null
        : { ...value.crashRecovery },
  };
}

export function advanceCampaignExpansionOnStageClear(
  input: CampaignExpansionState,
  progress: CampaignProgress,
  clearedStage: number,
  timestamp: string,
): StageClearExpansionResult {
  const state = sanitizeCampaignExpansionState(
    input,
    progress,
    timestamp,
  );
  const safeCleared = normalizeStage(clearedStage);
  const frontierBefore = state.activeSegment.currentStage;
  const highestReached = normalizeStage(
    Math.max(
      state.activeSegment.highestReachedStage,
      progress.highestUnlockedStage,
      safeCleared,
    ),
  );

  // Replaying a previously reached stage may update records/rewards but
  // must not move or commit the active progression frontier.
  if (safeCleared !== frontierBefore) {
    return {
      state: {
        ...state,
        activeSegment: {
          ...state.activeSegment,
          highestReachedStage: highestReached,
        },
      },
      checkpointCommitted: false,
    };
  }

  const nextFrontier = normalizeStage(progress.highestUnlockedStage);
  const reachedSectorEnd = safeCleared === state.sector.endStage;

  if (reachedSectorEnd) {
    const nextSector = sectorForStage(nextFrontier);
    const checkpointStage =
      safeCleared === MAX_CAMPAIGN_STAGE
        ? MAX_CAMPAIGN_STAGE
        : nextSector.startStage;
    return {
      state: {
        sector: nextSector,
        checkpoint: {
          stage: checkpointStage,
          committedAt: timestamp,
        },
        activeSegment: {
          checkpointStage,
          currentStage: nextFrontier,
          highestReachedStage: highestReached,
          startedAt: timestamp,
        },
        crashRecovery: null,
      },
      checkpointCommitted: true,
    };
  }

  return {
    state: {
      ...state,
      activeSegment: {
        ...state.activeSegment,
        currentStage: nextFrontier,
        highestReachedStage: highestReached,
      },
    },
    checkpointCommitted: false,
  };
}

export function markCrashRecovery(
  input: CampaignExpansionState,
  stage: number,
  reason: CrashRecoveryReason,
  timestamp: string,
): CampaignExpansionState {
  return {
    ...input,
    sector: { ...input.sector },
    checkpoint: { ...input.checkpoint },
    activeSegment: { ...input.activeSegment },
    crashRecovery: {
      stage: normalizeStage(stage),
      savedAt: timestamp,
      reason,
      deathInvalidated: false,
    },
  };
}

export function invalidateCrashRecoveryOnDeath(
  input: CampaignExpansionState,
  stage: number,
  timestamp: string,
): CampaignExpansionState {
  const previous = input.crashRecovery;

  return {
    ...input,
    sector: { ...input.sector },
    checkpoint: { ...input.checkpoint },
    activeSegment: {
      ...input.activeSegment,
      highestReachedStage: normalizeStage(
        Math.max(
          input.activeSegment.highestReachedStage,
          stage,
        ),
      ),
    },
    crashRecovery: {
      stage: normalizeStage(stage),
      savedAt: timestamp,
      reason: previous?.reason ?? "manual",
      deathInvalidated: true,
    },
  };
}

export function rollbackCampaignExpansion(
  input: CampaignExpansionState,
  timestamp: string,
): CampaignExpansionState {
  const checkpointStage = normalizeStage(input.checkpoint.stage);
  const sector = sectorForStage(checkpointStage);

  return {
    sector,
    checkpoint: {
      stage: checkpointStage,
      committedAt: input.checkpoint.committedAt,
    },
    activeSegment: {
      checkpointStage,
      currentStage: checkpointStage,
      highestReachedStage: normalizeStage(
        Math.max(
          input.activeSegment.highestReachedStage,
          input.activeSegment.currentStage,
        ),
      ),
      startedAt: timestamp,
    },
    crashRecovery: null,
  };
}

export function canSelectCampaignStage(
  progress: CampaignProgress,
  expansion: CampaignExpansionState,
  stage: number,
): boolean {
  if (
    !Number.isInteger(stage) ||
    stage < 1 ||
    stage > MAX_CAMPAIGN_STAGE
  ) {
    return false;
  }

  // highestReachedStage is a record only. It intentionally does not
  // grant Stage Select access after a rollback.
  const progressionCeiling = Math.min(
    progress.highestUnlockedStage,
    Math.max(
      expansion.activeSegment.currentStage,
      expansion.checkpoint.stage,
    ),
  );

  return stage <= progressionCeiling;
}
