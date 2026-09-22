import {
  createDefaultCampaignProgress,
  loadCampaignProgress,
  sanitizeCampaignProgress,
  saveCampaignProgress,
} from "../campaign/progress";
import type { CampaignProgress } from "../campaign/types";
import {
  createCampaignExpansionState,
  sanitizeCampaignExpansionState,
  type CampaignExpansionState,
} from "../campaign/expansion-state";
import {
  createStarterCharacterState,
  sanitizeCharacterState,
  type CharacterState,
} from "../characters/state";
import {
  createStarterEquipmentState,
  migrateLegacyEquipmentState,
  migrateRarityEquipmentState,
  sanitizeEquipmentState,
  type EquipmentState,
} from "../equipment/loadout";
import {
  createEmptyInventory,
  sanitizeInventory,
  type Inventory,
} from "../items/inventory";
import {
  createStarterSupportSpellState,
  sanitizeSupportSpellState,
  type SupportSpellState,
} from "../skills/support-loadout";
import {
  createLuckPityState,
  sanitizeLuckPityState,
  type LuckPityState,
} from "../loot/pity";
import {
  createHiddenDiscoveryState,
  sanitizeHiddenDiscoveryState,
  type HiddenDiscoveryState,
} from "../discovery/hidden-content";
import { sanitizeCredits } from "../economy/credits";
import {
  createExpansionCurrencyState,
  sanitizeExpansionCurrencyState,
  type ExpansionCurrencyState,
} from "../economy/currencies";
import {
  createProgressionState,
  sanitizeProgressionState,
  type ProgressionState,
} from "../progression/missions";
import {
  createCheckpointSnapshot,
  sanitizeCheckpointSnapshot,
  type CheckpointSnapshot,
  type RunPersistentState,
} from "./checkpoint";
import {
  createShopState,
  sanitizeShopState,
  type ShopState,
} from "../shops/state";
import {
  createRouteState,
  sanitizeRouteState,
  type RouteState,
} from "../campaign/route";
import {
  createHiddenChallengeState,
  sanitizeHiddenChallengeState,
  type HiddenChallengeState,
} from "../campaign/hidden-challenge";
import {
  resolveCrashRecovery,
  sanitizeCrashRecoverySnapshot,
  type CrashRecoverySnapshot,
} from "./crash-recovery";
import {
  sanitizeStageEntrySnapshot,
  type StageEntrySnapshot,
} from "./death-protection";

const DB_NAME = "space-typing";
const INDEXED_DB_VERSION = 1;
const STORE_NAME = "player";
const SAVE_KEY = "main";
const RECOVERY_SAVE_KEY = "spaceTypingPlayerSaveRecoveryV3";

export const PLAYER_SAVE_VERSION = 22;

export class UnsupportedPlayerSaveVersionError extends Error {
  constructor(readonly version: number) {
    super(
      "Player save version " +
        String(version) +
        " is newer or unsupported. Current version: " +
        String(PLAYER_SAVE_VERSION) +
        ".",
    );
    this.name = "UnsupportedPlayerSaveVersionError";
  }
}

export type SaveReason =
  | "migration"
  | "stage-entry"
  | "stage-clear"
  | "gameover"
  | "stage-select"
  | "inventory"
  | "equipment"
  | "support-spells"
  | "character"
  | "discovery"
  | "shop"
  | "route-choice"
  | "challenge"
  | "progression"
  | "pagehide"
  | "manual"
  | "unknown";

export type PlayerSaveV1 = {
  version: 1;
  campaign: CampaignProgress;
  updatedAt: string;
};

