import { describe, expect, it } from "vitest";
import {
  HISTORICAL_ANALYTICS_MAX_EVENTS,
  aggregateHistoricalRuns,
  appendHistoricalEvent,
  createHistoricalAnalyticsState,
  sanitizeHistoricalAnalyticsState,
  type HistoricalRunSettledEventV1,
  upsertHistoricalRunEvent,
  utcDayKey,
  utcWeekKey,
} from "../src/expansion-v2/historical-analytics";

function event(
  id: string,
  occurredAtMs: number,
  overrides: Partial<HistoricalRunSettledEventV1> = {},
): HistoricalRunSettledEventV1 {
  return {
    version: 1,
    eventId: id,
    occurredAtMs,
    kind: "run-settled",
    runId: "run-" + id,
    outcome: "completed",
    score: 100,
    accuracyPercent: 95,
    activeSeconds: 60,
    challengeKind: null,
    retryCount: 0,
    retried: false,
    assisted: false,
    leaderboardEligible: true,
    ...overrides,
  };
}

describe("historical analytics store", () => {
  it("appends valid events and ignores duplicate event ids or run ids idempotently", () => {
    const initial = createHistoricalAnalyticsState();
    const first = appendHistoricalEvent(initial, event("a", 1_000));
    const duplicateId = appendHistoricalEvent(first, event("a", 2_000, { score: 999 }));
    const duplicateRun = appendHistoricalEvent(first, event("other", 3_000, {
      runId: "run-a",
      score: 777,
    }));

    expect(first.events).toHaveLength(1);
    expect(duplicateId.events).toEqual(first.events);
    expect(duplicateRun.events).toEqual(first.events);
    expect(duplicateId.events[0]?.score).toBe(100);
  });

  it("upserts authoritative enrichment by run id without downgrading a known outcome", () => {
    let state = appendHistoricalEvent(
      createHistoricalAnalyticsState(),
      event("base", 2_000, {
        runId: "shared-run",
        outcome: "completed",
        accuracyPercent: null,
        activeSeconds: null,
        challengeKind: null,
        retryCount: null,
        retried: null,
        assisted: null,
        leaderboardEligible: null,
      }),
    );

    state = upsertHistoricalRunEvent(state, event("enrichment", 3_000, {
      runId: "shared-run",
      outcome: "unknown",
      score: 125,
      accuracyPercent: 92,
      activeSeconds: 55,
      challengeKind: "weekly",
      retryCount: null,
      retried: true,
      assisted: false,
      leaderboardEligible: null,
    }));

    expect(state.events).toHaveLength(1);
    expect(state.events[0]).toMatchObject({
      eventId: "base",
      occurredAtMs: 2_000,
      runId: "shared-run",
      outcome: "completed",
      score: 125,
      accuracyPercent: 92,
      activeSeconds: 55,
      challengeKind: "weekly",
      retried: true,
      assisted: false,
    });
  });

  it("reorders an enriched run when canonical occurrence time moves earlier", () => {
    let state = createHistoricalAnalyticsState();
    state = appendHistoricalEvent(state, event("later", 2_000));
    state = appendHistoricalEvent(state, event("other", 1_500));

    state = upsertHistoricalRunEvent(state, event("later-enrichment", 1_000, {
      runId: "run-later",
      score: 150,
    }));

    expect(state.events.map((row) => row.runId)).toEqual([
      "run-later",
      "run-other",
    ]);
    expect(state.events[0]?.occurredAtMs).toBe(1_000);
  });

  it("sanitizes malformed and version-skewed rows without poisoning valid history", () => {
    const legacyWithoutRetried = {
      ...event("legacy", 1_500),
    } as Record<string, unknown>;
    delete legacyWithoutRetried.retried;
    const state = sanitizeHistoricalAnalyticsState({
      version: 1,
      events: [
        event("valid", 1_000),
        legacyWithoutRetried,
        { ...event("future", 2_000), version: 9 },
        { ...event("bad-accuracy", 3_000), accuracyPercent: 101 },
        null,
      ],
    });

    expect(state.events.map((row) => row.eventId)).toEqual(["valid", "legacy"]);
    expect(state.events[1]?.retried).toBeNull();
    expect(sanitizeHistoricalAnalyticsState({ version: 9, events: [event("x", 1)] }))
      .toEqual(createHistoricalAnalyticsState());
  });

  it("canonicalizes unordered persisted rows by occurrence time", () => {
    const state = sanitizeHistoricalAnalyticsState({
      version: 1,
      events: [
        event("newest", 3_000),
        event("oldest", 1_000),
        event("middle", 2_000),
      ],
    });

    expect(state.events.map((row) => row.eventId)).toEqual([
      "oldest",
      "middle",
      "newest",
    ]);
  });

  it("retains a deterministic bounded chronological tail", () => {
    let state = createHistoricalAnalyticsState();
    for (let index = 0; index < HISTORICAL_ANALYTICS_MAX_EVENTS + 7; index += 1) {
      state = appendHistoricalEvent(state, event(String(index), index));
    }

    expect(state.events).toHaveLength(HISTORICAL_ANALYTICS_MAX_EVENTS);
    expect(state.events[0]?.eventId).toBe("7");
    expect(state.events.at(-1)?.eventId).toBe(
      String(HISTORICAL_ANALYTICS_MAX_EVENTS + 6),
    );
  });

  it("does not let a late old event evict newer retained history", () => {
    let state = createHistoricalAnalyticsState();
    for (let index = 0; index < HISTORICAL_ANALYTICS_MAX_EVENTS; index += 1) {
      state = appendHistoricalEvent(
        state,
        event("kept-" + String(index), 10_000 + index),
      );
    }

    state = appendHistoricalEvent(state, event("late-old", 1));

    expect(state.events).toHaveLength(HISTORICAL_ANALYTICS_MAX_EVENTS);
    expect(state.events.some((row) => row.eventId === "late-old")).toBe(false);
    expect(state.events[0]?.eventId).toBe("kept-0");
    expect(state.events.at(-1)?.eventId).toBe(
      "kept-" + String(HISTORICAL_ANALYTICS_MAX_EVENTS - 1),
    );
  });

  it("uses canonical UTC day and Monday-week identities at boundaries", () => {
    const sunday = Date.parse("2026-10-11T23:59:59.999Z");
    const monday = Date.parse("2026-10-12T00:00:00.000Z");

    expect(utcDayKey(sunday)).toBe("2026-10-11");
    expect(utcDayKey(monday)).toBe("2026-10-12");
    expect(utcWeekKey(sunday)).toBe("2026-10-05");
    expect(utcWeekKey(monday)).toBe("2026-10-12");
  });

  it("aggregates the same persisted rows deterministically with end-exclusive periods", () => {
    const start = Date.parse("2026-10-10T00:00:00.000Z");
    const end = Date.parse("2026-10-11T00:00:00.000Z");
    let state = createHistoricalAnalyticsState();
    state = appendHistoricalEvent(state, event("completed", start, {
      score: 100,
      accuracyPercent: 90,
    }));
    state = appendHistoricalEvent(state, event("defeat", start + 1, {
      outcome: "defeated",
      score: 50,
      accuracyPercent: 80,
      assisted: true,
      retryCount: null,
      retried: true,
      leaderboardEligible: false,
    }));
    state = appendHistoricalEvent(state, event("unknown", start + 2, {
      outcome: "unknown",
      score: 25,
      accuracyPercent: null,
      retryCount: null,
      retried: null,
      assisted: null,
      leaderboardEligible: null,
    }));
    state = appendHistoricalEvent(state, event("next-day", end));

    const first = aggregateHistoricalRuns(state, { startMs: start, endMs: end });
    const second = aggregateHistoricalRuns(state, { startMs: start, endMs: end });

    expect(second).toEqual(first);
    expect(first).toMatchObject({
      runCount: 3,
      completedRuns: 1,
      defeatedRuns: 1,
      abandonedRuns: 0,
      unknownRuns: 1,
      invalidRuns: 0,
      averageScore: 175 / 3,
      averageAccuracyPercent: 85,
      assistedRuns: 1,
      retriedRuns: 1,
      leaderboardEligibleRuns: 1,
    });
  });

  it("returns explicit no-data aggregates instead of substituting live values", () => {
    expect(aggregateHistoricalRuns(createHistoricalAnalyticsState(), {
      startMs: 0,
      endMs: 10,
    })).toMatchObject({
      runCount: 0,
      unknownRuns: 0,
      averageScore: null,
      averageAccuracyPercent: null,
    });
  });
});
