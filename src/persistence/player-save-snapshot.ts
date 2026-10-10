import {
  PLAYER_SAVE_VERSION,
  openPlayerDatabase,
  readCanonicalPlayerSave,
  type PlayerSave,
} from "./player-save";

const CANONICAL_STORE_NAME = "player";
const CANONICAL_SAVE_KEY = "main";

export class QaCanonicalSnapshotError extends Error {}

async function readStoredCanonicalSave(database: IDBDatabase): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(CANONICAL_STORE_NAME, "readonly");
    const request = transaction.objectStore(CANONICAL_STORE_NAME).get(CANONICAL_SAVE_KEY);
    let result: unknown;
    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () => reject(request.error ?? new Error("Unable to read canonical save"));
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = transaction.onerror = () =>
      reject(transaction.error ?? new Error("Canonical save read aborted"));
  });
}

/**
 * Read the current canonical account without acquiring the account writer lock
 * and without writing/migrating it. QA uses this snapshot as the seed for its
 * disposable sandbox, so a normal tab may remain the sole canonical writer.
 */
export async function readPlayerSaveSnapshotForQa(): Promise<PlayerSave> {
  if (!("indexedDB" in globalThis)) {
    throw new QaCanonicalSnapshotError(
      "QA sandbox requires the current IndexedDB account; no canonical writer fallback is allowed.",
    );
  }
  const database = await openPlayerDatabase();
  try {
    const stored = await readStoredCanonicalSave(database);
    if (stored === undefined) {
      throw new QaCanonicalSnapshotError(
        "No canonical account exists. Start a normal session before QA.",
      );
    }
    const version = (stored as { version?: unknown } | null)?.version;
    if (version !== PLAYER_SAVE_VERSION) {
      throw new QaCanonicalSnapshotError(
        "QA cannot migrate account data. Open a normal session to migrate the canonical save first.",
      );
    }
    return structuredClone(readCanonicalPlayerSave(stored));
  } finally {
    database.close();
  }
}