export type PlayerSaveV2 = {
  version: 2;
  campaign: CampaignProgress;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV3 = {
  version: 3;
  campaign: CampaignProgress;
  inventory: Inventory;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV4 = {
  version: 4;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: unknown;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV5 = {
  version: 5;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: unknown;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV6 = {
  version: 6;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV7 = {
  version: 7;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV8 = {
  version: 8;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  characters: unknown;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV9 = {
  version: 9;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  characters: unknown;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV10 = {
  version: 10;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  characters: CharacterState;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV11 = {
  version: 11;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  characters: CharacterState;
  luckPity: LuckPityState;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV12 = {
  version: 12;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  characters: CharacterState;
  luckPity: LuckPityState;
  hiddenDiscovery: HiddenDiscoveryState;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV13 = {
  version: 13;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  characters: CharacterState;
  luckPity: LuckPityState;
  hiddenDiscovery: HiddenDiscoveryState;
  credits: number;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV14 = {
  version: 14;
  campaign: CampaignProgress;
  inventory: Inventory;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
  characters: CharacterState;
  luckPity: LuckPityState;
  hiddenDiscovery: HiddenDiscoveryState;
  credits: number;
  progression: ProgressionState;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV15 = {
  version: 15;
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
  campaignExpansion: CampaignExpansionState;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV16 = {
  version: 16;
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
  campaignExpansion: CampaignExpansionState;
  checkpointSnapshot: CheckpointSnapshot;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV17 = {
  version: 17;
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
  campaignExpansion: CampaignExpansionState;
  checkpointSnapshot: CheckpointSnapshot;
  crashRecoverySnapshot: CrashRecoverySnapshot | null;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV18 = {
  version: 18;
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
  campaignExpansion: CampaignExpansionState;
  checkpointSnapshot: CheckpointSnapshot;
  crashRecoverySnapshot: CrashRecoverySnapshot | null;
  stageEntrySnapshot: StageEntrySnapshot | null;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV19 = {
  version: 19;
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
  campaignExpansion: CampaignExpansionState;
  checkpointSnapshot: CheckpointSnapshot;
  crashRecoverySnapshot: CrashRecoverySnapshot | null;
  stageEntrySnapshot: StageEntrySnapshot | null;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV20 = {
  version: 20;
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
  campaignExpansion: CampaignExpansionState;
  checkpointSnapshot: CheckpointSnapshot;
  crashRecoverySnapshot: CrashRecoverySnapshot | null;
  stageEntrySnapshot: StageEntrySnapshot | null;
  shops: ShopState;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV21 = {
  version: 21;
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
  campaignExpansion: CampaignExpansionState;
  checkpointSnapshot: CheckpointSnapshot;
  crashRecoverySnapshot: CrashRecoverySnapshot | null;
  stageEntrySnapshot: StageEntrySnapshot | null;
  shops: ShopState;
  route: RouteState;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSaveV22 = {
  version: 22;
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
  campaignExpansion: CampaignExpansionState;
  checkpointSnapshot: CheckpointSnapshot;
  crashRecoverySnapshot: CrashRecoverySnapshot | null;
  stageEntrySnapshot: StageEntrySnapshot | null;
  shops: ShopState;
  route: RouteState;
  challenge: HiddenChallengeState;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSave = PlayerSaveV22;
export type PersistenceSource = "indexeddb" | "localStorage";

export type LoadedPlayerSave = {
  save: PlayerSave;
  source: PersistenceSource;
  migrated: boolean;
  recoveryMode: "none" | "crash" | "death-rollback";
};

export type MigrationResult = {
  save: PlayerSave;
  migrated: boolean;
  fromVersion: number | null;
};

function normalizeSaveReason(value: unknown): SaveReason {
  return value === "migration" ||
    value === "stage-entry" ||
    value === "stage-clear" ||
    value === "gameover" ||
    value === "stage-select" ||
    value === "inventory" ||
    value === "equipment" ||
    value === "support-spells" ||
    value === "character" ||
    value === "discovery" ||
    value === "shop" ||
    value === "route-choice" ||
    value === "challenge" ||
    value === "progression" ||
    value === "pagehide" ||
    value === "manual"
    ? value
    : "unknown";
}

export function createPlayerSave(
  campaign: CampaignProgress,
  updatedAt = new Date().toISOString(),
  lastSaveReason: SaveReason = "unknown",
  inventory: Inventory = createEmptyInventory(),
  equipment: EquipmentState = createStarterEquipmentState(),
  supportSpells: SupportSpellState = createStarterSupportSpellState(),
  characters: CharacterState = createStarterCharacterState(),
  luckPity: LuckPityState = createLuckPityState(),
  hiddenDiscovery: HiddenDiscoveryState = createHiddenDiscoveryState(),
  credits = 0,
  progression: ProgressionState = createProgressionState(),
  expansionCurrencies: ExpansionCurrencyState =
    createExpansionCurrencyState(),
  campaignExpansion: CampaignExpansionState =
    createCampaignExpansionState(campaign, updatedAt),
  checkpointSnapshot?: CheckpointSnapshot,
  crashRecoverySnapshot: CrashRecoverySnapshot | null = null,
  stageEntrySnapshot: StageEntrySnapshot | null = null,
  shops: ShopState = createShopState(),
  route: RouteState = createRouteState(campaign.highestUnlockedStage),
  challenge: HiddenChallengeState = createHiddenChallengeState(),
): PlayerSave {
  const safeCampaign = sanitizeCampaignProgress(campaign);
  const activeState: RunPersistentState = {
    campaign: safeCampaign,
    inventory: sanitizeInventory(inventory),
    equipment: sanitizeEquipmentState(equipment),
    supportSpells: sanitizeSupportSpellState(supportSpells),
    characters: sanitizeCharacterState(characters),
    luckPity: sanitizeLuckPityState(luckPity),
    hiddenDiscovery: sanitizeHiddenDiscoveryState(hiddenDiscovery),
    credits: sanitizeCredits(credits),
    progression: sanitizeProgressionState(progression),
    expansionCurrencies:
      sanitizeExpansionCurrencyState(expansionCurrencies),
    shops: sanitizeShopState(shops),
    route: sanitizeRouteState(
      route,
      safeCampaign.highestUnlockedStage,
    ),
    challenge: sanitizeHiddenChallengeState(challenge),
  };
  const safeCampaignExpansion = sanitizeCampaignExpansionState(
    campaignExpansion,
    safeCampaign,
    updatedAt,
  );
  const safeCheckpoint =
    checkpointSnapshot === undefined
      ? createCheckpointSnapshot(
          activeState,
          safeCampaignExpansion.checkpoint.stage,
        )
      : sanitizeCheckpointSnapshot(
          checkpointSnapshot,
          activeState,
          safeCampaignExpansion.checkpoint.stage,
        );

  return {
    version: PLAYER_SAVE_VERSION,
    ...activeState,
    campaignExpansion: safeCampaignExpansion,
    checkpointSnapshot: safeCheckpoint,
    crashRecoverySnapshot:
      sanitizeCrashRecoverySnapshot(crashRecoverySnapshot),
    stageEntrySnapshot:
      sanitizeStageEntrySnapshot(stageEntrySnapshot),
    updatedAt,
    lastSaveReason,
  };
}

export function migratePlayerSave(value: unknown): MigrationResult {
  if (value === null || typeof value !== "object") {
    return {
      save: createPlayerSave(createDefaultCampaignProgress(), ""),
      migrated: false,
      fromVersion: null,
    };
  }

  const raw = value as {
    version?: unknown;
    campaign?: unknown;
    inventory?: unknown;
    equipment?: unknown;
    supportSpells?: unknown;
    characters?: unknown;
    luckPity?: unknown;
    hiddenDiscovery?: unknown;
    credits?: unknown;
    progression?: unknown;
    expansionCurrencies?: unknown;
    campaignExpansion?: unknown;
    checkpointSnapshot?: unknown;
    crashRecoverySnapshot?: unknown;
    stageEntrySnapshot?: unknown;
    shops?: unknown;
    route?: unknown;
    challenge?: unknown;
    updatedAt?: unknown;
    lastSaveReason?: unknown;
  };

  if (raw.version === 1 || raw.version === 2) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        createEmptyInventory(),
        createStarterEquipmentState(),
      ),
      migrated: true,
      fromVersion: raw.version,
    };
  }

  if (raw.version === 3) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        createStarterEquipmentState(),
      ),
      migrated: true,
      fromVersion: 3,
    };
  }

  if (raw.version === 4) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        migrateLegacyEquipmentState(raw.equipment),
      ),
      migrated: true,
      fromVersion: 4,
    };
  }

  if (raw.version === 5) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        migrateRarityEquipmentState(raw.equipment),
      ),
      migrated: true,
      fromVersion: 5,
    };
  }

  if (raw.version === 6) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        createStarterSupportSpellState(),
      ),
      migrated: true,
      fromVersion: 6,
    };
  }

  if (raw.version === 7) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        createStarterCharacterState(),
      ),
      migrated: true,
      fromVersion: 7,
    };
  }

  if (raw.version === 8) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
      ),
      migrated: true,
      fromVersion: 8,
    };
  }

  if (raw.version === 9) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
      ),
      migrated: true,
      fromVersion: 9,
    };
  }

  if (raw.version === 10) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        createLuckPityState(),
      ),
      migrated: true,
      fromVersion: 10,
    };
  }

  if (raw.version === 11) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        sanitizeLuckPityState(raw.luckPity),
        createHiddenDiscoveryState(),
      ),
      migrated: true,
      fromVersion: 11,
    };
  }

  if (raw.version === 12) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        sanitizeLuckPityState(raw.luckPity),
        sanitizeHiddenDiscoveryState(raw.hiddenDiscovery),
        0,
      ),
      migrated: true,
      fromVersion: 12,
    };
  }

  if (raw.version === 13) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        sanitizeLuckPityState(raw.luckPity),
        sanitizeHiddenDiscoveryState(raw.hiddenDiscovery),
        sanitizeCredits(raw.credits),
        createProgressionState(),
      ),
      migrated: true,
      fromVersion: 13,
    };
  }

  if (raw.version === 14) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        sanitizeLuckPityState(raw.luckPity),
        sanitizeHiddenDiscoveryState(raw.hiddenDiscovery),
        sanitizeCredits(raw.credits),
        sanitizeProgressionState(raw.progression),
      ),
      migrated: true,
      fromVersion: 14,
    };
  }

  if (raw.version === 15) {
    const safeCampaign = sanitizeCampaignProgress(raw.campaign);
    const timestamp =
      typeof raw.updatedAt === "string" ? raw.updatedAt : "";
    return {
      save: createPlayerSave(
        safeCampaign,
        timestamp,
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        sanitizeLuckPityState(raw.luckPity),
        sanitizeHiddenDiscoveryState(raw.hiddenDiscovery),
        sanitizeCredits(raw.credits),
        sanitizeProgressionState(raw.progression),
        sanitizeExpansionCurrencyState(raw.expansionCurrencies),
        sanitizeCampaignExpansionState(
          raw.campaignExpansion,
          safeCampaign,
          timestamp,
        ),
      ),
      migrated: true,
      fromVersion: 15,
    };
  }

  if (raw.version === 16) {
    const safeCampaign = sanitizeCampaignProgress(raw.campaign);
    const timestamp =
      typeof raw.updatedAt === "string" ? raw.updatedAt : "";
    return {
      save: createPlayerSave(
        safeCampaign,
        timestamp,
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        sanitizeLuckPityState(raw.luckPity),
        sanitizeHiddenDiscoveryState(raw.hiddenDiscovery),
        sanitizeCredits(raw.credits),
        sanitizeProgressionState(raw.progression),
        sanitizeExpansionCurrencyState(raw.expansionCurrencies),
        sanitizeCampaignExpansionState(
          raw.campaignExpansion,
          safeCampaign,
          timestamp,
        ),
        raw.checkpointSnapshot as CheckpointSnapshot | undefined,
        null,
      ),
      migrated: true,
      fromVersion: 16,
    };
  }

  if (raw.version === 17) {
    const safeCampaign = sanitizeCampaignProgress(raw.campaign);
    const timestamp =
      typeof raw.updatedAt === "string" ? raw.updatedAt : "";
    return {
      save: createPlayerSave(
        safeCampaign,
        timestamp,
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        sanitizeLuckPityState(raw.luckPity),
        sanitizeHiddenDiscoveryState(raw.hiddenDiscovery),
        sanitizeCredits(raw.credits),
        sanitizeProgressionState(raw.progression),
        sanitizeExpansionCurrencyState(raw.expansionCurrencies),
        sanitizeCampaignExpansionState(
          raw.campaignExpansion,
          safeCampaign,
          timestamp,
        ),
        raw.checkpointSnapshot as CheckpointSnapshot | undefined,
        sanitizeCrashRecoverySnapshot(raw.crashRecoverySnapshot),
        null,
      ),
      migrated: true,
      fromVersion: 17,
    };
  }

  if (raw.version === 18) {
    const safeCampaign = sanitizeCampaignProgress(raw.campaign);
    const timestamp =
      typeof raw.updatedAt === "string" ? raw.updatedAt : "";
    return {
      save: createPlayerSave(
        safeCampaign,
        timestamp,
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        sanitizeLuckPityState(raw.luckPity),
        sanitizeHiddenDiscoveryState(raw.hiddenDiscovery),
        sanitizeCredits(raw.credits),
        sanitizeProgressionState(raw.progression),
        sanitizeExpansionCurrencyState(raw.expansionCurrencies),
        sanitizeCampaignExpansionState(
          raw.campaignExpansion,
          safeCampaign,
          timestamp,
        ),
        raw.checkpointSnapshot as CheckpointSnapshot | undefined,
        sanitizeCrashRecoverySnapshot(raw.crashRecoverySnapshot),
        sanitizeStageEntrySnapshot(raw.stageEntrySnapshot),
      ),
      migrated: true,
      fromVersion: 18,
    };
  }

  if (raw.version === 19) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        sanitizeLuckPityState(raw.luckPity),
        sanitizeHiddenDiscoveryState(raw.hiddenDiscovery),
        sanitizeCredits(raw.credits),
        sanitizeProgressionState(raw.progression),
        sanitizeExpansionCurrencyState(raw.expansionCurrencies),
        sanitizeCampaignExpansionState(
          raw.campaignExpansion,
          sanitizeCampaignProgress(raw.campaign),
          typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        ),
        raw.checkpointSnapshot as CheckpointSnapshot | undefined,
        sanitizeCrashRecoverySnapshot(raw.crashRecoverySnapshot),
        sanitizeStageEntrySnapshot(raw.stageEntrySnapshot),
        createShopState(),
      ),
      migrated: true,
      fromVersion: 19,
    };
  }

  if (raw.version === 20) {
    const safeCampaign = sanitizeCampaignProgress(raw.campaign);
    return {
      save: createPlayerSave(
        safeCampaign,
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        sanitizeLuckPityState(raw.luckPity),
        sanitizeHiddenDiscoveryState(raw.hiddenDiscovery),
        sanitizeCredits(raw.credits),
        sanitizeProgressionState(raw.progression),
        sanitizeExpansionCurrencyState(raw.expansionCurrencies),
        sanitizeCampaignExpansionState(
          raw.campaignExpansion,
          safeCampaign,
          typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        ),
        raw.checkpointSnapshot as CheckpointSnapshot | undefined,
        sanitizeCrashRecoverySnapshot(raw.crashRecoverySnapshot),
        sanitizeStageEntrySnapshot(raw.stageEntrySnapshot),
        sanitizeShopState(raw.shops),
        createRouteState(safeCampaign.highestUnlockedStage),
      ),
      migrated: true,
      fromVersion: 20,
    };
  }

  if (raw.version === 21) {
    const safeCampaign = sanitizeCampaignProgress(raw.campaign);
    return {
      save: createPlayerSave(
        safeCampaign,
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        "migration",
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        sanitizeLuckPityState(raw.luckPity),
        sanitizeHiddenDiscoveryState(raw.hiddenDiscovery),
        sanitizeCredits(raw.credits),
        sanitizeProgressionState(raw.progression),
        sanitizeExpansionCurrencyState(raw.expansionCurrencies),
        sanitizeCampaignExpansionState(
          raw.campaignExpansion,
          safeCampaign,
          typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        ),
        raw.checkpointSnapshot as CheckpointSnapshot | undefined,
        sanitizeCrashRecoverySnapshot(raw.crashRecoverySnapshot),
        sanitizeStageEntrySnapshot(raw.stageEntrySnapshot),
        sanitizeShopState(raw.shops),
        sanitizeRouteState(
          raw.route,
          safeCampaign.highestUnlockedStage,
        ),
        createHiddenChallengeState(),
      ),
      migrated: true,
      fromVersion: 21,
    };
  }

  if (raw.version === PLAYER_SAVE_VERSION) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        normalizeSaveReason(raw.lastSaveReason),
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
        sanitizeCharacterState(raw.characters),
        sanitizeLuckPityState(raw.luckPity),
        sanitizeHiddenDiscoveryState(raw.hiddenDiscovery),
        sanitizeCredits(raw.credits),
        sanitizeProgressionState(raw.progression),
        sanitizeExpansionCurrencyState(raw.expansionCurrencies),
        sanitizeCampaignExpansionState(
          raw.campaignExpansion,
          sanitizeCampaignProgress(raw.campaign),
          typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        ),
        raw.checkpointSnapshot as CheckpointSnapshot | undefined,
        sanitizeCrashRecoverySnapshot(raw.crashRecoverySnapshot),
        sanitizeStageEntrySnapshot(raw.stageEntrySnapshot),
        sanitizeShopState(raw.shops),
        sanitizeRouteState(
          raw.route,
          sanitizeCampaignProgress(raw.campaign).highestUnlockedStage,
        ),
        sanitizeHiddenChallengeState(raw.challenge),
      ),
      migrated: false,
      fromVersion: PLAYER_SAVE_VERSION,
    };
  }

  if (typeof raw.version === "number" && Number.isFinite(raw.version)) {
    throw new UnsupportedPlayerSaveVersionError(raw.version);
  }

  return {
    save: createPlayerSave(
      sanitizeCampaignProgress(raw.campaign),
      typeof raw.updatedAt === "string" ? raw.updatedAt : "",
      "migration",
      sanitizeInventory(raw.inventory),
      sanitizeEquipmentState(raw.equipment),
      sanitizeSupportSpellState(raw.supportSpells),
      sanitizeCharacterState(raw.characters),
    ),
    migrated: true,
    fromVersion: null,
  };
}

