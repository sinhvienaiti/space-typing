import {
  createDefaultCampaignProgress,
  loadCampaignProgress,
  sanitizeCampaignProgress,
  saveCampaignProgress,
} from "../campaign/progress";
import type { CampaignProgress } from "../campaign/types";

const DB_NAME = "space-typing";
const INDEXED_DB_VERSION = 1;
const STORE_NAME = "player";
const SAVE_KEY = "main";

export const PLAYER_SAVE_VERSION = 2;

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

export type PlayerSave = PlayerSaveV2;

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
    value === "pagehide" ||
    value === "manual"
    ? value
    : "unknown";
}

export function createPlayerSave(
  campaign: CampaignProgress,
  updatedAt = new Date().toISOString(),
  lastSaveReason: SaveReason = "unknown",
): PlayerSave {
  return {
    version: PLAYER_SAVE_VERSION,
    campaign: sanitizeCampaignProgress(campaign),
    updatedAt,
    lastSaveReason,
  };
}

function migrateV1(value: PlayerSaveV1): PlayerSave {
  return createPlayerSave(
    value.campaign,
    typeof value.updatedAt === "string" ? value.updatedAt : "",
    "migration",
  );
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
    updatedAt?: unknown;
    lastSaveReason?: unknown;
  };

  if (raw.version === 1) {
    return {
      save: migrateV1({
        version: 1,
        campaign: sanitizeCampaignProgress(raw.campaign),
        updatedAt:
          typeof raw.updatedAt === "string" ? raw.updatedAt : "",
      }),
      migrated: true,
      fromVersion: 1,
    };
  }

  if (raw.version === PLAYER_SAVE_VERSION) {
    return {
      save: {
        version: PLAYER_SAVE_VERSION,
        campaign: sanitizeCampaignProgress(raw.campaign),
        updatedAt:
          typeof raw.updatedAt === "string" ? raw.updatedAt : "",
        lastSaveReason: normalizeSaveReason(raw.lastSaveReason),
      },
      migrated: false,
      fromVersion: PLAYER_SAVE_VERSION,
    };
  }

  if (
    typeof raw.version === "number" &&
    Number.isFinite(raw.version)
  ) {
    throw new UnsupportedPlayerSaveVersionError(raw.version);
  }

  return {
    save: createPlayerSave(
      sanitizeCampaignProgress(raw.campaign),
      typeof raw.updatedAt === "string" ? raw.updatedAt : "",
      "migration",
    ),
    migrated: true,
    fromVersion: null,
  };
}

export function sanitizePlayerSave(value: unknown): PlayerSave {
  return migratePlayerSave(value).save;
}

function progressRank(progress: CampaignProgress): [
  number,
  number,
  number,
] {
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

function writeSave(
  database: IDBDatabase,
  save: PlayerSave,
): Promise<void> {
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
  const legacyCampaign = loadCampaignProgress();

  if (!("indexedDB" in window)) {
    return {
      save: createPlayerSave(legacyCampaign),
      source: "localStorage",
      migrated: false,
    };
  }

  let database: IDBDatabase | null = null;

  try {
    database = await openDatabase();
    const stored = await readSave(database);

    if (stored === undefined) {
      const migrated = createPlayerSave(
        legacyCampaign,
        new Date().toISOString(),
        "migration",
      );
      await writeSave(database, migrated);
      return {
        save: migrated,
        source: "indexeddb",
        migrated: true,
      };
    }

    const migration = migratePlayerSave(stored);
    const campaign = chooseFurthestCampaign(
      migration.save.campaign,
      legacyCampaign,
    );

    const recoveredLegacy = campaign !== migration.save.campaign;
    const shouldWrite = migration.migrated || recoveredLegacy;

    if (shouldWrite) {
      const recovered = createPlayerSave(
        campaign,
        new Date().toISOString(),
        "migration",
      );
      await writeSave(database, recovered);
      return {
        save: recovered,
        source: "indexeddb",
        migrated: true,
      };
    }

    try {
      saveCampaignProgress(migration.save.campaign);
    } catch {
      // IndexedDB remains the source of truth if the recovery mirror fails.
    }

    return {
      save: migration.save,
      source: "indexeddb",
      migrated: false,
    };
  } catch (error) {
    if (error instanceof UnsupportedPlayerSaveVersionError) {
      throw error;
    }

    return {
      save: createPlayerSave(legacyCampaign),
      source: "localStorage",
      migrated: false,
    };
  } finally {
    database?.close();
  }
}

export async function savePlayerCampaign(
  campaign: CampaignProgress,
  reason: SaveReason = "unknown",
): Promise<PersistenceSource> {
  const save = createPlayerSave(
    campaign,
    new Date().toISOString(),
    reason,
  );

  if ("indexedDB" in window) {
    try {
      await writeIndexedDb(save);
      try {
        saveCampaignProgress(save.campaign);
      } catch {
        // IndexedDB already contains the valid save; recovery mirror is optional.
      }
      return "indexeddb";
    } catch {
      // Keep the old adapter as a recovery path if IndexedDB is unavailable.
    }
  }

  saveCampaignProgress(save.campaign);
  return "localStorage";
}
