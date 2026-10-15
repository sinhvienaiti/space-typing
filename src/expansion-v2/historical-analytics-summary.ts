import {
  aggregateHistoricalRuns,
  sanitizeHistoricalAnalyticsState,
  utcDayKey,
  type HistoricalAggregate,
  type HistoricalAnalyticsState,
  type HistoricalEventV1,
  type HistoricalPeriod,
} from "./historical-analytics";

export const HISTORICAL_ANALYTICS_SUMMARY_VERSION = 1 as const;

export type HistoricalDimensionAggregateV1 = {
  key: string;
  runCount: number;
  completedRuns: number;
  averageScore: number | null;
  averageAccuracyPercent: number | null;
  averageWordsPerMinute: number | null;
};

export type HistoricalTrendPointV1 = HistoricalDimensionAggregateV1 & {
  dayKey: string;
};

export type HistoricalBossAggregateV1 = {
  bossId: string;
  stage: number;
  attempts: number;
  successes: number;
  successRate: number | null;
  averageActiveSeconds: number | null;
  averageDamageDealt: number | null;
  averageDamageTaken: number | null;
};

export type HistoricalUsageAggregateV1 = {
  id: string;
  runCount: number;
  useCount: number | null;
};

export type HistoricalAnalyticsCoverageV1 = {
  runCount: number;
  difficultyRuns: number;
  inputModeRuns: number;
  gameplayModeRuns: number;
  sourceStageRuns: number;
  bossAttemptRuns: number;
  bossDamageSamples: number;
  wordsPerMinuteRuns: number;
  relicLoadoutRuns: number;
  equipmentLoadoutRuns: number;
  skillUsageRuns: number;
  playerScope: "local-profile";
  crossPlayerSupported: false;
};

export type HistoricalAnalyticsSummaryV1 = {
  version: typeof HISTORICAL_ANALYTICS_SUMMARY_VERSION;
  period: HistoricalPeriod;
  lifetime: HistoricalAggregate;
  selected: HistoricalAggregate;
  byPlayer: HistoricalDimensionAggregateV1[];
  byChallengeKind: HistoricalDimensionAggregateV1[];
  byDifficulty: HistoricalDimensionAggregateV1[];
  byInputMode: HistoricalDimensionAggregateV1[];
  byGameplayMode: HistoricalDimensionAggregateV1[];
  bySourceStage: HistoricalDimensionAggregateV1[];
  bosses: HistoricalBossAggregateV1[];
  relicUsage: HistoricalUsageAggregateV1[];
  equipmentUsage: HistoricalUsageAggregateV1[];
  skillUsage: HistoricalUsageAggregateV1[];
  dailyTrend: HistoricalTrendPointV1[];
  coverage: HistoricalAnalyticsCoverageV1;
};

function normalizedPeriod(
  state: HistoricalAnalyticsState,
  period?: HistoricalPeriod,
): HistoricalPeriod {
  if (period !== undefined) {
    const startMs = Number.isFinite(period.startMs)
      ? Math.max(0, period.startMs)
      : 0;
    const endMs = Number.isFinite(period.endMs)
      ? Math.max(startMs, period.endMs)
      : startMs;
    return { startMs, endMs };
  }
  const latest = state.events.at(-1)?.occurredAtMs ?? 0;
  return {
    startMs: 0,
    endMs: latest < Number.MAX_SAFE_INTEGER ? latest + 1 : Number.MAX_SAFE_INTEGER,
  };
}

function selectedEvents(
  state: HistoricalAnalyticsState,
  period: HistoricalPeriod,
): HistoricalEventV1[] {
  return state.events.filter(
    (event) => event.occurredAtMs >= period.startMs && event.occurredAtMs < period.endMs,
  );
}

function average(values: readonly number[]): number | null {
  return values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}

function dimensionAggregate(
  key: string,
  events: readonly HistoricalEventV1[],
): HistoricalDimensionAggregateV1 {
  return {
    key,
    runCount: events.length,
    completedRuns: events.filter((event) => event.outcome === "completed").length,
    averageScore: average(events.map((event) => event.score)),
    averageAccuracyPercent: average(
      events.flatMap((event) =>
        event.accuracyPercent === null ? [] : [event.accuracyPercent],
      ),
    ),
    averageWordsPerMinute: average(
      events.flatMap((event) =>
        event.wordsPerMinute === null || event.wordsPerMinute === undefined
          ? []
          : [event.wordsPerMinute],
      ),
    ),
  };
}

function groupBySingleKey(
  events: readonly HistoricalEventV1[],
  keyFor: (event: HistoricalEventV1) => string | null,
): HistoricalDimensionAggregateV1[] {
  const grouped = new Map<string, HistoricalEventV1[]>();
  for (const event of events) {
    const key = keyFor(event);
    if (key === null) continue;
    const rows = grouped.get(key) ?? [];
    rows.push(event);
    grouped.set(key, rows);
  }
  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, rows]) => dimensionAggregate(key, rows));
}

function groupByRepeatedKey(
  events: readonly HistoricalEventV1[],
  keysFor: (event: HistoricalEventV1) => readonly string[],
): HistoricalDimensionAggregateV1[] {
  const grouped = new Map<string, HistoricalEventV1[]>();
  for (const event of events) {
    for (const key of new Set(keysFor(event))) {
      const rows = grouped.get(key) ?? [];
      rows.push(event);
      grouped.set(key, rows);
    }
  }
  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
    .map(([key, rows]) => dimensionAggregate(key, rows));
}

