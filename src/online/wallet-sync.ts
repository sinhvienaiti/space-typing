import type { WarpCharge } from "../economy/warp-charge";
import { LESSON_REWARDS } from "../lessons/chain";
import type { WalletPurchase } from "../economy/wallet-price";
import {
  addDeltas,
  diffBalances,
  isEmptyDeltas,
  sanitizeBalances,
  WALLET_CURRENCIES,
  type WalletBalances,
  type WalletDeltas,
} from "../economy/wallet-rules";
import { onlineRequest, OnlineError } from "./api";
import type { OnlineSession } from "./session";

/**
 * The game's side of the server wallet (cloud/src/wallet.ts).
 *
 * The game keeps its own economy code; money changes reach the server as
 * operations with an opId (a retry never counts twice):
 * - purchases ask first (`spend`); the server refuses what its balance
 *   cannot cover (phase ≥ 2). A purchase that then fails to save is
 *   given back (`refund`);
 * - a sortie starts on the server (`startSortie`, which spends its Warp);
 *   its earnings (the difference of the committed balances) are reported
 *   when it ends, and checked from phase 3;
 * - any other change shows up as a difference at the next committed save
 *   and is reported as an earning (`hint()` names its source);
 * - phase ≥ 2: every server answer replaces the game's balances and Warp
 *   with the server's, plus what the game earned since and has not
 *   reported yet. Phase 1 only reports (shadow).
 *
 * Without the API (offline, or local dev without the Worker) nothing here
 * runs and the local economy works as before. A device that has had a
 * server wallet (phase ≥ 2) cannot start Campaign sorties or buy offline.
 *
 * Bookkeeping: `reported` is the local balance the server knows about;
 * each queued op carries `reports`, the local balance it accounts for.
 */
export type WalletView = {
  accountId?: string;
  phase: number;
  balances: WalletBalances;
  warp: WarpCharge;
  warpPending: number;
  held: { key: string; label: string; reward: WalletDeltas & { warp?: number } }[];
  sortie: { id: string; stage: number } | null;
  maxStage: number;
  earnedToday: WalletBalances;
  dailyCap: WalletBalances;
  flagged: number;
  version: number;
  serverTime: number;
  applied?: WalletDeltas;
  decayed?: string[];
  flags?: string[];
  duplicate?: boolean;
  price?: number;
  reconciled?: boolean;
};

export type WalletHost = {
  /** Balances of the latest committed save (null before the account loaded). */
  committedBalances(): WalletBalances | null;
  /** Balances the game holds right now. */
  liveBalances(): WalletBalances | null;
  /** The game's Warp (seed of a device's first wallet). */
  localWarp(): WarpCharge | null;
  /** Highest unlocked stage (seed of a device's first wallet). */
  highestStage(): number;
  /** Replace the game's balances and save quietly (no change: nothing to do). */
  adoptBalances(balances: WalletBalances): Promise<void>;
  /** Replace the game's Warp with the server's. */
  adoptWarp(warp: WarpCharge): Promise<void>;
  /** A sortie is prepared or in progress. */
  sortieActive(): boolean;
  /** Words typed correctly in the sortie that just ended. */
  lastSortieWords(): number;
  notice(text: string): void;
  changed(): void;
  /** Stored in the same canonical save as the purchased item. */
  hasPurchaseReceipt?(id: string): boolean;
  /** Identity of the local save; it changes when the save is replaced (cloud or backup restore). */
  saveGeneration?(): string | null;
  lessonRewards?(): { day: number; tier: "three" | "five" }[];
};

type QueuedOp = { path: "/wallet/op" | "/wallet/sortie"; body: Record<string, unknown>; reports: WalletBalances };
type PendingPurchase = { id: string; costs: WalletDeltas };
type PendingStart = { attemptId: string; stage: number; activity: string; reserveConsent: boolean };
type Stored = { reported: WalletBalances; queue: QueuedOp[]; purchase?: PendingPurchase; refuelId?: string; refuelQuote?: { index: number; price: number }; start?: PendingStart; lessonClaims?: string[]; generation?: string };
export type SpendResult = { ok: true; opId: string | null } | { ok: false; reason: string };

