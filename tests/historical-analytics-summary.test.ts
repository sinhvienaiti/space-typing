import { describe, expect, it } from "vitest";
import {
  appendHistoricalEvent,
  createHistoricalAnalyticsState,
  sanitizeHistoricalAnalyticsState,
  type HistoricalRunSettledEventV1,
} from "../src/expansion-v2/historical-analytics";
import { buildHistoricalAnalyticsSummary } from "../src/expansion-v2/historical-analytics-summary";

function event(
  eventId: string,
  occurredAtMs: number,
  overrides: Partial<HistoricalRunSettledEventV1> = {},
): HistoricalRunSettledEventV1 {
  return {
    version: 1,
    eventId,
    occurredAtMs,
    kind: "run-settled",
    runId: "run-" + eventId,
    outcome: "completed",
    score: 100,
    accuracyPercent: 90,
    activeSeconds: 60,
    challengeKind: "daily",
    retryCount: 0,
    retried: false,
    assisted: false,
    leaderboardEligible: true,
    ...overrides,
  };
}

describe("historical analytics summary v1", () => {
  it("keeps legacy V1 events readable while defaulting additive metadata safely", () => {
    const legacy = event("legacy", 100) as Record<string, unknown>;
    const state = sanitizeHistoricalAnalyticsState({
      version: 1,
      events: [legacy],
    });

    expect(state.events).toHaveLength(1);
    expect(state.events[0]).toMatchObject({
      eventId: "legacy",
      difficulty: null,
      inputMode: null,
      gameplayMode: null,
      sourceStages: [],
      bossAttempts: [],
      equippedRelicIds: [],
      equipmentIds: [],
      skillUsage: [],
      wordsPerMinute: null,
      acceptedTypedLetters: null,
      voiceCompletions: null,
    });
  });

  it("salvages valid core history while dropping malformed optional metadata", () => {
    const state = sanitizeHistoricalAnalyticsState({
      version: 1,
      events: [{
        ...event("mixed", 100),
        difficulty: "  high  ",
        inputMode: "unsupported",
        sourceStages: [3, -1, 3, 7, "9"],
        bossAttempts: [
          {
            bossId: "warden-frost",
            stage: 7,
            completed: true,
            activeSeconds: 12,
            damageDealt: 390,
            damageTaken: 18,
          },
          { bossId: "", stage: 7, completed: true },
        ],
        equippedRelicIds: ["relic-a", "relic-a", ""],
        skillUsage: [
          { id: "meteor", count: 2 },
          { id: "meteor", count: 1 },
          { id: "bad", count: -1 },
        ],
        wordsPerMinute: Number.NaN,
        acceptedTypedLetters: 300,
      }],
    });

    expect(state.events).toHaveLength(1);
    expect(state.events[0]).toMatchObject({
      difficulty: "high",
      inputMode: null,
      sourceStages: [3, 7],
      equippedRelicIds: ["relic-a"],
      skillUsage: [{ id: "meteor", count: 3 }],
      wordsPerMinute: null,
      acceptedTypedLetters: 300,
    });
    expect(state.events[0]?.bossAttempts).toEqual([{
      bossId: "warden-frost",
      stage: 7,
      completed: true,
      activeSeconds: 12,
      damageDealt: 390,
      damageTaken: 18,
    }]);
  });

  it("derives lifetime, period, trend, dimension, boss, and usage aggregates", () => {
    const day = Date.parse("2026-10-10T00:00:00.000Z");
    let state = createHistoricalAnalyticsState();
    state = appendHistoricalEvent(state, event("alpha", day + 1, {
      difficulty: "high",
      inputMode: "typing",
      gameplayMode: "campaign",
      sourceStages: [7, 8],
      wordsPerMinute: 60,
      equippedRelicIds: ["r-a", "r-b"],
      equipmentIds: ["laser-a"],
      skillUsage: [{ id: "meteor", count: 2 }],
      bossAttempts: [{
        bossId: "warden-frost",
        stage: 8,
        completed: true,
        activeSeconds: 20,
        damageDealt: 390,
        damageTaken: 10,
      }],
    }));
    state = appendHistoricalEvent(state, event("beta", day + 2, {
      outcome: "defeated",
      score: 50,
      accuracyPercent: 80,
      difficulty: "high",
      inputMode: "hybrid",
      gameplayMode: "campaign",
      sourceStages: [8],
      wordsPerMinute: 40,
      equippedRelicIds: ["r-a"],
      equipmentIds: ["laser-a", "shield-b"],
      skillUsage: [{ id: "meteor", count: 1 }, { id: "nova", count: 3 }],
      bossAttempts: [{
        bossId: "warden-frost",
        stage: 8,
        completed: false,
        activeSeconds: 30,
        damageDealt: 200,
        damageTaken: null,
      }],
    }));
    state = appendHistoricalEvent(state, event("next", day + 86_400_000, {
      difficulty: "normal",
      inputMode: "voice",
      sourceStages: [9],
      wordsPerMinute: null,
    }));

    const summary = buildHistoricalAnalyticsSummary(state, {
      startMs: day,
      endMs: day + 86_400_000,
    });

    expect(summary.version).toBe(1);
    expect(summary.lifetime.runCount).toBe(3);
    expect(summary.selected).toMatchObject({
      runCount: 2,
      completedRuns: 1,
      defeatedRuns: 1,
      averageScore: 75,
      averageAccuracyPercent: 85,
    });
    expect(summary.byPlayer[0]).toMatchObject({
      key: "local-profile",
      runCount: 2,
    });
    expect(summary.byDifficulty).toEqual([
      expect.objectContaining({ key: "high", runCount: 2, averageWordsPerMinute: 50 }),
    ]);
    expect(summary.byInputMode.map((row) => [row.key, row.runCount])).toEqual([
      ["hybrid", 1],
      ["typing", 1],
    ]);
    expect(summary.bySourceStage.map((row) => [row.key, row.runCount])).toEqual([
      ["7", 1],
      ["8", 2],
    ]);
    expect(summary.bosses).toEqual([{
      bossId: "warden-frost",
      stage: 8,
      attempts: 2,
      successes: 1,
      successRate: 0.5,
      averageActiveSeconds: 25,
      averageDamageDealt: 295,
      averageDamageTaken: 10,
    }]);
    expect(summary.relicUsage).toEqual([
      { id: "r-a", runCount: 2, useCount: null },
      { id: "r-b", runCount: 1, useCount: null },
    ]);
    expect(summary.equipmentUsage).toEqual([
      { id: "laser-a", runCount: 2, useCount: null },
      { id: "shield-b", runCount: 1, useCount: null },
    ]);
    expect(summary.skillUsage).toEqual([
      { id: "meteor", runCount: 2, useCount: 3 },
      { id: "nova", runCount: 1, useCount: 3 },
    ]);
    expect(summary.dailyTrend).toHaveLength(1);
    expect(summary.dailyTrend[0]).toMatchObject({
      dayKey: "2026-10-10",
      runCount: 2,
      averageWordsPerMinute: 50,
    });
    expect(summary.coverage).toMatchObject({
      runCount: 2,
      difficultyRuns: 2,
      inputModeRuns: 2,
      sourceStageRuns: 2,
      bossAttemptRuns: 2,
      bossDamageSamples: 2,
      wordsPerMinuteRuns: 2,
      relicLoadoutRuns: 2,
      equipmentLoadoutRuns: 2,
      skillUsageRuns: 2,
      playerScope: "local-profile",
      crossPlayerSupported: false,
    });
  });

  it("keeps selected period end-exclusive while lifetime remains independent", () => {
    let state = createHistoricalAnalyticsState();
    state = appendHistoricalEvent(state, event("inside", 99));
    state = appendHistoricalEvent(state, event("boundary", 100));

    const summary = buildHistoricalAnalyticsSummary(state, {
      startMs: 0,
      endMs: 100,
    });

    expect(summary.selected.runCount).toBe(1);
    expect(summary.lifetime.runCount).toBe(2);
    expect(summary.dailyTrend[0]?.runCount).toBe(1);
  });
});
