import {
  EXPEDITION_RUN_VERSION,
  type ExpeditionRun,
} from "./core";

export const EXPEDITION_STORAGE_KEY = "spaceTypingExpeditionRunV1";
const STORE_VERSION = 1 as const;

export interface ExpeditionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type ExpeditionEnvelope = {
  storeVersion: typeof STORE_VERSION;
  revision: number;
  writerId: string;
  updatedAt: string;
  run: ExpeditionRun;
};

export type ExpeditionLoadResult =
  | { status: "empty" }
  | { status: "supported"; envelope: ExpeditionEnvelope }
  | { status: "unsupported"; raw: string }
  | { status: "corrupt"; raw: string };

export class ExpeditionStoreConflictError extends Error {
  constructor(readonly reason: "revision-conflict" | "stale-writer" | "duplicate-run-id") {
    super("Expedition store conflict: " + reason + ".");
    this.name = "ExpeditionStoreConflictError";
  }
}

export class ExpeditionStoreWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpeditionStoreWriteError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validRun(value: unknown): value is ExpeditionRun {
  if (!isRecord(value)) return false;
  if (
    value.version !== EXPEDITION_RUN_VERSION ||
    typeof value.runId !== "string" ||
    value.runId.length === 0 ||
    !Number.isInteger(value.seed) ||
    typeof value.phase !== "string" ||
    !Array.isArray(value.encounterPlan) ||
    !Array.isArray(value.committedEncounterIds) ||
    !isRecord(value.relics) ||
    !isRecord(value.resources)
  ) {
    return false;
  }
  const wordPool = isRecord(value.wordPool) ? value.wordPool : null;
  return (
    wordPool !== null &&
    typeof wordPool.hash === "string" &&
    wordPool.hash.length > 0 &&
    Array.isArray(wordPool.entries) &&
    wordPool.entries.length > 0
  );
}

export function loadExpeditionEnvelope(
  storage: ExpeditionStorage,
): ExpeditionLoadResult {
  const raw = storage.getItem(EXPEDITION_STORAGE_KEY);
  if (raw === null) return { status: "empty" };

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { status: "corrupt", raw };
  }
  if (!isRecord(value)) return { status: "corrupt", raw };
  if (value.storeVersion !== STORE_VERSION) {
    return { status: "unsupported", raw };
  }
  if (
    !Number.isInteger(value.revision) ||
    typeof value.writerId !== "string" ||
    value.writerId.length === 0 ||
    typeof value.updatedAt !== "string" ||
    !validRun(value.run)
  ) {
    return { status: "corrupt", raw };
  }
  return {
    status: "supported",
    envelope: value as ExpeditionEnvelope,
  };
}

function writeAndVerify(
  storage: ExpeditionStorage,
  envelope: ExpeditionEnvelope,
): void {
  try {
    storage.setItem(EXPEDITION_STORAGE_KEY, JSON.stringify(envelope));
  } catch (error) {
    throw new ExpeditionStoreWriteError(
      error instanceof Error ? error.message : "Unable to write Expedition save.",
    );
  }

  const loaded = loadExpeditionEnvelope(storage);
  if (
    loaded.status !== "supported" ||
    loaded.envelope.revision !== envelope.revision ||
    loaded.envelope.writerId !== envelope.writerId ||
    loaded.envelope.run.runId !== envelope.run.runId
  ) {
    throw new ExpeditionStoreWriteError("Expedition save verification failed.");
  }
}

export function startExpeditionEnvelope(
  storage: ExpeditionStorage,
  writerId: string,
  run: ExpeditionRun,
  updatedAt = new Date().toISOString(),
): ExpeditionEnvelope {
  const loaded = loadExpeditionEnvelope(storage);
  if (loaded.status === "corrupt" || loaded.status === "unsupported") {
    throw new ExpeditionStoreConflictError("revision-conflict");
  }
  if (loaded.status === "supported" && loaded.envelope.run.terminal === null) {
    throw new ExpeditionStoreConflictError(
      loaded.envelope.run.runId === run.runId ? "duplicate-run-id" : "stale-writer",
    );
  }
  const envelope: ExpeditionEnvelope = {
    storeVersion: STORE_VERSION,
    revision: loaded.status === "supported" ? loaded.envelope.revision + 1 : 1,
    writerId,
    updatedAt,
    run,
  };
  writeAndVerify(storage, envelope);
  return envelope;
}

export function claimExpeditionEnvelope(
  storage: ExpeditionStorage,
  writerId: string,
  expectedRevision: number,
  updatedAt = new Date().toISOString(),
): ExpeditionEnvelope {
  const loaded = loadExpeditionEnvelope(storage);
  if (
    loaded.status !== "supported" ||
    loaded.envelope.revision !== expectedRevision
  ) {
    throw new ExpeditionStoreConflictError("revision-conflict");
  }
  if (loaded.envelope.run.terminal !== null) {
    throw new ExpeditionStoreConflictError("stale-writer");
  }
  const envelope: ExpeditionEnvelope = {
    ...loaded.envelope,
    revision: loaded.envelope.revision + 1,
    writerId,
    updatedAt,
  };
  writeAndVerify(storage, envelope);
  return envelope;
}

export function writeExpeditionEnvelope(
  storage: ExpeditionStorage,
  input: {
    writerId: string;
    expectedRevision: number;
    run: ExpeditionRun;
    updatedAt?: string;
  },
): ExpeditionEnvelope {
  const loaded = loadExpeditionEnvelope(storage);
  if (
    loaded.status !== "supported" ||
    loaded.envelope.revision !== input.expectedRevision
  ) {
    throw new ExpeditionStoreConflictError("revision-conflict");
  }
  if (loaded.envelope.writerId !== input.writerId) {
    throw new ExpeditionStoreConflictError("stale-writer");
  }
  if (loaded.envelope.run.runId !== input.run.runId) {
    throw new ExpeditionStoreConflictError("duplicate-run-id");
  }
  const envelope: ExpeditionEnvelope = {
    storeVersion: STORE_VERSION,
    revision: input.expectedRevision + 1,
    writerId: input.writerId,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
    run: input.run,
  };
  writeAndVerify(storage, envelope);
  return envelope;
}

export function loadExpeditionForFeature(
  storage: ExpeditionStorage,
  _featureEnabled: boolean,
): ExpeditionLoadResult {
  return loadExpeditionEnvelope(storage);
}
