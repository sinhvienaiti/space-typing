import { describe, expect, it } from "vitest";
import {
  createExpeditionEncounterPlan,
  createExpeditionRun,
  type ExpeditionRun,
} from "../src/expedition/core";
import {
  buildExpeditionHistoricalMetadata,
  recordExpeditionHistoricalRun,
} from "../src/expansion-v2/expedition-history";
import { HISTORICAL_ANALYTICS_MAX_EVENTS } from "../src/expansion-v2/historical-analytics";
import {
  EXPANSION_V2_PROCESSED_RUN_RETENTION,
  createExpansionV2Profile,
  recordExpansionRun,
  sanitizeExpansionV2Profile,
} from "../src/expansion-v2/profile-store";

function terminalRun(): ExpeditionRun {
  const plan = createExpeditionEncounterPlan(123, [7, 8, 9], 3);
  const base = createExpeditionRun({
    runId: "analytics-expedition",
    seed: 123,
    wordPool: {
      hash: "words-v1",
      entries: [{ id: "orbit", en: "orbit", vi: "quỹ đạo", ipa: "/ˈɔːbɪt/" }],
    },
    profile: {
      inputMode: "hybrid",
      difficulty: "high",
      assist: "standard",
      vocabularyLevel: 3,
      gameplayMode: "campaign",
    },
    encounterPlan: plan,
    campaignFixture: { world: 1 },
    startingResources: {
      hull: 100,
      maxHull: 100,
      shield: 20,
      maxShield: 20,
      energy: 50,
      maxEnergy: 50,
      power: 0,
    },
    challenge: {
      kind: "daily",
      dayKey: "2026-10-10",
      identityKey: "daily|2026-10-10",
    },
  });
  return {
    ...base,
    phase: "victory",
    completedEncounters: 2,
    currentEncounterIndex: 2,
    totalScore: 500,
    accuracySum: 180,
    retryCount: 1,
    ghostPoints: [
      { encounterIndex: 0, activeSeconds: 10, cumulativeScore: 200 },
      { encounterIndex: 1, activeSeconds: 20, cumulativeScore: 500 },
      { encounterIndex: 2, activeSeconds: 999, cumulativeScore: 999 },
    ],
    contributions: {
      ...base.contributions,
      typedCompletions: 25,
      acceptedTypedLetters: 300,
      voiceCompletions: 4,
      voiceEffort: 12,
    },
    relics: {
      ...base.relics,
      owned: ["relic-a", "relic-b"],
      equipped: ["relic-a", "relic-b"],
    },
    terminal: {
      phase: "victory",
      reason: "plan-complete",
      completedEncounters: 2,
    },
  };
}