export function sanitizePlayerSave(value: unknown): PlayerSave {
  return migratePlayerSave(value).save;
}

function progressRank(progress: CampaignProgress): [number, number, number] {
  return [
    progress.highestUnlockedStage,
    progress.clearedStages.length,
    Object.keys(progress.bestByStage).length,
  ];
}

function compareCampaignProgress(
  left: CampaignProgress,
  right: CampaignProgress,
): number {
  const leftRank = progressRank(left);
  const rightRank = progressRank(right);

  for (let index = 0; index < leftRank.length; index += 1) {
    const leftValue = leftRank[index] ?? 0;
    const rightValue = rightRank[index] ?? 0;
    if (leftValue > rightValue) return 1;
    if (rightValue > leftValue) return -1;
  }

  return 0;
}

export function chooseFurthestCampaign(
  preferred: CampaignProgress,
  fallback: CampaignProgress,
): CampaignProgress {
  return compareCampaignProgress(preferred, fallback) >= 0
    ? preferred
    : fallback;
}

function saveTimestamp(save: PlayerSave): number {
  const value = Date.parse(save.updatedAt);
  return Number.isFinite(value) ? value : 0;
}

export function choosePreferredPlayerSave(
  preferred: PlayerSave,
  recovery: PlayerSave,
): PlayerSave {
  const campaignComparison = compareCampaignProgress(
    preferred.campaign,
    recovery.campaign,
  );
  if (campaignComparison > 0) return preferred;
  if (campaignComparison < 0) return recovery;

  return saveTimestamp(recovery) > saveTimestamp(preferred)
    ? recovery
    : preferred;
}

