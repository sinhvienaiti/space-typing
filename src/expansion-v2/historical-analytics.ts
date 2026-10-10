export const HISTORICAL_ANALYTICS_VERSION = 1 as const;
export const HISTORICAL_ANALYTICS_MAX_EVENTS = 512;

export type HistoricalRunOutcome =
  | "completed"
  | "defeated"
  | "abandoned"
  | "unknown"
  | "invalid";

export type HistoricalChallengeKind =
  | "prototype"
  | "daily"
  | "weekly"
  | "qa";

export type HistoricalRunSettledEventV1 = {
  version: 1;
  eventId: string;
  occurredAtMs: number;
  kind: "run-settled";
  runId: string;
  outcome: HistoricalRunOutcome;
  score: number;
  accuracyPercent: number | null;
  activeSeconds: number | null;
  challengeKind: HistoricalChallengeKind | null;
  retryCount: number | null;
  retried: boolean | null;
  assisted: boolean | null;
  leaderboardEligible: boolean | null;
};

export type HistoricalEventV1 = HistoricalRunSettledEventV1;

export type HistoricalAnalyticsState = {
  version: typeof HISTORICAL_ANALYTICS_VERSION;
  events: HistoricalEventV1[];
};

export type HistoricalPeriod = {
  startMs: number;
  endMs: number;
};

export type HistoricalAggregate = {
  period: HistoricalPeriod;
  runCount: number;
  completedRuns: number;
  defeatedRuns: number;
  abandonedRuns: number;
  unknownRuns: number;
  invalidRuns: number;
  averageScore: number | null;
  averageAccuracyPercent: number | null;
  assistedRuns: number;
  retriedRuns: number;
  leaderboardEligibleRuns: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function nonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function validOutcome(value: unknown): value is HistoricalRunOutcome {
  return value === "completed" ||
    value === "defeated" ||
    value === "abandoned" ||
    value === "unknown" ||
    value === "invalid";
}

function validChallengeKind(value: unknown): value is HistoricalChallengeKind {
  return value === "prototype" ||
    value === "daily" ||
    value === "weekly" ||
    value === "qa";
}

function mergeHistoricalRunEvents(
  existing: HistoricalEventV1,
  incoming: HistoricalEventV1,
): HistoricalEventV1 {
  const outcome =
    incoming.outcome === "unknown" && existing.outcome !== "unknown"
      ? existing.outcome
      : incoming.outcome;
  return {
    ...existing,
    occurredAtMs: Math.min(existing.occurredAtMs, incoming.occurredAtMs),
    outcome,
    score: incoming.score,
    accuracyPercent: incoming.accuracyPercent ?? existing.accuracyPercent,
    activeSeconds: incoming.activeSeconds ?? existing.activeSeconds,
    challengeKind: incoming.challengeKind ?? existing.challengeKind,
    retryCount: incoming.retryCount ?? existing.retryCount,
    retried: incoming.retried ?? existing.retried,
    assisted: incoming.assisted ?? existing.assisted,
    leaderboardEligible:
      incoming.leaderboardEligible ?? existing.leaderboardEligible,
  };
}

export function createHistoricalAnalyticsState(): HistoricalAnalyticsState {
  return {
    version: HISTORICAL_ANALYTICS_VERSION,
    events: [],
  };
}

export function sanitizeHistoricalEvent(
  value: unknown,
): HistoricalEventV1 | null {
  if (!isRecord(value) || value.version !== 1 || value.kind !== "run-settled") {
    return null;
  }
  if (
    typeof value.eventId !== "string" ||
    value.eventId.length === 0 ||
    value.eventId.length > 160 ||
    typeof value.runId !== "string" ||
    value.runId.length === 0 ||
    value.runId.length > 160 ||
    !nonNegativeInteger(value.occurredAtMs) ||
    !validOutcome(value.outcome) ||
    !finiteNumber(value.score) ||
    value.score < 0
  ) {
    return null;
  }

  const accuracyPercent = value.accuracyPercent;
  if (
    accuracyPercent !== null &&
    (!finiteNumber(accuracyPercent) || accuracyPercent < 0 || accuracyPercent > 100)
  ) return null;

  const activeSeconds = value.activeSeconds;
  if (
    activeSeconds !== null &&
    (!finiteNumber(activeSeconds) || activeSeconds < 0)
  ) return null;

  const challengeKind = value.challengeKind;
  if (challengeKind !== null && !validChallengeKind(challengeKind)) return null;

  const retryCount = value.retryCount;
  if (retryCount !== null && !nonNegativeInteger(retryCount)) return null;

  const retried = value.retried === undefined ? null : value.retried;
  if (retried !== null && typeof retried !== "boolean") return null;

  const assisted = value.assisted;
  if (assisted !== null && typeof assisted !== "boolean") return null;

  const leaderboardEligible = value.leaderboardEligible;
  if (leaderboardEligible !== null && typeof leaderboardEligible !== "boolean") {
    return null;
  }

  return {
    version: 1,
    eventId: value.eventId,
    occurredAtMs: value.occurredAtMs,
    kind: "run-settled",
    runId: value.runId,
    outcome: value.outcome,
    score: value.score,
    accuracyPercent,
    activeSeconds,
    challengeKind,
    retryCount,
    retried,
    assisted,
    leaderboardEligible,
  };
}

export function sanitizeHistoricalAnalyticsState(
  value: unknown,
): HistoricalAnalyticsState {
  if (!isRecord(value) || value.version !== HISTORICAL_ANALYTICS_VERSION) {
    return createHistoricalAnalyticsState();
  }

  const rows = Array.isArray(value.events) ? value.events : [];
  const deduped = new Map<string, HistoricalEventV1>();
  for (const row of rows) {
    const event = sanitizeHistoricalEvent(row);
    if (event === null) continue;
    const existing = deduped.get(event.runId);
    deduped.set(
      event.runId,
      existing === undefined
        ? event
        : mergeHistoricalRunEvents(existing, event),
    );
  }

  return {
    version: HISTORICAL_ANALYTICS_VERSION,
    events: [...deduped.values()].slice(-HISTORICAL_ANALYTICS_MAX_EVENTS),
  };
}

export function appendHistoricalEvent(
  stateInput: HistoricalAnalyticsState,
  eventInput: HistoricalEventV1,
): HistoricalAnalyticsState {
  const state = sanitizeHistoricalAnalyticsState(stateInput);
  const event = sanitizeHistoricalEvent(eventInput);
  if (
    event === null ||
    state.events.some(
      (row) => row.eventId === event.eventId || row.runId === event.runId,
    )
  ) {
    return state;
  }
  return {
    version: HISTORICAL_ANALYTICS_VERSION,
    events: [...state.events, event].slice(-HISTORICAL_ANALYTICS_MAX_EVENTS),
  };
}

export function upsertHistoricalRunEvent(
  stateInput: HistoricalAnalyticsState,
  eventInput: HistoricalRunSettledEventV1,
): HistoricalAnalyticsState {
  const state = sanitizeHistoricalAnalyticsState(stateInput);
  const event = sanitizeHistoricalEvent(eventInput);
  if (event === null) return state;

  const index = state.events.findIndex((row) => row.runId === event.runId);
  if (index < 0) {
    return {
      version: HISTORICAL_ANALYTICS_VERSION,
      events: [...state.events, event].slice(-HISTORICAL_ANALYTICS_MAX_EVENTS),
    };
  }

  const events = [...state.events];
  events[index] = mergeHistoricalRunEvents(events[index]!, event);
  return {
    version: HISTORICAL_ANALYTICS_VERSION,
    events,
  };
}

export function utcDayKey(occurredAtMs: number): string {
  const date = new Date(occurredAtMs);
  if (!Number.isFinite(date.getTime())) return "invalid";
  return date.toISOString().slice(0, 10);
}

export function utcWeekKey(occurredAtMs: number): string {
  const date = new Date(occurredAtMs);
  if (!Number.isFinite(date.getTime())) return "invalid";
  const day = date.getUTCDay();
  const deltaToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + deltaToMonday,
  ));
  return monday.toISOString().slice(0, 10);
}

