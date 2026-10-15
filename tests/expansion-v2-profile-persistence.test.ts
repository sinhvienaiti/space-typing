import { describe, expect, it, vi } from "vitest";
import {
  CorruptExpansionV2ProfileError,
  EXPANSION_V2_PROFILE_KEY,
  UnsupportedExpansionV2ProfileVersionError,
  createExpansionV2Profile,
  loadExpansionV2Profile,
  recordExpansionRun,
  recordFixedChallengeResult,
  saveExpansionV2Profile,
} from "../src/expansion-v2/profile-store";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("Expansion V2 profile persistence", () => {
  it("loads missing and partial v1 profiles with safe defaults", () => {
    const storage = new MemoryStorage();
    expect(loadExpansionV2Profile(storage)).toEqual(
      createExpansionV2Profile(),
    );

    storage.setItem(
      EXPANSION_V2_PROFILE_KEY,
      JSON.stringify({
        version: 1,
        completedRuns: 4,
        ghostEnabled: false,
      }),
    );
    const loaded = loadExpansionV2Profile(storage);
    expect(loaded.completedRuns).toBe(4);
    expect(loaded.ghostEnabled).toBe(false);
    expect(loaded.learning.records).toEqual({});
    expect(loaded.history).toEqual({ version: 1, events: [] });
  });

  it("never overwrites a future-version profile", () => {
    const storage = new MemoryStorage();
    const future = JSON.stringify({
      version: 9,
      futureData: { keep: true },
    });
    storage.setItem(EXPANSION_V2_PROFILE_KEY, future);

    expect(loadExpansionV2Profile(storage)).toEqual(
      createExpansionV2Profile(),
    );
    expect(() =>
      saveExpansionV2Profile(
        storage,
        createExpansionV2Profile(),
      ),
    ).toThrow(UnsupportedExpansionV2ProfileVersionError);
    expect(storage.getItem(EXPANSION_V2_PROFILE_KEY)).toBe(future);
  });

  it("never silently overwrites corrupt profile bytes", () => {
    const storage = new MemoryStorage();
    storage.setItem(EXPANSION_V2_PROFILE_KEY, "{broken");

    expect(loadExpansionV2Profile(storage)).toEqual(
      createExpansionV2Profile(),
    );
    expect(() =>
      saveExpansionV2Profile(
        storage,
        createExpansionV2Profile(),
      ),
    ).toThrow(CorruptExpansionV2ProfileError);
    expect(storage.getItem(EXPANSION_V2_PROFILE_KEY)).toBe("{broken");
  });

  it("writes and read-verifies supported v1 data including bounded history", () => {
    const storage = new MemoryStorage();
    const profile = recordExpansionRun(
      {
        ...createExpansionV2Profile(),
        completedRuns: 7,
        bestScore: 12345,
      },
      {
        runId: "history-run",
        score: 13000,
        completed: true,
        occurredAtMs: Date.parse("2026-10-10T12:00:00.000Z"),
      },
    );
    const saved = saveExpansionV2Profile(storage, profile);
    expect(saved.completedRuns).toBe(8);
    const loaded = loadExpansionV2Profile(storage);
    expect(loaded.bestScore).toBe(13000);
    expect(loaded.history.events).toHaveLength(1);
    expect(loaded.history.events[0]).toMatchObject({
      eventId: "expedition-run:history-run:terminal",
      runId: "history-run",
      outcome: "completed",
      score: 13000,
    });
  });

  it("records unresolved terminal outcomes explicitly instead of fabricating defeat or abandon", () => {
    const base = createExpansionV2Profile();
    const unresolved = recordExpansionRun(base, {
      runId: "unresolved-run",
      score: 5,
      completed: false,
      occurredAtMs: 100,
    });

    expect(unresolved.history.events).toHaveLength(1);
    expect(unresolved.history.events[0]).toMatchObject({
      runId: "unresolved-run",
      outcome: "unknown",
      score: 5,
    });

    const completed = recordExpansionRun(unresolved, {
      runId: "complete-run",
      score: 10,
      completed: true,
      occurredAtMs: 200,
    });
    const replay = recordExpansionRun(completed, {
      runId: "complete-run",
      score: 999,
      completed: true,
      occurredAtMs: 300,
    });

    expect(completed.history.events).toHaveLength(2);
    expect(replay).toBe(completed);
    expect(replay.history.events).toHaveLength(2);
    expect(replay.history.events[1]?.occurredAtMs).toBe(200);
  });

  it("enriches challenge metrics by run id while keeping non-PB attempts in history", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-10T12:30:00.000Z"));
    try {
      const identityKey = "2026-10-10|123|rules|content|words|kit|normal|standard|frozen";
      let profile = recordExpansionRun(createExpansionV2Profile(), {
        runId: "daily-best",
        score: 100,
        completed: true,
        occurredAtMs: 100,
      });
      profile = recordFixedChallengeResult(profile, {
        identityKey,
        runId: "daily-best",
        completedEncounters: 2,
        score: 100,
        accuracy: 93,
        activeSeconds: 50,
        retried: false,
        assisted: false,
      }, []);

      expect(profile.history.events).toHaveLength(1);
      expect(profile.history.events[0]).toMatchObject({
        eventId: "expedition-run:daily-best:terminal",
        occurredAtMs: 100,
        outcome: "completed",
        challengeKind: "daily",
        accuracyPercent: 93,
        activeSeconds: 50,
        retried: false,
        assisted: false,
      });
      expect(profile.pbByIdentity[identityKey]?.runId).toBe("daily-best");

      profile = recordExpansionRun(profile, {
        runId: "daily-worse",
        score: 50,
        completed: false,
        occurredAtMs: 200,
      });
      profile = recordFixedChallengeResult(profile, {
        identityKey,
        runId: "daily-worse",
        completedEncounters: 2,
        score: 50,
        accuracy: 80,
        activeSeconds: 70,
        retried: true,
        assisted: true,
      }, []);

      expect(profile.history.events).toHaveLength(2);
      expect(profile.history.events[1]).toMatchObject({
        runId: "daily-worse",
        outcome: "unknown",
        challengeKind: "daily",
        accuracyPercent: 80,
        activeSeconds: 70,
        retried: true,
        assisted: true,
      });
      expect(profile.pbByIdentity[identityKey]?.runId).toBe("daily-best");
    } finally {
      vi.useRealTimers();
    }
  });

  it("recognizes canonical weekly challenge identity during historical enrichment", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-10T12:30:00.000Z"));
    try {
      const profile = recordFixedChallengeResult(
        createExpansionV2Profile(),
        {
          identityKey: "weekly|2026-W41|123|rules|content|words|kit|normal|standard|frozen",
          runId: "weekly-run",
          completedEncounters: 1,
          score: 42,
          accuracy: 88,
          activeSeconds: 30,
          retried: false,
          assisted: false,
        },
        [],
      );

      expect(profile.history.events).toHaveLength(1);
      expect(profile.history.events[0]).toMatchObject({
        runId: "weekly-run",
        outcome: "unknown",
        challengeKind: "weekly",
        accuracyPercent: 88,
        activeSeconds: 30,
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