function recoverySaveFromLegacy(): PlayerSave {
  const legacyCampaign = loadCampaignProgress();

  try {
    const raw = localStorage.getItem(RECOVERY_SAVE_KEY);
    if (raw === null) {
      return createPlayerSave(legacyCampaign, "", "migration");
    }

    const recovery = migratePlayerSave(JSON.parse(raw)).save;
    const campaign = chooseFurthestCampaign(
      recovery.campaign,
      legacyCampaign,
    );

    return createPlayerSave(
      campaign,
      recovery.updatedAt,
      recovery.lastSaveReason,
      recovery.inventory,
      recovery.equipment,
      recovery.supportSpells,
      recovery.characters,
      recovery.luckPity,
      recovery.hiddenDiscovery,
      recovery.credits,
      recovery.progression,
      recovery.expansionCurrencies,
      recovery.campaignExpansion,
      recovery.checkpointSnapshot,
      recovery.crashRecoverySnapshot,
      recovery.stageEntrySnapshot,
      recovery.shops,
      recovery.route,
      recovery.challenge,
    );
  } catch (error) {
    if (error instanceof UnsupportedPlayerSaveVersionError) throw error;
    return createPlayerSave(legacyCampaign, "", "migration");
  }
}

function saveRecovery(save: PlayerSave): void {
  localStorage.setItem(RECOVERY_SAVE_KEY, JSON.stringify(save));
  saveCampaignProgress(save.campaign);
}

