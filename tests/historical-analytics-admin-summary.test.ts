import { describe, expect, it } from "vitest";
import { appendHistoricalEvent } from "../src/expansion-v2/historical-analytics";
import { buildHistoricalAnalyticsAdminSurface } from "../src/expansion-v2/historical-analytics-admin";
import { createExpansionV2Profile } from "../src/expansion-v2/profile-store";

const DAY_START = Date.parse("2026-10-10T00:00:00.000Z");
const DAY_END = Date.parse("2026-10-11T00:00:00.000Z");

describe("Historical Analytics admin summary", () => {
  it("exposes persisted summary dimensions and coverage without enabling mutation", () => {
    const profile = createExpansionV2Profile();
    profile.history = appendHistoricalEvent(profile.history, {
      version: 1,
      eventId: "enriched-run",
      occurredAtMs: DAY_START + 1,
      kind: "run-settled",
      runId: "enriched",
      outcome: "completed",
      score: 150,
      accuracyPercent: 97,
      activeSeconds: 45,
      challengeKind: "daily",
      retryCount: 0,
      retried: false,
      assisted: false,
      leaderboardEligible: true,
      difficulty: "high",
      inputMode: "typing",
      gameplayMode: "campaign",
      sourceStages: [18],
      bossAttempts: [{
        bossId: "warden-frost",
        stage: 18,
        completed: true,
        activeSeconds: 20,
        damageDealt: 390,
        damageTaken: 12,
      }],
      equippedRelicIds: ["relic-a"],
      equipmentIds: ["laser-a"],
      skillUsage: [{ id: "meteor", count: 2 }],
      wordsPerMinute: 72,
      acceptedTypedLetters: 270,
      voiceCompletions: 0,
    });

    const surface = buildHistoricalAnalyticsAdminSurface(profile, {
      startMs: DAY_START,
      endMs: DAY_END,
    });

    expect(surface.canMutate).toBe(false);
    expect(surface.crossPlayerSupported).toBe(false);
    expect(surface.summary.byDifficulty).toEqual([
      expect.objectContaining({ key: "high", runCount: 1 }),
    ]);
    expect(surface.summary.bySourceStage).toEqual([
      expect.objectContaining({ key: "18", runCount: 1 }),
    ]);
    expect(surface.summary.bosses).toEqual([
      expect.objectContaining({
        bossId: "warden-frost",
        attempts: 1,
        successes: 1,
      }),
    ]);
    expect(surface.rows.find((row) => row.id === "wpm")?.value).toBe("72.0");
    expect(surface.rows.find((row) => row.id === "coverage")?.value)
      .toContain("difficulty 1");
  });

  it("reports partial additive metadata instead of filling gaps from live state", () => {
    const profile = createExpansionV2Profile();
    profile.history = appendHistoricalEvent(profile.history, {
      version: 1,
      eventId: "legacy-run",
      occurredAtMs: DAY_START + 1,
      kind: "run-settled",
      runId: "legacy",
      outcome: "completed",
      score: 80,
      accuracyPercent: 90,
      activeSeconds: 50,
      challengeKind: null,
      retryCount: null,
      retried: null,
      assisted: null,
      leaderboardEligible: null,
    });

    const surface = buildHistoricalAnalyticsAdminSurface(profile, {
      startMs: DAY_START,
      endMs: DAY_END,
    });

    expect(surface.rows.find((row) => row.id === "wpm")?.value)
      .toBe("No historical data");
    expect(surface.rows.find((row) => row.id === "coverage")?.status)
      .toBe("warning");
    expect(surface.diagnostics.join(" ")).toContain("WPM coverage is partial");
    expect(surface.diagnostics.join(" ")).toContain("missing rows are not inferred");
  });
});
