import { MAX_CAMPAIGN_STAGE } from "../campaign/stage";
import {
  createStarterEquipmentState,
  isValidEquipmentState,
  isValidLegacyEquipmentState,
  isValidRarityEquipmentState,
  type EquipmentState,
} from "../equipment/loadout";
import type { CampaignProgress, StageBest } from "../campaign/types";
import {
  createEmptyInventory,
  isValidInventory,
  type Inventory,
} from "../items/inventory";
import {
  createPlayerSave,
  migratePlayerSave,
  PLAYER_SAVE_VERSION,
} from "./player-save";
import type { PlayerSave } from "./player-save";

export type BackupParseResult =
  | {
      ok: true;
      save: PlayerSave;
      migrated: boolean;
    }
  | {
      ok: false;
      error: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateBest(value: unknown): value is StageBest {
  if (!isRecord(value)) return false;

  return (
    isFiniteNumber(value.score) &&
    value.score >= 0 &&
    isFiniteNumber(value.accuracy) &&
    value.accuracy >= 0 &&
    value.accuracy <= 100 &&
    isFiniteNumber(value.wpm) &&
    value.wpm >= 0 &&
    typeof value.clearedAt === "string" &&
    value.clearedAt.length > 0
  );
}

function validateCampaign(value: unknown): value is CampaignProgress {
  if (!isRecord(value) || value.version !== 1) return false;

  if (
    !Number.isInteger(value.highestUnlockedStage) ||
    !isFiniteNumber(value.highestUnlockedStage) ||
    value.highestUnlockedStage < 1 ||
    value.highestUnlockedStage > MAX_CAMPAIGN_STAGE
  ) {
    return false;
  }

  if (
    !Number.isInteger(value.selectedStage) ||
    !isFiniteNumber(value.selectedStage) ||
    value.selectedStage < 1 ||
    value.selectedStage > value.highestUnlockedStage
  ) {
    return false;
  }

  if (!Array.isArray(value.clearedStages)) return false;
  for (const stage of value.clearedStages) {
    if (
      !Number.isInteger(stage) ||
      !isFiniteNumber(stage) ||
      stage < 1 ||
      stage > value.highestUnlockedStage
    ) {
      return false;
    }
  }

  if (!isRecord(value.bestByStage)) return false;
  for (const [key, best] of Object.entries(value.bestByStage)) {
    const stage = Number(key);
    if (
      !Number.isInteger(stage) ||
      stage < 1 ||
      stage > MAX_CAMPAIGN_STAGE ||
      !validateBest(best)
    ) {
      return false;
    }
  }

  return true;
}

export function exportPlayerSaveJson(
  campaign: CampaignProgress,
  updatedAt = new Date().toISOString(),
  inventory: Inventory = createEmptyInventory(),
  equipment: EquipmentState = createStarterEquipmentState(),
): string {
  return JSON.stringify(
    createPlayerSave(
      campaign,
      updatedAt,
      "manual",
      inventory,
      equipment,
    ),
    null,
    2,
  );
}

export function parsePlayerSaveJson(text: string): BackupParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      ok: false,
      error: "Invalid JSON file.",
    };
  }

  if (!isRecord(parsed)) {
    return {
      ok: false,
      error: "Save root must be an object.",
    };
  }

  const version = parsed.version;
  if (
    version !== 1 &&
    version !== 2 &&
    version !== 3 &&
    version !== 4 &&
    version !== 5 &&
    version !== PLAYER_SAVE_VERSION
  ) {
    return {
      ok: false,
      error:
        "Unsupported save version. Supported versions: 1-" +
        String(PLAYER_SAVE_VERSION) +
        ".",
    };
  }

  if (!validateCampaign(parsed.campaign)) {
    return {
      ok: false,
      error: "Campaign data is missing, corrupted or out of range.",
    };
  }

  if (
    (version === 3 ||
      version === 4 ||
      version === 5 ||
      version === PLAYER_SAVE_VERSION) &&
    !isValidInventory(parsed.inventory)
  ) {
    return {
      ok: false,
      error: "Inventory contains an unknown item or invalid stack count.",
    };
  }

  if (
    version === 4 &&
    !isValidLegacyEquipmentState(parsed.equipment)
  ) {
    return {
      ok: false,
      error: "Equipment data contains an invalid item or loadout reference.",
    };
  }

  if (
    version === 5 &&
    !isValidRarityEquipmentState(parsed.equipment)
  ) {
    return {
      ok: false,
      error: "Equipment data contains an invalid item or loadout reference.",
    };
  }

  if (
    version === PLAYER_SAVE_VERSION &&
    !isValidEquipmentState(parsed.equipment)
  ) {
    return {
      ok: false,
      error: "Equipment data contains an invalid item or loadout reference.",
    };
  }

  const migration = migratePlayerSave(parsed);
  return {
    ok: true,
    save: migration.save,
    migrated: migration.migrated,
  };
}