/** The account id of the last server wallet (phase ≥ 2) on this device. */
export const WALLET_DEVICE_KEY = "spaceTypingWalletDeviceV1";
const MAX_QUEUE = 20;
/** A failed /wallet/open is retried after this, doubling up to REOPEN_MAX_MS. */
const REOPEN_FIRST_MS = 5_000;
const REOPEN_MAX_MS = 120_000;

function storageKey(accountId: string): string {
  return "spaceTypingWalletV1:" + accountId;
}

export function newOpId(prefix: string): string {
  const random = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return prefix + "-" + random;
}

function positive(deltas: WalletDeltas): WalletDeltas {
  const out: WalletDeltas = {};
  for (const key of WALLET_CURRENCIES) if ((deltas[key] ?? 0) > 0) out[key] = deltas[key];
  return out;
}

function negate(deltas: WalletDeltas): WalletDeltas {
  const out: WalletDeltas = {};
  for (const key of WALLET_CURRENCIES) if (deltas[key]) out[key] = -deltas[key]!;
  return out;
}

export type CommittedSave = {
  credits: number;
  expansionCurrencies: { alloy: number; starCrystal: number; quantumCore: number };
  account: { attempt: { id: string; context: { stage: number } } | null; receipts: { id: string }[] };
};

export class WalletSync {
  view: WalletView | null = null;
  private accountId: string | null = null;
  private reported: WalletBalances | null = null;
  private queue: QueuedOp[] = [];
  private sending: Promise<void> | null = null;
  private nextHint: { source: string; opId?: string } | null = null;
  private lastAttempt: { id: string; stage: number } | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private epoch = 0;
  private opening = false;
  private disabled = false;
  private pendingPurchase: PendingPurchase | undefined;
  private purchaseInFlight = false;
  private pendingStart: PendingStart | undefined;
  private lessonClaims: string[] = [];
  private pendingRefuelQuote: { index: number; price: number } | undefined;
  private pendingRefuel: string | undefined;
  private actionBusy = false;
  private reopenTimer: ReturnType<typeof setTimeout> | null = null;
  private reopenDelay = REOPEN_FIRST_MS;

  constructor(
    private readonly session: OnlineSession,
    private readonly host: WalletHost,
  ) {
    session.onChange(() => void this.attach());
  }

  phase(): number {
    return this.view?.phase ?? 0;
  }

  /** Phase ≥ 2 and connected: the server's balances, Warp and claims count. */
  authoritative(): boolean {
    return this.view !== null && this.view.phase >= 2 && this.session.online;
  }

  /** Why Campaign or a purchase cannot run now (offline with a server wallet), or null. */
  blocker(): string | null {
    if (this.opening) return "Loading your server wallet. Please try again in a moment.";
    if (this.session.online && this.view !== null) return null;
    if (this.session.online && !this.disabled) return "Your server wallet is unavailable. Reconnect before spending; free practice is still available.";
    let known: string | null = null;
    try {
      known = localStorage.getItem(WALLET_DEVICE_KEY);
    } catch {
      known = null;
    }
    return known === null
      ? null
      : "Your wallet is on the server: Campaign and shops need a connection. Practice, Recall review and Daily Lessons work offline.";
  }

  heldCount(): number {
    return this.view?.held.length ?? 0;
  }

  /** Names the source (and opId) of the next earning found at a committed save. */
  hint(source: string, id?: string): void {
    this.nextHint = { source, ...(id === undefined ? {} : { opId: id }) };
  }

  private load(accountId: string): Stored | null {
    try {
      const raw = JSON.parse(localStorage.getItem(storageKey(accountId)) ?? "null") as Partial<Stored> | null;
      if (raw === null || typeof raw !== "object") return null;
      return { reported: sanitizeBalances(raw.reported), queue: Array.isArray(raw.queue) ? raw.queue.slice(0, MAX_QUEUE) : [],
        ...(typeof raw.purchase?.id === "string" ? { purchase: { id: raw.purchase.id, costs: sanitizeBalances(raw.purchase.costs) } } : {}),
        ...(typeof raw.refuelId === "string" ? { refuelId: raw.refuelId } : {}),
        ...(raw.refuelQuote ? { refuelQuote: raw.refuelQuote } : {}),
        ...(typeof raw.start?.attemptId === "string" ? { start: raw.start } : {}),
        lessonClaims: Array.isArray(raw.lessonClaims) ? raw.lessonClaims.filter(x => typeof x === "string").slice(-180) : [],
        ...(typeof raw.generation === "string" ? { generation: raw.generation } : {}) };
    } catch {
      return null;
    }
  }

