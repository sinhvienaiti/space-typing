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
    Math.max(progress.selectedStage, highestCleared),
  );
}

export function createCampaignExpansionState(
  progress: CampaignProgress,
  timestamp = "",
): CampaignExpansionState {
  const currentStage = normalizeStage(progress.selectedStage);
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
  if (
    sectorRaw.startStage !== expectedSector.startStage ||
    sectorRaw.endStage !== expectedSector.endStage ||
    checkpointRaw.stage !== expectedSector.startStage ||
    activeRaw.checkpointStage !== expectedSector.startStage ||
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

  return {
    sector: { ...value.sector },
    checkpoint: { ...value.checkpoint },
    activeSegment: { ...value.activeSegment },
    crashRecovery:
      value.crashRecovery === null
        ? null
        : { ...value.crashRecovery },
  };
}