export function savePlayerRecoveryMirrorSync(save: PlayerSave): void {
  saveRecovery(save);
}

function runStateFromSave(save: PlayerSave): RunPersistentState {
  return {
    campaign: save.campaign,
    inventory: save.inventory,
    equipment: save.equipment,
    supportSpells: save.supportSpells,
    characters: save.characters,
    luckPity: save.luckPity,
    hiddenDiscovery: save.hiddenDiscovery,
    credits: save.credits,
    progression: save.progression,
    expansionCurrencies: save.expansionCurrencies,
    shops: save.shops,
    route: save.route,
    challenge: save.challenge,
  };
}

export function resolvePlayerSaveRecovery(
  save: PlayerSave,
  timestamp = new Date().toISOString(),
): {
  save: PlayerSave;
  recoveryMode: LoadedPlayerSave["recoveryMode"];
} {
  const resolution = resolveCrashRecovery(
    runStateFromSave(save),
    save.campaignExpansion,
    save.checkpointSnapshot,
    save.crashRecoverySnapshot,
    timestamp,
  );

  if (resolution.mode === "none") {
    return { save, recoveryMode: "none" };
  }

  return {
    save: createPlayerSave(
      resolution.state.campaign,
      timestamp,
      save.lastSaveReason,
      resolution.state.inventory,
      resolution.state.equipment,
      resolution.state.supportSpells,
      resolution.state.characters,
      resolution.state.luckPity,
      resolution.state.hiddenDiscovery,
      resolution.state.credits,
      resolution.state.progression,
      resolution.state.expansionCurrencies,
      resolution.campaignExpansion,
      resolution.checkpointSnapshot,
      resolution.crashRecoverySnapshot,
      save.stageEntrySnapshot,
      resolution.state.shops,
      resolution.state.route,
      resolution.state.challenge,
    ),
    recoveryMode: resolution.mode,
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, INDEXED_DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Unable to open IndexedDB."));
  });
}