function loadoutUsage(
  events: readonly HistoricalEventV1[],
  idsFor: (event: HistoricalEventV1) => readonly string[],
): HistoricalUsageAggregateV1[] {
  const runs = new Map<string, number>();
  for (const event of events) {
    for (const id of new Set(idsFor(event))) {
      runs.set(id, (runs.get(id) ?? 0) + 1);
    }
  }
  return [...runs.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, runCount]) => ({ id, runCount, useCount: null }));
}

function skillUsage(events: readonly HistoricalEventV1[]): HistoricalUsageAggregateV1[] {
  const runs = new Map<string, number>();
  const uses = new Map<string, number>();
  for (const event of events) {
    for (const usage of event.skillUsage ?? []) {
      runs.set(usage.id, (runs.get(usage.id) ?? 0) + 1);
      uses.set(usage.id, (uses.get(usage.id) ?? 0) + usage.count);
    }
  }
  return [...runs.keys()]
    .sort((left, right) => left.localeCompare(right))
    .map((id) => ({
      id,
      runCount: runs.get(id) ?? 0,
      useCount: uses.get(id) ?? 0,
    }));
}

function bossSummary(events: readonly HistoricalEventV1[]): HistoricalBossAggregateV1[] {
  const grouped = new Map<string, NonNullable<HistoricalEventV1["bossAttempts"]>>();
  for (const event of events) {
    for (const attempt of event.bossAttempts ?? []) {
      const key = attempt.bossId + "@" + String(attempt.stage);
      const rows = grouped.get(key) ?? [];
      rows.push(attempt);
      grouped.set(key, rows);
    }
  }
  return [...grouped.values()]
    .map((rows) => {
      const first = rows[0]!;
      const successes = rows.filter((row) => row.completed).length;
      return {
        bossId: first.bossId,
        stage: first.stage,
        attempts: rows.length,
        successes,
        successRate: rows.length > 0 ? successes / rows.length : null,
        averageActiveSeconds: average(
          rows.flatMap((row) => row.activeSeconds === null ? [] : [row.activeSeconds]),
        ),
        averageDamageDealt: average(
          rows.flatMap((row) => row.damageDealt === null ? [] : [row.damageDealt]),
        ),
        averageDamageTaken: average(
          rows.flatMap((row) => row.damageTaken === null ? [] : [row.damageTaken]),
        ),
      };
    })
    .sort((left, right) => left.stage - right.stage || left.bossId.localeCompare(right.bossId));
}

function dailyTrend(events: readonly HistoricalEventV1[]): HistoricalTrendPointV1[] {
  return groupBySingleKey(events, (event) => utcDayKey(event.occurredAtMs))
    .map((row) => ({ ...row, dayKey: row.key }));
}

function coverage(events: readonly HistoricalEventV1[]): HistoricalAnalyticsCoverageV1 {
  return {
    runCount: events.length,
    difficultyRuns: events.filter((event) => event.difficulty != null).length,
    inputModeRuns: events.filter((event) => event.inputMode != null).length,
    gameplayModeRuns: events.filter((event) => event.gameplayMode != null).length,
    sourceStageRuns: events.filter((event) => (event.sourceStages?.length ?? 0) > 0).length,
    bossAttemptRuns: events.filter((event) => (event.bossAttempts?.length ?? 0) > 0).length,
    bossDamageSamples: events.reduce(
      (count, event) => count + (event.bossAttempts ?? []).filter(
        (attempt) => attempt.damageDealt !== null || attempt.damageTaken !== null,
      ).length,
      0,
    ),
    wordsPerMinuteRuns: events.filter((event) => event.wordsPerMinute != null).length,
    relicLoadoutRuns: events.filter((event) => (event.equippedRelicIds?.length ?? 0) > 0).length,
    equipmentLoadoutRuns: events.filter((event) => (event.equipmentIds?.length ?? 0) > 0).length,
    skillUsageRuns: events.filter((event) => (event.skillUsage?.length ?? 0) > 0).length,
    playerScope: "local-profile",
    crossPlayerSupported: false,
  };
}

export function buildHistoricalAnalyticsSummary(
  stateInput: HistoricalAnalyticsState,
  periodInput?: HistoricalPeriod,
): HistoricalAnalyticsSummaryV1 {
  const state = sanitizeHistoricalAnalyticsState(stateInput);
  const period = normalizedPeriod(state, periodInput);
  const events = selectedEvents(state, period);
  const lifetimePeriod = normalizedPeriod(state);

  return {
    version: HISTORICAL_ANALYTICS_SUMMARY_VERSION,
    period,
    lifetime: aggregateHistoricalRuns(state, lifetimePeriod),
    selected: aggregateHistoricalRuns(state, period),
    byPlayer: [dimensionAggregate("local-profile", events)],
    byChallengeKind: groupBySingleKey(events, (event) => event.challengeKind),
    byDifficulty: groupBySingleKey(events, (event) => event.difficulty ?? null),
    byInputMode: groupBySingleKey(events, (event) => event.inputMode ?? null),
    byGameplayMode: groupBySingleKey(events, (event) => event.gameplayMode ?? null),
    bySourceStage: groupByRepeatedKey(
      events,
      (event) => (event.sourceStages ?? []).map(String),
    ),
    bosses: bossSummary(events),
    relicUsage: loadoutUsage(events, (event) => event.equippedRelicIds ?? []),
    equipmentUsage: loadoutUsage(events, (event) => event.equipmentIds ?? []),
    skillUsage: skillUsage(events),
    dailyTrend: dailyTrend(events),
    coverage: coverage(events),
  };
}
