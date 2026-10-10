import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import {
  QaSessionSandbox,
  assertQaCallbackCurrent,
  beginQaRuntimeSession,
  parseQaCapability,
  qaCallbackToken,
  qaCanPreviewShip,
  qaCanSelectStage,
  qaForcedStage,
  qaHasUnlimitedWarp,
  qaSessionExpired,
  type QaCapability,
  type QaEnvironment,
  type QaSandboxStorage,
} from "../src/admin/qa-session";
import {
  createPlayerSave,
  playerSaveTransaction,
  type PlayerSave,
} from "../src/persistence/player-save";
import { readPlayerSaveSnapshotForQa } from "../src/persistence/player-save-snapshot";
import { createDefaultCampaignProgress } from "../src/campaign/progress";
import { createAccountState, type SortieContext } from "../src/persistence/account-state";
import { AccountTransactions } from "../src/persistence/account-transactions";

const now = Date.UTC(2026, 9, 5, 12);
const runtimeSessionId = "runtime-session-1";
const environment: QaEnvironment = "development";
const context: SortieContext = {
  stage: 1,
  tier: 0,
  activity: "campaign",
  inputMode: "typing",
  gameplayMode: "combat",
  difficulty: "balanced",
  vocabulary: "english-v1",
  contentVersion: "qa-test",
  seed: 7,
};

function capability(patch: Partial<QaCapability> = {}): QaCapability {
  return {
    version: 1,
    id: "qa-capability-1",
    gameId: "space-typing",
    environment,
    targetSessionId: runtimeSessionId,
    actorId: "admin:test",
    issuedAtMs: now - 1_000,
    expiresAtMs: now + 60_000,
    generation: 1,
    overrides: {
      stageAccess: { stage: 900, mode: "force" },
      shipPreview: "zenith",
      unlimitedWarp: true,
    },
    ...patch,
  };
}

function memoryStorage(): { storage: QaSandboxStorage; memory: Map<string, string> } {
  const memory = new Map<string, string>();
  return {
    memory,
    storage: {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => memory.set(key, value),
      removeItem: (key) => memory.delete(key),
    },
  };
}

function canonicalSave(): PlayerSave {
  const save = createPlayerSave(
    createDefaultCampaignProgress(),
    new Date(now).toISOString(),
    "migration",
  );
  save.account = createAccountState(now);
  return save;
}

class Locks {
  held = false;
  async request(
    _name: string,
    _options: unknown,
    callback: (lock: Lock | null) => Promise<void>,
  ) {
    if (this.held) {
      await callback(null);
      return;
    }
    this.held = true;
    try {
      await callback({ name: "account", mode: "exclusive" } as Lock);
    } finally {
      this.held = false;
    }
  }
}

let memory: Map<string, string>;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  const indexedDB = new IDBFactory();
  vi.stubGlobal("indexedDB", indexedDB);
  vi.stubGlobal("window", { indexedDB });
  memory = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
    removeItem: (key: string) => memory.delete(key),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("QA capability scope and lifecycle", () => {
  it("accepts only the targeted non-production runtime session", () => {
    const parsed = parseQaCapability(
      capability(),
      runtimeSessionId,
      environment,
      now,
    );
    expect(parsed.id).toBe("qa-capability-1");
    expect(() =>
      parseQaCapability(capability(), "other-session", environment, now),
    ).toThrow(/scope/);
    expect(() =>
      parseQaCapability(
        { ...capability(), environment: "production" } as unknown,
        runtimeSessionId,
        environment,
        now,
      ),
    ).toThrow(/scope/);
  });

  it("keeps an active QA run permanently non-rewarded after capability expiry", () => {
    const policy = beginQaRuntimeSession(
      capability(),
      runtimeSessionId,
      environment,
      now,
    );
    const token = qaCallbackToken(policy);
    expect(qaSessionExpired(policy, now + 60_001)).toBe(true);
    expect(policy.rewardEligibility).toBe("none");
    expect(() => assertQaCallbackCurrent(policy, token)).not.toThrow();
    expect(() =>
      beginQaRuntimeSession(
        capability(),
        runtimeSessionId,
        environment,
        now + 60_001,
      ),
    ).toThrow(/expired/);
  });

  it("rejects callbacks from a replaced QA generation or session", () => {
    const policy = beginQaRuntimeSession(
      capability(),
      runtimeSessionId,
      environment,
      now,
    );
    expect(() =>
      assertQaCallbackCurrent(policy, {
        ...qaCallbackToken(policy),
        generation: policy.generation + 1,
      }),
    ).toThrow(/Stale/);
    expect(() =>
      assertQaCallbackCurrent(policy, {
        ...qaCallbackToken(policy),
        sessionId: "old-session",
      }),
    ).toThrow(/Stale/);
  });
});