function readSave(database: IDBDatabase): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(SAVE_KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Unable to read player save."));
  });
}

function writeSave(database: IDBDatabase, save: PlayerSave): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(save, SAVE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Unable to write player save."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Player save was aborted."));
  });
}

async function writeIndexedDb(save: PlayerSave): Promise<void> {
  const database = await openDatabase();
  try {
    await writeSave(database, save);
  } finally {
    database.close();
  }
}

export async function loadPlayerSave(): Promise<LoadedPlayerSave> {
  const recovery = recoverySaveFromLegacy();

  if (!("indexedDB" in window)) {
    const resolved = resolvePlayerSaveRecovery(recovery);
    try {
      if (resolved.recoveryMode !== "none") {
        saveRecovery(resolved.save);
      }
    } catch {
      // The resolved in-memory state is still safe to use.
    }
    return {
      save: resolved.save,
      source: "localStorage",
      migrated: recovery.lastSaveReason === "migration",
      recoveryMode: resolved.recoveryMode,
    };
  }

  let database: IDBDatabase | null = null;

  try {
    database = await openDatabase();
    const stored = await readSave(database);

    if (stored === undefined) {
      const resolved = resolvePlayerSaveRecovery(recovery);
      const migrated = createPlayerSave(
        resolved.save.campaign,
        new Date().toISOString(),
        "migration",
        resolved.save.inventory,
        resolved.save.equipment,
        resolved.save.supportSpells,
        resolved.save.characters,
        resolved.save.luckPity,
        resolved.save.hiddenDiscovery,
        resolved.save.credits,
        resolved.save.progression,
        resolved.save.expansionCurrencies,
        resolved.save.campaignExpansion,
        resolved.save.checkpointSnapshot,
        resolved.save.crashRecoverySnapshot,
        resolved.save.stageEntrySnapshot,
        resolved.save.shops,
        resolved.save.route,
        resolved.save.challenge,
      );
      await writeSave(database, migrated);
      try {
        saveRecovery(migrated);
      } catch {
        // IndexedDB remains the source of truth.
      }
      return {
        save: migrated,
        source: "indexeddb",
        migrated: true,
        recoveryMode: resolved.recoveryMode,
      };
    }

    const migration = migratePlayerSave(stored);
    const preferredSave = choosePreferredPlayerSave(
      migration.save,
      recovery,
    );
    const useRecovery = preferredSave === recovery;
    const campaign = preferredSave.campaign;
    const inventory = useRecovery
      ? recovery.inventory
      : migration.save.inventory;
    const equipment = useRecovery
      ? recovery.equipment
      : migration.save.equipment;
    const supportSpells = useRecovery
      ? recovery.supportSpells
      : migration.save.supportSpells;
    const characters = useRecovery
      ? recovery.characters
      : migration.save.characters;
    const luckPity = useRecovery
      ? recovery.luckPity
      : migration.save.luckPity;
    const hiddenDiscovery = useRecovery
      ? recovery.hiddenDiscovery
      : migration.save.hiddenDiscovery;
    const credits = useRecovery
      ? recovery.credits
      : migration.save.credits;
    const progression = useRecovery
      ? recovery.progression
      : migration.save.progression;
    const expansionCurrencies = useRecovery
      ? recovery.expansionCurrencies
      : migration.save.expansionCurrencies;
    const shops = useRecovery
      ? recovery.shops
      : migration.save.shops;
    const route = useRecovery
      ? recovery.route
      : migration.save.route;
    const challenge = useRecovery
      ? recovery.challenge
      : migration.save.challenge;
    const campaignExpansion = useRecovery
      ? recovery.campaignExpansion
      : migration.save.campaignExpansion;
    const checkpointSnapshot = useRecovery
      ? recovery.checkpointSnapshot
      : migration.save.checkpointSnapshot;
    const crashRecoverySnapshot = useRecovery
      ? recovery.crashRecoverySnapshot
      : migration.save.crashRecoverySnapshot;
    const stageEntrySnapshot = useRecovery
      ? recovery.stageEntrySnapshot
      : migration.save.stageEntrySnapshot;

    const recoveredProgress =
      campaign !== migration.save.campaign ||
      inventory !== migration.save.inventory ||
      equipment !== migration.save.equipment ||
      supportSpells !== migration.save.supportSpells ||
      characters !== migration.save.characters ||
      luckPity !== migration.save.luckPity ||
      hiddenDiscovery !== migration.save.hiddenDiscovery ||
      credits !== migration.save.credits ||
      progression !== migration.save.progression ||
      expansionCurrencies !== migration.save.expansionCurrencies ||
      shops !== migration.save.shops ||
      route !== migration.save.route ||
      challenge !== migration.save.challenge ||
      campaignExpansion !== migration.save.campaignExpansion ||
      checkpointSnapshot !== migration.save.checkpointSnapshot ||
      crashRecoverySnapshot !== migration.save.crashRecoverySnapshot ||
      stageEntrySnapshot !== migration.save.stageEntrySnapshot;

    const candidate = createPlayerSave(
      campaign,
      useRecovery ? recovery.updatedAt : migration.save.updatedAt,
      useRecovery ? recovery.lastSaveReason : migration.save.lastSaveReason,
      inventory,
      equipment,
      supportSpells,
      characters,
      luckPity,
      hiddenDiscovery,
      credits,
      progression,
      expansionCurrencies,
      campaignExpansion,
      checkpointSnapshot,
      crashRecoverySnapshot,
      stageEntrySnapshot,
      shops,
      route,
      challenge,
    );
    const resolved = resolvePlayerSaveRecovery(candidate);

    if (
      migration.migrated ||
      recoveredProgress ||
      resolved.recoveryMode !== "none"
    ) {
      const recovered = createPlayerSave(
        resolved.save.campaign,
        new Date().toISOString(),
        migration.migrated || recoveredProgress
          ? "migration"
          : resolved.save.lastSaveReason,
        resolved.save.inventory,
        resolved.save.equipment,
        resolved.save.supportSpells,
        resolved.save.characters,
        resolved.save.luckPity,
        resolved.save.hiddenDiscovery,
        resolved.save.credits,
        resolved.save.progression,
        resolved.save.expansionCurrencies,
        resolved.save.campaignExpansion,
        resolved.save.checkpointSnapshot,
        resolved.save.crashRecoverySnapshot,
        resolved.save.stageEntrySnapshot,
        resolved.save.shops,
        resolved.save.route,
        resolved.save.challenge,
      );
      await writeSave(database, recovered);
      try {
        saveRecovery(recovered);
      } catch {
        // IndexedDB remains the source of truth.
      }
      return {
        save: recovered,
        source: "indexeddb",
        migrated: migration.migrated || recoveredProgress,
        recoveryMode: resolved.recoveryMode,
      };
    }

    try {
      saveRecovery(resolved.save);
    } catch {
      // IndexedDB remains the source of truth if the mirror fails.
    }

    return {
      save: resolved.save,
      source: "indexeddb",
      migrated: false,
      recoveryMode: resolved.recoveryMode,
    };
  } catch (error) {
    if (error instanceof UnsupportedPlayerSaveVersionError) throw error;
    const resolved = resolvePlayerSaveRecovery(recovery);
    return {
      save: resolved.save,
      source: "localStorage",
      migrated: false,
      recoveryMode: resolved.recoveryMode,
    };
  } finally {
    database?.close();
  }
}

