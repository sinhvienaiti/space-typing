import {
  createDefaultCampaignProgress,
  loadCampaignProgress,
  sanitizeCampaignProgress,
  saveCampaignProgress,
} from "../campaign/progress";
import type { CampaignProgress } from "../campaign/types";
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
  createMetaProgressState,
  sanitizeMetaProgressState,
  type MetaProgressState,
} from "../progression/meta";

const DB_NAME = "space-typing";
const INDEXED_DB_VERSION = 1;
const STORE_NAME = "player";
const SAVE_KEY = "main";
const RECOVERY_SAVE_KEY = "spaceTypingPlayerSaveRecoveryV3";

export const PLAYER_SAVE_VERSION = 14;

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
  | "stage-clear"
  | "stage-select"
  | "inventory"
  | "equipment"
  | "support-spells"
  | "character"
  | "discovery"
  | "shop"
  | "meta"
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
  metaProgress: MetaProgressState;
  updatedAt: string;
  lastSaveReason: SaveReason;
};

export type PlayerSave = PlayerSaveV14;
export type PersistenceSource = "indexeddb" | "localStorage";

export type LoadedPlayerSave = {
  save: PlayerSave;
  source: PersistenceSource;
  migrated: boolean;
};

export type MigrationResult = {
  save: PlayerSave;
  migrated: boolean;
  fromVersion: number | null;
};

function normalizeSaveReason(value: unknown): SaveReason {
  return value === "migration" ||
    value === "stage-clear" ||
    value === "stage-select" ||
    value === "inventory" ||
    value === "equipment" ||
    value === "support-spells" ||
    value === "character" ||
    value === "discovery" ||
    value === "shop" ||
    value === "meta" ||
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
  metaProgress: MetaProgressState = createMetaProgressState(),
): PlayerSave {
  return {
    version: PLAYER_SAVE_VERSION,
    campaign: sanitizeCampaignProgress(campaign),
    inventory: sanitizeInventory(inventory),
    equipment: sanitizeEquipmentState(equipment),
    supportSpells: sanitizeSupportSpellState(supportSpells),
    characters: sanitizeCharacterState(characters),
    luckPity: sanitizeLuckPityState(luckPity),
    hiddenDiscovery: sanitizeHiddenDiscoveryState(hiddenDiscovery),
    credits: sanitizeCredits(credits),
    metaProgress: sanitizeMetaProgressState(metaProgress),
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
    metaProgress?: unknown;
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
        createMetaProgressState(),
      ),
      migrated: true,
      fromVersion: 13,
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
        sanitizeMetaProgressState(raw.metaProgress),
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

export function chooseFurthestCampaign(
  preferred: CampaignProgress,
  fallback: CampaignProgress,
): CampaignProgress {
  const left = progressRank(preferred);
  const right = progressRank(fallback);

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    if (leftValue > rightValue) return preferred;
    if (rightValue > leftValue) return fallback;
  }

  return preferred;
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
      recovery.metaProgress,
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
    return {
      save: recovery,
      source: "localStorage",
      migrated: recovery.lastSaveReason === "migration",
    };
  }

  let database: IDBDatabase | null = null;

  try {
    database = await openDatabase();
    const stored = await readSave(database);

    if (stored === undefined) {
      const migrated = createPlayerSave(
        recovery.campaign,
        new Date().toISOString(),
        "migration",
        recovery.inventory,
        recovery.equipment,
        recovery.supportSpells,
        recovery.characters,
        recovery.luckPity,
        recovery.hiddenDiscovery,
        recovery.credits,
        recovery.metaProgress,
      );
      await writeSave(database, migrated);
      try {
        saveRecovery(migrated);
      } catch {
        // IndexedDB remains the source of truth.
      }
      return { save: migrated, source: "indexeddb", migrated: true };
    }

    const migration = migratePlayerSave(stored);
    const campaign = chooseFurthestCampaign(
      migration.save.campaign,
      recovery.campaign,
    );
    const useRecovery = campaign === recovery.campaign;
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
    const metaProgress = useRecovery
      ? recovery.metaProgress
      : migration.save.metaProgress;

    const recoveredProgress =
      campaign !== migration.save.campaign ||
      inventory !== migration.save.inventory ||
      equipment !== migration.save.equipment ||
      supportSpells !== migration.save.supportSpells ||
      characters !== migration.save.characters ||
      luckPity !== migration.save.luckPity ||
      hiddenDiscovery !== migration.save.hiddenDiscovery ||
      credits !== migration.save.credits ||
      metaProgress !== migration.save.metaProgress;

    if (migration.migrated || recoveredProgress) {
      const recovered = createPlayerSave(
        campaign,
        new Date().toISOString(),
        "migration",
        inventory,
        equipment,
        supportSpells,
        characters,
        luckPity,
        hiddenDiscovery,
        credits,
        metaProgress,
      );
      await writeSave(database, recovered);
      try {
        saveRecovery(recovered);
      } catch {
        // IndexedDB remains the source of truth.
      }
      return { save: recovered, source: "indexeddb", migrated: true };
    }

    try {
      saveRecovery(migration.save);
    } catch {
      // IndexedDB remains the source of truth if the mirror fails.
    }

    return {
      save: migration.save,
      source: "indexeddb",
      migrated: false,
    };
  } catch (error) {
    if (error instanceof UnsupportedPlayerSaveVersionError) throw error;
    return {
      save: recovery,
      source: "localStorage",
      migrated: false,
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
  metaProgress: MetaProgressState = createMetaProgressState(),
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
    metaProgress,
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
