import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWarpCharge, type WarpCharge } from "../src/economy/warp-charge";
import { addDeltas, type WalletBalances, type WalletDeltas } from "../src/economy/wallet-rules";
import type { OnlineSession } from "../src/online/session";
import { WALLET_DEVICE_KEY, WalletSync, type CommittedSave } from "../src/online/wallet-sync";

/** The game's side of the server wallet (src/online/wallet-sync.ts) against a small fake server. */

const NOW = Date.UTC(2026, 9, 17, 3, 0);
type Call = { path: string; body: Record<string, unknown> };

function fakeServer(start: WalletBalances, phase = 3) {
  const state = { balances: { ...start }, warp: createWarpCharge(NOW) as WarpCharge, seen: new Set<string>(), spends: new Map<string, WalletDeltas>(), offline: false, decay: 1, loseSpendReply: false, confirmed: new Set<string>(), openFailures: 0, rateLimited: false, reconciled: false };
  const calls: Call[] = [];
  const view = (extra: Record<string, unknown> = {}) => ({ phase, balances: { ...state.balances }, warp: state.warp, warpPending: 0, held: [], sortie: null, maxStage: 1, earnedToday: {}, dailyCap: {}, flagged: 0, version: 1, serverTime: NOW, reconciled: state.reconciled, ...extra });
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    const path = url.replace("/api/account", "");
    const body = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
    calls.push({ path, body });
    if (state.offline) throw new TypeError("Failed to fetch");
    if (path === "/wallet/op" && state.rateLimited) return json(429, { error: "rate-limited", message: "Retry later" });
    const opId = String(body.opId ?? "");
    if (opId !== "" && state.seen.has(opId)) return json(200, view({ duplicate: true }));
    if (opId !== "") state.seen.add(opId);
    if (path === "/wallet/open" && state.openFailures > 0) {
      state.openFailures -= 1;
      return json(503, { error: "unavailable", message: "Try again" });
    }
    if (path === "/wallet/open" || path === "/wallet") return json(200, view());
    if (path === "/wallet/op" && body.kind === "refund" && state.confirmed.has(String(body.spendOpId))) {
      return json(409, { error: "purchase-saved", message: "This purchase was already saved." });
    }
    if (path === "/wallet/op" && body.kind === "spend") {
      const costs = body.deltas as WalletDeltas;
      if ((costs.credits ?? 0) > state.balances.credits) return json(409, { error: "insufficient", message: "Not enough" });
      state.balances = addDeltas(state.balances, { credits: -(costs.credits ?? 0) });
      state.spends.set(opId, costs);
      if (state.loseSpendReply) { state.loseSpendReply = false; throw new TypeError("Lost response after debit"); }
      return json(200, view());
    }
    if (path === "/wallet/op" && body.kind === "earn") {
      const gains = body.deltas as WalletDeltas;
      const applied = { credits: Math.floor((gains.credits ?? 0) * state.decay) };
      state.balances = addDeltas(state.balances, applied);
      return json(200, view({ applied }));
    }
    if (path === "/wallet/op" && body.kind === "refund") {
      state.balances = addDeltas(state.balances, state.spends.get(String(body.spendOpId)) ?? {});
      state.spends.delete(String(body.spendOpId));
      return json(200, view());
    }
    if (path === "/wallet/op" && body.kind === "confirm") {
      state.spends.delete(String(body.spendOpId));
      return json(200, view());
    }
    if (path === "/wallet/sortie") {
      const finish = body.finish as { earnings: WalletDeltas } | undefined;
      if (finish) state.balances = addDeltas(state.balances, { credits: Math.floor((finish.earnings.credits ?? 0) * state.decay) });
      if (body.start) state.warp = { ...state.warp, current: state.warp.current - 10 };
      return json(200, view());
    }
    return json(404, { error: "not-found" });
  });
  return { state, calls, fetch };
}