  private store(): boolean {
    if (this.accountId === null || this.reported === null) return false;
    try {
      localStorage.setItem(storageKey(this.accountId), JSON.stringify({ reported: this.reported, queue: this.queue, purchase: this.pendingPurchase, refuelId: this.pendingRefuel, refuelQuote: this.pendingRefuelQuote, start: this.pendingStart, lessonClaims: this.lessonClaims, generation: this.host.saveGeneration?.() ?? undefined }));
      return true;
    } catch {
      return false;
    }
  }

  private async attach(): Promise<void> {
    const account = this.session.account;
    if (!this.session.online || account === null) {
      this.epoch++;
      this.accountId = null;
      this.view = null;
      this.opening = false;
      this.queue = [];
      this.sending = null;
      this.actionBusy = false;
      this.purchaseInFlight = false;
      if (this.retryTimer !== null) clearTimeout(this.retryTimer);
      this.retryTimer = null;
      this.clearReopen();
      this.host.changed();
      return;
    }
    if (account.id === this.accountId && (this.opening || this.view !== null || this.disabled)) return;
    // The first wallet of a device is seeded from its balances: wait until the account has loaded.
    if (this.host.committedBalances() === null) return;
    this.accountId = account.id;
    this.purchaseInFlight = false;
    this.epoch++;
    this.opening = true;
    this.disabled = false;
    this.actionBusy = false;
    this.sending = null;
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.view = null;
    this.reported = null;
    this.queue = [];
    const epoch = this.epoch;
    try { await this.open(account.id); }
    finally { if (epoch === this.epoch) { this.opening = false; this.host.changed(); } }
  }

  /** The local account finished loading (call once persistence is ready). */
  accountReady(): Promise<void> {
    return this.attach();
  }

  /** One failed open (5xx, timeout) must not block Campaign and shops until a reload. */
  private scheduleReopen(): void {
    if (this.reopenTimer !== null || typeof setTimeout !== "function") return;
    const delay = this.reopenDelay;
    this.reopenDelay = Math.min(REOPEN_MAX_MS, delay * 2);
    this.reopenTimer = setTimeout(() => {
      this.reopenTimer = null;
      if (this.view === null && !this.disabled && this.session.online) void this.attach();
    }, delay);
  }

  private clearReopen(): void {
    if (this.reopenTimer !== null) clearTimeout(this.reopenTimer);
    this.reopenTimer = null;
    this.reopenDelay = REOPEN_FIRST_MS;
  }