export async function savePlayerProgress(
  campaign: CampaignProgress,
  inventory: Inventory,
  equipment: EquipmentState,
  supportSpells: SupportSpellState,
  characters: CharacterState,
  reason: SaveReason = "unknown",
  luckPity: LuckPityState = createLuckPityState(),
  hiddenDiscovery: HiddenDiscoveryState = createHiddenDiscoveryState(),
  credits = 0,
  progression: ProgressionState = createProgressionState(),
  expansionCurrencies: ExpansionCurrencyState =
    createExpansionCurrencyState(),
  campaignExpansion?: CampaignExpansionState,
  checkpointSnapshot?: CheckpointSnapshot,
  crashRecoverySnapshot: CrashRecoverySnapshot | null = null,
  stageEntrySnapshot: StageEntrySnapshot | null = null,
  shops: ShopState = createShopState(),
  route: RouteState = createRouteState(campaign.highestUnlockedStage),
  challenge: HiddenChallengeState = createHiddenChallengeState(),
): Promise<PersistenceSource> {
  const save = createPlayerSave(
    campaign,
    new Date().toISOString(),
    reason,
    inventory,
    equipment,
    supportSpells,
    characters,
    luckPity,
    hiddenDiscovery,
    credits,
    progression,
    expansionCurrencies,
    campaignExpansion,
    checkpointSnapshot,
    crashRecoverySnapshot,
    stageEntrySnapshot,
    shops,
    route,
    challenge,
  );

  if ("indexedDB" in window) {
    try {
      await writeIndexedDb(save);
      try {
        saveRecovery(save);
      } catch {
        // IndexedDB already contains the valid save.
      }
      return "indexeddb";
    } catch {
      // Use recovery storage below.
    }
  }

  saveRecovery(save);
  return "localStorage";
}
