import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { AccountTransactions } from "../src/persistence/account-transactions";
import {
  createPlayerSave,
  loadPlayerSave,
  playerSaveTransaction,
} from "../src/persistence/player-save";
import { createDefaultCampaignProgress } from "../src/campaign/progress";
import {
  createAccountState,
  type SortieContext,
} from "../src/persistence/account-state";

const now = Date.UTC(2026, 9, 21);
const context: SortieContext = {
  stage: 1,
  tier: 0,
  activity: "campaign",
  inputMode: "voice",
  gameplayMode: "combat",
  difficulty: "balanced",
  vocabulary: "english-v1",
  contentVersion: "test",
  seed: 42,
};
const locks = {
  async request(
    _name: string,
    _options: unknown,
    callback: (lock: Lock | null) => Promise<void>,
  ) {
    await callback({ name: "account", mode: "exclusive" } as Lock);
  },
} as unknown as LockManager;
let stores: AccountTransactions[];
beforeEach(async () => {
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
  const save = createPlayerSave(
    createDefaultCampaignProgress(),
    new Date(now).toISOString(),
    "migration",
  );
  save.account = createAccountState(now);
  await playerSaveTransaction(() => save);
});
afterEach(async () => {
  stores.forEach((s) => s.close());
  await Promise.resolve();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
async function store() {
  const s = new AccountTransactions(() => {}, locks);
  stores.push(s);
  vi.spyOn(s, "now").mockReturnValue(now);
  await s.initialize();
  return s;
}

describe("a sortie whose stage never started", () => {
  it("goes back to prepared with its Warp, and the next Deploy resumes it free", async () => {
    const s = await store();
    const id = (await s.admit(context)).account.attempt!.id;
    await s.activate(id, context);
    await s.deactivate(id);
    expect(s.account()!.attempt).toMatchObject({ id, phase: "prepared" });
    expect(s.account()!.warp.current).toBe(90);
    expect((await loadPlayerSave()).save.account.attempt?.phase).toBe("prepared");

    await s.admit(context);
    await s.activate(id, context);
    expect(s.account()!.attempt?.phase).toBe("active");
    expect(s.account()!.warp.current).toBe(90);
  });

  it("survives a reload as prepared, where an active sortie would be closed", async () => {
    const first = await store();
    const id = (await first.admit(context)).account.attempt!.id;
    await first.activate(id, context);
    await first.deactivate(id);
    first.close();
    await Promise.resolve();
    const s = await store();
    expect(s.account()!.attempt).toMatchObject({ id, phase: "prepared" });
    expect(s.account()!.warp.current).toBe(90);
  });

  it("only applies to the active sortie it names", async () => {
    const s = await store();
    const id = (await s.admit(context)).account.attempt!.id;
    await expect(s.deactivate(id)).rejects.toThrow("Sortie already closed");
    await s.activate(id, context);
    await expect(s.deactivate("another-sortie")).rejects.toThrow(
      "Sortie already closed",
    );
    expect(s.account()!.attempt?.phase).toBe("active");
  });
});
