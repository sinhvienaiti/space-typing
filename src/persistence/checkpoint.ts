import { MAX_CAMPAIGN_STAGE, normalizeStage } from "../campaign/stage";
import {
  sanitizeCampaignProgress,
} from "../campaign/progress";
import type { CampaignProgress } from "../campaign/types";
import {
  sanitizeCharacterState,
  isValidCharacterState,
  type CharacterState,
} from "../characters/state";
import {
  sanitizeEquipmentState,
  isValidEquipmentState,
  type EquipmentState,
} from "../equipment/loadout";
import {
  sanitizeInventory,
  isValidInventory,
  type Inventory,
} from "../items/inventory";
import {
  sanitizeSupportSpellState,
  isValidSupportSpellState,
  type SupportSpellState,
} from "../skills/support-loadout";
import {
  sanitizeLuckPityState,
  isValidLuckPityState,
  type LuckPityState,
} from "../loot/pity";
import {
  HIDDEN_CONTENT_IDS,
  sanitizeHiddenDiscoveryState,
  isValidHiddenDiscoveryState,
  type HiddenDiscoveryState,
} from "../discovery/hidden-content";
import {
  sanitizeCredits,
  isValidCredits,
} from "../economy/credits";
import {
  sanitizeProgressionState,
  isValidProgressionState,
  ACHIEVEMENT_IDS,
  type ProgressionState,
} from "../progression/missions";
import {
  sanitizeExpansionCurrencyState,
  isValidExpansionCurrencyState,
  type ExpansionCurrencyState,
} from "../economy/currencies";

export type RunPersistentState = {
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  characters: CharacterState;
  luckPity: LuckPityState;
  hiddenDiscovery: HiddenDiscoveryState;
  credits: number;
  progression: ProgressionState;
  expansionCurrencies: ExpansionCurrencyState;
};

export type CheckpointSnapshot = RunPersistentState;

function campaignAtCheckpoint(
  input: CampaignProgress,
  checkpointStage: number,
): CampaignProgress {
  const campaign = sanitizeCampaignProgress(input);
  const checkpoint = normalizeStage(checkpointStage);
  const terminalComplete =
    checkpoint === MAX_CAMPAIGN_STAGE &&
    campaign.clearedStages.includes(MAX_CAMPAIGN_STAGE);

  return {
    ...campaign,
    highestUnlockedStage: checkpoint,
    selectedStage: checkpoint,
    clearedStages: terminalComplete
      ? [...campaign.clearedStages]
      : campaign.clearedStages.filter((stage) => stage < checkpoint),
    bestByStage: { ...campaign.bestByStage },
  };
}

export function createCheckpointSnapshot(
  input: RunPersistentState,
  checkpointStage: number,
): CheckpointSnapshot {
  return {
    campaign: campaignAtCheckpoint(input.campaign, checkpointStage),
    inventory: sanitizeInventory(input.inventory),
    equipment: sanitizeEquipmentState(input.equipment),
    supportSpells: sanitizeSupportSpellState(input.supportSpells),
    characters: sanitizeCharacterState(input.characters),
    luckPity: sanitizeLuckPityState(input.luckPity),
    hiddenDiscovery: sanitizeHiddenDiscoveryState(input.hiddenDiscovery),
    credits: sanitizeCredits(input.credits),
    progression: sanitizeProgressionState(input.progression),
    expansionCurrencies:
      sanitizeExpansionCurrencyState(input.expansionCurrencies),
  };
}

function isValidCampaignSnapshot(value: unknown): value is CampaignProgress {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const raw = value as Record<string, unknown>;
  if (
    raw.version !== 1 ||
    typeof raw.highestUnlockedStage !== "number" ||
    typeof raw.selectedStage !== "number" ||
    !Array.isArray(raw.clearedStages) ||
    raw.bestByStage === null ||
    typeof raw.bestByStage !== "object" ||
    Array.isArray(raw.bestByStage)
  ) {
    return false;
  }

  const safe = sanitizeCampaignProgress(value);
  return JSON.stringify(safe) === JSON.stringify(value);
}

