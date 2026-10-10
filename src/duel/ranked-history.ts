export const DUEL_RANKED_HISTORY_VERSION = 1 as const;
export const DUEL_RANKED_HISTORY_MAX_EVENTS = 512;

export type DuelRankedHistoricalResult = "win" | "loss" | "draw";

export type DuelRankedHistoricalEventV1 = {
  version: 1;
  eventId: string;
  occurredAtMs: number;
  kind: "duel-settled";
  matchId: string;
  accountId: string;
  opponentAccountId: string;
  result: DuelRankedHistoricalResult;
  duelRatingBefore: number;
  duelRatingAfter: number;
};

export type DuelRankedHistoryState = {
  version: typeof DUEL_RANKED_HISTORY_VERSION;
  accountId: string;
  events: DuelRankedHistoricalEventV1[];
};

export type DuelRankedHistoryPeriod = {
  startMs: number;
  endMs: number;
};

export type DuelRankedHistoryQuery = {
  startMs?: number;
  endMs?: number;
  result?: DuelRankedHistoricalResult;
  limit?: number;
};

export type DuelRankedHistoryAggregate = {
  accountId: string;
  period: DuelRankedHistoryPeriod;
  matchCount: number;
  wins: number;
  losses: number;
  draws: number;
  ratingDelta: number;
  ratingStart: number | null;
  ratingEnd: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finiteInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function cleanIdentity(value: string): string {
  return value.trim().slice(0, 160);
}

function validResult(value: unknown): value is DuelRankedHistoricalResult {
  return value === "win" || value === "loss" || value === "draw";
}

function eventOrder(
  left: DuelRankedHistoricalEventV1,
  right: DuelRankedHistoricalEventV1,
): number {
  return (
    left.occurredAtMs - right.occurredAtMs ||
    left.matchId.localeCompare(right.matchId) ||
    left.eventId.localeCompare(right.eventId)
  );
}

export function createDuelRankedHistoryState(
  accountIdInput: string,
): DuelRankedHistoryState {
  return {
    version: DUEL_RANKED_HISTORY_VERSION,
    accountId: cleanIdentity(accountIdInput),
    events: [],
  };
}

export function sanitizeDuelRankedHistoricalEvent(
  value: unknown,
  expectedAccountIdInput?: string,
): DuelRankedHistoricalEventV1 | null {
  if (!isRecord(value) || value.version !== 1 || value.kind !== "duel-settled") {
    return null;
  }

  const eventId = typeof value.eventId === "string"
    ? cleanIdentity(value.eventId)
    : "";
  const matchId = typeof value.matchId === "string"
    ? cleanIdentity(value.matchId)
    : "";
  const accountId = typeof value.accountId === "string"
    ? cleanIdentity(value.accountId)
    : "";
  const opponentAccountId = typeof value.opponentAccountId === "string"
    ? cleanIdentity(value.opponentAccountId)
    : "";
  const expectedAccountId = expectedAccountIdInput === undefined
    ? null
    : cleanIdentity(expectedAccountIdInput);

  if (
    eventId.length === 0 ||
    matchId.length === 0 ||
    accountId.length === 0 ||
    opponentAccountId.length === 0 ||
    accountId === opponentAccountId ||
    (expectedAccountId !== null && accountId !== expectedAccountId) ||
    !Number.isSafeInteger(value.occurredAtMs) ||
    (value.occurredAtMs as number) < 0 ||
    !validResult(value.result) ||
    !finiteInteger(value.duelRatingBefore) ||
    !finiteInteger(value.duelRatingAfter)
  ) {
    return null;
  }

  return {
    version: 1,
    eventId,
    occurredAtMs: value.occurredAtMs as number,
    kind: "duel-settled",
    matchId,
    accountId,
    opponentAccountId,
    result: value.result,
    duelRatingBefore: value.duelRatingBefore,
    duelRatingAfter: value.duelRatingAfter,
  };
}

export function sanitizeDuelRankedHistoryState(
  value: unknown,
  accountIdInput: string,
): DuelRankedHistoryState {
  const accountId = cleanIdentity(accountIdInput);
  const empty = createDuelRankedHistoryState(accountId);
  if (
    !isRecord(value) ||
    value.version !== DUEL_RANKED_HISTORY_VERSION ||
    value.accountId !== accountId
  ) {
    return empty;
  }

  const rows = Array.isArray(value.events) ? value.events : [];
  const deduped = new Map<string, DuelRankedHistoricalEventV1>();
  for (const row of rows) {
    const event = sanitizeDuelRankedHistoricalEvent(row, accountId);
    if (event === null || deduped.has(event.matchId)) continue;
    deduped.set(event.matchId, event);
  }

  return {
    version: DUEL_RANKED_HISTORY_VERSION,
    accountId,
    events: [...deduped.values()].slice(-DUEL_RANKED_HISTORY_MAX_EVENTS),
  };
}

export function appendDuelRankedHistoricalEvent(
  stateInput: DuelRankedHistoryState,
  eventInput: DuelRankedHistoricalEventV1,
): DuelRankedHistoryState {
  const accountId = cleanIdentity(stateInput.accountId);
  const state = sanitizeDuelRankedHistoryState(stateInput, accountId);
  const event = sanitizeDuelRankedHistoricalEvent(eventInput, accountId);
  if (
    event === null ||
    state.events.some(
      (row) => row.matchId === event.matchId || row.eventId === event.eventId,
    )
  ) {
    return state;
  }

  return {
    version: DUEL_RANKED_HISTORY_VERSION,
    accountId,
    events: [...state.events, event].slice(-DUEL_RANKED_HISTORY_MAX_EVENTS),
  };
}

export function queryDuelRankedHistory(
  stateInput: DuelRankedHistoryState,
  query: DuelRankedHistoryQuery = {},
): readonly DuelRankedHistoricalEventV1[] {
  const state = sanitizeDuelRankedHistoryState(
    stateInput,
    stateInput.accountId,
  );
  const startMs = Number.isFinite(query.startMs)
    ? Math.max(0, Math.floor(query.startMs as number))
    : 0;
  const endMs = Number.isFinite(query.endMs)
    ? Math.max(startMs, Math.floor(query.endMs as number))
    : Number.MAX_SAFE_INTEGER;
  const limit = Number.isFinite(query.limit)
    ? Math.max(
        0,
        Math.min(
          DUEL_RANKED_HISTORY_MAX_EVENTS,
          Math.floor(query.limit as number),
        ),
      )
    : 50;
  if (limit === 0) return [];
  if (query.result !== undefined && !validResult(query.result)) return [];

  return state.events
    .filter(
      (event) =>
        event.occurredAtMs >= startMs &&
        event.occurredAtMs < endMs &&
        (query.result === undefined || event.result === query.result),
    )
    .sort((left, right) => eventOrder(right, left))
    .slice(0, limit);
}

export function aggregateDuelRankedHistory(
  stateInput: DuelRankedHistoryState,
  period: DuelRankedHistoryPeriod,
): DuelRankedHistoryAggregate {
  const state = sanitizeDuelRankedHistoryState(
    stateInput,
    stateInput.accountId,
  );
  const startMs = Number.isFinite(period.startMs)
    ? Math.max(0, Math.floor(period.startMs))
    : 0;
  const endMs = Number.isFinite(period.endMs)
    ? Math.max(startMs, Math.floor(period.endMs))
    : startMs;
  const events = state.events
    .filter(
      (event) =>
        event.occurredAtMs >= startMs &&
        event.occurredAtMs < endMs,
    )
    .sort(eventOrder);

  let wins = 0;
  let losses = 0;
  let draws = 0;
  let ratingDelta = 0;
  for (const event of events) {
    if (event.result === "win") wins += 1;
    else if (event.result === "loss") losses += 1;
    else draws += 1;
    ratingDelta += event.duelRatingAfter - event.duelRatingBefore;
  }

  return {
    accountId: state.accountId,
    period: { startMs, endMs },
    matchCount: events.length,
    wins,
    losses,
    draws,
    ratingDelta,
    ratingStart: events[0]?.duelRatingBefore ?? null,
    ratingEnd: events.at(-1)?.duelRatingAfter ?? null,
  };
}
