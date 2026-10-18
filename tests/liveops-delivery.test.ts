import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClaimRequest } from "../src/liveops/claims";
import { LiveOpsController, type LedgerEntry, type LiveOpsHost, type LiveOpsRemote } from "../src/liveops/controller";
import type { LiveOpsReward } from "../src/liveops/policy";
import { createLiveOpsState, rolloverLiveOps, type LiveOpsState } from "../src/liveops/state";
import { gameDay } from "../src/liveops/time";

/** Exactly-once delivery of server-confirmed Daily Hub claims (src/liveops/controller.ts). */

beforeEach(() => {
  vi.stubGlobal("window", { setTimeout, clearTimeout });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function serverState(patch?: (state: LiveOpsState) => void): LiveOpsState {
  const state = rolloverLiveOps(createLiveOpsState(), gameDay(Date.now()));
  patch?.(state);
  return state;
}

type Fake = {
  host: LiveOpsHost;
  remote: LiveOpsRemote;
  currencies: LiveOpsReward[];
  warp: { key: string; amount: number }[];
  ledger: LedgerEntry[];
  claims: ClaimRequest[];
  warpFails: { value: boolean };
  room: { value: number | null };
  claim: { value: (request: ClaimRequest) => Promise<{ state: unknown; reward: LiveOpsReward; key: string; label: string }> };
  state: { value: LiveOpsState };
};

function fake(options: { withRoom?: boolean } = {}): Fake {
  const f = {
    currencies: [] as LiveOpsReward[],
    warp: [] as { key: string; amount: number }[],
    ledger: [] as LedgerEntry[],
    claims: [] as ClaimRequest[],
    warpFails: { value: false },
    room: { value: null as number | null },
    state: { value: serverState() },
    claim: { value: async (_request: ClaimRequest) => ({ state: serverState(), reward: {}, key: "none", label: "none" }) },
  };
  const paidWarp = new Set<string>();
  const host: LiveOpsHost = {
    localNow: () => Date.now(),
    claimBlocker: () => null,
    starCrystals: () => 0,
    spendStarCrystals: () => {},
    grantCurrencies: (reward) => f.currencies.push(reward),
    grantWarp: async (key, amount) => {
      if (f.warpFails.value) throw new Error("Warp tanks are full. Deploy first, then claim.");
      // Like AccountTransactions.giftWarp: a key it has paid is a no-op.
      if (paidWarp.has(key)) return;
      paidWarp.add(key);
      f.warp.push({ key, amount });
    },
    persist: async () => true,
    changed: () => {},
    ...(options.withRoom === true ? { warpRoom: () => f.room.value } : {}),
  };
  const remote: LiveOpsRemote = {
    fetch: async (after) => ({
      state: f.state.value,
      serverTime: Date.now(),
      accountId: "acc",
      ledgerHead: f.ledger.reduce((max, entry) => Math.max(max, entry.id), 10),
      ...(after === undefined ? {} : { ledger: f.ledger.filter((entry) => entry.id > after) }),
    }),
    importLocal: async () => ({ state: f.state.value }),
    claim: (request) => {
      f.claims.push(request);
      return f.claim.value(request);
    },
    progress: async () => ({ state: f.state.value, goalReached: false }),
    goal: async () => ({ state: f.state.value }),
    shield: async () => ({ state: f.state.value, price: 0 }),
    redeem: async () => ({ state: f.state.value, title: "" }),
  };
  return { ...f, host, remote };
}

describe("exactly-once delivery of confirmed claims", () => {
  it("pays currencies at once and keeps the Warp waiting when the tanks are full, then pays it once", async () => {
    const f = fake();
    const controller = new LiveOpsController(f.host);
    await controller.setRemote(f.remote);
    expect(controller.grants()).toMatchObject({ account: "acc", cursor: 10, applied: [], pending: [] });
    f.claim.value = async () => ({ state: serverState(), reward: { credits: 100, warp: 30 }, key: "liveops:mail:gift", label: "Gift" });
    f.warpFails.value = true;
    const outcome = await controller.claim({ kind: "message", id: "gift" });
    expect(outcome).toMatchObject({ ok: true, reward: { credits: 100 }, label: "Gift" });
    expect(outcome.ok && outcome.note).toMatch(/Warp/);
    expect(f.currencies).toEqual([{ credits: 100 }]);
    expect(controller.grants().pending).toEqual([{ key: "liveops:mail:gift", reward: { credits: 100, warp: 30 }, label: "Gift", currenciesPaid: true }]);

    // The save (with the book) is reloaded on another visit; Warp has room now. Loading
    // retries waiting claims by itself (sync), so this returns that same delivery.
    const saved = controller.snapshot();
    const again = new LiveOpsController(f.host);
    f.warpFails.value = false;
    again.load(saved);
    expect((await again.deliverPending()).map((grant) => grant.key)).toEqual(["liveops:mail:gift"]);
    expect(f.warp).toEqual([{ key: "liveops:mail:gift", amount: 30 }]);
    expect(f.currencies).toEqual([{ credits: 100 }]);
    expect(again.grants()).toMatchObject({ applied: ["liveops:mail:gift"], pending: [] });
    expect(await again.deliverPending()).toEqual([]);
  });

  it("recovers a claim whose answer was lost from the ledger, and never pays it twice", async () => {
    const f = fake();
    const controller = new LiveOpsController(f.host);
    await controller.setRemote(f.remote);
    // The server commits, then the connection drops before the answer arrives.
    f.claim.value = async () => {
      f.ledger.push({ id: 11, key: "liveops:newbie:1", source: "liveops:newbie", reward: { credits: 300 } });
      throw Object.assign(new Error("You are offline or the server is unreachable."), { code: "offline" });
    };
    const outcome = await controller.claim({ kind: "newbie" });
    expect(outcome).toMatchObject({ ok: true, reward: { credits: 300 } });
    expect(f.currencies).toEqual([{ credits: 300 }]);
    expect(controller.grants()).toMatchObject({ cursor: 11, applied: ["liveops:newbie:1"], pending: [] });
    // Later visits see nothing new; even a ledger replay is recognised by key.
    await controller.refresh();
    const replay = new LiveOpsController(f.host);
    replay.load({ ...controller.snapshot(), grants: { ...controller.grants(), cursor: 10 } });
    await replay.setRemote(f.remote);
    expect(f.currencies).toEqual([{ credits: 300 }]);
  });

  it("on 'Already claimed' (another tab paid it) applies the ledger row instead", async () => {
    const f = fake();
    const controller = new LiveOpsController(f.host);
    await controller.setRemote(f.remote);
    f.ledger.push({ id: 12, key: "liveops:month:2026-10:1", source: "liveops:monthly", reward: { credits: 120, alloy: 2 } });
    f.ledger.push({ id: 13, key: "liveops:shield:abc", source: "liveops:shield", reward: { shields: 1 } });
    f.claim.value = async () => {
      throw Object.assign(new Error("Already claimed."), { code: "already-claimed" });
    };
    const outcome = await controller.claim({ kind: "monthly" });
    expect(outcome).toMatchObject({ ok: true, reward: { credits: 120, alloy: 2 } });
    expect(f.currencies).toEqual([{ credits: 120, alloy: 2 }]);
    // The shield purchase is not a reward to deliver, but the cursor moves past it.
    expect(controller.grants()).toMatchObject({ cursor: 13, applied: ["liveops:month:2026-10:1"] });
  });

  it("refuses a Warp gift that cannot fit before asking the server", async () => {
    const f = fake({ withRoom: true });
    f.state.value = serverState((state) => {
      state.inbox.push({ id: "mail-x", title: "Warp crate", body: "", reward: { warp: 20 }, day: state.day, expiresDay: -1, claimed: false });
      state.delivered.push("mail-x");
    });
    const controller = new LiveOpsController(f.host);
    await controller.setRemote(f.remote);
    f.room.value = 10;
    const outcome = await controller.claim({ kind: "message", id: "mail-x" });
    expect(outcome.ok).toBe(false);
    expect(outcome.ok ? "" : outcome.reason).toMatch(/Warp tanks are full/);
    expect(f.claims).toEqual([]);
  });

  it("a save first seen with this account (or another account's save) starts counting now, paying nothing old", async () => {
    const f = fake();
    f.ledger.push({ id: 40, key: "liveops:newbie:1", source: "liveops:newbie", reward: { credits: 300 } });
    const controller = new LiveOpsController(f.host);
    controller.load({ ...createLiveOpsState(), grants: { account: "someone-else", cursor: 5, applied: ["k"], pending: [] } });
    await controller.setRemote(f.remote);
    expect(controller.grants()).toEqual({ account: "acc", cursor: 40, applied: [], pending: [] });
    expect(f.currencies).toEqual([]);
  });

  it("sanitizes a damaged delivery book", () => {
    // While the account loads nothing is delivered, so the book can be inspected as loaded.
    const controller = new LiveOpsController({ ...fake().host, claimBlocker: () => "Loading your account…" });
    controller.load({ ...createLiveOpsState(), grants: { account: 5, cursor: -3, applied: ["a", "a", 7], pending: [{ key: "a" }, { key: "b", reward: { credits: -5, alloy: 2 } }, "junk"] } });
    expect(controller.grants()).toEqual({
      account: null,
      cursor: null,
      applied: ["a"],
      pending: [{ key: "b", reward: { alloy: 2 }, label: "Daily Hub reward", currenciesPaid: false }],
    });
  });
});