export function isValidCheckpointSnapshot(
  value: unknown,
): value is CheckpointSnapshot {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const raw = value as Record<string, unknown>;
  return (
    isValidCampaignSnapshot(raw.campaign) &&
    isValidInventory(raw.inventory) &&
    isValidEquipmentState(raw.equipment) &&
    isValidSupportSpellState(raw.supportSpells) &&
    isValidCharacterState(raw.characters) &&
    isValidLuckPityState(raw.luckPity) &&
    isValidHiddenDiscoveryState(raw.hiddenDiscovery) &&
    isValidCredits(raw.credits) &&
    isValidProgressionState(raw.progression) &&
    isValidExpansionCurrencyState(raw.expansionCurrencies)
  );
}

export function sanitizeCheckpointSnapshot(
  value: unknown,
  fallback: RunPersistentState,
  checkpointStage: number,
): CheckpointSnapshot {
  if (!isValidCheckpointSnapshot(value)) {
    return createCheckpointSnapshot(fallback, checkpointStage);
  }

  return {
    campaign: sanitizeCampaignProgress(value.campaign),
    inventory: sanitizeInventory(value.inventory),
    equipment: sanitizeEquipmentState(value.equipment),
    supportSpells: sanitizeSupportSpellState(value.supportSpells),
    characters: sanitizeCharacterState(value.characters),
    luckPity: sanitizeLuckPityState(value.luckPity),
    hiddenDiscovery:
      sanitizeHiddenDiscoveryState(value.hiddenDiscovery),
    credits: sanitizeCredits(value.credits),
    progression: sanitizeProgressionState(value.progression),
    expansionCurrencies:
      sanitizeExpansionCurrencyState(value.expansionCurrencies),
  };
}

function mergeKnowledgeCampaign(
  committed: CampaignProgress,
  active: CampaignProgress,
): CampaignProgress {
  return {
    ...committed,
    bestByStage: {
      ...committed.bestByStage,
      ...active.bestByStage,
    },
  };
}

function mergeKnowledgeDiscovery(
  committed: HiddenDiscoveryState,
  active: HiddenDiscoveryState,
): HiddenDiscoveryState {
  const discovered = new Set([
    ...committed.discovered,
    ...active.discovered,
  ]);

  return {
    ...committed,
    discovered: HIDDEN_CONTENT_IDS.filter((id) => discovered.has(id)),
    drought: { ...committed.drought },
  };
}

function mergeKnowledgeProgression(
  committed: ProgressionState,
  active: ProgressionState,
): ProgressionState {
  const achievements = new Set([
    ...committed.unlockedAchievements,
    ...active.unlockedAchievements,
  ]);

  return {
    ...committed,
    counters: { ...committed.counters },
    claimedMissions: [...committed.claimedMissions],
    unlockedAchievements: ACHIEVEMENT_IDS.filter((id) =>
      achievements.has(id),
    ),
  };
}

export function restoreCheckpointSnapshot(
  committedInput: CheckpointSnapshot,
  activeInput: RunPersistentState,
): RunPersistentState {
  const committed = sanitizeCheckpointSnapshot(
    committedInput,
    activeInput,
    committedInput.campaign.selectedStage,
  );
  const active = {
    campaign: sanitizeCampaignProgress(activeInput.campaign),
    inventory: sanitizeInventory(activeInput.inventory),
    equipment: sanitizeEquipmentState(activeInput.equipment),
    supportSpells: sanitizeSupportSpellState(activeInput.supportSpells),
    characters: sanitizeCharacterState(activeInput.characters),
    luckPity: sanitizeLuckPityState(activeInput.luckPity),
    hiddenDiscovery:
      sanitizeHiddenDiscoveryState(activeInput.hiddenDiscovery),
    credits: sanitizeCredits(activeInput.credits),
    progression: sanitizeProgressionState(activeInput.progression),
    expansionCurrencies:
      sanitizeExpansionCurrencyState(activeInput.expansionCurrencies),
  };

  return {
    campaign: mergeKnowledgeCampaign(
      committed.campaign,
      active.campaign,
    ),
    inventory: { ...committed.inventory },
    equipment: sanitizeEquipmentState(committed.equipment),
    supportSpells:
      sanitizeSupportSpellState(committed.supportSpells),
    characters: sanitizeCharacterState(committed.characters),
    luckPity: sanitizeLuckPityState(committed.luckPity),
    hiddenDiscovery: mergeKnowledgeDiscovery(
      committed.hiddenDiscovery,
      active.hiddenDiscovery,
    ),
    credits: committed.credits,
    progression: mergeKnowledgeProgression(
      committed.progression,
      active.progression,
    ),
    expansionCurrencies: {
      ...committed.expansionCurrencies,
    },
  };
}
