import {
  rollbackCampaignExpansion,
  sanitizeCampaignExpansionState,
  type CampaignExpansionState,
  type CrashRecoveryReason,
} from "../campaign/expansion-state";
import {
  isValidCheckpointSnapshot,
  isValidRunPersistentState,
  restoreCheckpointSnapshot,
  sanitizeCheckpointSnapshot,
  sanitizeRunPersistentState,
  type CheckpointSnapshot,
  type RunPersistentState,
} from "./checkpoint";

export type CrashRecoverySnapshot = {
  state: RunPersistentState;
  campaignExpansion: CampaignExpansionState;
  checkpointSnapshot: CheckpointSnapshot;
  savedAt: string;
  reason: CrashRecoveryReason;
  deathInvalidated: boolean;
};

export type CrashRecoveryResolution = {
  state: RunPersistentState;
  campaignExpansion: CampaignExpansionState;
  checkpointSnapshot: CheckpointSnapshot;
  crashRecoverySnapshot: CrashRecoverySnapshot | null;
  mode: "none" | "crash" | "death-rollback";
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isValidCrashRecoverySnapshot(
  value: unknown,
): value is CrashRecoverySnapshot {
  if (!isRecord(value)) return false;

  const state = value.state;
  const expansion = value.campaignExpansion;
  const checkpoint = value.checkpointSnapshot;

  if (
    !isValidRunPersistentState(state) ||
    !isValidCheckpointSnapshot(checkpoint) ||
    typeof value.savedAt !== "string" ||
    typeof value.reason !== "string" ||
    typeof value.deathInvalidated !== "boolean"
  ) {
    return false;
  }

  const safeExpansion = sanitizeCampaignExpansionState(
    expansion,
    state.campaign,
    value.savedAt,
  );

  if (
    safeExpansion.crashRecovery === null ||
    safeExpansion.crashRecovery.savedAt !== value.savedAt ||
    safeExpansion.crashRecovery.reason !== value.reason ||
    safeExpansion.crashRecovery.deathInvalidated !== value.deathInvalidated
  ) {
    return false;
  }

  return (
    safeExpansion.crashRecovery.stage === state.campaign.selectedStage
  );
}

export function captureCrashRecoverySnapshot(
  stateInput: RunPersistentState,
  expansionInput: CampaignExpansionState,
  checkpointInput: CheckpointSnapshot,
  reason: CrashRecoveryReason,
  savedAt: string,
): {
  snapshot: CrashRecoverySnapshot;
  campaignExpansion: CampaignExpansionState;
} {
  const state = sanitizeRunPersistentState(stateInput);
  const checkpoint = sanitizeCheckpointSnapshot(
    checkpointInput,
    state,
    expansionInput.checkpoint.stage,
  );
  const expansion = sanitizeCampaignExpansionState(
    expansionInput,
    state.campaign,
    savedAt,
  );
  const crashRecovery = {
    stage: state.campaign.selectedStage,
    savedAt,
    reason,
    deathInvalidated: false,
  } as const;
  const campaignExpansion: CampaignExpansionState = {
    ...expansion,
    crashRecovery,
  };

  return {
    snapshot: {
      state,
      campaignExpansion,
      checkpointSnapshot: checkpoint,
      savedAt,
      reason,
      deathInvalidated: false,
    },
    campaignExpansion,
  };
}

export function invalidateCrashRecoverySnapshot(
  snapshotInput: CrashRecoverySnapshot | null,
  stateInput: RunPersistentState,
  expansionInput: CampaignExpansionState,
  checkpointInput: CheckpointSnapshot,
  savedAt: string,
): {
  snapshot: CrashRecoverySnapshot;
  campaignExpansion: CampaignExpansionState;
} {
  const fallback = captureCrashRecoverySnapshot(
    stateInput,
    expansionInput,
    checkpointInput,
    "manual",
    savedAt,
  );
  const base =
    snapshotInput !== null && isValidCrashRecoverySnapshot(snapshotInput)
      ? snapshotInput
      : fallback.snapshot;

  const crashRecovery = {
    stage: base.state.campaign.selectedStage,
    savedAt,
    reason: base.reason,
    deathInvalidated: true,
  } as const;
  const campaignExpansion: CampaignExpansionState = {
    ...sanitizeCampaignExpansionState(
      expansionInput,
      stateInput.campaign,
      savedAt,
    ),
    crashRecovery,
  };

  return {
    snapshot: {
      ...base,
      campaignExpansion,
      savedAt,
      deathInvalidated: true,
    },
    campaignExpansion,
  };
}

export function sanitizeCrashRecoverySnapshot(
  value: unknown,
): CrashRecoverySnapshot | null {
  if (!isValidCrashRecoverySnapshot(value)) return null;

  return {
    state: sanitizeRunPersistentState(value.state),
    campaignExpansion: sanitizeCampaignExpansionState(
      value.campaignExpansion,
      value.state.campaign,
      value.savedAt,
    ),
    checkpointSnapshot: sanitizeCheckpointSnapshot(
      value.checkpointSnapshot,
      value.state,
      value.campaignExpansion.checkpoint.stage,
    ),
    savedAt: value.savedAt,
    reason: value.reason,
    deathInvalidated: value.deathInvalidated,
  };
}

export function resolveCrashRecovery(
  activeStateInput: RunPersistentState,
  expansionInput: CampaignExpansionState,
  checkpointInput: CheckpointSnapshot,
  crashRecoveryInput: CrashRecoverySnapshot | null,
  timestamp: string,
): CrashRecoveryResolution {
  const activeState = sanitizeRunPersistentState(activeStateInput);
  const expansion = sanitizeCampaignExpansionState(
    expansionInput,
    activeState.campaign,
    timestamp,
  );
  const checkpoint = sanitizeCheckpointSnapshot(
    checkpointInput,
    activeState,
    expansion.checkpoint.stage,
  );
  const crashRecovery = sanitizeCrashRecoverySnapshot(
    crashRecoveryInput,
  );

  if (crashRecovery === null) {
    return {
      state: activeState,
      campaignExpansion: expansion,
      checkpointSnapshot: checkpoint,
      crashRecoverySnapshot: null,
      mode: "none",
    };
  }

  if (crashRecovery.deathInvalidated) {
    return {
      state: restoreCheckpointSnapshot(checkpoint, activeState),
      campaignExpansion: rollbackCampaignExpansion(
        expansion,
        timestamp,
      ),
      checkpointSnapshot: checkpoint,
      crashRecoverySnapshot: crashRecovery,
      mode: "death-rollback",
    };
  }

  return {
    state: sanitizeRunPersistentState(crashRecovery.state),
    campaignExpansion: sanitizeCampaignExpansionState(
      crashRecovery.campaignExpansion,
      crashRecovery.state.campaign,
      crashRecovery.savedAt,
    ),
    checkpointSnapshot: sanitizeCheckpointSnapshot(
      crashRecovery.checkpointSnapshot,
      crashRecovery.state,
      crashRecovery.campaignExpansion.checkpoint.stage,
    ),
    crashRecoverySnapshot: crashRecovery,
    mode: "crash",
  };
}
