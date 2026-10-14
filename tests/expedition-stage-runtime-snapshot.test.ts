import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExpeditionRun } from "../src/expedition/core";

type RuntimeEnvelope = {
  applyBoundary: "new-session";
  activeRevision: string;
  policy: {
    configRevision: string;
    stages: Array<{ stage: number; enemyBudget: number }>;
  };
  gameDefaults: { difficulty: "normal" };
};

class MemoryStorage {
  private readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

function publishedRuntime(revision: string, enemyBudget: number): RuntimeEnvelope {
  return {
    applyBoundary: "new-session",
    activeRevision: revision,
    policy: {
      configRevision: revision,
      stages: [{ stage: 1, enemyBudget }],
    },
    gameDefaults: { difficulty: "normal" },
  };
}

function installPageRuntime(runtime: RuntimeEnvelope): void {
  vi.stubGlobal("window", {
    fetch: vi.fn(async () => new Response(JSON.stringify(runtime), {
      status: 200,
      headers: { "content-type": "application/json" },
    })),
  });
}

function minimalRun(runId: string): ExpeditionRun {
  return {
    version: 1,
    runId,
    seed: 7,
    rulesetVersion: "test",
    contentVersion: "test",
    startKitId: "loaner-vanguard-v1",
    wordPool: {
      hash: "word-pool-test",
      entries: [{ id: "word-1", en: "orbit", vi: "quy dao", ipa: "orbit" }],
    },
    profile: { difficulty: "normal", assist: "standard", vocabularyLevel: 1 },
    phase: "setup",
    encounterPlan: [{ id: "enc-1", index: 0, sourceStage: 1, gameplaySeed: 1, cosmeticSeed: 2 }],
    currentEncounterIndex: 0,
    completedEncounters: 0,
    draftOffer: null,
    relics: { owned: [], equipped: [], maxEquipped: 3, discarded: [] },
    resources: { hull: 100, maxHull: 100, shield: 0, maxShield: 0, energy: 100, maxEnergy: 100, power: 0 },
    totalScore: 0,
    accuracySum: 0,
    contributions: {
      typedCompletions: 0,
      perfectCompletions: 0,
      acceptedTypedLetters: 0,
      weightedEffort: 0,
      longWordCompletions: 0,
      solarStormBonuses: 0,
      solarStormEnergy: 0,
      relicProcs: 0,
      perkProcs: 0,
      synergyProcs: 0,
    },
    committedEncounterIds: [],
    interrupted: false,
    retryCount: 0,
    terminal: null,
    campaignFixture: {},
    campaignFixtureHash: "fixture-test",
  };
}

function snapshotBudget(run: ExpeditionRun): number | undefined {
  return (run as ExpeditionRun & {
    stageRuntimeSnapshot?: { stages?: Record<number, { enemyBudget?: number }> };
  }).stageRuntimeSnapshot?.stages?.[1]?.enemyBudget;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("Expedition Stage runtime snapshot", () => {
  it("freezes A across reload B, gives new runs B, and fails legacy saves closed to bundled", async () => {
    installPageRuntime(publishedRuntime("stage-a", 71));
    vi.resetModules();
    const storeA = await import("../src/expedition/store");

    const storageA = new MemoryStorage();
    const startedA = storeA.startExpeditionEnvelope(storageA, "writer-a", minimalRun("run-a"));
    expect(snapshotBudget(startedA.run)).toBe(71);

    const persistedA = storeA.loadExpeditionEnvelope(storageA);
    expect(persistedA.status).toBe("supported");
    if (persistedA.status !== "supported") throw new Error("Expected persisted Expedition A.");
    expect(snapshotBudget(persistedA.envelope.run)).toBe(71);

    installPageRuntime(publishedRuntime("stage-b", 93));
    vi.resetModules();
    const storeB = await import("../src/expedition/store");
    const stageB = await import("../src/campaign/stage");

    const reloadedA = storeB.loadExpeditionEnvelope(storageA);
    expect(reloadedA.status).toBe("supported");
    if (reloadedA.status !== "supported") throw new Error("Expected reloadable Expedition A.");
    const claimedA = storeB.claimExpeditionEnvelope(
      storageA,
      "writer-b",
      reloadedA.envelope.revision,
    );
    const encounterA = storeB.writeExpeditionEnvelope(storageA, {
      writerId: "writer-b",
      expectedRevision: claimedA.revision,
      run: { ...claimedA.run, phase: "encounter" },
    });
    expect(snapshotBudget(encounterA.run)).toBe(71);
    expect(stageB.createStageConfig(1).enemyBudget).toBe(71);
    expect(stageB.createStageConfig(1).enemyBudget).toBe(93);

    const storageB = new MemoryStorage();
    const startedB = storeB.startExpeditionEnvelope(storageB, "writer-b", minimalRun("run-b"));
    expect(snapshotBudget(startedB.run)).toBe(93);
    storeB.writeExpeditionEnvelope(storageB, {
      writerId: "writer-b",
      expectedRevision: startedB.revision,
      run: { ...startedB.run, phase: "encounter" },
    });
    expect(stageB.createStageConfig(1).enemyBudget).toBe(93);

    const legacyStorage = new MemoryStorage();
    legacyStorage.setItem(storeB.EXPEDITION_STORAGE_KEY, JSON.stringify({
      storeVersion: 1,
      revision: 1,
      writerId: "legacy-writer",
      updatedAt: "2026-10-14T00:00:00.000Z",
      run: minimalRun("legacy-run"),
    }));
    const legacyLoaded = storeB.loadExpeditionEnvelope(legacyStorage);
    expect(legacyLoaded.status).toBe("supported");
    if (legacyLoaded.status !== "supported") throw new Error("Expected legacy Expedition save.");
    const legacyClaimed = storeB.claimExpeditionEnvelope(
      legacyStorage,
      "writer-b",
      legacyLoaded.envelope.revision,
    );
    const legacyEncounter = storeB.writeExpeditionEnvelope(legacyStorage, {
      writerId: "writer-b",
      expectedRevision: legacyClaimed.revision,
      run: { ...legacyClaimed.run, phase: "encounter" },
    });
    expect(snapshotBudget(legacyEncounter.run)).toBeUndefined();
    expect(stageB.createStageConfig(1).enemyBudget).toBe(
      stageB.createBundledStageConfig(1).enemyBudget,
    );
    expect(stageB.createStageConfig(1).enemyBudget).toBe(93);
  });
});