export function aggregateHistoricalRuns(
  stateInput: HistoricalAnalyticsState,
  period: HistoricalPeriod,
): HistoricalAggregate {
  const state = sanitizeHistoricalAnalyticsState(stateInput);
  const startMs = Number.isFinite(period.startMs) ? Math.max(0, period.startMs) : 0;
  const endMs = Number.isFinite(period.endMs)
    ? Math.max(startMs, period.endMs)
    : startMs;
  const events = state.events.filter(
    (event) => event.occurredAtMs >= startMs && event.occurredAtMs < endMs,
  );

  let scoreTotal = 0;
  let accuracyTotal = 0;
  let accuracyCount = 0;
  let completedRuns = 0;
  let defeatedRuns = 0;
  let abandonedRuns = 0;
  let unknownRuns = 0;
  let invalidRuns = 0;
  let assistedRuns = 0;
  let retriedRuns = 0;
  let leaderboardEligibleRuns = 0;

  for (const event of events) {
    scoreTotal += event.score;
    if (event.accuracyPercent !== null) {
      accuracyTotal += event.accuracyPercent;
      accuracyCount += 1;
    }
    if (event.outcome === "completed") completedRuns += 1;
    else if (event.outcome === "defeated") defeatedRuns += 1;
    else if (event.outcome === "abandoned") abandonedRuns += 1;
    else if (event.outcome === "unknown") unknownRuns += 1;
    else invalidRuns += 1;
    if (event.assisted === true) assistedRuns += 1;
    if (
      event.retried === true ||
      (event.retryCount !== null && event.retryCount > 0)
    ) retriedRuns += 1;
    if (event.leaderboardEligible === true) leaderboardEligibleRuns += 1;
  }

  return {
    period: { startMs, endMs },
    runCount: events.length,
    completedRuns,
    defeatedRuns,
    abandonedRuns,
    unknownRuns,
    invalidRuns,
    averageScore: events.length > 0 ? scoreTotal / events.length : null,
    averageAccuracyPercent: accuracyCount > 0 ? accuracyTotal / accuracyCount : null,
    assistedRuns,
    retriedRuns,
    leaderboardEligibleRuns,
  };
}
