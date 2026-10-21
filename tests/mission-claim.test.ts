import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWarpCharge } from "../src/economy/warp-charge";
import { addDeltas, type WalletBalances, type WalletDeltas } from "../src/economy/wallet-rules";
import type { OnlineSession } from "../src/online/session";
import { WalletSync } from "../src/online/wallet-sync";
import {
  createProgressionState,
  missionClaimable,
  recordProgressionEvent,
  type ProgressionState,
} from "../src/progression/missions";
import { claimMissionWithRollback, type MissionClaimHost } from "../src/rewards/mission-claim";
import { CLAIM_NOT_SAVED } from "../src/rewards/reward-claim";

/** Mission claims (src/rewards/mission-claim.ts) against a small account, and against the client wallet. */

const REWARD = 150; // clear-5 (tests/missions.test.ts)
type Recovery = { snapshot: string };
type Account = { progression: ProgressionState; credits: number; recovery: Recovery };

function clearedFive(): ProgressionState {
  let progression = createProgressionState();
  for (let clear = 0; clear < 5; clear += 1) {
    progression = recordProgressionEvent(progression, { type: "stage-clear", accuracy: 90 });
  }
  return progression;
}

/** The game's side of a claim; the save rewrites the crash-recovery snapshot first, as autosaveCampaign does. */
function host(account: Account, save: (account: Account) => Promise<boolean> = async () => true) {
  const calls = { hints: [] as { source: string; opId?: string }[], saved: [] as string[], locked: false };
  const claimHost: MissionClaimHost<Recovery> = {
    blocker: () => (calls.locked ? "Saving… try again in a moment." : null),
    lock: (held) => {
      calls.locked = held;
    },
    read: () => ({ progression: account.progression, credits: account.credits, recovery: account.recovery }),
    write: (next) => {
      ({ progression: account.progression, credits: account.credits, recovery: account.recovery } = next);
    },
    hint: (source, opId) => {
      calls.hints.push(opId === undefined ? { source } : { source, opId });
    },
    save: async (message) => {
      calls.saved.push(message);
      account.recovery = { snapshot: "with the claim" };
      return save(account);
    },
    render: () => undefined,
  };
  return { claimHost, calls };
}

describe("mission claim", () => {
  it("keeps the claimed mark and its Credits once saved, under the mission's opId", async () => {
    const account: Account = { progression: clearedFive(), credits: 500, recovery: { snapshot: "before" } };
    const { claimHost, calls } = host(account);

    await expect(claimMissionWithRollback(claimHost, "clear-5")).resolves.toEqual({ ok: true });
    expect(account.credits).toBe(500 + REWARD);
    expect(missionClaimable(account.progression, "clear-5")).toBe(false);
    expect(calls.hints).toEqual([{ source: "mission", opId: "mission:clear-5" }]);
    expect(calls.saved).toEqual(["✓ Mission reward · +150 Credits"]);
    expect(calls.locked).toBe(false);
  });

  it("does nothing for a mission with nothing to claim, or while another claim saves", async () => {
    const account: Account = { progression: createProgressionState(), credits: 500, recovery: { snapshot: "before" } };
    const unclaimable = host(account);
    await expect(claimMissionWithRollback(unclaimable.claimHost, "clear-5")).resolves.toBeNull();

    account.progression = clearedFive();
    const blocked = host(account);
    blocked.calls.locked = true;
    await expect(claimMissionWithRollback(blocked.claimHost, "clear-5")).resolves.toEqual({
      ok: false,
      reason: "Saving… try again in a moment.",
    });
    expect(account.credits).toBe(500);
    expect(blocked.calls.hints).toEqual([]);
  });

  it("a failed save leaves the mission claimable and puts back the recovery snapshot the save rewrote", async () => {
    const account: Account = { progression: clearedFive(), credits: 500, recovery: { snapshot: "before" } };
    const { claimHost, calls } = host(account, async () => false);

    await expect(claimMissionWithRollback(claimHost, "clear-5")).resolves.toEqual({ ok: false, reason: CLAIM_NOT_SAVED });
    expect(account.credits).toBe(500);
    expect(missionClaimable(account.progression, "clear-5")).toBe(true);
    expect(account.recovery).toEqual({ snapshot: "before" });
    expect(calls.hints.at(-1)).toEqual({ source: "other" });
    expect(calls.locked).toBe(false);
  });

  it("a failed save takes back only the reward, keeping a server balance adopted while it saved", async () => {
    const account: Account = { progression: clearedFive(), credits: 500, recovery: { snapshot: "before" } };
    const { claimHost } = host(account, async (saving) => {
      // WalletSync.adoptBalances: the server's 2,000 plus what is not reported yet (the reward).
      saving.credits = 2_000 + REWARD;
      return false;
    });

    await claimMissionWithRollback(claimHost, "clear-5");
    expect(account.credits).toBe(2_000);
  });
});

