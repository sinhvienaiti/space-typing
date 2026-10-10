import {
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import {
  appendDuelRankedHistoricalEvent,
  createDuelRankedHistoryState,
  sanitizeDuelRankedHistoricalEvent,
  sanitizeDuelRankedHistoryState,
  type DuelRankedHistoricalEventV1,
  type DuelRankedHistoricalResult,
  type DuelRankedHistoryState,
} from "../../src/duel/ranked-history";

const DUEL_RANKED_HISTORY_FILE_VERSION = 1 as const;

type DuelRankedHistoryFileV1 = {
  version: typeof DUEL_RANKED_HISTORY_FILE_VERSION;
  accounts: Record<string, DuelRankedHistoryState>;
};

export class CorruptDuelRankedHistoryError extends Error {
  constructor() {
    super("Ranked Duel history storage is corrupt.");
    this.name = "CorruptDuelRankedHistoryError";
  }
}

export class UnsupportedDuelRankedHistoryVersionError extends Error {
  constructor(readonly version: number) {
    super(
      "Ranked Duel history storage version " +
        String(version) +
        " is newer than supported version 1.",
    );
    this.name = "UnsupportedDuelRankedHistoryVersionError";
  }
}

export interface DuelRankedHistoryStore {
  load(accountId: string): DuelRankedHistoryState;
  append(event: DuelRankedHistoricalEventV1): DuelRankedHistoryState;
  appendPair(
    left: DuelRankedHistoricalEventV1,
    right: DuelRankedHistoricalEventV1,
  ): readonly [DuelRankedHistoryState, DuelRankedHistoryState];
}

function cleanAccountId(accountId: string): string {
  return accountId.trim().slice(0, 160);
}

function cloneState(state: DuelRankedHistoryState): DuelRankedHistoryState {
  return {
    ...state,
    events: state.events.map((event) => ({ ...event })),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sameHistoricalEvent(
  left: DuelRankedHistoricalEventV1,
  right: DuelRankedHistoricalEventV1,
): boolean {
  return (
    left.version === right.version &&
    left.eventId === right.eventId &&
    left.occurredAtMs === right.occurredAtMs &&
    left.kind === right.kind &&
    left.matchId === right.matchId &&
    left.accountId === right.accountId &&
    left.opponentAccountId === right.opponentAccountId &&
    left.result === right.result &&
    left.duelRatingBefore === right.duelRatingBefore &&
    left.duelRatingAfter === right.duelRatingAfter
  );
}

function oppositeResult(
  result: DuelRankedHistoricalResult,
): DuelRankedHistoricalResult {
  if (result === "win") return "loss";
  if (result === "loss") return "win";
  return "draw";
}

function appendVerifiedEvent(
  state: DuelRankedHistoryState,
  event: DuelRankedHistoricalEventV1,
): DuelRankedHistoryState {
  const collision = state.events.find(
    (row) => row.matchId === event.matchId || row.eventId === event.eventId,
  );
  if (collision !== undefined) {
    if (sameHistoricalEvent(collision, event)) {
      return cloneState(state);
    }
    throw new Error(
      "Conflicting Ranked Duel historical event identity for match " +
        event.matchId +
        ".",
    );
  }
  return appendDuelRankedHistoricalEvent(state, event);
}

function parseHistoryFile(raw: string): DuelRankedHistoryFileV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CorruptDuelRankedHistoryError();
  }

  if (!isRecord(parsed)) throw new CorruptDuelRankedHistoryError();
  if (
    typeof parsed.version === "number" &&
    Number.isFinite(parsed.version) &&
    parsed.version > DUEL_RANKED_HISTORY_FILE_VERSION
  ) {
    throw new UnsupportedDuelRankedHistoryVersionError(
      Math.floor(parsed.version),
    );
  }
  if (
    parsed.version !== DUEL_RANKED_HISTORY_FILE_VERSION ||
    !isRecord(parsed.accounts)
  ) {
    throw new CorruptDuelRankedHistoryError();
  }

  const accounts: Record<string, DuelRankedHistoryState> = {};
  for (const [rawAccountId, rawState] of Object.entries(parsed.accounts)) {
    const accountId = cleanAccountId(rawAccountId);
    if (
      accountId.length === 0 ||
      accountId !== rawAccountId ||
      !isRecord(rawState) ||
      rawState.version !== 1 ||
      rawState.accountId !== accountId ||
      !Array.isArray(rawState.events)
    ) {
      throw new CorruptDuelRankedHistoryError();
    }

    const seenMatches = new Set<string>();
    const seenEvents = new Set<string>();
    for (const row of rawState.events) {
      const event = sanitizeDuelRankedHistoricalEvent(row, accountId);
      if (
        event === null ||
        seenMatches.has(event.matchId) ||
        seenEvents.has(event.eventId)
      ) {
        throw new CorruptDuelRankedHistoryError();
      }
      seenMatches.add(event.matchId);
      seenEvents.add(event.eventId);
    }

    const state = sanitizeDuelRankedHistoryState(rawState, accountId);
    if (state.events.length !== rawState.events.length) {
      throw new CorruptDuelRankedHistoryError();
    }
    accounts[accountId] = state;
  }

  return {
    version: DUEL_RANKED_HISTORY_FILE_VERSION,
    accounts,
  };
}

export class InMemoryDuelRankedHistoryStore
  implements DuelRankedHistoryStore
{
  protected readonly states = new Map<string, DuelRankedHistoryState>();

  load(accountIdInput: string): DuelRankedHistoryState {
    const accountId = cleanAccountId(accountIdInput);
    const state = this.states.get(accountId) ??
      createDuelRankedHistoryState(accountId);
    return cloneState(state);
  }

  append(eventInput: DuelRankedHistoricalEventV1): DuelRankedHistoryState {
    const event = sanitizeDuelRankedHistoricalEvent(eventInput);
    if (event === null) {
      throw new Error("Invalid Ranked Duel historical event.");
    }
    const next = appendVerifiedEvent(
      this.load(event.accountId),
      event,
    );
    this.states.set(event.accountId, next);
    return cloneState(next);
  }

  appendPair(
    leftInput: DuelRankedHistoricalEventV1,
    rightInput: DuelRankedHistoricalEventV1,
  ): readonly [DuelRankedHistoryState, DuelRankedHistoryState] {
    const left = sanitizeDuelRankedHistoricalEvent(leftInput);
    const right = sanitizeDuelRankedHistoricalEvent(rightInput);
    if (
      left === null ||
      right === null ||
      left.matchId !== right.matchId ||
      left.accountId !== right.opponentAccountId ||
      right.accountId !== left.opponentAccountId ||
      left.accountId === right.accountId ||
      left.occurredAtMs !== right.occurredAtMs ||
      right.result !== oppositeResult(left.result)
    ) {
      throw new Error("Invalid Ranked Duel historical settlement pair.");
    }

    const leftNext = appendVerifiedEvent(
      this.load(left.accountId),
      left,
    );
    const rightNext = appendVerifiedEvent(
      this.load(right.accountId),
      right,
    );
    this.states.set(left.accountId, leftNext);
    this.states.set(right.accountId, rightNext);
    return [cloneState(leftNext), cloneState(rightNext)];
  }
}

export class JsonFileDuelRankedHistoryStore
  extends InMemoryDuelRankedHistoryStore
{
  constructor(private readonly filePath: string) {
    super();
    this.loadFile();
  }

  override append(
    event: DuelRankedHistoricalEventV1,
  ): DuelRankedHistoryState {
    const previous = new Map(this.states);
    try {
      const next = super.append(event);
      this.flush();
      return next;
    } catch (error) {
      this.restore(previous);
      throw error;
    }
  }

  override appendPair(
    left: DuelRankedHistoricalEventV1,
    right: DuelRankedHistoricalEventV1,
  ): readonly [DuelRankedHistoryState, DuelRankedHistoryState] {
    const previous = new Map(this.states);
    try {
      const next = super.appendPair(left, right);
      this.flush();
      return next;
    } catch (error) {
      this.restore(previous);
      throw error;
    }
  }

  private loadFile(): void {
    let raw: string;
    try {
      raw = readFileSync(this.filePath, "utf8");
    } catch (error) {
      if (
        isRecord(error) &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return;
      }
      throw error;
    }

    const parsed = parseHistoryFile(raw);
    for (const [accountId, state] of Object.entries(parsed.accounts)) {
      this.states.set(accountId, state);
    }
  }

  private restore(
    previous: Map<string, DuelRankedHistoryState>,
  ): void {
    this.states.clear();
    for (const [accountId, state] of previous) {
      this.states.set(accountId, state);
    }
  }

  private flush(): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    const accounts: Record<string, DuelRankedHistoryState> = {};
    for (const [accountId, state] of this.states) {
      accounts[accountId] = cloneState(state);
    }
    const file: DuelRankedHistoryFileV1 = {
      version: DUEL_RANKED_HISTORY_FILE_VERSION,
      accounts,
    };
    const tempPath = this.filePath + ".tmp";
    writeFileSync(
      tempPath,
      JSON.stringify(file, null, 2) + "\n",
      "utf8",
    );
    renameSync(tempPath, this.filePath);
  }
}