  private async open(accountId: string): Promise<void> {
    if ((this.purchaseInFlight || this.actionBusy) && this.accountId === accountId) return;
    const epoch = this.epoch;
    const local = this.host.committedBalances();
    let lastDeviceWallet: string | null = null;
    try {
      lastDeviceWallet = localStorage.getItem(WALLET_DEVICE_KEY);
    } catch {
      lastDeviceWallet = null;
    }
    // This save last followed another account's server wallet (shared device,
    // "Sign out" to a new guest): its balances are that account's, not a seed.
    const otherWallet = lastDeviceWallet !== null && lastDeviceWallet !== accountId;
    let view: WalletView;
    try {
      view = await onlineRequest<WalletView>("/wallet/open", {
        body: { seed: local === null || otherWallet ? {} : { balances: local, warp: this.host.localWarp(), stage: this.host.highestStage() } },
      });
    } catch (error) {
      if (epoch !== this.epoch) return;
      if (error instanceof OnlineError && error.code === "wallet-off") {
        this.disabled = true;
        // Phase 0: the server wallet is off; offline play needs no connection either.
        try {
          localStorage.removeItem(WALLET_DEVICE_KEY);
        } catch {
          /* Nothing stored. */
        }
      } else {
        this.host.notice("Server wallet unavailable · free practice remains available");
        this.scheduleReopen();
      }
      return;
    }
    this.reopenDelay = REOPEN_FIRST_MS;
    if (this.accountId !== accountId || epoch !== this.epoch) return;
    const stored = this.load(accountId);
    const generation = this.host.saveGeneration?.() ?? null;
    // The local save was replaced (cloud or backup restore) or another wallet
    // has written into it since: what this account reported no longer
    // describes it, so its gap must not be reported again as an earning.
    const replaced =
      stored !== null &&
      (view.reconciled === true || otherWallet || (stored.generation !== undefined && generation !== null && stored.generation !== generation));
    this.queue = replaced ? [] : stored?.queue ?? [];
    this.pendingPurchase = stored?.purchase;
    this.pendingRefuel = stored?.refuelId;
    this.pendingRefuelQuote = stored?.refuelQuote;
    this.pendingStart = replaced ? undefined : stored?.start;
    this.lessonClaims = stored?.lessonClaims ?? [];
    // First wallet of this account on this device: what the game holds is what the server was given.
    this.reported = replaced ? local ?? view.balances : stored?.reported ?? local ?? view.balances;
    if (view.phase >= 2) {
      try {
        localStorage.setItem(WALLET_DEVICE_KEY, accountId);
      } catch {
        /* Not remembered: an offline start keeps the old local path. */
      }
    }
    // Earned here but never reported (offline, closed tab): reported at the next commit.
    if (stored !== null && !replaced) this.hint("resync");
    // Resolve an interrupted debit before publishing a balance or accepting another purchase.
    this.view = view;
    if (this.pendingPurchase && !this.purchaseInFlight) {
      this.reported = local ?? view.balances;
      if (!(await this.recoverPurchase())) return;
      view = this.view ?? view;
    }
    if (epoch !== this.epoch) return;
    await this.adopt(view, true);
    await this.flush();
  }

  /** The server's balances (and Warp) become the game's, keeping what is not reported yet. */
  private async adopt(view: WalletView, includeWarp: boolean): Promise<void> {
    const epoch = this.epoch;
    if (view.accountId !== undefined && view.accountId !== this.accountId) return;
    if (this.view !== null && view.version < this.view.version) return;
    this.view = view;
    if (view.phase < 2 || this.reported === null) {
      this.host.changed();
      return;
    }
    const old = this.reported;
    // Queued ops move with the new baseline (what they add stays the same).
    for (const op of this.queue) op.reports = addDeltas(view.balances, diffBalances(op.reports, old));
    this.reported = view.balances;
    const live = this.host.liveBalances();
    this.store();
    if (live !== null) await this.host.adoptBalances(addDeltas(view.balances, diffBalances(live, old)));
    if (epoch !== this.epoch) return;
    if (includeWarp && !this.host.sortieActive()) await this.host.adoptWarp(view.warp);
    this.host.changed();
  }

  /** A save was committed: report what changed since the last report. */
  onCommitted(save: CommittedSave): void {
    if (this.view === null || this.reported === null || this.accountId === null) return;
    const attempt = save.account.attempt;
    if (attempt !== null) {
      if (this.pendingStart?.attemptId === attempt.id) { this.pendingStart = undefined; this.store(); }
      this.lastAttempt = { id: attempt.id, stage: attempt.context.stage };
      return; // A sortie's earnings are reported when it ends.
    }
    const local = sanitizeBalances({ credits: save.credits, ...save.expansionCurrencies });
    let base = this.queue.length > 0 ? this.queue[this.queue.length - 1]!.reports : this.reported;
    const ended = this.lastAttempt;
    this.lastAttempt = null;
    if (ended !== null) {
      const drift = diffBalances(local, base);
      const cleared = save.account.receipts.some((receipt) => receipt.id === ended.id + ":clear");
      this.enqueue("/wallet/sortie", {
        opId: newOpId("sortie"),
        finish: { attemptId: ended.id, stage: ended.stage, outcome: cleared ? "cleared" : "failed", words: this.host.lastSortieWords(), earnings: positive(drift) },
      }, local);
      this.nextHint = null;
      return;
    }
    // Canonical, saved lesson receipts survive offline day rollover. Never fold these into resync.
    for (const reward of this.host.lessonRewards?.() ?? []) {
      if (this.queue.length >= MAX_QUEUE) break;
      const id = "lessons:" + reward.day + ":" + reward.tier;
      if (this.lessonClaims.includes(id) || this.queue.some(op => op.body.opId === id)) continue;
      const amount = LESSON_REWARDS[reward.tier];
      const gap = diffBalances(local, base);
      if ((gap.credits ?? 0) < amount.credits || (gap.starCrystal ?? 0) < amount.starCrystal) continue;
      base = addDeltas(base, amount);
      this.lessonClaims = [...this.lessonClaims, id].slice(-180);
      this.enqueue("/wallet/op", { kind: "earn", opId: id, source: "lessons", deltas: amount }, base);
    }
    const drift = diffBalances(local, base);
    if (isEmptyDeltas(drift)) return;
    const gains = positive(drift);
    const costs = positive(negate(drift));
    if (!isEmptyDeltas(costs)) {
      // A spend the game did not ask for first (phase 1, or a path without `spend`).
      this.enqueue("/wallet/op", { kind: "spend", opId: newOpId("spend"), source: "unasked", deltas: costs }, addDeltas(base, negate(costs)));
    }
    if (!isEmptyDeltas(gains)) {
      const hint = this.nextHint;
      this.enqueue("/wallet/op", { kind: "earn", opId: hint?.opId ?? newOpId("earn"), source: hint?.source ?? "other", deltas: gains }, local);
    }
    this.nextHint = null;
  }