describe("mission claim with the server wallet", () => {
  const ZERO: WalletBalances = { credits: 0, alloy: 0, starCrystal: 0, quantumCore: 0 };

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  /** A server that credits each earning opId once (cloud/src/wallet.ts mutate). */
  function walletAgainst(account: Account) {
    const server = { balances: { ...ZERO, credits: account.credits }, seen: new Set<string>(), earns: [] as Record<string, unknown>[] };
    const view = () => ({ phase: 3, balances: { ...server.balances }, warp: createWarpCharge(0), warpPending: 0, held: [], sortie: null, maxStage: 1, earnedToday: {}, dailyCap: {}, flagged: 0, version: 1, serverTime: 0 });
    const memory = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
      removeItem: (key: string) => memory.delete(key),
    });
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      const body = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
      if (url.endsWith("/wallet/op") && body.kind === "earn") {
        server.earns.push(body);
        const opId = String(body.opId);
        if (!server.seen.has(opId)) server.balances = addDeltas(server.balances, body.deltas as WalletDeltas);
        server.seen.add(opId);
      }
      return new Response(JSON.stringify(view()), { status: 200, headers: { "content-type": "application/json" } });
    });
    const listeners: (() => void)[] = [];
    const session = { online: true, account: { id: "acc" }, onChange: (fn: () => void) => listeners.push(fn) } as unknown as OnlineSession;
    const balances = (): WalletBalances => ({ ...ZERO, credits: account.credits });
    const sync = new WalletSync(session, {
      committedBalances: balances,
      liveBalances: balances,
      localWarp: () => null,
      highestStage: () => 1,
      adoptBalances: async (adopted) => {
        account.credits = adopted.credits;
      },
      adoptWarp: async () => undefined,
      sortieActive: () => false,
      lastSortieWords: () => 0,
      notice: () => undefined,
      changed: () => undefined,
    });
    const commit = (): void => {
      sync.onCommitted({ credits: account.credits, expansionCurrencies: { alloy: 0, starCrystal: 0, quantumCore: 0 }, account: { attempt: null, receipts: [] } });
    };
    const open = async (): Promise<void> => {
      listeners.forEach((fn) => fn());
      await vi.advanceTimersByTimeAsync(50);
    };
    return { sync, server, commit, open };
  }

  it("a claim whose save failed leaves no mission opId for the next earning, so its real claim is credited", async () => {
    const account: Account = { progression: clearedFive(), credits: 500, recovery: { snapshot: "before" } };
    const wallet = walletAgainst(account);
    await wallet.open();
    const claimHost = (save: () => Promise<boolean>): MissionClaimHost<Recovery> => ({
      ...host(account).claimHost,
      hint: (source, opId) => wallet.sync.hint(source, opId),
      save,
    });

    await claimMissionWithRollback(claimHost(async () => false), "clear-5");
    // An unrelated earning (an Expedition, say) is the next committed save.
    account.credits += 40;
    wallet.commit();
    await vi.advanceTimersByTimeAsync(50);
    expect(wallet.server.earns.at(-1)).toMatchObject({ source: "other", deltas: { credits: 40 } });
    expect(wallet.server.earns.at(-1)?.opId).not.toBe("mission:clear-5");

    await expect(
      claimMissionWithRollback(claimHost(async () => {
        wallet.commit();
        return true;
      }), "clear-5"),
    ).resolves.toEqual({ ok: true });
    await vi.advanceTimersByTimeAsync(50);
    expect(wallet.server.earns.at(-1)).toMatchObject({ opId: "mission:clear-5", source: "mission", deltas: { credits: REWARD } });
    expect(wallet.server.balances.credits).toBe(500 + 40 + REWARD);
    expect(account.credits).toBe(500 + 40 + REWARD);
  });
});
