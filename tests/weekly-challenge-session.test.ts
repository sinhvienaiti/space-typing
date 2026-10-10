import { describe, expect, it } from "vitest";
import {
  createExpeditionEncounterPlan,
  createExpeditionRun,
  type ExpeditionRun,
} from "../src/expedition/core";
import { ExpeditionSession } from "../src/expedition/session";
import {
  loadExpeditionEnvelope,
  startExpeditionEnvelope,
  type ExpeditionStorage,
} from "../src/expedition/store";
import {
  weeklyChallengeIdentity,
  type WeeklyChallengeConfig,
} from "../src/expansion-v2/challenge";
import { weeklyChallengeRunBinding } from "../src/expansion-v2/weekly-challenge-runtime";

class MemoryStorage implements ExpeditionStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const config: WeeklyChallengeConfig = {
  rulesetVersion: "expansion-v2-v1",
  contentVersion: "expansion-v2-world-01-v1",
  wordPoolHash: "weekly-session-pool",
  startKitId: "loaner-vanguard-v1",
  difficulty: "balanced",
  assist: "standard",
  adaptivePolicy: "frozen",
};

function binding(date: string) {
  return weeklyChallengeRunBinding(
    weeklyChallengeIdentity(config, new Date(date)),
  );
}

function weeklyRun(date: string): ExpeditionRun {
  const current = binding(date);
  const run = createExpeditionRun({
    runId: "weekly-session-run",
    seed: current.seed,
    wordPool: {
      hash: config.wordPoolHash,
      entries: [
        { id: "w1", en: "orbit", vi: "quỹ đạo", ipa: "/ˈɔːrbɪt/" },
      ],
    },
    profile: {
      difficulty: config.difficulty,
      assist: config.assist,
      vocabularyLevel: 1,
    },
    encounterPlan: createExpeditionEncounterPlan(current.seed, [1, 2], 2),
    campaignFixture: { selectedStage: 1 },
    startingResources: {
      hull: 100,
      maxHull: 100,
      shield: 50,
      maxShield: 50,
      energy: 40,
      maxEnergy: 40,
      power: 0,
    },
    challenge: {
      kind: "weekly",
      dayKey: null,
      weekKey: current.weekKey,
      identityKey: current.identityKey,
    },
  });
  return {
    ...run,
    phase: "encounter",
  };
}

describe("R02 weekly Expedition session lifecycle", () => {
  it("requires the weekly-specific resume gate for persisted weekly runs", () => {
    const storage = new MemoryStorage();
    const current = binding("2026-10-08T12:00:00.000Z");
    startExpeditionEnvelope(
      storage,
      "writer-a",
      weeklyRun("2026-10-08T12:00:00.000Z"),
      "2026-10-08T12:00:00.000Z",
    );

    const session = new ExpeditionSession(storage, "writer-b");
    expect(session.hasResumableRun()).toBe(false);
    expect(session.hasResumableWeeklyRun(current)).toBe(true);
    expect(session.weeklyResumeStatus(current)).toBe("available");
    expect(session.resume([])).toBeNull();

    const resumed = session.resumeWeekly(current, []);
    expect(resumed).not.toBeNull();
    expect(resumed?.challenge?.kind).toBe("weekly");
    expect(resumed?.seed).toBe(current.seed);
    expect(resumed?.retryCount).toBe(1);
    expect(resumed?.interrupted).toBe(true);
    expect(resumed?.encounterPlan).toEqual(
      createExpeditionEncounterPlan(current.seed, [1, 2], 2),
    );
  });

  it("blocks a previous-week run without mutating its persisted revision", () => {
    const storage = new MemoryStorage();
    startExpeditionEnvelope(
      storage,
      "writer-a",
      weeklyRun("2026-10-11T23:59:59.000Z"),
      "2026-10-11T23:59:59.000Z",
    );
    const before = loadExpeditionEnvelope(storage);
    expect(before.status).toBe("supported");

    const next = binding("2026-10-12T00:00:00.000Z");
    const session = new ExpeditionSession(storage, "writer-b");
    expect(session.weeklyResumeStatus(next)).toBe("stale");
    expect(session.resumeWeekly(next, [])).toBeNull();

    const after = loadExpeditionEnvelope(storage);
    expect(after).toEqual(before);
  });

  it("blocks a run whose canonical identity is paired with a forged seed", () => {
    const storage = new MemoryStorage();
    const current = binding("2026-10-08T12:00:00.000Z");
    const forged = {
      ...weeklyRun("2026-10-08T12:00:00.000Z"),
      seed: current.seed + 1,
    };
    startExpeditionEnvelope(
      storage,
      "writer-a",
      forged,
      "2026-10-08T12:00:00.000Z",
    );

    const session = new ExpeditionSession(storage, "writer-b");
    expect(session.weeklyResumeStatus(current)).toBe("invalid");
    expect(session.resumeWeekly(current, [])).toBeNull();
  });
});
