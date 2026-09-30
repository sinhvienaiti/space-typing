import { describe, expect, it } from "vitest";
import {
  createExpeditionEncounterPlan,
  createExpeditionRun,
  type ExpeditionResources,
} from "../src/expedition/core";
import { ExpeditionSession } from "../src/expedition/session";
import type { ExpeditionStorage } from "../src/expedition/store";

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

function createRun(id: string, seed = 77) {
  return createExpeditionRun({
    runId: id,
    seed,
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
  it("persists draft -> encounter -> settlement/draft safely", () => {
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

    expect(next?.phase).toBe("draft");
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

  it("QA phase forcing stays inside Expedition storage", () => {
    const storage = new MemoryStorage();
    const session = new ExpeditionSession(storage, "tab-a");
    session.start(createRun("qa"), ["a", "b"]);

    expect(session.testForcePhase("encounter", ["a", "b"])?.phase)
      .toBe("encounter");
    expect(session.testForcePhase("draft", ["a", "b"])?.phase)
      .toBe("draft");
    expect(session.testForcePhase("defeat", ["a", "b"])?.phase)
      .toBe("defeat");
  });
});
