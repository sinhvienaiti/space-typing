import { runClaim, type ClaimRequest } from "./claims";
import { LIVE_OPS_POLICY, type DailyGoal, type LiveOpsReward } from "./policy";
import { activeRuntimeMessages, liveOpsNow } from "./runtime";
import {
  buyStreakShield,
  createLiveOpsState,
  deliverMessages,
  liveOpsBadges,
  recordLiveOps,
  rolloverLiveOps,
  sanitizeLiveOpsState,
  sanitizeReward,
  setDailyGoal,
  type LiveOpsBadges,
  type LiveOpsProgress,
  type LiveOpsState,
} from "./state";
import { gameDay } from "./time";

/**
 * Owns the Daily Hub state for the page.
 *
 * Offline (no online session): the rules run here on the account clock,
 * exactly as before.
 * Online: the server (cloud/src/liveops.ts) is the authority. Claims, goal,
 * shields and gift codes are server calls; play progress is shown at once
 * and sent in batches (every minute, and on flushNow()); the server's state
 * replaces the local copy.
 *
 * Rewards: currencies go into the save the host autosaves; Warp goes through
 * a keyed account transaction (paid once per key).
 *
 * Exactly-once delivery (online): a claim the server confirmed is recorded
 * in a small delivery book that is saved with the Daily Hub (and so travels
 * with the save to other devices). A save holds a confirmed reward exactly
 * when its key is in `book.applied`. If the Warp part cannot be added yet
 * (tanks full, mid-sortie) the claim stays in `book.pending` and is retried
 * on the hangar screen. If the answer was lost (timeout, closed tab), the
 * server's ledger rows after `book.cursor` (GET /liveops?after=…) bring it
 * back on the next hub visit, and it is applied by key.
 */
export type LiveOpsHost = {
  localNow(): number;
  claimBlocker(): string | null;
  starCrystals(): number;
  spendStarCrystals(amount: number): void;
  grantCurrencies(reward: LiveOpsReward): void;
  grantWarp(key: string, amount: number): Promise<void>;
  persist(message: string): Promise<boolean>;
  changed(): void;
  /**
   * Free Warp tank space right now (Active + Reserve), or null when unknown.
   * Optional: with it, a Warp gift that cannot fit is refused before the
   * server is asked, and waiting gifts are retried as soon as they fit.
   */
  warpRoom?(): number | null;
  /**
   * Server wallet (phase ≥ 2): a claim or shield answer carries the wallet,
   * which the host adopts instead of paying the reward itself.
   */
  adoptWallet?(view: unknown): Promise<void>;
};

/** One reward_ledger row (cloud/src/liveops.ts). */
export type LedgerEntry = { id: number; key: string; source?: string; reward: unknown };

export type LiveOpsFetch = {
  state: unknown;
  serverTime: number;
  accountId?: string;
  /** Newest ledger id of the account (where a save starts tracking). */
  ledgerHead?: number;
  /** Ledger rows after the `after` id that was sent, oldest first. */
  ledger?: LedgerEntry[];
  /** ≥ 2: claims are paid into the server wallet (no ledger replay on the client). */
  walletPhase?: number;
};

export type LiveOpsRemote = {
  fetch(after?: number): Promise<LiveOpsFetch>;
  importLocal(state: LiveOpsState): Promise<{ state: unknown }>;
  claim(request: ClaimRequest): Promise<{ state: unknown; reward: LiveOpsReward; key: string; label: string; wallet?: unknown; held?: boolean }>;
  progress(progress: LiveOpsProgress, options?: { keepalive?: boolean }): Promise<{ state: unknown; goalReached: boolean }>;
  goal(goal: DailyGoal): Promise<{ state: unknown }>;
  shield(starCrystals: number): Promise<{ state: unknown; price: number; wallet?: unknown }>;
  redeem(code: string): Promise<{ state: unknown; title: string }>;
};

/** `note`: part of the reward follows later (e.g. Warp when the tanks have room). */
export type ClaimOutcome =
  | { ok: true; reward: LiveOpsReward; label: string; note?: string }
  | { ok: false; reason: string };

