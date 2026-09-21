import {
  createDefaultCampaignProgress,
  loadCampaignProgress,
  sanitizeCampaignProgress,
  saveCampaignProgress,
} from "../campaign/progress";
import type { CampaignProgress } from "../campaign/types";
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

const DB_NAME = "space-typing";
const INDEXED_DB_VERSION = 1;
const STORE_NAME = "player";
const SAVE_KEY = "main";
const RECOVERY_SAVE_KEY = "spaceTypingPlayerSaveRecoveryV3";

export const PLAYER_SAVE_VERSION = 7;

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

export type PlayerSave = PlayerSaveV7;
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
): PlayerSave {
  return {
    version: PLAYER_SAVE_VERSION,
    campaign: sanitizeCampaignProgress(campaign),
    inventory: sanitizeInventory(inventory),
    equipment: sanitizeEquipmentState(equipment),
    supportSpells: sanitizeSupportSpellState(supportSpells),
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

  if (raw.version === PLAYER_SAVE_VERSION) {
    return {
      save: createPlayerSave(
        sanitizeCampaignProgress(raw.campaign),
        typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        normalizeSaveReason(raw.lastSaveReason),
        sanitizeInventory(raw.inventory),
        sanitizeEquipmentState(raw.equipment),
        sanitizeSupportSpellState(raw.supportSpells),
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

    const recoveredProgress =
      campaign !== migration.save.campaign ||
      inventory !== migration.save.inventory ||
      equipment !== migration.save.equipment ||
      supportSpells !== migration.save.supportSpells;

    if (migration.migrated || recoveredProgress) {
      const recovered = createPlayerSave(
        campaign,
        new Date().toISOString(),
        "migration",
        inventory,
        equipment,
        supportSpells,
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
  reason: SaveReason = "unknown",
): Promise<PersistenceSource> {
  const save = createPlayerSave(
    campaign,
    new Date().toISOString(),
    reason,
    inventory,
    equipment,
    supportSpells,
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