  private enqueue(path: QueuedOp["path"], body: Record<string, unknown>, reports: WalletBalances): void {
    if (this.queue.length >= MAX_QUEUE) return; // Offline for long: the rest is found at a later commit.
    this.queue.push({ path, body, reports });
    this.store();
    void this.flush();
  }

  /** Sends queued ops in order (the same opId until confirmed). */
  private flush(): Promise<void> {
    if (this.sending !== null) return this.sending;
    if (this.queue.length === 0 || !this.session.online || this.view === null) return Promise.resolve();
    const epoch = this.epoch;
    this.sending = (async () => {
      while (epoch === this.epoch && this.queue.length > 0 && this.session.online) {
        const op = this.queue[0]!;
        try {
          const view = await onlineRequest<WalletView>(op.path, { body: op.body });
          if (epoch !== this.epoch) return;
          this.queue.shift();
          this.reported = op.reports;
          this.report(view);
          await this.adopt(view, op.path === "/wallet/sortie");
        } catch (error) {
          if (epoch !== this.epoch) return;
          if (error instanceof OnlineError && error.status >= 400 && error.status < 500 && error.status !== 429 && error.code !== "busy") {
            // Refused for good: drop it; the server's balances follow.
            this.queue.shift();
            this.reported = op.reports;
            this.store();
            await this.refresh();
            continue;
          }
          // Network or server trouble: keep it; the same opId goes again later.
          if (this.retryTimer === null) {
            this.retryTimer = setTimeout(() => {
              this.retryTimer = null;
              void this.flush();
            }, 15_000);
          }
          break;
        }
      }
      if (epoch === this.epoch) this.store();
    })().finally(() => {
      if (epoch === this.epoch) this.sending = null;
    });
    return this.sending;
  }

  private report(view: WalletView): void {
    if (view.decayed !== undefined && view.decayed.length > 0) this.host.notice("Daily earning limit reached · more rewards today are reduced");
    if (view.flags?.some((code) => code === "sortie-too-fast" || code === "typing-too-fast")) this.host.notice("That sortie looked too fast · its reward was reduced");
  }

  /** The server's balances again (after a refusal, or when the Daily Hub opens). */
  async refresh(): Promise<void> {
    if (this.view === null) return;
    const epoch = this.epoch;
    try {
      const view = await onlineRequest<WalletView>("/wallet");
      if (epoch === this.epoch) await this.adopt(view, true);
    } catch {
      /* Keep the last view. */
    }
  }

  /** A server answer that carries the wallet (Daily Hub claim, streak shield). */
  async acceptView(view: WalletView | undefined): Promise<void> {
    if (view === undefined || this.view === null) return;
    if (view.accountId !== undefined && view.accountId !== this.accountId) return;
    const epoch = this.epoch;
    await this.flush();
    if (epoch !== this.epoch) return;
    await this.adopt(view, true);
  }

