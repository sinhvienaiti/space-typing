import { describe, expect, it } from "vitest";
import {
  createExpeditionEncounterPlan,
  createExpeditionRun,
  type ExpeditionResources,
} from "../src/expedition/core";
import {
  ExpeditionSession,
  ExpeditionStorageAdapter,
} from "../src/expedition/session";
import {
  EXPEDITION_STORAGE_KEY,
  type ExpeditionStorage,
} from "../src/expedition/store";

class MemoryStorage implements ExpeditionStorage {
  private values = new Map<string, string>();
  failNextWrite = false;

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failNextWrite) {
      this.failNextWrite = false;
      throw new Error("quota");
    }
    this.values.set(key, value);
  }
}

const resources: ExpeditionResources = {
  hull: 100,
  maxHull: 100,
  shield: 40,
  maxShield: 40,
  energy: 100,
  maxEnergy: 100,
  power: 0,
};

function createRun(
  id: string,
  seed = 77,
  kind?: "daily" | "qa",
) {
  return createExpeditionRun({
    runId: id,
    seed,
    ...(kind === undefined
      ? {}
      : {
          challenge: {
            kind,
            dayKey: kind === "daily" ? "2026-10-21" : null,
            identityKey: kind === "daily" ? "daily:2026-10-21" : null,
          },
        }),
    wordPool: {
      hash: "pool",
      entries: [
        { id: "w1", en: "alpha", vi: "a", ipa: "/a/" },
      ],
    },
    profile: {
      difficulty: "balanced",
      assist: "standard",
      vocabularyLevel: 1,
    },
    encounterPlan: createExpeditionEncounterPlan(
      seed,
      [1, 2, 3, 4],
      2,
    ),
    campaignFixture: {
      credits: 999,
      route: "campaign",
    },
    startingResources: resources,
  });
}