/** A claim the server confirmed that is not (fully) in this save yet. */
export type PendingGrant = {
  key: string;
  reward: LiveOpsReward;
  label: string;
  /** Credits and other currencies already added (only Warp is still waiting). */
  currenciesPaid: boolean;
};

/**
 * Saved as `grants` next to the Daily Hub state (save.auxiliary.liveOps).
 * - account: whose ledger `cursor` points into;
 * - cursor: last ledger id this save has looked at (null: not tracking yet);
 * - applied: keys of confirmed rewards already in this save (newest last);
 * - pending: confirmed rewards still to apply.
 */
export type GrantBook = { account: string | null; cursor: number | null; applied: string[]; pending: PendingGrant[] };

const PROGRESS_FLUSH_MS = 60_000;
const MAX_APPLIED = 300;
const MAX_PENDING = 50;
/** Without warpRoom(), a waiting Warp gift is retried this often on the hangar screen. */
const RETRY_MS = 5 * 60_000;
const RECOVERED_LABEL = "Daily Hub reward";

export function createGrantBook(): GrantBook {
  return { account: null, cursor: null, applied: [], pending: [] };
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function sanitizeGrantBook(value: unknown): GrantBook {
  const raw = asObject(value);
  if (raw === null) return createGrantBook();
  const applied = Array.isArray(raw.applied)
    ? [...new Set(raw.applied.filter((key): key is string => typeof key === "string" && key.length > 0 && key.length <= 160))].slice(-MAX_APPLIED)
    : [];
  const pending: PendingGrant[] = [];
  for (const item of Array.isArray(raw.pending) ? raw.pending : []) {
    const entry = asObject(item);
    if (entry === null || typeof entry.key !== "string" || entry.key.length === 0 || entry.key.length > 160) continue;
    if (applied.includes(entry.key) || pending.some((grant) => grant.key === entry.key)) continue;
    pending.push({
      key: entry.key,
      reward: sanitizeReward(entry.reward),
      label: typeof entry.label === "string" ? entry.label.slice(0, 120) : RECOVERED_LABEL,
      currenciesPaid: entry.currenciesPaid === true,
    });
  }
  return {
    account: typeof raw.account === "string" && raw.account.length <= 64 ? raw.account : null,
    cursor: typeof raw.cursor === "number" && Number.isSafeInteger(raw.cursor) && raw.cursor >= 0 ? raw.cursor : null,
    applied,
    pending: pending.slice(-MAX_PENDING),
  };
}

function addProgress(into: LiveOpsProgress, more: LiveOpsProgress): void {
  for (const [key, value] of Object.entries(more)) {
    if (typeof value === "number" && value > 0) (into as Record<string, number>)[key] = ((into as Record<string, number>)[key] ?? 0) + value;
  }
}

function withoutWarp(reward: LiveOpsReward): LiveOpsReward {
  const { warp: _warp, ...rest } = reward;
  return rest;
}

function sumRewards(grants: readonly PendingGrant[]): LiveOpsReward {
  const total: Record<string, number> = {};
  for (const grant of grants) {
    for (const [key, value] of Object.entries(grant.reward)) if (typeof value === "number") total[key] = (total[key] ?? 0) + value;
  }
  return total as LiveOpsReward;
}

/** The server may have paid this claim already (lost answer, another tab): worth checking the ledger. */
function mayBePaid(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  const message = error instanceof Error ? error.message : "";
  return code === "already-claimed" || code === "offline" || /already/i.test(message);
}

export class LiveOpsController {
  private current: LiveOpsState = createLiveOpsState();
  private book: GrantBook = createGrantBook();
  private claiming = false;
  private dirty = false;
  private remote: LiveOpsRemote | null = null;
  private serverOffset = 0;
  private pending: LiveOpsProgress = {};
  private flushTimer = 0;
  private flushing: Promise<void> | null = null;
  private delivering: Promise<PendingGrant[]> | null = null;
  private lastRetryAt = 0;
  private listening = false;
  /** The server pays claims into its wallet (GET /liveops walletPhase ≥ 2). */
  private walletMode = false;

  constructor(private readonly host: LiveOpsHost) {}

  now(): number {
    return this.remote !== null ? Date.now() + this.serverOffset : liveOpsNow(this.host.localNow());
  }

  today(): number {
    return gameDay(this.now());
  }

  state(): LiveOpsState {
    return this.current;
  }

  isOnline(): boolean {
    return this.remote !== null;
  }

  /** What the save stores: the hub state plus the delivery book. */
  snapshot(): LiveOpsState & { grants: GrantBook } {
    return { ...structuredClone(this.current), grants: structuredClone(this.book) };
  }

  /** Confirmed claims waiting to be applied (for tests and diagnostics). */
  grants(): GrantBook {
    return structuredClone(this.book);
  }

  load(value: unknown): void {
    // The delivery book belongs to the save being loaded, online or not.
    this.book = sanitizeGrantBook(asObject(value)?.grants);
    if (this.remote !== null) return;
    this.current = sanitizeLiveOpsState(value);
    this.sync();
  }

  isDirty(): boolean {
    return this.dirty;
  }

  markSaved(): void {
    this.dirty = false;
  }

  /**
   * Switches to the server (or back to local with null). The first time an
   * account goes online, its offline Daily Hub is offered to the server,
   * which keeps it only if it has none yet.
   */
  async setRemote(remote: LiveOpsRemote | null): Promise<void> {
    this.remote = remote;
    if (remote === null) return;
    this.listenForPageHide();
    try {
      const sentAt = Date.now();
      await remote.importLocal(this.current);
      const fetched = await remote.fetch(this.book.cursor ?? undefined);
      this.serverOffset = fetched.serverTime - (sentAt + Date.now()) / 2;
      this.adopt(fetched.state);
      this.reconcile(fetched);
      await this.deliverPending();
    } catch {
      // Stay online for claims; the next refresh retries.
    }
  }

  private adopt(state: unknown): void {
    this.current = sanitizeLiveOpsState(state);
    // Re-apply progress made while a request was in flight.
    if (Object.keys(this.pending).length > 0) this.current = recordLiveOps(this.current, this.pending, this.today()).state;
    this.dirty = true;
    this.host.changed();
  }

  /**
   * Compares the server's ledger with this save's delivery book and queues
   * every confirmed reward the save does not hold yet. A save seen for the
   * first time with this account starts counting at the newest ledger row:
   * nothing paid before is paid again.
   */
  private reconcile(fetched: LiveOpsFetch): void {
    if (typeof fetched.ledgerHead !== "number") return; // A server without delivery tracking.
    const account = typeof fetched.accountId === "string" ? fetched.accountId : null;
    const book = this.book;
    // Server wallet: claims are paid there, so the client never replays ledger rows; keep the cursor current.
    const walletMode = (fetched.walletPhase ?? 0) >= 2;
    this.walletMode = walletMode;
    if (book.account !== account || book.cursor === null || walletMode) {
      if (book.account === account && book.cursor === fetched.ledgerHead) return;
      this.book = { account, cursor: fetched.ledgerHead, applied: book.account === account ? book.applied : [], pending: book.pending };
      this.dirty = true;
      return;
    }
    let cursor = book.cursor;
    for (const entry of fetched.ledger ?? []) {
      if (!Number.isSafeInteger(entry.id) || entry.id <= cursor) continue;
      cursor = entry.id;
      // Shield purchases are spends the client already made; other sources are not Daily Hub claims.
      if (typeof entry.key !== "string" || entry.source === "liveops:shield" || (entry.source !== undefined && !entry.source.startsWith("liveops:"))) continue;
      if (book.applied.includes(entry.key) || book.pending.some((grant) => grant.key === entry.key)) continue;
      book.pending.push({ key: entry.key, reward: sanitizeReward(entry.reward), label: RECOVERED_LABEL, currenciesPaid: false });
    }
    if (cursor !== book.cursor) {
      book.cursor = cursor;
      this.dirty = true;
    }
  }

  /** The pending entry for a confirmed claim (new or already queued), or null if the save holds it. */
  private enqueue(key: string, reward: LiveOpsReward, label: string): PendingGrant | null {
    if (this.book.applied.includes(key)) return null;
    const queued = this.book.pending.find((grant) => grant.key === key);
    if (queued !== undefined) return queued;
    const grant: PendingGrant = { key, reward, label, currenciesPaid: false };
    this.book.pending.push(grant);
    this.dirty = true;
    return grant;
  }

  /**
   * Applies one confirmed claim. Currencies once (flag set in the same
   * synchronous step, so any autosave holds both or neither); Warp by key
   * (the account transaction ignores a key it has paid). Returns true when
   * the claim is fully in the save.
   */
  private async applyGrant(grant: PendingGrant): Promise<boolean> {
    const { warp, shields: _shields, ...currencies } = grant.reward;
    if (!grant.currenciesPaid) {
      this.host.grantCurrencies(currencies);
      grant.currenciesPaid = true;
      this.dirty = true;
    }
    if (warp !== undefined && warp > 0) {
      const room = this.host.warpRoom?.() ?? null;
      if (room !== null && room < warp) return false;
      try {
        await this.host.grantWarp(grant.key, warp);
      } catch {
        return false;
      }
    }
    this.book.pending = this.book.pending.filter((item) => item.key !== grant.key);
    if (!this.book.applied.includes(grant.key)) this.book.applied = [...this.book.applied, grant.key].slice(-MAX_APPLIED);
    this.dirty = true;
    return true;
  }

  /** Applies every pending claim that can be applied now, then saves once. */
  deliverPending(): Promise<PendingGrant[]> {
    if (this.delivering !== null) return this.delivering;
    if (this.book.pending.length === 0 || this.host.claimBlocker() !== null) return Promise.resolve([]);
    this.delivering = (async () => {
      const delivered: PendingGrant[] = [];
      let changed = false;
      for (const grant of [...this.book.pending]) {
        const paidBefore = grant.currenciesPaid;
        if (await this.applyGrant(grant)) delivered.push(grant);
        if (delivered.includes(grant) || grant.currenciesPaid !== paidBefore) changed = true;
      }
      this.lastRetryAt = Date.now();
      if (changed) {
        this.dirty = true;
        const message = delivered.length > 0 ? "✓ " + delivered.map((grant) => grant.label).join(" · ") : "✓ Reward saved · Warp follows when your tanks have room";
        if (await this.host.persist(message)) this.dirty = false;
        this.host.changed();
      }
      return delivered;
    })().finally(() => {
      this.delivering = null;
    });
    return this.delivering;
  }

  /** On the hangar screen (sync), retry waiting claims when they may fit now. */
  private retryPending(): void {
    if (this.book.pending.length === 0 || this.delivering !== null) return;
    const room = this.host.warpRoom?.() ?? null;
    const due = this.book.pending.some(
      (grant) => !grant.currenciesPaid || (room !== null ? room >= (grant.reward.warp ?? 0) : Date.now() - this.lastRetryAt >= RETRY_MS),
    );
    if (due) void this.deliverPending();
  }

  /** Online: flush progress, fetch the hub and the ledger, apply what the save misses. */
  private async syncServer(): Promise<PendingGrant[]> {
    const remote = this.remote;
    if (remote === null) return [];
    try {
      await this.flush();
      const fetched = await remote.fetch(this.book.cursor ?? undefined);
      this.adopt(fetched.state);
      this.reconcile(fetched);
      return await this.deliverPending();
    } catch {
      return [];
    }
  }

  /** Online: fetch the server's current state (the hub calls this when it opens). */
  async refresh(): Promise<void> {
    if (this.remote === null) {
      this.sync();
      return;
    }
    await this.syncServer();
  }

  /** Offline: turns the day and drops in Admin runtime mail. Both: retries waiting claims. */
  sync(): boolean {
    this.retryPending();
    if (this.remote !== null) {
      // Online the server turns the day; locally just keep the view current.
      const day = this.today();
      if (day > this.current.day) {
        this.current = rolloverLiveOps(this.current, day);
        this.host.changed();
        void this.refresh();
        return true;
      }
      return false;
    }
    const now = this.now();
    const day = gameDay(now);
    let next = rolloverLiveOps(this.current, day);
    next = deliverMessages(next, activeRuntimeMessages(now), day);
    if (next === this.current) return false;
    this.current = next;
    this.dirty = true;
    this.host.changed();
    return true;
  }

  badges(): LiveOpsBadges {
    return liveOpsBadges(this.current, this.today(), this.now());
  }

  /** Adds progress; returns whether the daily goal was reached just now. */
  record(progress: LiveOpsProgress): boolean {
    this.sync();
    const result = recordLiveOps(this.current, progress, this.today());
    if (result.state === this.current) return false;
    this.current = result.state;
    this.dirty = true;
    if (this.remote !== null) {
      addProgress(this.pending, progress);
      if (this.flushTimer === 0) this.flushTimer = window.setTimeout(() => void this.flush(), PROGRESS_FLUSH_MS);
    }
    if (result.goalReached) this.host.changed();
    return result.goalReached;
  }

  /**
   * Sends batched play progress now: call at the end of a stage. With
   * `keepalive` the request survives the page closing (pagehide; the
   * controller already does this itself once it is online).
   */
  flushNow(options: { keepalive?: boolean } = {}): Promise<void> {
    return this.flush(options);
  }

  /** Sends batched play progress to the server now. */
  flush(options: { keepalive?: boolean } = {}): Promise<void> {
    if (this.remote === null || Object.keys(this.pending).length === 0) return Promise.resolve();
    if (this.flushing !== null) return this.flushing;
    window.clearTimeout(this.flushTimer);
    this.flushTimer = 0;
    const sending = this.pending;
    this.pending = {};
    const remote = this.remote;
    this.flushing = remote
      .progress(sending, options.keepalive === true ? { keepalive: true } : undefined)
      .then((result) => this.adopt(result.state))
      .catch(() => addProgress(this.pending, sending))
      .finally(() => {
        this.flushing = null;
      });
    return this.flushing;
  }

  /** Progress still unsent when the tab is hidden or closed goes out with keepalive. */
  private listenForPageHide(): void {
    if (this.listening || typeof window === "undefined" || typeof window.addEventListener !== "function") return;
    this.listening = true;
    const send = (): void => void this.flushNow({ keepalive: true });
    window.addEventListener("pagehide", send);
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") send();
      });
    }
  }

  async setGoal(goal: DailyGoal): Promise<void> {
    if (this.remote !== null) {
      try {
        this.adopt((await this.remote.goal(goal)).state);
      } catch {
        /* Unchanged. */
      }
      return;
    }
    this.sync();
    this.current = setDailyGoal(this.current, goal, this.today());
    this.dirty = true;
    this.host.changed();
  }

  busy(): boolean {
    return this.claiming;
  }

  private async pay(reward: LiveOpsReward, key: string, label: string): Promise<ClaimOutcome> {
    const { warp, ...currencies } = reward;
    if (warp !== undefined && warp > 0) {
      try {
        await this.host.grantWarp(key, warp);
      } catch (error) {
        return { ok: false, reason: error instanceof Error ? error.message : "Warp could not be added." };
      }
    }
    this.host.grantCurrencies(currencies);
    this.dirty = true;
    if (await this.host.persist("✓ " + label)) this.dirty = false;
    this.host.changed();
    return { ok: true, reward, label };
  }

  /** Online claim: pre-check Warp room, ask the server, then apply exactly once by key. */
  private async claimOnline(remote: LiveOpsRemote, request: ClaimRequest): Promise<ClaimOutcome> {
    await this.flush();
    // With the server wallet, Warp that does not fit waits on the server: no need to refuse here.
    const room = this.walletMode ? null : (this.host.warpRoom?.() ?? null);
    if (room !== null) {
      const expected = runClaim(request, this.current, this.today(), this.now());
      const warp = expected.ok ? (expected.reward.warp ?? 0) : 0;
      if (warp > room) {
        return { ok: false, reason: "Warp tanks are full (room for " + room + ", this gift has " + warp + "). Deploy first, then claim." };
      }
    }
    let result: Awaited<ReturnType<LiveOpsRemote["claim"]>>;
    try {
      result = await remote.claim(request);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Could not reach the server.";
      if (mayBePaid(error)) {
        const recovered = await this.syncServer();
        if (recovered.length > 0) return { ok: true, reward: sumRewards(recovered), label: recovered.map((grant) => grant.label).join(" · ") };
      }
      return { ok: false, reason };
    }
    this.current = sanitizeLiveOpsState(result.state);
    const reward = sanitizeReward(result.reward);
    if (result.wallet !== undefined && this.host.adoptWallet !== undefined) {
      // Paid into the server wallet already: take its balances; the key never pays here.
      if (!this.book.applied.includes(result.key)) this.book.applied = [...this.book.applied, result.key].slice(-MAX_APPLIED);
      this.dirty = true;
      await this.host.adoptWallet(result.wallet);
      const note = result.held === true ? "Big reward · kept for you until your account email is confirmed, then paid automatically." : undefined;
      if (await this.host.persist("✓ " + result.label + (note === undefined ? "" : " · " + note))) this.dirty = false;
      this.host.changed();
      return { ok: true, reward: result.held === true ? {} : reward, label: result.label, ...(note === undefined ? {} : { note }) };
    }
    const grant = this.enqueue(result.key, reward, result.label);
    if (grant === null) {
      this.host.changed();
      return { ok: true, reward: {}, label: result.label + " (already in your hangar)" };
    }
    const done = await this.applyGrant(grant);
    this.dirty = true;
    const note = done ? undefined : "Warp arrives when your tanks have room.";
    if (await this.host.persist("✓ " + result.label + (note === undefined ? "" : " · " + note))) this.dirty = false;
    this.host.changed();
    return { ok: true, reward: done ? reward : withoutWarp(reward), label: result.label, ...(note === undefined ? {} : { note }) };
  }

  async claim(request: ClaimRequest): Promise<ClaimOutcome> {
    const blocker = this.host.claimBlocker();
    if (blocker !== null) return { ok: false, reason: blocker };
    if (this.claiming) return { ok: false, reason: "One moment…" };
    this.claiming = true;
    try {
      if (this.remote !== null) return await this.claimOnline(this.remote, request);
      this.sync();
      const now = this.now();
      const result = runClaim(request, this.current, gameDay(now), now);
      if (!result.ok) return result;
      const previous = this.current;
      this.current = result.state;
      const outcome = await this.pay(result.reward, result.key, result.label);
      if (!outcome.ok) this.current = previous;
      return outcome;
    } finally {
      this.claiming = false;
    }
  }

  async buyShield(): Promise<{ ok: boolean; reason?: string }> {
    const blocker = this.host.claimBlocker();
    if (blocker !== null) return { ok: false, reason: blocker };
    if (this.remote !== null) {
      try {
        const result = await this.remote.shield(this.host.starCrystals());
        this.current = sanitizeLiveOpsState(result.state);
        // Server wallet: the Star Crystals were taken there; otherwise the game pays them.
        if (result.wallet !== undefined && this.host.adoptWallet !== undefined) await this.host.adoptWallet(result.wallet);
        else this.host.spendStarCrystals(result.price);
      } catch (error) {
        return { ok: false, reason: error instanceof Error ? error.message : "Could not reach the server." };
      }
    } else {
      this.sync();
      const result = buyStreakShield(this.current, this.host.starCrystals());
      if (!result.ok) return result;
      this.current = result.state;
      this.host.spendStarCrystals(result.price);
    }
    this.dirty = true;
    if (await this.host.persist("✓ Streak shield bought")) this.dirty = false;
    this.host.changed();
    return { ok: true };
  }

  /** Gift codes are checked on the server only. */
  async redeem(code: string): Promise<{ ok: boolean; reason?: string; title?: string }> {
    if (this.remote === null) return { ok: false, reason: "Gift codes need an online connection." };
    try {
      const result = await this.remote.redeem(code);
      this.adopt(result.state);
      return { ok: true, title: result.title };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : "Code not accepted." };
    }
  }
}

export { LIVE_OPS_POLICY };