  /** Before a purchase: the server takes the price (phase ≥ 2) or refuses. */
  async spend(costs: WalletDeltas, sourceName: string, purchase?: WalletPurchase): Promise<SpendResult> {
    const blocked = this.blocker();
    if (blocked !== null) return { ok: false, reason: blocked };
    if (!this.authoritative() || isEmptyDeltas(costs)) return { ok: true, opId: null };
    if (this.actionBusy) return { ok: false, reason: "A wallet operation is already running." };
    if (this.purchaseInFlight) return { ok: false, reason: "A purchase is still saving." };
    this.actionBusy = true;
    const epoch = this.epoch;
    await this.flush();
    if (epoch !== this.epoch) return { ok: false, reason: "The account changed. Reopen the shop." };
    if (this.queue.length > 0 || !(await this.recoverPurchase())) {
      this.actionBusy = false;
      return { ok: false, reason: "A wallet operation is waiting for a connection. Please retry." };
    }
    const id = newOpId("spend");
    this.pendingPurchase = { id, costs: { ...costs } };
    if (!this.store()) {
      this.pendingPurchase = undefined;
      this.actionBusy = false;
      return { ok: false, reason: "Purchase recovery storage is unavailable. Allow local storage before buying." };
    }
    try {
      const view = await this.requestAction("/wallet/op", { kind: "spend", opId: id, source: sourceName, deltas: costs, purchase }, epoch);
      // The game applies the purchase itself next: its price is already reported.
      this.reported = addDeltas(this.reported ?? view.balances, negate(costs));
      this.view = view;
      this.purchaseInFlight = true;
      this.store();
      return { ok: true, opId: id };
    } catch (error) {
      if (epoch !== this.epoch) return { ok: false, reason: "The account changed. Reopen the shop." };
      await this.recoverPurchase();
      if (error instanceof OnlineError && error.code === "insufficient") {
        await this.refresh();
        return { ok: false, reason: "Not enough on your account · balances updated from the server." };
      }
      return { ok: false, reason: error instanceof Error ? error.message : "Could not reach the server." };
    } finally {
      if (epoch === this.epoch) this.actionBusy = false;
    }
  }

  /** The purchase saved: take the server's balances. */
  async settle(): Promise<void> {
    this.purchaseInFlight = false;
    if (this.authoritative() && this.view !== null) {
      if (this.pendingPurchase) await this.recoverPurchase(true);
      else await this.adopt(this.view, false);
    }
  }

  /** The purchase could not be saved after the server took its price: give it back. */
  async refund(spendOpId: string | null, costs: WalletDeltas): Promise<void> {
    this.purchaseInFlight = false;
    if (spendOpId === null || this.reported === null) return;
    this.reported = addDeltas(this.reported, costs);
    this.store();
    this.pendingPurchase = { id: spendOpId, costs };
    this.store();
    await this.recoverPurchase(false);
  }

  /** Same opId on an uncertain response; late replies can never write into another account. */
  private async requestAction(path: string, body: Record<string, unknown>, epoch: number): Promise<WalletView> {
    for (let attempt = 0; ; attempt++) {
      if (epoch !== this.epoch) throw new Error("The account changed.");
      try {
        const view = await onlineRequest<WalletView>(path, { body });
        if (epoch !== this.epoch) throw new Error("The account changed.");
        return view;
      } catch (error) {
        if (epoch !== this.epoch || attempt >= 1 || !(error instanceof OnlineError) || (error.status >= 400 && error.status < 500 && error.code !== "busy")) throw error;
      }
    }
  }

  private async recoverPurchase(saved?: boolean): Promise<boolean> {
    if (this.purchaseInFlight) return false;
    const pending = this.pendingPurchase;
    if (!pending) return true;
    const epoch = this.epoch;
    const kind = (saved ?? this.host.hasPurchaseReceipt?.(pending.id) ?? false) ? "confirm" : "refund";
    try {
      const view = await this.requestAction("/wallet/op", { kind, opId: kind + ":" + pending.id, spendOpId: pending.id }, epoch);
      this.pendingPurchase = undefined;
      this.store();
      await this.adopt(view, false);
      return true;
    } catch (error) {
      if (epoch !== this.epoch) return false;
      // The server already settled this purchase the other way (a refund after a
      // confirm, or a confirm after a refund/cancel): there is nothing left to
      // recover, and retrying would block every later spend and sortie.
      if (error instanceof OnlineError && (error.code === "purchase-saved" || error.code === "purchase-missing")) {
        this.pendingPurchase = undefined;
        this.store();
        await this.refresh();
        return true;
      }
      this.host.notice("Purchase recovery is waiting for a connection. Reopen the game to retry.");
      return false;
    }
  }

