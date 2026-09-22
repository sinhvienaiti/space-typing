import {
  normalizeStage,
} from "../campaign/stage";
import {
  rollbackCampaignExpansion,
  sanitizeCampaignExpansionState,
  type CampaignExpansionState,
} from "../campaign/expansion-state";
import {
  itemCount,
  removeItem,
} from "../items/inventory";
import {
  isValidCheckpointSnapshot,
  isValidRunPersistentState,
  migrateLegacyRunPersistentState,
  restoreCheckpointSnapshot,
  sanitizeCheckpointSnapshot,
  sanitizeRunPersistentState,
  type CheckpointSnapshot,
  type RunPersistentState,
} from "./checkpoint";

export const DEATH_PROTECTION_ITEM_IDS = [
  "salvage-anchor",
  "stage-revival-core",
  "phoenix-core",
] as const;

export type DeathProtectionItemId =
  (typeof DEATH_PROTECTION_ITEM_IDS)[number];

export type StageEntrySnapshot = {
  stage: number;
  capturedAt: string;
  state: RunPersistentState;
  campaignExpansion: CampaignExpansionState;
  checkpointSnapshot: CheckpointSnapshot;
};

export type DeathProtectionResolution = {
  applied: boolean;
  state: RunPersistentState;
  campaignExpansion: CampaignExpansionState;
  checkpointSnapshot: CheckpointSnapshot;
  stageEntrySnapshot: StageEntrySnapshot | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function createStageEntrySnapshot(
  stateInput: RunPersistentState,
  expansionInput: CampaignExpansionState,
  checkpointInput: CheckpointSnapshot,
  capturedAt: string,
): StageEntrySnapshot {
  const state = sanitizeRunPersistentState(stateInput);
  const campaignExpansion = sanitizeCampaignExpansionState(
    expansionInput,
    state.campaign,
    capturedAt,
  );
  const checkpointSnapshot = sanitizeCheckpointSnapshot(
    checkpointInput,
    state,
    campaignExpansion.checkpoint.stage,
  );

  return {
    stage: normalizeStage(state.campaign.selectedStage),
    capturedAt,
    state,
    campaignExpansion,
    checkpointSnapshot,
  };
}

export function isValidStageEntrySnapshot(
  value: unknown,
): value is StageEntrySnapshot {
  if (!isRecord(value)) return false;
  if (
    !Number.isInteger(value.stage) ||
    typeof value.stage !== "number" ||
    value.stage < 1 ||
    value.stage > 1000 ||
    typeof value.capturedAt !== "string" ||
    !isValidRunPersistentState(value.state) ||
    !isValidCheckpointSnapshot(value.checkpointSnapshot)
  ) {
    return false;
  }

  const state = value.state;
  if (state.campaign.selectedStage !== value.stage) return false;

  const expansion = sanitizeCampaignExpansionState(
    value.campaignExpansion,
    state.campaign,
    value.capturedAt,
  );

  return (
    expansion.checkpoint.stage ===
      value.checkpointSnapshot.campaign.selectedStage &&
    JSON.stringify(expansion) ===
      JSON.stringify(value.campaignExpansion)
  );
}

export function sanitizeStageEntrySnapshot(
  value: unknown,
): StageEntrySnapshot | null {
  if (isValidStageEntrySnapshot(value)) {
    return createStageEntrySnapshot(
      value.state,
      value.campaignExpansion,
      value.checkpointSnapshot,
      value.capturedAt,
    );
  }

  if (
    !isRecord(value) ||
    !Number.isInteger(value.stage) ||
    typeof value.stage !== "number" ||
    value.stage < 1 ||
    value.stage > 1000 ||
    typeof value.capturedAt !== "string"
  ) {
    return null;
  }

  const state = migrateLegacyRunPersistentState(value.state);
  if (state === null || state.campaign.selectedStage !== value.stage) {
    return null;
  }

  const campaignExpansion = sanitizeCampaignExpansionState(
    value.campaignExpansion,
    state.campaign,
    value.capturedAt,
  );
  if (
    JSON.stringify(campaignExpansion) !==
    JSON.stringify(value.campaignExpansion)
  ) {
    return null;
  }

  return createStageEntrySnapshot(
    state,
    campaignExpansion,
    sanitizeCheckpointSnapshot(
      value.checkpointSnapshot,
      state,
      campaignExpansion.checkpoint.stage,
    ),
    value.capturedAt,
  );
}

function consumeProtectionItem(
  stateInput: RunPersistentState,
  itemId: DeathProtectionItemId,
): {
  state: RunPersistentState;
  consumed: boolean;
} {
  const state = sanitizeRunPersistentState(stateInput);
  if (itemCount(state.inventory, itemId) <= 0) {
    return { state, consumed: false };
  }

  const removed = removeItem(state.inventory, itemId, 1);
  return {
    state: {
      ...state,
      inventory: removed.inventory,
    },
    consumed: removed.changed === 1,
  };
}

export function resolveSalvageAnchor(
  activeInput: RunPersistentState,
  expansionInput: CampaignExpansionState,
  checkpointInput: CheckpointSnapshot,
  timestamp: string,
): DeathProtectionResolution {
  const active = sanitizeRunPersistentState(activeInput);
  const consumed = consumeProtectionItem(active, "salvage-anchor");
  if (!consumed.consumed) {
    return {
      applied: false,
      state: active,
      campaignExpansion: expansionInput,
      checkpointSnapshot: checkpointInput,
      stageEntrySnapshot: null,
    };
  }

  const checkpointRestored = restoreCheckpointSnapshot(
    checkpointInput,
    active,
  );
  const state: RunPersistentState = {
    ...consumed.state,
    campaign: checkpointRestored.campaign,
  };

  return {
    applied: true,
    state,
    campaignExpansion: rollbackCampaignExpansion(
      expansionInput,
      timestamp,
    ),
    checkpointSnapshot: sanitizeCheckpointSnapshot(
      checkpointInput,
      state,
      expansionInput.checkpoint.stage,
    ),
    stageEntrySnapshot: null,
  };
}

export function resolveStageRevivalCore(
  activeInput: RunPersistentState,
  stageEntryInput: StageEntrySnapshot | null,
): DeathProtectionResolution | null {
  const active = sanitizeRunPersistentState(activeInput);
  const stageEntry = sanitizeStageEntrySnapshot(stageEntryInput);
  if (
    stageEntry === null ||
    itemCount(active.inventory, "stage-revival-core") <= 0
  ) {
    return null;
  }

  // Revert failed-stage economic mutations to the deterministic entry
  // state while retaining knowledge/meta observations already seen.
  const restored = restoreCheckpointSnapshot(
    stageEntry.state,
    active,
  );
  const consumed = consumeProtectionItem(
    restored,
    "stage-revival-core",
  );
  if (!consumed.consumed) return null;

  return {
    applied: true,
    state: consumed.state,
    campaignExpansion: sanitizeCampaignExpansionState(
      stageEntry.campaignExpansion,
      consumed.state.campaign,
      stageEntry.capturedAt,
    ),
    checkpointSnapshot: sanitizeCheckpointSnapshot(
      stageEntry.checkpointSnapshot,
      consumed.state,
      stageEntry.campaignExpansion.checkpoint.stage,
    ),
    stageEntrySnapshot: createStageEntrySnapshot(
      consumed.state,
      stageEntry.campaignExpansion,
      stageEntry.checkpointSnapshot,
      stageEntry.capturedAt,
    ),
  };
}

export function consumePhoenixCore(
  activeInput: RunPersistentState,
): {
  state: RunPersistentState;
  applied: boolean;
} {
  const consumed = consumeProtectionItem(
    activeInput,
    "phoenix-core",
  );
  return {
    state: consumed.state,
    applied: consumed.consumed,
  };
}