describe("Expedition historical analytics producer", () => {
  it("derives only canonical persisted metadata from the terminal run", () => {
    const run = terminalRun();
    const metadata = buildExpeditionHistoricalMetadata(run);

    expect(metadata).toMatchObject({
      outcome: "completed",
      accuracyPercent: 90,
      activeSeconds: 30,
      challengeKind: "daily",
      retryCount: 1,
      retried: true,
      assisted: false,
      leaderboardEligible: null,
      difficulty: "high",
      inputMode: "hybrid",
      gameplayMode: "campaign",
      equippedRelicIds: ["relic-a", "relic-b"],
      acceptedTypedLetters: 300,
      voiceCompletions: 4,
      wordsPerMinute: 120,
      bossAttempts: [],
      equipmentIds: [],
      skillUsage: [],
    });
    expect(metadata.sourceStages).toEqual(
      run.encounterPlan.slice(0, 2).map((encounter) => encounter.sourceStage),
    );
  });

  it("persists exactly one enriched terminal record through the runtime producer", () => {
    const run = terminalRun();
    const profile = recordExpeditionHistoricalRun(
      createExpansionV2Profile(),
      run,
      1_000,
    );
    const replay = recordExpeditionHistoricalRun(profile, run, 2_000);

    expect(replay).toBe(profile);
    expect(profile.completedRuns).toBe(1);
    expect(profile.bestScore).toBe(500);
    expect(profile.processedRunIds).toEqual(["analytics-expedition"]);
    expect(profile.history.events).toHaveLength(1);
    expect(profile.history.events[0]).toMatchObject({
      occurredAtMs: 1_000,
      runId: "analytics-expedition",
      outcome: "completed",
      score: 500,
      accuracyPercent: 90,
      activeSeconds: 30,
      challengeKind: "daily",
      assisted: false,
      difficulty: "high",
      inputMode: "hybrid",
      gameplayMode: "campaign",
      equippedRelicIds: ["relic-a", "relic-b"],
      equipmentIds: [],
      skillUsage: [],
      acceptedTypedLetters: 300,
      voiceCompletions: 4,
      wordsPerMinute: 120,
    });
  });

  it("derives assist coverage from the persisted expedition profile", () => {
    const run = terminalRun();
    const assistedRun: ExpeditionRun = {
      ...run,
      profile: { ...run.profile, assist: "family" },
    };

    expect(buildExpeditionHistoricalMetadata(assistedRun).assisted).toBe(true);
  });

  it("keeps pure Voice WPM unknown instead of treating spoken completions as typed letters", () => {
    const run = terminalRun();
    const voiceRun: ExpeditionRun = {
      ...run,
      profile: { ...run.profile, inputMode: "voice" },
      contributions: {
        ...run.contributions,
        acceptedTypedLetters: 0,
        voiceCompletions: 20,
      },
    };

    expect(buildExpeditionHistoricalMetadata(voiceRun)).toMatchObject({
      inputMode: "voice",
      wordsPerMinute: null,
      acceptedTypedLetters: 0,
      voiceCompletions: 20,
    });
  });

  it("maps terminal failures precisely while refusing to invent unavailable dimensions", () => {
    const run = terminalRun();
    for (const phase of ["defeat", "abandoned"] as const) {
      const failed: ExpeditionRun = {
        ...run,
        phase,
        terminal: {
          phase,
          reason: phase === "defeat" ? "player-defeat" : "player-abandon",
          completedEncounters: run.completedEncounters,
        },
      };
      const metadata = buildExpeditionHistoricalMetadata(failed);
      expect(metadata.outcome).toBe(phase === "defeat" ? "defeated" : "abandoned");
      expect(metadata.assisted).toBe(false);
      expect(metadata.leaderboardEligible).toBeNull();
      expect(metadata.bossAttempts).toEqual([]);
      expect(metadata.equipmentIds).toEqual([]);
      expect(metadata.skillUsage).toEqual([]);
    }
  });

  it("keeps the replay journal aligned with retained history across reloads", () => {
    expect(EXPANSION_V2_PROCESSED_RUN_RETENTION).toBe(
      HISTORICAL_ANALYTICS_MAX_EVENTS,
    );

    let profile = createExpansionV2Profile();
    for (let index = 0; index < 300; index += 1) {
      profile = recordExpansionRun(profile, {
        runId: `retained-${index}`,
        score: index,
        completed: true,
        occurredAtMs: index,
      });
    }

    expect(profile.completedRuns).toBe(300);
    expect(profile.history.events).toHaveLength(300);
    expect(profile.processedRunIds).toHaveLength(300);

    const reloaded = sanitizeExpansionV2Profile(
      JSON.parse(JSON.stringify(profile)),
    );
    expect(reloaded.processedRunIds).toHaveLength(300);

    const replay = recordExpansionRun(reloaded, {
      runId: "retained-0",
      score: 0,
      completed: true,
      occurredAtMs: 0,
    });
    expect(replay).toBe(reloaded);
    expect(replay.completedRuns).toBe(300);
    expect(replay.history.events).toHaveLength(300);
  });

  it("uses retained history as a migration replay receipt when the old journal is missing", () => {
    const run = terminalRun();
    const recorded = recordExpeditionHistoricalRun(
      createExpansionV2Profile(),
      run,
      1_000,
    );
    const migrated = {
      ...recorded,
      processedRunIds: [],
    };

    const replay = recordExpeditionHistoricalRun(migrated, run, 2_000);
    expect(replay).toBe(migrated);
    expect(replay.completedRuns).toBe(1);
    expect(replay.history.events).toHaveLength(1);
    expect(replay.history.events[0]?.occurredAtMs).toBe(1_000);
  });
});
