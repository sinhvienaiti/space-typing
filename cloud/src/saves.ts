import { isUniqueViolation, type Sql } from "./db";
import { ApiError, nowIso } from "./http";

/**
 * Cloud copy of the game save with a revision number. A device uploads with
 * the revision it last saw; if another device saved in between, the update
 * changes no row and the player chooses which copy to keep (409).
 *
 * Storage (D1 Free plan: 500 MB per database): the save is stored gzip
 * compressed in `data_gz` (`data` is then '{}'), with a small `summary` for
 * the Admin and the conflict dialog. Rows written before compression keep
 * their JSON in `data` and are still read. A save may be up to 1.9 MB of
 * JSON (UTF-8); compressed it is far below D1's 2 MB row limit.
 * Backups: one per hour of play, the newest `SAVE_BACKUPS` (default 6) kept.
 */
const SAVE_MAX_BYTES = 1_900_000;
const DEFAULT_BACKUPS = 6;
const BACKUP_EVERY_MS = 60 * 60_000;

export function backupsKept(setting: string | undefined): number {
  const value = Number(setting ?? DEFAULT_BACKUPS);
  return Number.isInteger(value) && value >= 1 && value <= 24 ? value : DEFAULT_BACKUPS;
}

export type SaveSummary = {
  highestUnlockedStage: unknown;
  clearedStages: unknown;
  credits: unknown;
  alloy: unknown;
  starCrystal: unknown;
  quantumCore: unknown;
  selectedShip: unknown;
  updatedAt: unknown;
};

/**
 * Small summary by SQLite: the stored `summary` (compressed rows), or the same
 * fields read from `data` (rows written before compression).
 */
export const SAVE_SUMMARY_SQL = `coalesce(summary, json_object(
  'highestUnlockedStage', json_extract(data, '$.campaign.highestUnlockedStage'),
  'clearedStages', json_array_length(json_extract(data, '$.campaign.clearedStages')),
  'credits', json_extract(data, '$.credits'),
  'alloy', json_extract(data, '$.expansionCurrencies.alloy'),
  'starCrystal', json_extract(data, '$.expansionCurrencies.starCrystal'),
  'quantumCore', json_extract(data, '$.expansionCurrencies.quantumCore'),
  'selectedShip', json_extract(data, '$.characters.selected'),
  'updatedAt', json_extract(data, '$.updatedAt')))`;

function field(value: unknown, key: string): unknown {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>)[key] ?? null : null;
}

/** The same fields as SAVE_SUMMARY_SQL, from the parsed save. */
export function saveSummary(data: Record<string, unknown>): SaveSummary {
  const cleared = field(data.campaign, "clearedStages");
  return {
    highestUnlockedStage: field(data.campaign, "highestUnlockedStage"),
    clearedStages: Array.isArray(cleared) ? cleared.length : null,
    credits: data.credits ?? null,
    alloy: field(data.expansionCurrencies, "alloy"),
    starCrystal: field(data.expansionCurrencies, "starCrystal"),
    quantumCore: field(data.expansionCurrencies, "quantumCore"),
    selectedShip: field(data.characters, "selected"),
    updatedAt: data.updatedAt ?? null,
  };
}