  /** Starts a sortie on the server (it spends the Warp). Throws with a message when refused. */
  startAttemptId(proposedId: string, stage: number, activity: string): string {
    if (!this.pendingStart) return proposedId;
    if (this.pendingStart.stage !== stage || this.pendingStart.activity !== activity) throw new Error("Retry the pending Campaign stage before starting another sortie.");
    return this.pendingStart.attemptId;
  }

  async startSortie(attemptId: string, stage: number, activity: string, reserveConsent: boolean): Promise<WarpCharge | null> {
    const blocked = this.blocker();
    if (blocked !== null) throw new Error(blocked);
    if (this.view === null) return null;
    if (this.actionBusy) throw new Error("A wallet operation is already running.");
    this.actionBusy = true;
    const epoch = this.epoch;
    try {
      await this.flush();
      if (epoch !== this.epoch) throw new Error("The account changed.");
      if (this.queue.length > 0 || !(await this.recoverPurchase())) throw new Error("Previous wallet operations are still waiting for a connection.");
      const id = this.startAttemptId(attemptId, stage, activity);
      this.pendingStart ??= { attemptId: id, stage, activity, reserveConsent };
      if (!this.store()) throw new Error("Sortie recovery storage is unavailable.");
      const view = await this.requestAction("/wallet/sortie", { opId: "start:" + id, start: this.pendingStart }, epoch);
      this.view = view;
      this.lastAttempt = { id, stage };
      return view.phase >= 2 ? view.warp : null;
    } catch (error) {
      if (epoch !== this.epoch) throw new Error("The account changed.");
      if (this.phase() < 2) return null; // Shadow never blocks.
      if (error instanceof OnlineError && error.status >= 400 && error.status < 500 && error.status !== 429 && error.code !== "busy") {
        this.pendingStart = undefined;
        this.store();
      }
      if (error instanceof OnlineError && error.code === "no-warp") {
        await this.refresh();
        throw new Error(error.message + " · Warp updated from the server");
      }
      throw new Error((error instanceof Error ? error.message : "Could not reach the server") + " · reconnect to check Warp before retrying");
    } finally {
      if (epoch === this.epoch) this.actionBusy = false;
    }
  }

  /** Refuel +20 Warp on the server (phase ≥ 2). */
  async refuel(quote: { index: number; price: number }): Promise<{ price: number; warp: WarpCharge; starCrystal: number }> {
    const blocked = this.blocker();
    if (blocked !== null) throw new Error(blocked);
    if (this.actionBusy) throw new Error("A wallet operation is already running.");
    this.actionBusy = true;
    const epoch = this.epoch;
    try {
      await this.flush();
      if (epoch !== this.epoch) throw new Error("The account changed.");
      if (this.queue.length > 0 || !(await this.recoverPurchase())) throw new Error("Previous wallet operations are still waiting for a connection.");
      this.pendingRefuel ??= newOpId("refuel");
      this.pendingRefuelQuote ??= { index: quote.index, price: quote.price };
      if (!this.store()) throw new Error("Refuel recovery storage is unavailable. Allow local storage before refueling.");
      const view = await this.requestAction("/wallet/refuel", { opId: this.pendingRefuel, quote: this.pendingRefuelQuote }, epoch);
      this.pendingRefuel = undefined;
      this.pendingRefuelQuote = undefined;
      this.store();
      await this.adopt(view, true);
      return { price: view.price ?? 0, warp: view.warp, starCrystal: view.balances.starCrystal };
    } catch (error) {
      if (epoch === this.epoch && error instanceof OnlineError && error.status >= 400 && error.status < 500 && error.status !== 429 && error.code !== "busy") {
        this.pendingRefuel = undefined;
        this.pendingRefuelQuote = undefined;
        this.store();
        await this.refresh();
      }
      throw error;
    } finally {
      if (epoch === this.epoch) this.actionBusy = false;
    }
  }
}
