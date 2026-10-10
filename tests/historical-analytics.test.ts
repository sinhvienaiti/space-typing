import { describe, expect, it } from "vitest";
import {
  HISTORICAL_ANALYTICS_MAX_EVENTS,
  aggregateHistoricalRuns,
  appendHistoricalEvent,
  createHistoricalAnalyticsState,
  sanitizeHistoricalAnalyticsState,
  type HistoricalRunSettledEventV1,
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
    assisted: false,
    leaderboardEligible: true,
    ...overrides,
  };
}

describe("historical analytics store", () => {
  it("appends valid events and ignores duplicate event ids idempotently", () => {
    const initial = createHistoricalAnalyticsState();
    const first = appendHistoricalEvent(initial, event("a", 1_000));
    const duplicate = appendHistoricalEvent(first, event("a", 2_000, { score: 999 }));

    expect(first.events).toHaveLength(1);
    expect(duplicate.events).toEqual(first.events);
    expect(duplicate.events[0]?.score).toBe(100);
  });

  it("sanitizes malformed and version-skewed rows without poisoning valid history", () => {
    const state = sanitizeHistoricalAnalyticsState({
      version: 1,
      events: [
        event("valid", 1_000),
        { ...event("future", 2_000), version: 9 },
        { ...event("bad-accuracy", 3_000), accuracyPercent: 101 },
        null,
      ],
    });

    expect(state.events.map((row) => row.eventId)).toEqual(["valid"]);
    expect(sanitizeHistoricalAnalyticsState({ version: 9, events: [event("x", 1)] }))
      .toEqual(createHistoricalAnalyticsState());
  });

  it("retains a deterministic bounded tail", () => {
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
      retryCount: 2,
      leaderboardEligible: false,
    }));
    state = appendHistoricalEvent(state, event("next-day", end));

    const first = aggregateHistoricalRuns(state, { startMs: start, endMs: end });
    const second = aggregateHistoricalRuns(state, { startMs: start, endMs: end });

    expect(second).toEqual(first);
    expect(first).toMatchObject({
      runCount: 2,
      completedRuns: 1,
      defeatedRuns: 1,
      abandonedRuns: 0,
      invalidRuns: 0,
      averageScore: 75,
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
      averageScore: null,
      averageAccuracyPercent: null,
    });
  });
});
