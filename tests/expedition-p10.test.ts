import { describe, expect, it } from "vitest";
import {
  abandonExpeditionRun,
  beginExpeditionEncounter,
  campaignFixtureUnchanged,
  confirmExpeditionDraft,
  createExpeditionEncounterPlan,
  createExpeditionRun,
  defeatExpeditionRun,
  materializeExpeditionDraft,
  openExpeditionDraft,
  settleExpeditionEncounter,
} from "../src/expedition/core";
import {
  EXPEDITION_STORAGE_KEY,
  ExpeditionStoreConflictError,
  ExpeditionStoreWriteError,
  claimExpeditionEnvelope,
  loadExpeditionEnvelope,
  loadExpeditionForFeature,
  startExpeditionEnvelope,
  writeExpeditionEnvelope,
  type ExpeditionStorage,
} from "../src/expedition/store";

class MemoryStorage implements ExpeditionStorage {
  values = new Map<string, string>();
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

const resources = {
  hull: 100,
  maxHull: 100,
  shield: 50,
  maxShield: 50,
  energy: 80,
  maxEnergy: 80,
  power: 0,
};

function fixture() {
  return {
    stage: 421,
    equipment: "campaign-only",
    credits: 987654,
    pity: 17,
    route: "campaign-route",
  };
}

function run(id = "run-a", seed = 42, encounters = 2) {
  return createExpeditionRun({
    runId: id,
    seed,
    wordPool: {
      hash: "pool-a",
      entries: [{ id: "w1", en: "alpha", vi: "a", ipa: "/a/" }],
    },
    profile: {
      difficulty: "normal",
      assist: "standard",
      vocabularyLevel: 1,
    },
    encounterPlan: createExpeditionEncounterPlan(seed, [1, 2, 3, 4], encounters),
    campaignFixture: fixture(),
    startingResources: resources,
  });
}

describe("P10 Expedition contract", () => {
  it("T01 abandon does not mutate campaign fixture", () => {
    const campaign = fixture();
    const ended = abandonExpeditionRun(run("t01"));
    expect(ended.phase).toBe("abandoned");
    expect(campaignFixtureUnchanged(ended, campaign)).toBe(true);
    expect(campaign).toEqual(fixture());
  });

  it("T02 victory remains run-local", () => {
    const campaign = fixture();
    let current = openExpeditionDraft(run("t02", 2, 1), ["first-light-seed"]);
    const choice = current.draftOffer!.choices[0]!;
    const confirmed = confirmExpeditionDraft(current, choice.id);
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    current = beginExpeditionEncounter(confirmed.run);
    current = settleExpeditionEncounter(current, {
      score: 500,
      accuracy: 97,
      resources,
    });
    expect(current.phase).toBe("victory");
    expect(campaignFixtureUnchanged(current, campaign)).toBe(true);
  });

  it("T03 same seed gives same plan and offer", () => {
    expect(createExpeditionEncounterPlan(3, [1, 2, 3], 2)).toEqual(
      createExpeditionEncounterPlan(3, [1, 2, 3], 2),
    );
    expect(
      materializeExpeditionDraft(3, 0, ["a", "b", "c"], []).choices,
    ).toEqual(
      materializeExpeditionDraft(3, 0, ["a", "b", "c"], []).choices,
    );
  });

  it("T04 repeated confirm cannot grant twice", () => {
    const current = openExpeditionDraft(run("t04"), ["a", "b"]);
    const id = current.draftOffer!.choices[0]!.id;
    const first = confirmExpeditionDraft(current, id);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = confirmExpeditionDraft(first.run, id);
    expect(second.ok).toBe(false);
    expect(first.run.relics.owned).toHaveLength(1);
  });

  it("T05 full slots require explicit replacement", () => {
    const current = {
      ...openExpeditionDraft(run("t05"), ["d"]),
      relics: {
        owned: ["a", "b", "c"],
        equipped: ["a", "b", "c"],
        maxEquipped: 3,
      },
    };
    const choice = current.draftOffer!.choices[0]!;
    const blocked = confirmExpeditionDraft(current, choice.id);
    expect(blocked).toEqual({
      ok: false,
      reason: "replacement-required",
      run: current,
    });
    const replaced = confirmExpeditionDraft(current, choice.id, "b");
    expect(replaced.ok).toBe(true);
    if (!replaced.ok) return;
    expect(replaced.run.relics.equipped).toEqual(["a", "d", "c"]);
  });

  it("T06 0/1/2 eligible rewards stay finite and unique", () => {
    expect(materializeExpeditionDraft(1, 0, [], []).choices).toEqual([
      { id: "continue", kind: "continue" },
    ]);
    expect(materializeExpeditionDraft(1, 1, ["a"], []).choices).toHaveLength(1);
    const two = materializeExpeditionDraft(1, 2, ["a", "a", "b"], []).choices;
    expect(two).toHaveLength(2);
    expect(new Set(two.map((choice) => choice.id)).size).toBe(2);
  });

  it("T10 reload claim preserves materialized state", () => {
    const storage = new MemoryStorage();
    const current = openExpeditionDraft(run("t10"), ["a", "b"]);
    const first = startExpeditionEnvelope(storage, "tab-a", current);
    const claimed = claimExpeditionEnvelope(storage, "tab-b", first.revision);
    expect(claimed.run.draftOffer).toEqual(current.draftOffer);
  });

  it("T11/T14 failed write leaves previous boundary authoritative", () => {
    const storage = new MemoryStorage();
    let current = openExpeditionDraft(run("t11"), ["a"]);
    const confirmed = confirmExpeditionDraft(current, current.draftOffer!.choices[0]!.id);
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    current = beginExpeditionEncounter(confirmed.run);
    const first = startExpeditionEnvelope(storage, "tab-a", current);
    const settled = settleExpeditionEncounter(current, {
      score: 10,
      accuracy: 100,
      resources,
    });
    storage.failNextWrite = true;
    expect(() =>
      writeExpeditionEnvelope(storage, {
        writerId: "tab-a",
        expectedRevision: first.revision,
        run: settled,
      }),
    ).toThrow(ExpeditionStoreWriteError);
    const loaded = loadExpeditionEnvelope(storage);
    expect(loaded.status).toBe("supported");
    if (loaded.status !== "supported") return;
    expect(loaded.envelope.revision).toBe(first.revision);
    expect(loaded.envelope.run.phase).toBe("encounter");
  });

  it("T12 terminal state is idempotent", () => {
    const first = defeatExpeditionRun(run("t12"));
    expect(defeatExpeditionRun(first)).toBe(first);
    expect(abandonExpeditionRun(first)).toBe(first);
  });

  it("T13 future save is not overwritten", () => {
    const storage = new MemoryStorage();
    const future = JSON.stringify({ storeVersion: 99, important: "keep" });
    storage.setItem(EXPEDITION_STORAGE_KEY, future);
    expect(loadExpeditionEnvelope(storage).status).toBe("unsupported");
    expect(() => startExpeditionEnvelope(storage, "tab", run("t13")))
      .toThrow(ExpeditionStoreConflictError);
    expect(storage.getItem(EXPEDITION_STORAGE_KEY)).toBe(future);
  });

  it("T15 stale writer cannot silently overwrite", () => {
    const storage = new MemoryStorage();
    const current = run("t15");
    const first = startExpeditionEnvelope(storage, "tab-a", current);
    expect(() =>
      writeExpeditionEnvelope(storage, {
        writerId: "tab-b",
        expectedRevision: first.revision,
        run: current,
      }),
    ).toThrow(ExpeditionStoreConflictError);
  });

  it("T19 disabled feature does not delete stored data", () => {
    const storage = new MemoryStorage();
    startExpeditionEnvelope(storage, "tab", run("t19"));
    const before = storage.getItem(EXPEDITION_STORAGE_KEY);
    expect(loadExpeditionForFeature(storage, false).status).toBe("supported");
    expect(storage.getItem(EXPEDITION_STORAGE_KEY)).toBe(before);
  });
});
