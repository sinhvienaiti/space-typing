import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import {
  AccountTransactions,
  type AccountView,
} from "../src/persistence/account-transactions";
import {
  createPlayerSave,
  loadPlayerSave,
  migratePlayerSave,
  openPlayerDatabase,
  playerSaveTransaction,
  type PlayerSave,
} from "../src/persistence/player-save";
import { createDefaultCampaignProgress } from "../src/campaign/progress";
import {
  createAccountState,
  type SortieContext,
} from "../src/persistence/account-state";
import { gameDay } from "../src/economy/warp-charge";
import { parsePlayerSaveJson } from "../src/persistence/backup";
const now = Date.UTC(2026, 9, 4);
const context: SortieContext = {
  stage: 1,
  tier: 0,
  activity: "campaign",
  inputMode: "typing",
  gameplayMode: "combat",
  difficulty: "balanced",
  vocabulary: "english-v1",
  contentVersion: "test",
  seed: 42,
};
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
let locks: Locks, stores: AccountTransactions[], memory: Map<string, string>;
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
  });
  locks = new Locks();
  stores = [];
});
afterEach(async () => {
  stores.forEach((s) => s.close());
  await Promise.resolve();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
async function store(lockManager?: LockManager) {
  const manager =
    arguments.length === 0 ? (locks as unknown as LockManager) : lockManager;
  const published = vi.fn(),
    s = new AccountTransactions(published, manager);
  stores.push(s);
  vi.spyOn(s, "now").mockReturnValue(now);
  const loaded = await s.initialize();
  return { s, loaded, published };
}
async function seed(patch?: (save: PlayerSave) => void) {
  const save = createPlayerSave(
    createDefaultCampaignProgress(),
    new Date(now).toISOString(),
    "migration",
  );
  save.account = createAccountState(now);
  patch?.(save);
  await playerSaveTransaction(() => save);
  return save;
}
function view(save: PlayerSave): AccountView {
  const { account: _account, ...fields } = structuredClone(save);
  return fields;
}
async function raw(value: unknown) {
  const db = await openPlayerDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("player", "readwrite");
    tx.objectStore("player").put(value, "main");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
describe("canonical admission and fenced writer", () => {
  it("snapshots caller context and intent before queued admission and activation", async () => {
    await seed();
    const { s } = await store();
    const requested = { ...context }, intent = s.intent(), originalIntent = { ...intent };
    const pending = s.admit(requested, intent);
    requested.stage = 999;
    intent.id = "changed-after-call";
    intent.fence++;
    await pending;
    expect(s.account()!.warp.current).toBe(90);
    await s.admit(context, originalIntent);
    expect(s.account()!.warp.current).toBe(90);
    const activationContext = { ...context };
    const activating = s.activate(s.account()!.attempt!.id, activationContext);
    activationContext.stage = 999;
    await activating;
    expect(s.account()!.attempt!.phase).toBe("active");
  });
  it.each([
    { ...context, stage: 2 },
    { ...context, tier: 1 },
    { ...context, activity: "hidden" as const },
    { ...context, seed: -1 },
  ])(
    "canonical stage/context validation rejects before charging: %j",
    async (requested) => {
      await seed();
      const { s } = await store();
      await expect(s.admit(requested)).rejects.toThrow(
        /unlocked|Hidden route|Invalid/,
      );
      expect(s.account()!.warp.current).toBe(100);
      expect(s.account()!.attempt).toBeNull();
    },
  );
  it("Reserve remains opt-in and pays only the deficit after explicit consent", async () => {
    await seed((save) => {
      save.account.warp.current = 6;
      save.account.warp.reserve = 40;
    });
    const { s } = await store();
    await expect(s.admit(context)).rejects.toThrow(/confirmation/);
    expect(s.account()!.warp).toMatchObject({ current: 6, reserve: 40 });
    await s.reserveConsent(true);
    await s.admit(context);
    expect(s.account()).toMatchObject({
      warp: { current: 0, reserve: 36 },
      attempt: { activeCost: 6, reserveCost: 4 },
    });
  });
  it("commits one fee on duplicate Deploy and lost-ACK retry; payload reuse rejects", async () => {
    await seed();
    const { s } = await store(),
      intent = s.intent();
    const [a, b] = await Promise.all([
      s.admit(context, intent),
      s.admit(context, intent),
    ]);
    expect(a.account.warp.current).toBe(90);
    expect(b.account.warp.current).toBe(90);
    expect(a.account.attempt?.phase).toBe("prepared");
    await expect(s.admit({ ...context, stage: 2 }, intent)).rejects.toThrow(
      /different/,
    );
    expect((await loadPlayerSave()).save.account.warp.current).toBe(90);
  });
  it("two tabs racing for the final 10 Warp authorize only one writer", async () => {
    await seed((s) => {
      s.account.warp.current = 10;
    });
    const [a, b] = await Promise.all([store(), store()]);
    const result = await Promise.allSettled([
      a.s.admit(context),
      b.s.admit(context),
    ]);
    expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await loadPlayerSave()).save.account.warp.current).toBe(0);
  });
  it("old autosave/pagehide cannot replace a spend or a post-refill wallet", async () => {
    await seed((s) => {
      s.account.warp.current = 40;
      s.expansionCurrencies.starCrystal = 100;
    });
    const { s, loaded } = await store(),
      before = s.ticket();
    await s.refuel(s.quote());
    await expect(s.save(view(loaded.save), before, null)).rejects.toThrow(
      /Stale/,
    );
    const fresh = s.ticket();
    await s.admit(context);
    await expect(s.save(view(loaded.save), fresh, null)).rejects.toThrow(
      /Stale/,
    );
    expect((await loadPlayerSave()).save).toMatchObject({
      expansionCurrencies: { starCrystal: 92 },
      account: { warp: { current: 50 } },
    });
  });
  it("a takeover fences an old suspended owner and closes activated crash without charging a retry", async () => {
    await seed();
    const { s: first, loaded } = await store();
    await first.admit(context);
    await first.activate(first.account()!.attempt!.id, context);
    const stale = first.ticket();
    // Simulate the lock going away after a browser context dies; the old object waking is still fenced.
    const { s: second, loaded: recovered } = await store(
      new Locks() as unknown as LockManager,
    );
    expect(recovered.interrupted).toBe(true);
    expect(second.account()!.attempt).toBeNull();
    expect(second.account()!.warp.current).toBe(90);
    await expect(first.save(view(loaded.save), stale, null)).rejects.toThrow(
      /another tab/,
    );
    await second.admit(context);
    expect(second.account()!.warp.current).toBe(80);
  });
  it("prepared reload can continue its exact context without a second fee and mismatched context cannot activate", async () => {
    await seed();
    const { s: first } = await store();
    await first.admit(context);
    first.close();
    await Promise.resolve();
    const { s } = await store();
    const prepared = await s.admit(context);
    expect(prepared.account.warp.current).toBe(90);
    await expect(
      s.activate(prepared.account.attempt!.id, {
        ...context,
        inputMode: "voice",
      }),
    ).rejects.toThrow(/context/);
    await s.activate(prepared.account.attempt!.id, context);
    expect(s.account()!.attempt?.phase).toBe("active");
  });
  it("confirmed transaction abort cannot debit, publish or admit a playable attempt", async () => {
    await seed();
    const { s, published } = await store();
    const calls = published.mock.calls.length;
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementationOnce(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    await expect(s.admit(context)).rejects.toThrow(/full/);
    expect(published).toHaveBeenCalledTimes(calls);
    expect((await loadPlayerSave()).save.account).toMatchObject({
      attempt: null,
      warp: { current: 100 },
    });
  });
  it("mirror failure does not undo a commit or debit again", async () => {
    await seed();
    const { s } = await store(),
      intent = s.intent();
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    });
    await s.admit(context, intent);
    await s.admit(context, intent);
    expect(s.account()!.warp.current).toBe(90);
  });
  it.each(["practice", "review", "qa", "expedition"] as const)(
    "%s capability cannot commit Campaign economy, inventory, unlocks, Nemesis or difficulty",
    async (capability) => {
      await seed();
      const { s, loaded } = await store();
      const fake = view(loaded.save);
      fake.credits = 99_999;
      fake.inventory = { "phoenix-core": 9 };
      fake.campaign.highestUnlockedStage = 999;
      fake.auxiliary = {
        expansionV2: { hacked: true },
        difficulty: { encounters: 999 },
      };
      await expect(s.save(fake, s.ticket(capability), null)).rejects.toThrow(
        /learning only/,
      );
      expect((await loadPlayerSave()).save.credits).toBe(0);
      expect((await loadPlayerSave()).save.campaign.highestUnlockedStage).toBe(
        1,
      );
    },
  );
  it("no Web Locks means read-only economy rather than a localStorage mutex fallback", async () => {
    vi.stubGlobal("navigator", { locks: undefined });
    await seed();
    const { s } = await store(undefined);
    expect(s.canWrite()).toBe(false);
    await expect(s.admit(context)).rejects.toThrow(/another tab/);
  });
  it("compacted receipts cannot turn an old callback into a new account intent", async () => {
    await seed();
    const { s } = await store(),
      old = s.intent();
    await s.reserveConsent(true, old);
    for (let i = 0; i < 66; i++) await s.reserveConsent(i % 2 === 0);
    expect(s.account()!.receipts).toHaveLength(64);
    await expect(s.reserveConsent(true, old)).rejects.toThrow(/Expired/);
  });
  it("ordinary autosaves stay ordered but older snapshots cannot roll them back", async () => {
    await seed();
    const { s, loaded } = await store(),
      old = s.ticket(),
      next = s.ticket();
    const changed = view(loaded.save);
    changed.credits = 100;
    await s.save(changed, next, null);
    await expect(s.save(view(loaded.save), old, null)).rejects.toThrow(/Stale/);
    expect((await loadPlayerSave()).save.credits).toBe(100);
  });
});
describe("settlement, Phoenix, refuel and migration", () => {
  it("snapshots a refuel quote before queued work and keeps its retry identity", async () => {
    await seed((save) => { save.account.warp.current = 0; save.expansionCurrencies.starCrystal = 100; });
    const { s } = await store(), quote = s.quote(), original = { ...quote }, intent = s.intent();
    const pending = s.refuel(quote, intent);
    quote.price = 1;
    quote.amount = 200;
    await pending;
    await s.refuel(original, intent);
    expect(s.account()!.warp).toMatchObject({ current: 20, refills: 1 });
    expect((await loadPlayerSave()).save.expansionCurrencies.starCrystal).toBe(92);
  });
  it("clear reward, terminal receipt and milestone commit once; duplicate and late callbacks cannot pay again", async () => {
    await seed();
    const { s, loaded } = await store();
    await s.admit(context);
    const id = s.account()!.attempt!.id;
    await s.activate(id, context);
    const reward = view(loaded.save);
    reward.credits = 100;
    const ticket = s.ticket("rewarded");
    await s.save(reward, ticket, id, "cleared", ["warp-v3-1:sector:0:10"]);
    await expect(s.save(reward, ticket, id, "cleared")).rejects.toThrow(
      /Stale/,
    );
    expect((await loadPlayerSave()).save).toMatchObject({
      credits: 100,
      account: {
        attempt: null,
        warp: { current: 90 },
        milestoneGrants: ["warp-v3-1:sector:0:10"],
      },
    });
    await s.admit(context);
    await s.activate(s.account()!.attempt!.id, context);
    await expect(
      s.save(reward, s.ticket(), s.account()!.attempt!.id, "cleared", [
        "warp-v3-1:sector:0:10",
      ]),
    ).rejects.toThrow(/Milestone/);
  });
  it("Phoenix consumes once in the current defeated attempt before resume, without another Warp fee", async () => {
    await seed((s) => {
      s.inventory = { "phoenix-core": 2 };
    });
    const { s, loaded } = await store();
    await s.admit(context);
    const id = s.account()!.attempt!.id;
    await s.activate(id, context);
    await s.save(view(loaded.save), s.ticket(), id, "defeat-pending");
    const intent = s.intent();
    const revived = await s.revive(id, intent);
    const duplicate = await s.revive(id, intent);
    expect(revived.inventory["phoenix-core"]).toBe(1);
    expect(duplicate.inventory["phoenix-core"]).toBe(1);
    expect(revived.account).toMatchObject({
      warp: { current: 90 },
      attempt: { phase: "active", reviveSequence: 1 },
    });
  });
  it("Phoenix transaction failure keeps the item and defeated phase intact", async () => {
    await seed((s) => {
      s.inventory = { "phoenix-core": 1 };
    });
    const { s, loaded } = await store();
    await s.admit(context);
    const id = s.account()!.attempt!.id;
    await s.activate(id, context);
    await s.save(view(loaded.save), s.ticket(), id, "defeat-pending");
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementationOnce(() => {
      throw new Error("disk");
    });
    await expect(s.revive(id)).rejects.toThrow(/disk/);
    expect((await loadPlayerSave()).save.inventory["phoenix-core"]).toBe(1);
    expect(s.account()!.attempt?.phase).toBe("defeat-pending");
  });
  it("refuel is atomic, quota bounded, and a stale quote never spends at a different price", async () => {
    await seed((s) => {
      s.account.warp.current = 0;
      s.expansionCurrencies.starCrystal = 100;
    });
    const { s } = await store(),
      quote = s.quote(),
      intent = s.intent();
    await s.refuel(quote, intent);
    await s.refuel(quote, intent);
    await expect(s.refuel(quote)).rejects.toThrow(/quote changed/);
    await s.refuel(s.quote());
    await s.refuel(s.quote());
    expect(s.account()!.warp).toMatchObject({ current: 60, refills: 3 });
    expect((await loadPlayerSave()).save.expansionCurrencies.starCrystal).toBe(
      62,
    );
    expect(() => s.quote()).toThrow(/3 daily/);
  });
  it("refuel rejects a running attempt and no room without touching Crystals", async () => {
    await seed((s) => {
      s.account.warp.current = 95;
      s.account.warp.reserve = 295;
      s.expansionCurrencies.starCrystal = 100;
    });
    const { s } = await store();
    await expect(
      s.refuel({ day: gameDay(now), index: 0, price: 8, amount: 20 }),
    ).rejects.toThrow(/room/);
    await s.admit(context);
    await expect(s.refuel(s.quote())).rejects.toThrow(/sortie ends/);
    expect((await loadPlayerSave()).save.expansionCurrencies.starCrystal).toBe(
      100,
    );
  });
  it("legacy schema migrates once at current time; current missing Warp and future schema reject", async () => {
    const legacy = createPlayerSave(createDefaultCampaignProgress());
    const { account: _a, ...fields } = legacy;
    await raw({ ...fields, version: 27, updatedAt: "2000-01-01T00:00:00Z" });
    const { s } = await store();
    expect(s.account()!.warp).toMatchObject({
      current: 100,
      reserve: 0,
      watermarkMs: now,
    });
    await s.admit(context);
    expect((await loadPlayerSave()).save.account.warp.current).toBe(90);
    expect(() => migratePlayerSave({ ...fields, version: 28 })).toThrow(
      /missing/,
    );
    expect(() => migratePlayerSave({ ...fields, version: 29 })).toThrow(
      /newer/,
    );
    expect(
      parsePlayerSaveJson(JSON.stringify({ ...fields, version: 28 })).ok,
    ).toBe(false);
  });
  it("explicit whole-profile restore creates a new generation; old backups cannot repeat +100 migration", async () => {
    await seed();
    const { s, loaded } = await store();
    await s.admit(context);
    await s.finish("abandoned", s.account()!.attempt!.id);
    const stale = s.ticket();
    const restored = await s.restore(loaded.save, true);
    expect(restored.account.warp.current).toBe(90);
    expect(restored.account.generation).not.toBe(
      loaded.save.account.generation,
    );
    await expect(s.save(view(loaded.save), stale, null)).rejects.toThrow(
      /another tab/,
    );
    expect(parsePlayerSaveJson(JSON.stringify(restored)).ok).toBe(true);
  });
  it("clock re-anchor grants nothing retroactively and preserves used refill quota", async () => {
    await seed((s) => {
      s.account.warp.current = 0;
      s.account.warp.watermarkMs = now + 86_400_000 * 365;
      s.account.warp.day = gameDay(s.account.warp.watermarkMs);
      s.account.warp.refills = 3;
    });
    const { s } = await store();
    await s.reanchor();
    expect(s.account()!.warp).toMatchObject({
      current: 0,
      refills: 3,
      watermarkMs: now,
      day: gameDay(now),
    });
  });
  it("clear storage failure leaves all rewards, milestone keys, terminal receipt and phase unchanged; retry settles once", async () => {
    await seed();
    const { s, loaded } = await store();
    await s.admit(context);
    const id = s.account()!.attempt!.id;
    await s.activate(id, context);
    const reward = view(loaded.save);
    reward.credits = 200;
    reward.expansionCurrencies.starCrystal = 5;
    const ticket = s.ticket("rewarded"),
      key = "warp-v3-1:sector:0:10";
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementationOnce(() => {
      throw new Error("full disk");
    });
    await expect(s.save(reward, ticket, id, "cleared", [key])).rejects.toThrow(
      /full disk/,
    );
    const failed = (await loadPlayerSave()).save;
    expect(failed).toMatchObject({
      credits: 0,
      expansionCurrencies: { starCrystal: 0 },
      account: { attempt: { phase: "active" }, milestoneGrants: [] },
    });
    expect(failed.account.receipts.some((r) => r.kind === "clear")).toBe(false);
    await s.save(reward, ticket, id, "cleared", [key]);
    expect((await loadPlayerSave()).save).toMatchObject({
      credits: 200,
      expansionCurrencies: { starCrystal: 5 },
      account: { attempt: null, milestoneGrants: [key] },
    });
  });
  it.each([null, {}, { version: 28 }, { version: 99 }])(
    "canonical corrupt/future records are never converted to a new full account: %j",
    async (stored) => {
      await raw(stored);
      await expect(store()).rejects.toThrow(
        /invalid|missing|newer|unsupported/,
      );
      const db = await openPlayerDatabase();
      const value = await new Promise((resolve) => {
        const tx = db.transaction("player", "readonly");
        const get = tx.objectStore("player").get("main");
        get.onsuccess = () => resolve(get.result);
      });
      db.close();
      expect(value).toEqual(stored);
    },
  );
  it("missing canonical state with a committed mirror requires explicit recovery, preserving spent Warp", async () => {
    const original = await seed();
    const { s } = await store();
    await s.admit(context);
    await s.finish("abandoned", s.account()!.attempt!.id);
    const backup = (await loadPlayerSave()).save;
    s.close();
    await Promise.resolve();
    const db = await openPlayerDatabase();
    await new Promise<void>((resolve) => {
      const tx = db.transaction("player", "readwrite");
      tx.objectStore("player").delete("main");
      tx.oncomplete = () => resolve();
    });
    db.close();
    const { s: rescue, loaded } = await store();
    expect(rescue.canWrite()).toBe(false);
    expect(loaded.mirrorRescue).toBe(true);
    expect(loaded.save.account.warp.current).toBe(90);
    const recovered = await rescue.recover(backup);
    expect(recovered.account.generation).not.toBe(original.account.generation);
    expect(recovered.account.warp.current).toBe(90);
  });
  it("explicit recovery cannot overwrite a valid canonical profile or downgrade a future schema", async () => {
    const backup = await seed();
    const readonly = new AccountTransactions(
      vi.fn(),
      locks as unknown as LockManager,
    );
    stores.push(readonly);
    await expect(readonly.recover(backup)).rejects.toThrow(/valid canonical/);
    await raw({ ...backup, version: 29 });
    await expect(readonly.recover(backup)).rejects.toThrow(/newer/);
    await expect(readonly.recover(backup, true)).rejects.toThrow(/Legacy/);
  });
  it("explicit recovery replaces a corrupt profile only with valid current-version backup data", async () => {
    const backup = await seed((s) => {
      s.account.warp.current = 30;
    });
    await raw({ ...backup, account: null });
    const s = new AccountTransactions(vi.fn(), locks as unknown as LockManager);
    stores.push(s);
    const restored = await s.recover(backup);
    expect(restored.account.warp.current).toBe(30);
    expect(restored.account.attempt).toBeNull();
    expect((await loadPlayerSave()).save.account.generation).toBe(
      restored.account.generation,
    );
  });
  it("backup retry receipts are bound to the whole payload, including currency", async () => {
    await seed();
    const { s, loaded } = await store(),
      intent = s.intent();
    await s.restore(loaded.save, false, intent);
    const changed = structuredClone(loaded.save);
    changed.credits = 200;
    // Restore changed generation; both old callbacks are fenced before any payload can be applied again.
    await expect(s.restore(changed, false, intent)).rejects.toThrow(
      /another tab|different/,
    );
    expect((await loadPlayerSave()).save.credits).toBe(0);
  });
  it("a view callback failure never reports a committed fee as a failed transaction", async () => {
    await seed();
    const { s, published } = await store();
    published.mockImplementation(() => {
      throw new Error("DOM missing");
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => {}),
      intent = s.intent();
    await s.admit(context, intent);
    await s.admit(context, intent);
    expect((await loadPlayerSave()).save.account.warp.current).toBe(90);
    expect(error).toHaveBeenCalled();
  });
  it("future auxiliary profile data is rejected without discarding it or granting migration Warp", async () => {
    const backup = await seed();
    const future = {
      ...backup,
      auxiliary: { expansionV2: { version: 2, completedRuns: 100 } },
    };
    await raw(future);
    await expect(loadPlayerSave()).rejects.toThrow(/newer/);
    expect(parsePlayerSaveJson(JSON.stringify(future)).ok).toBe(false);
  });
  it("a quote confirmed before 04:00 is rejected after reset without spending Crystals", async () => {
    const before = Date.UTC(2026, 9, 3, 20, 59, 59, 999),
      after = before + 1;
    vi.setSystemTime(before);
    await seed((save) => {
      save.account.warp.current = 30;
      save.account.warp.refills = 1;
      save.account.warp.watermarkMs = before;
      save.account.warp.day = gameDay(before);
      save.expansionCurrencies.starCrystal = 100;
    });
    const s = new AccountTransactions(vi.fn(), locks as unknown as LockManager);
    stores.push(s);
    vi.spyOn(s, "now").mockReturnValue(before);
    await s.initialize();
    const quote = s.quote();
    vi.setSystemTime(after);
    vi.spyOn(s, "now").mockReturnValue(after);
    await expect(s.refuel(quote)).rejects.toThrow(/quote changed/);
    expect((await loadPlayerSave()).save.expansionCurrencies.starCrystal).toBe(
      100,
    );
    await s.refuel(s.quote());
    expect((await loadPlayerSave()).save.expansionCurrencies.starCrystal).toBe(
      92,
    );
  });
  it("read-only tabs refresh committed balances through advisory notifications without becoming writers", async () => {
    class Channel {
      static all = new Set<Channel>();
      onmessage: (() => void) | null = null;
      constructor(_name: string) {
        Channel.all.add(this);
      }
      postMessage() {
        for (const channel of Channel.all)
          if (channel !== this) queueMicrotask(() => channel.onmessage?.());
      }
      close() {
        Channel.all.delete(this);
        this.onmessage = null;
      }
    }
    vi.stubGlobal("window", { indexedDB, BroadcastChannel: Channel });
    await seed((save) => {
      save.account.warp.current = 20;
      save.expansionCurrencies.starCrystal = 100;
    });
    const { s: writer } = await store(),
      { s: readonly, published } = await store();
    await writer.refuel(writer.quote());
    await writer.reserveConsent(true);
    await vi.waitFor(() =>
      expect(readonly.account()?.warp).toMatchObject({
        current: 40,
        reserveConsent: true,
      }),
    );
    expect(readonly.canWrite()).toBe(false);
    expect(published).toHaveBeenCalled();
    await expect(readonly.admit(context)).rejects.toThrow(/another tab/);
  });
});