function setup(local: WalletBalances, server: ReturnType<typeof fakeServer>, stored?: unknown) {
  const memory = new Map<string, string>();
  if (stored !== undefined) memory.set("spaceTypingWalletV1:acc", JSON.stringify(stored));
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
    removeItem: (key: string) => memory.delete(key),
  });
  vi.stubGlobal("fetch", server.fetch);
  const listeners: (() => void)[] = [];
  const session = { online: true, account: { id: "acc" }, onChange: (fn: () => void) => listeners.push(fn) } as unknown as OnlineSession & { online: boolean };
  const game = { balances: { ...local }, warp: null as WarpCharge | null, active: false, notices: [] as string[], receipts: new Set<string>(), generation: null as string | null, lessonRewards: [] as {day:number;tier:"three"|"five"}[] };
  const sync = new WalletSync(session, {
    committedBalances: () => ({ ...game.balances }),
    liveBalances: () => ({ ...game.balances }),
    localWarp: () => null,
    highestStage: () => 1,
    adoptBalances: async (balances) => {
      game.balances = { ...balances };
    },
    adoptWarp: async (warp) => {
      game.warp = warp;
    },
    sortieActive: () => game.active,
    lastSortieWords: () => 40,
    notice: (text) => game.notices.push(text),
    changed: () => {},
    hasPurchaseReceipt: (id) => game.receipts.has(id),
    saveGeneration: () => game.generation,
    lessonRewards: () => game.lessonRewards,
  });
  const commit = (attempt: { id: string; stage: number } | null = null, cleared = false): void => {
    const save: CommittedSave = {
      credits: game.balances.credits,
      expansionCurrencies: { alloy: game.balances.alloy, starCrystal: game.balances.starCrystal, quantumCore: game.balances.quantumCore },
      account: { attempt: attempt === null ? null : { id: attempt.id, context: { stage: attempt.stage } }, receipts: cleared && attempt === null ? [{ id: "a1:clear" }] : [] },
    };
    sync.onCommitted(save);
  };
  const open = async () => {
    listeners.forEach((fn) => fn());
    await vi.advanceTimersByTimeAsync(50);
  };
  return { sync, session, game, commit, open, memory };
}