describe("QA overrides remain ephemeral", () => {
  it("allows only the scoped locked stage/ship and bypasses Warp without inflating it", () => {
    const policy = beginQaRuntimeSession(
      capability(),
      runtimeSessionId,
      environment,
      now,
    );
    const save = canonicalSave();
    const originalWarp = structuredClone(save.account.warp);
    const originalCampaign = structuredClone(save.campaign);
    const originalCharacters = structuredClone(save.characters);

    expect(qaCanSelectStage(false, 900, policy)).toBe(true);
    expect(qaCanSelectStage(false, 899, policy)).toBe(false);
    expect(qaForcedStage(policy)).toBe(900);
    expect(qaCanPreviewShip(false, "zenith", policy)).toBe(true);
    expect(qaCanPreviewShip(false, "reaper", policy)).toBe(false);
    expect(qaHasUnlimitedWarp(policy)).toBe(true);

    expect(save.account.warp).toEqual(originalWarp);
    expect(save.campaign).toEqual(originalCampaign);
    expect(save.characters).toEqual(originalCharacters);
  });

  it("persists crash/pagehide state only under the QA sandbox key", () => {
    const policy = beginQaRuntimeSession(
      capability(),
      runtimeSessionId,
      environment,
      now,
    );
    const canonical = canonicalSave();
    const { storage, memory: sandboxMemory } = memoryStorage();
    const sandbox = new QaSessionSandbox(policy, canonical, storage);
    sandbox.mutate((draft) => {
      draft.credits = 777;
      draft.expansionCurrencies.starCrystal = 555;
    });

    expect(canonical.credits).toBe(0);
    expect(canonical.expansionCurrencies.starCrystal).toBe(0);
    expect([...sandboxMemory.keys()]).toHaveLength(1);
    expect([...sandboxMemory.keys()][0]).toMatch(/^spaceTypingQaSandboxV1:/);

    const resumed = new QaSessionSandbox(policy, canonical, storage);
    expect(resumed.snapshot().credits).toBe(777);
    expect(resumed.snapshot().expansionCurrencies.starCrystal).toBe(555);
    resumed.dispose();
    expect(sandboxMemory.size).toBe(0);
  });
});

describe("canonical isolation", () => {
  it("reads the QA seed through a readonly transaction and sandbox writes never touch IDB", async () => {
    const save = canonicalSave();
    await playerSaveTransaction(() => save);
    const put = vi.spyOn(IDBObjectStore.prototype, "put");

    const snapshot = await readPlayerSaveSnapshotForQa();
    const policy = beginQaRuntimeSession(
      capability(),
      runtimeSessionId,
      environment,
      now,
    );
    const { storage } = memoryStorage();
    const sandbox = new QaSessionSandbox(policy, snapshot, storage);
    sandbox.mutate((draft) => {
      draft.credits = 123_456;
      draft.campaign.highestUnlockedStage = 999;
    });

    expect(put).not.toHaveBeenCalled();
    expect((await readPlayerSaveSnapshotForQa()).credits).toBe(0);
    expect((await readPlayerSaveSnapshotForQa()).campaign.highestUnlockedStage).toBe(1);
  });

  it("does not take the writer lock, so a normal tab can commit while QA is active", async () => {
    await playerSaveTransaction(() => canonicalSave());
    const qaSnapshot = await readPlayerSaveSnapshotForQa();
    const policy = beginQaRuntimeSession(
      capability(),
      runtimeSessionId,
      environment,
      now,
    );
    const sandbox = new QaSessionSandbox(policy, qaSnapshot);
    sandbox.mutate((draft) => {
      draft.credits = 999_999;
    });

    const normal = new AccountTransactions(
      () => {},
      new Locks() as unknown as LockManager,
    );
    vi.spyOn(normal, "now").mockReturnValue(now);
    await normal.initialize();
    expect(normal.canWrite()).toBe(true);
    await normal.admit(context);

    const canonical = await readPlayerSaveSnapshotForQa();
    expect(canonical.account.warp.current).toBe(90);
    expect(canonical.credits).toBe(0);
    expect(sandbox.snapshot().account.warp.current).toBe(100);
    expect(sandbox.snapshot().credits).toBe(999_999);
    normal.close();
  });
});
