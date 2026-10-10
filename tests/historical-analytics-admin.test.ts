import { describe, expect, it } from "vitest";
import { appendHistoricalEvent } from "../src/expansion-v2/historical-analytics";
import { buildHistoricalAnalyticsAdminSurface } from "../src/expansion-v2/historical-analytics-admin";
import { createExpansionV2Profile } from "../src/expansion-v2/profile-store";

const DAY_START = Date.parse("2026-10-10T00:00:00.000Z");
const DAY_END = Date.parse("2026-10-11T00:00:00.000Z");

describe("Historical Analytics admin surface", () => {
  it("shows explicit no-data state without substituting live telemetry", () => {
    const surface = buildHistoricalAnalyticsAdminSurface(
      createExpansionV2Profile(),
      { startMs: DAY_START, endMs: DAY_END },
    );

    expect(surface.source).toBe("no-historical-records");
    expect(surface.canMutate).toBe(false);
    expect(surface.crossPlayerSupported).toBe(false);
    expect(surface.aggregate.runCount).toBe(0);
    expect(surface.rows.find((row) => row.id === "accuracy")?.value)
      .toBe("No historical data");
    expect(surface.diagnostics.join(" ")).toContain("live telemetry is not substituted");
  });

  it("reads only real persisted profile history for the requested period", () => {
    const profile = createExpansionV2Profile();
    profile.history = appendHistoricalEvent(profile.history, {
      version: 1,
      eventId: "run-a",
      occurredAtMs: DAY_START + 1,
      kind: "run-settled",
      runId: "a",
      outcome: "completed",
      score: 120,
      accuracyPercent: 96,
      activeSeconds: 40,
      challengeKind: "weekly",
      retryCount: 0,
      assisted: false,
      leaderboardEligible: true,
    });
    profile.history = appendHistoricalEvent(profile.history, {
      version: 1,
      eventId: "outside-period",
      occurredAtMs: DAY_END,
      kind: "run-settled",
      runId: "b",
      outcome: "defeated",
      score: 5,
      accuracyPercent: 50,
      activeSeconds: 10,
      challengeKind: null,
      retryCount: null,
      assisted: null,
      leaderboardEligible: null,
    });

    const surface = buildHistoricalAnalyticsAdminSurface(
      profile,
      { startMs: DAY_START, endMs: DAY_END },
    );

    expect(surface.source).toBe("historical-persisted");
    expect(surface.aggregate).toMatchObject({
      runCount: 1,
      completedRuns: 1,
      defeatedRuns: 0,
      averageScore: 120,
      averageAccuracyPercent: 96,
      leaderboardEligibleRuns: 1,
    });
    expect(surface.diagnostics.join(" ")).toContain("current player profile");
  });
});
