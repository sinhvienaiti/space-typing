import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { AccountTransactions } from "../src/persistence/account-transactions";
import {
  createPlayerSave,
  loadPlayerSave,
  playerSaveTransaction,
  type PlayerSave,
} from "../src/persistence/player-save";
import { createDefaultCampaignProgress } from "../src/campaign/progress";
import { createAccountState } from "../src/persistence/account-state";
import { createWarpCharge, giftWarp } from "../src/economy/warp-charge";
import { LiveOpsController } from "../src/liveops/controller";

/** Live-ops Warp gifts go through a keyed account transaction. */
const now = Date.UTC(2026, 9, 16, 5, 30); // 12:30 Vietnam, inside the lunch supply window

class Locks {
  held = false;
  async request(_name: string, _options: unknown, callback: (lock: Lock | null) => Promise<void>) {
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

let stores: AccountTransactions[];
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  const indexedDB = new IDBFactory();
  vi.stubGlobal("indexedDB", indexedDB);
  vi.stubGlobal("window", { indexedDB });
  const memory = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
  });
  stores = [];
});
afterEach(async () => {
  stores.forEach((s) => s.close());
  await Promise.resolve();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function seed(patch?: (save: PlayerSave) => void): Promise<void> {
  const save = createPlayerSave(createDefaultCampaignProgress(), new Date(now).toISOString(), "migration");
  save.account = createAccountState(now);
  patch?.(save);
  await playerSaveTransaction(() => save);
}

async function store(): Promise<AccountTransactions> {
  const s = new AccountTransactions(vi.fn(), new Locks() as unknown as LockManager);
  stores.push(s);
  vi.spyOn(s, "now").mockReturnValue(now);
  await s.initialize();
  return s;
}

describe("giftWarp", () => {
  it("fills Active first, then Reserve, and refuses when both are full", () => {
    const base = { ...createWarpCharge(now), current: 90 };
    const w = giftWarp(base, now, 30);
    expect(w.current).toBe(100);
    expect(w.reserve).toBe(20);
    expect(() => giftWarp({ ...w, reserve: 290 }, now, 30)).toThrow(/full/);
  });
});

describe("live-ops Warp through the account", () => {
  it("pays a keyed gift once", async () => {
    await seed((save) => {
      save.account.warp.current = 40;
    });
    const s = await store();
    await s.giftWarp("liveops:test:1", 30);
    await s.giftWarp("liveops:test:1", 30);
    const saved = (await loadPlayerSave()).save.account;
    expect(saved.warp.current).toBe(70);
    expect(saved.milestoneGrants).toContain("liveops:test:1");
    expect(s.hasGrant("liveops:test:1")).toBe(true);
  });

  it("is refused during a sortie", async () => {
    await seed((save) => {
      save.account.warp.current = 40;
      save.account.attempt = {
        id: "sortie-1",
        context: {
          stage: 1,
          tier: 0,
          activity: "campaign",
          inputMode: "typing",
          gameplayMode: "combat",
          difficulty: "balanced",
          vocabulary: "english-v1",
          contentVersion: "test",
          seed: 1,
        },
        phase: "prepared",
        activeCost: 10,
        reserveCost: 0,
        reviveSequence: 0,
      };
    });
    const s = await store();
    await expect(s.giftWarp("liveops:test:2", 30)).rejects.toThrow(/between sorties/);
  });

  it("controller: Warp failure leaves the claim open; success applies currencies once", async () => {
    await seed((save) => {
      save.account.warp.current = 100;
      save.account.warp.reserve = 290;
    });
    const s = await store();
    const granted: unknown[] = [];
    let saves = 0;
    const controller = new LiveOpsController({
      localNow: () => now,
      claimBlocker: () => null,
      starCrystals: () => 0,
      spendStarCrystals: () => {},
      grantCurrencies: (reward) => granted.push(reward),
      grantWarp: (key, amount) => s.giftWarp(key, amount).then(() => {}),
      persist: async () => {
        saves += 1;
        return true;
      },
      changed: () => {},
    });
    controller.load(undefined);
    // Tanks too full for +30: nothing changes.
    const failed = await controller.claim({ kind: "warp-window", id: "noon" });
    expect(failed.ok).toBe(false);
    expect(controller.state().warpWindows).toEqual([]);
    expect(saves).toBe(0);
    // Starter day 1 is Credits only.
    const ok = await controller.claim({ kind: "newbie" });
    expect(ok.ok).toBe(true);
    expect(granted).toEqual([{ credits: 300 }]);
    expect(saves).toBe(1);
    expect(controller.isDirty()).toBe(false);
  });
});
