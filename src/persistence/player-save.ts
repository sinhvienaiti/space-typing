import {
  createDefaultCampaignProgress,
  loadCampaignProgress,
  sanitizeCampaignProgress,
  saveCampaignProgress,
} from "../campaign/progress";
import type { CampaignProgress } from "../campaign/types";

const DB_NAME = "space-typing";
const DB_VERSION = 1;
const STORE_NAME = "player";
const SAVE_KEY = "main";

export type PlayerSaveV1 = {
  version: 1;
  campaign: CampaignProgress;
  updatedAt: string;
};

export type PersistenceSource = "indexeddb" | "localStorage";

export type LoadedPlayerSave = {
  save: PlayerSaveV1;
  source: PersistenceSource;
  migrated: boolean;
};

export function createPlayerSave(
  campaign: CampaignProgress,
  updatedAt = new Date().toISOString(),
): PlayerSaveV1 {
  return {
    version: 1,
    campaign: sanitizeCampaignProgress(campaign),
    updatedAt,
  };
}

export function sanitizePlayerSave(value: unknown): PlayerSaveV1 {
  if (value === null || typeof value !== "object") {
    return createPlayerSave(createDefaultCampaignProgress(), "");
  }

  const raw = value as Partial<PlayerSaveV1>;
  return {
    version: 1,
    campaign: sanitizeCampaignProgress(raw.campaign),
    updatedAt:
      typeof raw.updatedAt === "string" ? raw.updatedAt : "",
  };
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
    const request = indexedDB.open(DB_NAME, DB_VERSION);

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
  save: PlayerSaveV1,
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

async function writeIndexedDb(save: PlayerSaveV1): Promise<void> {
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
      const migrated = createPlayerSave(legacyCampaign);
      await writeSave(database, migrated);
      return {
        save: migrated,
        source: "indexeddb",
        migrated: true,
      };
    }

    const indexed = sanitizePlayerSave(stored);
    const campaign = chooseFurthestCampaign(
      indexed.campaign,
      legacyCampaign,
    );

    if (campaign !== indexed.campaign) {
      const recovered = createPlayerSave(campaign);
      await writeSave(database, recovered);
      return {
        save: recovered,
        source: "indexeddb",
        migrated: true,
      };
    }

    return {
      save: indexed,
      source: "indexeddb",
      migrated: false,
    };
  } catch {
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
): Promise<PersistenceSource> {
  const save = createPlayerSave(campaign);

  if ("indexedDB" in window) {
    try {
      await writeIndexedDb(save);
      return "indexeddb";
    } catch {
      // Keep the old adapter as a recovery path if IndexedDB is unavailable.
    }
  }

  saveCampaignProgress(save.campaign);
  return "localStorage";
}