const ZERO = { credits: 0, alloy: 0, starCrystal: 0, quantumCore: 0 };

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("server wallet on the client", () => {
  it("ignores a Daily Hub response belonging to the previous account", async () => {
    const t = setup({ ...ZERO, credits: 500 }, fakeServer({ ...ZERO, credits: 500 }));
    await t.open();
    await t.sync.acceptView({ ...t.sync.view!, accountId: "old-account", balances: { ...ZERO, credits: 9000 }, version: 99 });
    expect(t.game.balances.credits).toBe(500);
  });
  it("does not recover a purchase still being saved when the wallet opens again", async () => {
    const server = fakeServer({ ...ZERO, credits: 500 });
    const t = setup({ ...ZERO, credits: 500 }, server);
    await t.open();
    await t.sync.spend({ credits: 100 }, "shop:test");
    await (t.sync as unknown as { open(id: string): Promise<void> }).open("acc");
    expect(server.calls.some(c => c.body.kind === "refund")).toBe(false);
    t.game.balances.credits -= 100;
    t.commit();
    await t.sync.settle();
    expect(server.calls.some(c => c.body.kind === "confirm")).toBe(true);
  });
  it("keeps rate-limited earnings and retries the same operation", async () => {
    const server = fakeServer({ ...ZERO });
    const t = setup({ ...ZERO }, server);
    await t.open();
    server.state.rateLimited = true;
    t.game.balances.credits += 50;
    t.commit();
    await vi.advanceTimersByTimeAsync(50);
    expect(JSON.parse(t.memory.get("spaceTypingWalletV1:acc")!).queue).toHaveLength(1);
    server.state.rateLimited = false;
    await vi.advanceTimersByTimeAsync(16_000);
    expect(server.state.balances.credits).toBe(50);
    const ids = server.calls.filter(c => c.body.kind === "earn").map(c => c.body.opId);
    expect(new Set(ids).size).toBe(1);
  });
  it("persists an uncertain sortie start and reuses its id after reload", async () => {
    const server = fakeServer({ ...ZERO });
    const t = setup({ ...ZERO }, server);
    await t.open();
    server.state.offline = true;
    await expect(t.sync.startSortie("original", 1, "campaign", false)).rejects.toThrow();
    const journal = JSON.parse(t.memory.get("spaceTypingWalletV1:acc")!);
    server.state.offline = false;
    const reloaded = setup({ ...ZERO }, server, journal);
    await reloaded.open();
    expect(reloaded.sync.startAttemptId("new-id", 1, "campaign")).toBe("original");
    await reloaded.sync.startSortie("original", 1, "campaign", false);
    expect(server.calls.filter(c => c.path === "/wallet/sortie").every(c => c.body.opId === "start:original")).toBe(true);
  });
  it("reports persisted offline lesson rewards under each day's fixed id", async () => {
    const server = fakeServer({ ...ZERO, credits: 100 });
    const t = setup({ ...ZERO, credits: 650, starCrystal: 2 }, server, { reported: { ...ZERO, credits: 100 }, queue: [] });
    t.game.lessonRewards = [{ day: 20380, tier: "three" }, { day: 20381, tier: "five" }];
    await t.open();
    t.commit();
    await vi.advanceTimersByTimeAsync(100);
    expect(server.calls.filter(c => c.body.kind === "earn").map(c => c.body.opId)).toEqual(["lessons:20380:three", "lessons:20381:five"]);
  });
  it("discards pre-rollback reporting gaps after server reconciliation", async () => {
    const server = fakeServer({ ...ZERO, credits: 900 });
    server.state.reconciled = true;
    const t = setup({ ...ZERO, credits: 900 }, server, { reported: { ...ZERO, credits: 100 }, queue: [] });
    await t.open();
    t.commit();
    await vi.advanceTimersByTimeAsync(50);
    expect(server.calls.some(c => c.body.kind === "earn")).toBe(false);
  });
  it("refuses a debit when its recovery journal cannot be written", async () => {
    const server = fakeServer({ ...ZERO, credits: 500 });
    const t = setup({ ...ZERO, credits: 500 }, server);
    await t.open();
    vi.stubGlobal("localStorage", { getItem: (key: string) => t.memory.get(key) ?? null, setItem: () => { throw new Error("Storage full"); } });
    expect(await t.sync.spend({ credits: 100 }, "shop:test")).toMatchObject({ ok: false });
    expect(server.state.balances.credits).toBe(500);
    expect(server.calls.some(c => c.body.kind === "spend")).toBe(false);
  });

  it("does not fall back to local purchases when an online wallet fails to open", async () => {
    const server = fakeServer({ ...ZERO, credits: 500 });
    server.state.offline = true;
    const t = setup({ ...ZERO, credits: 500 }, server);
    await t.open();
    expect(await t.sync.spend({ credits: 100 }, "shop:test")).toMatchObject({ ok: false });
    server.state.offline = false;
    await t.sync.accountReady();
    expect(t.sync.authoritative()).toBe(true);
  });

  it("retries a lost purchase response with the same id and debits once", async () => {
    const server = fakeServer({ ...ZERO, credits: 500 });
    const t = setup({ ...ZERO, credits: 500 }, server);
    await t.open();
    server.state.loseSpendReply = true;
    expect(await t.sync.spend({ credits: 100 }, "shop:test")).toMatchObject({ ok: true });
    expect(server.state.balances.credits).toBe(400);
    const calls = server.calls.filter((c) => c.body.kind === "spend");
    expect(calls).toHaveLength(2);
    expect(calls[0]!.body.opId).toBe(calls[1]!.body.opId);
  });

  it("refunds an interrupted purchase on reload when no item receipt was saved", async () => {
    const server = fakeServer({ ...ZERO, credits: 400 });
    server.state.spends.set("spend-crash", { credits: 100 });
    const t = setup({ ...ZERO, credits: 500 }, server, { reported: { ...ZERO, credits: 400 }, queue: [], purchase: { id: "spend-crash", costs: { credits: 100 } } });
    await t.open();
    expect(server.state.balances.credits).toBe(500);
    expect(t.game.balances.credits).toBe(500);
    expect(server.calls.some((c) => c.body.kind === "refund")).toBe(true);
  });

  it("confirms rather than refunds a purchase whose item and receipt were saved", async () => {
    const server = fakeServer({ ...ZERO, credits: 400 });
    server.state.spends.set("spend-saved", { credits: 100 });
    const t = setup({ ...ZERO, credits: 400 }, server, { reported: { ...ZERO, credits: 400 }, queue: [], purchase: { id: "spend-saved", costs: { credits: 100 } } });
    t.game.receipts.add("spend-saved");
    await t.open();
    expect(server.state.balances.credits).toBe(400);
    expect(server.calls.some((c) => c.body.kind === "confirm")).toBe(true);
    expect(server.calls.some((c) => c.body.kind === "refund")).toBe(false);
  });

  it("drops the journal when the server says the purchase was already saved, so later spends are not blocked", async () => {
    const server = fakeServer({ ...ZERO, credits: 400 });
    server.state.confirmed.add("spend-lost");
    // The confirm reply was lost and the save was then replaced: no receipt, so the game asks for a refund.
    const t = setup({ ...ZERO, credits: 400 }, server, { reported: { ...ZERO, credits: 400 }, queue: [], purchase: { id: "spend-lost", costs: { credits: 100 } } });
    await t.open();
    expect(server.calls.some((c) => c.body.kind === "refund")).toBe(true);
    expect(server.state.balances.credits).toBe(400);
    expect(await t.sync.spend({ credits: 50 }, "shop:test")).toMatchObject({ ok: true });
    expect(JSON.parse(t.memory.get("spaceTypingWalletV1:acc") ?? "{}").purchase?.id).not.toBe("spend-lost");
  });

  it("a replaced local save (cloud or backup restore) is not reported again as an earning", async () => {
    // The server already holds 800, including 400 reported from another device.
    const server = fakeServer({ ...ZERO, credits: 800 });
    const t = setup({ ...ZERO, credits: 800 }, server, { reported: { ...ZERO, credits: 400 }, queue: [], generation: "before-restore" });
    t.game.generation = "after-restore";
    await t.open();
    t.commit();
    await vi.advanceTimersByTimeAsync(50);
    expect(server.calls.some((c) => c.path === "/wallet/op" && c.body.kind === "earn")).toBe(false);
    expect(server.state.balances.credits).toBe(800);
    expect(t.game.balances.credits).toBe(800);
    expect(JSON.parse(t.memory.get("spaceTypingWalletV1:acc") ?? "{}").generation).toBe("after-restore");
  });

  it("does not seed a new wallet from a save that followed another account's wallet", async () => {
    const server = fakeServer({ ...ZERO });
    const t = setup({ ...ZERO, credits: 5000 }, server);
    t.memory.set(WALLET_DEVICE_KEY, "registered-account");
    await t.open();
    expect(server.calls.find((c) => c.path === "/wallet/open")?.body.seed).toEqual({});
    expect(t.game.balances.credits).toBe(0);
    expect(t.memory.get(WALLET_DEVICE_KEY)).toBe("acc");
  });

  it("retries a failed wallet open instead of blocking Campaign until a reload", async () => {
    const server = fakeServer({ ...ZERO, credits: 500 });
    server.state.openFailures = 1;
    const t = setup({ ...ZERO, credits: 500 }, server);
    await t.open();
    expect(t.sync.authoritative()).toBe(false);
    await vi.advanceTimersByTimeAsync(6_000);
    expect(t.sync.authoritative()).toBe(true);
    expect(t.sync.blocker()).toBeNull();
  });

  it("the server's balances and Warp become the game's on the first sync", async () => {
    const server = fakeServer({ ...ZERO, credits: 500 });
    const t = setup({ ...ZERO, credits: 700 }, server);
    await t.open();
    expect(t.game.balances.credits).toBe(500);
    expect(t.game.warp?.current).toBe(100);
    expect(t.memory.get(WALLET_DEVICE_KEY)).toBe("acc");
  });

  it("a purchase is paid on the server first and nothing is counted twice", async () => {
    const server = fakeServer({ ...ZERO, credits: 500 });
    const t = setup({ ...ZERO, credits: 500 }, server);
    await t.open();
    expect(await t.sync.spend({ credits: 100 }, "shop:test")).toMatchObject({ ok: true });
    t.game.balances.credits -= 100; // The game applies the purchase and saves.
    t.commit();
    await t.sync.settle();
    await vi.advanceTimersByTimeAsync(50);
    expect(server.state.balances.credits).toBe(400);
    expect(t.game.balances.credits).toBe(400);
    expect(server.calls.filter((call) => call.path === "/wallet/op" && call.body.kind === "spend")).toHaveLength(1);
    expect(await t.sync.spend({ credits: 9999 }, "shop:test")).toMatchObject({ ok: false });
  });

  it("a sortie starts on the server and its earnings are reported when it ends; the server's answer wins", async () => {
    const server = fakeServer({ ...ZERO, credits: 100 });
    const t = setup({ ...ZERO, credits: 100 }, server);
    await t.open();
    await t.sync.startSortie("a1", 3, "campaign", false);
    t.commit({ id: "a1", stage: 3 });
    t.game.balances.credits += 300; // Earned in the sortie.
    server.state.decay = 0.5; // e.g. over the daily cap
    t.commit(null, true);
    await vi.advanceTimersByTimeAsync(50);
    const finish = server.calls.find((call) => call.path === "/wallet/sortie" && call.body.finish !== undefined);
    expect(finish?.body.finish).toMatchObject({ attemptId: "a1", stage: 3, outcome: "cleared", words: 40, earnings: { credits: 300 } });
    expect(server.state.balances.credits).toBe(250);
    expect(t.game.balances.credits).toBe(250);
    expect(t.game.warp?.current).toBe(90);
  });

  it("other earnings carry their hint (fixed Daily Lessons opId)", async () => {
    const server = fakeServer({ ...ZERO });
    const t = setup({ ...ZERO }, server);
    await t.open();
    t.sync.hint("lessons", "lessons:20380:five");
    t.game.balances.credits += 400;
    t.commit();
    await vi.advanceTimersByTimeAsync(50);
    expect(server.calls.find((call) => call.path === "/wallet/op")?.body).toMatchObject({ kind: "earn", opId: "lessons:20380:five", source: "lessons", deltas: { credits: 400 } });
    expect(t.game.balances.credits).toBe(400);
  });

  it("offline, a report waits and goes again with the same opId; Campaign and shops are blocked", async () => {
    const server = fakeServer({ ...ZERO });
    const t = setup({ ...ZERO }, server);
    await t.open();
    server.state.offline = true;
    t.game.balances.credits += 50;
    t.commit();
    await vi.advanceTimersByTimeAsync(50);
    server.state.offline = false;
    await vi.advanceTimersByTimeAsync(16_000);
    const earns = server.calls.filter((call) => call.path === "/wallet/op" && call.body.kind === "earn");
    expect(earns.length).toBeGreaterThanOrEqual(2);
    expect(new Set(earns.map((call) => call.body.opId)).size).toBe(1);
    expect(server.state.balances.credits).toBe(50);
    (t.session as unknown as { online: boolean }).online = false;
    expect(t.sync.blocker()).toMatch(/need a connection/);
    expect(await t.sync.spend({ credits: 1 }, "shop:test")).toMatchObject({ ok: false });
    await expect(t.sync.startSortie("a2", 1, "campaign", false)).rejects.toThrow(/need a connection/);
  });

  it("a device that never had a server wallet keeps the old offline path", () => {
    const t = setup({ ...ZERO }, fakeServer({ ...ZERO }));
    (t.session as unknown as { online: boolean }).online = false;
    expect(t.sync.blocker()).toBeNull();
  });

  it("phase 1 (shadow) reports but never changes the game's balances", async () => {
    const server = fakeServer({ ...ZERO, credits: 10 }, 1);
    const t = setup({ ...ZERO, credits: 999 }, server);
    await t.open();
    expect(t.game.balances.credits).toBe(999);
    t.game.balances.credits += 1;
    t.commit();
    await vi.advanceTimersByTimeAsync(50);
    expect(t.game.balances.credits).toBe(1000);
    expect(server.calls.some((call) => call.path === "/wallet/op")).toBe(true);
  });
});