describe("P10 ExpeditionSession", () => {
  it("persists draft -> encounter -> safe setup boundary", () => {
    const storage = new MemoryStorage();
    const session = new ExpeditionSession(storage, "tab-a");
    const run = session.start(createRun("flow"), ["a", "b", "c"]);

    expect(run.phase).toBe("draft");
    const choice = run.draftOffer!.choices[0]!;
    const encounter = session.confirmDraft(choice.id);

    expect(encounter?.phase).toBe("encounter");
    expect(session.currentRevision()).toBe(2);

    const next = session.settle({
      score: 123,
      accuracy: 98,
      resources: {
        ...resources,
        hull: 81,
        shield: 11,
        energy: 72,
        power: 44,
      },
    });

    expect(next?.phase).toBe("setup");
    expect(next?.completedEncounters).toBe(1);
    expect(next?.resources.hull).toBe(81);
    expect(next?.resources.power).toBe(44);
  });

  it("reload claims writer ownership and marks encounter replay", () => {
    const storage = new MemoryStorage();
    const first = new ExpeditionSession(storage, "tab-a");
    const draft = first.start(createRun("resume"), ["a"]);
    first.confirmDraft(draft.draftOffer!.choices[0]!.id);

    const second = new ExpeditionSession(storage, "tab-b");
    const resumed = second.resume(["a"]);

    expect(resumed?.phase).toBe("encounter");
    expect(resumed?.interrupted).toBe(true);
    expect(resumed?.retryCount).toBe(1);
  });

  it("failed storage write does not advance session revision", () => {
    const storage = new MemoryStorage();
    const session = new ExpeditionSession(storage, "tab-a");
    const draft = session.start(createRun("failure"), ["a"]);
    const before = session.currentRevision();

    storage.failNextWrite = true;
    expect(() =>
      session.confirmDraft(draft.draftOffer!.choices[0]!.id),
    ).toThrow("quota");

    expect(session.currentRevision()).toBe(before);
    expect(session.currentRun()?.phase).toBe("draft");
  });

  it("release clears Expedition ownership but preserves a resumable run", () => {
    const storage = new MemoryStorage();
    const session = new ExpeditionSession(storage, "tab-a");
    session.start(createRun("leave-and-resume"), ["a", "b"]);

    expect(session.ownsCampaignPersistence()).toBe(true);
    session.release();
    expect(session.ownsCampaignPersistence()).toBe(false);
    expect(session.hasResumableRun()).toBe(true);
    expect(session.resume(["a", "b"])?.runId).toBe("leave-and-resume");
  });

  it("QA phase forcing stays inside Expedition storage", () => {
    const storage = new MemoryStorage();
    const session = new ExpeditionSession(storage, "tab-a");
    session.start(createRun("qa", 77, "qa"), ["a", "b"]);

    expect(session.testForcePhase("encounter", ["a", "b"])?.phase)
      .toBe("encounter");
    expect(session.testForcePhase("draft", ["a", "b"])?.phase)
      .toBe("draft");
    expect(session.testForcePhase("defeat", ["a", "b"])?.phase)
      .toBe("defeat");
  });

  it("QA overrides refuse Daily and player runs and leave their saves untouched", () => {
    for (const run of [createRun("daily", 77, "daily"), createRun("player")]) {
      const storage = new MemoryStorage();
      const session = new ExpeditionSession(storage, "tab-a");
      session.start(run, ["a", "b"]);
      const saved = storage.getItem(EXPEDITION_STORAGE_KEY);

      expect(session.testForcePhase("defeat", ["a", "b"])).toBeNull();
      expect(session.testForceEncounterIndex(3)).toBeNull();
      expect(storage.getItem(EXPEDITION_STORAGE_KEY)).toBe(saved);
      expect(session.currentRun()?.terminal).toBeNull();
    }
  });

  it("an injected QA save failure never reaches a Daily run", () => {
    const values = new Map<string, string>();
    const adapter = new ExpeditionStorageAdapter({
      readItem: (key) => values.get(key) ?? null,
      commitItem: (key, value) => {
        values.set(key, value);
        return true;
      },
    });
    adapter.injectFailureOnce();

    const daily = new ExpeditionSession(adapter, "tab-a");
    const draft = daily.start(createRun("daily", 77, "daily"), ["a"]);
    expect(daily.confirmDraft(draft.draftOffer!.choices[0]!.id)?.phase)
      .toBe("encounter");
    expect(daily.abandon()?.terminal).not.toBeNull();

    const qa = new ExpeditionSession(adapter, "tab-b");
    expect(() => qa.start(createRun("qa", 78, "qa"), ["a"]))
      .toThrow("Expedition QA storage failure.");
  });

  it("a save the browser refuses throws instead of advancing the run", () => {
    const adapter = new ExpeditionStorageAdapter({
      readItem: () => null,
      commitItem: () => false,
    });
    const session = new ExpeditionSession(adapter, "tab-a");

    expect(() => session.start(createRun("blocked"), ["a"])).toThrow();
    expect(session.currentRun()).toBeNull();
  });

  it("a save the browser will not let us read is never started over", () => {
    const values = new Map<string, string>();
    let readable = true;
    const adapter = new ExpeditionStorageAdapter({
      readItem: (key) => (readable ? values.get(key) ?? null : undefined),
      commitItem: (key, value) => {
        values.set(key, value);
        return true;
      },
    });
    new ExpeditionSession(adapter, "tab-a").start(createRun("running"), ["a"]);
    const saved = values.get(EXPEDITION_STORAGE_KEY);

    readable = false;
    const next = new ExpeditionSession(adapter, "tab-b");
    expect(next.hasResumableRun()).toBe(false);
    expect(() => next.start(createRun("other"), ["a"]))
      .toThrow("Unable to read Expedition save.");
    expect(() => next.resume(["a"])).toThrow("Unable to read Expedition save.");
    expect(values.get(EXPEDITION_STORAGE_KEY)).toBe(saved);
    expect(next.currentRun()).toBeNull();

    readable = true;
    expect(next.hasResumableRun()).toBe(true);
  });
});