export async function gzipText(text: string): Promise<ArrayBuffer> {
  return new Response(new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer();
}

async function gunzipText(bytes: Uint8Array): Promise<string> {
  return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
}

/** D1 returns a BLOB as an array of numbers (or an ArrayBuffer in some runtimes). */
function blobBytes(value: unknown): Uint8Array | null {
  if (value === null || value === undefined) return null;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (Array.isArray(value)) return Uint8Array.from(value as number[]);
  return null;
}

/** The save's JSON text from a row with `data` and `data_gz`. */
export async function storedSaveText(row: { data: string; data_gz?: unknown }): Promise<string> {
  const bytes = blobBytes(row.data_gz);
  return bytes === null ? row.data : gunzipText(bytes);
}

/**
 * GET /save as JSON text, built around the stored save without parsing it
 * again (a parse and re-serialise of a large save costs most of the Free
 * plan's 10 ms CPU).
 */
export async function getSaveText(db: Sql, accountId: string): Promise<string | null> {
  const row = await db.first<{ revision: number; save_version: number; updated_at: string; data: string; data_gz: unknown; upload_id: string | null }>(
    "select revision, save_version, updated_at, data, data_gz, upload_id from player_saves where account_id = ?1",
    accountId,
  );
  if (row === null) return null;
  return (
    '{"revision":' + Number(row.revision) +
    ',"saveVersion":' + Number(row.save_version) +
    ',"updatedAt":' + JSON.stringify(row.updated_at) +
    ',"uploadId":' + JSON.stringify(row.upload_id ?? null) +
    ',"data":' + (await storedSaveText(row)) + "}"
  );
}

export async function putSave(
  db: Sql,
  accountId: string,
  input: { baseRevision?: unknown; saveVersion?: unknown; data?: unknown; device?: unknown; force?: unknown; uploadId?: unknown },
  now: number,
  keep = DEFAULT_BACKUPS,
): Promise<{ revision: number; updatedAt: string; bytes: number; storedBytes: number }> {
  const base = Number(input.baseRevision);
  const version = Number(input.saveVersion);
  if (!Number.isSafeInteger(base) || base < 0 || !Number.isSafeInteger(version) || version < 1) {
    throw new ApiError(400, "invalid", "Invalid save revision.");
  }
  if (input.data === null || typeof input.data !== "object" || Array.isArray(input.data)) {
    throw new ApiError(400, "invalid", "Save data must be an object.");
  }
  const data = input.data as Record<string, unknown>;
  const text = JSON.stringify(data);
  // The limit is in UTF-8 bytes; text.length counts UTF-16 units (Vietnamese letters take 2–3 bytes).
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > SAVE_MAX_BYTES) throw new ApiError(413, "too-large", "Save is larger than 1.9 MB.");
  const gz = await gzipText(text);
  const summary = JSON.stringify(saveSummary(data));
  const device = typeof input.device === "string" ? input.device.slice(0, 80) : null;
  const uploadId = typeof input.uploadId === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(input.uploadId) ? input.uploadId : null;
  const at = nowIso(now);
  const force = input.force === true;
  const done = (revision: number) => ({ revision, updatedAt: at, bytes, storedBytes: gz.byteLength });
  const insert = () =>
    db.run(
      "insert into player_saves (account_id, revision, save_version, data, data_gz, summary, upload_id, bytes, device, updated_at) values (?1, 1, ?2, '{}', ?3, ?4, ?5, ?6, ?7, ?8)",
      accountId, version, gz, summary, uploadId, bytes, device, at,
    );

  if (base === 0 && !force) {
    try {
      await insert();
      return done(1);
    } catch (error) {
      // A copy exists already: fall through to the conflict answer.
      if (!isUniqueViolation(error)) throw error;
    }
  }

  const current = await db.first<{ revision: number; save_version: number }>("select revision, save_version from player_saves where account_id = ?1", accountId);
  const serverRevision = current === null ? 0 : Number(current.revision);
  // An old cached copy of the game must not overwrite a save made by a newer one (even when forced).
  if (current !== null && Number(current.save_version) > version) {
    throw new ApiError(409, "client-outdated", "Your cloud save comes from a newer version of the game. Reload the page to update, then try again.", {
      cloudSaveVersion: Number(current.save_version),
    });
  }
  if (serverRevision !== base && !force) {
    const row = await db.first<{ summary: string; updated_at: string }>(
      `select ${SAVE_SUMMARY_SQL} as summary, updated_at from player_saves where account_id = ?1`,
      accountId,
    );
    throw new ApiError(409, "save-conflict", "Another device saved newer progress.", {
      revision: serverRevision,
      updatedAt: row?.updated_at ?? null,
      summary: row === null ? null : JSON.parse(row.summary),
    });
  }
  if (current === null) {
    await insert();
    return done(1);
  }
  const last = await db.first<{ created_at: string }>(
    "select created_at from player_save_backups where account_id = ?1 order by id desc limit 1",
    accountId,
  );
  const backup = force || last === null || now - new Date(last.created_at).getTime() > BACKUP_EVERY_MS;
  const changes = await db.batch([
    // Keep the copy being replaced (hourly, and always before a forced overwrite).
    db.stmt(
      `insert into player_save_backups (account_id, revision, save_version, data, data_gz, summary, reason, created_at)
       select account_id, revision, save_version, data, data_gz, summary, ?3, ?4 from player_saves where account_id = ?1 and revision = ?2 and ?5 = 1`,
      accountId, serverRevision, force ? "before-overwrite" : "hourly", at, backup ? 1 : 0,
    ),
    db.stmt(
      `update player_saves set revision = revision + 1, save_version = ?3, data = '{}', data_gz = ?4, summary = ?5, upload_id = ?6,
              bytes = ?7, device = ?8, updated_at = ?9
        where account_id = ?1 and revision = ?2 and save_version <= ?3`,
      accountId, serverRevision, version, gz, summary, uploadId, bytes, device, at,
    ),
    // Only after a new backup (the trim reads every backup row of the player).
    db.stmt(
      `delete from player_save_backups where ?2 = 1 and account_id = ?1 and id not in
         (select id from player_save_backups where account_id = ?1 order by id desc limit ?3)`,
      accountId, backup ? 1 : 0, keep,
    ),
  ]);
  if (changes[1] === 0) throw new ApiError(409, "save-conflict", "Another device saved at the same moment. Try again.", { revision: serverRevision + 1 });
  return done(serverRevision + 1);
}
