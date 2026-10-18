import { createWarpCharge, isValidWarpCharge, reconcileWarp, refuelQuote, refuelWarp, spendWarp, type WarpCharge } from "../../src/economy/warp-charge";
import {
  addDeltas,
  applyDailyCap,
  capMigration,
  checkSortie,
  compactLedger,
  dailyEarnCap,
  emptyBalances,
  fillWarp,
  fixedEarning,
  isEmptyDeltas,
  ledgerTotals,
  sanitizeBalances,
  sanitizeDeltas,
  sortieEarnMax,
  DAY_LEDGER_MAX_OPS,
  EARN_OP_SORTIES,
  EARN_OUTSIDE_HARD_CAPS,
  RECENT_OPS,
  WALLET_CURRENCIES,
  type SortieOutcome,
  type WalletBalances,
  type WalletDeltas,
  type WalletOp,
} from "../../src/economy/wallet-rules";
import { gameDay } from "../../src/liveops/time";
import type { AccountRow } from "./accounts";
import type { Sql } from "./db";
import type { Env } from "./env";
import { ApiError, nowIso } from "./http";
import { storedSaveText } from "./saves";
import { walletPrice, sameWalletPrice } from "../../src/economy/wallet-price";

/**
 * The server wallet (docs/ONLINE_SERVER_WALLET_DESIGN_2026-10-16.md).
 * One row per player in `wallets` holds balances, Warp, the sortie in
 * progress, today's earnings and day ledger, the recent opIds and the held
 * big rewards, so every money change is one version-checked row write.
 *
 * WALLET_PHASE (cloud/wrangler.jsonc) rolls it out and back:
 * 0 off · 1 shadow · 2/3 authoritative spends, Warp, claims and earning checks.
 * Phase 2 uses the same earning ceilings as phase 3; it cannot mint unchecked money.
 */
export type WalletPhase = 0 | 1 | 2 | 3;

export function walletPhase(env: Env): WalletPhase {
  const value = Number(env.WALLET_PHASE ?? 0);
  return value === 1 || value === 2 || value === 3 ? value : 0;
}

type SortieOpen = { id: string; stage: number; activity: string; startedAt: number; cost: number };
type HeldReward = { key: string; label: string; reward: WalletDeltas & { warp?: number } };
type Flag = { t: number; code: string; detail?: string };

export type Wallet = {
  accountId: string;
  balances: WalletBalances;
  warp: WarpCharge;
  warpPending: number;
  sortie: SortieOpen | null;
  maxStage: number;
  earnDay: number;
  earned: WalletBalances;
  todayDay: number;
  todayOps: WalletOp[];
  recentOps: string[];
  pendingPurchases: Record<string, WalletOp>;
  fixedClaims: string[];
  held: HeldReward[];
  flags: Flag[];
  version: number;
  origin: string;
  /** Game day the wallet was opened; earlier days' fixed rewards are in its seed. */
  createdDay: number;
  reconcileRequired: boolean;
};

type WalletRow = {
  account_id: string;
  credits: number;
  alloy: number;
  star_crystal: number;
  quantum_core: number;
  warp: string;
  warp_pending: number;
  sortie: string | null;
  max_stage: number;
  earn_day: number;
  earned: string;
  today_day: number;
  today_ops: string;
  recent_ops: string;
  pending_purchases: string;
  fixed_claims: string;
  held: string;
  flags: string;
  version: number;
  origin: string;
  created_at?: string | null;
  reconcile_required?: number;
};

const MAX_FLAGS = 50;

function json<T>(text: string | null, fallback: T): T {
  if (text === null) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

function parse(row: WalletRow, now: number): Wallet {
  const warp = json<unknown>(row.warp, null);
  return {
    accountId: row.account_id,
    balances: sanitizeBalances({ credits: row.credits, alloy: row.alloy, starCrystal: row.star_crystal, quantumCore: row.quantum_core }),
    warp: isValidWarpCharge(warp) ? warp : createWarpCharge(now),
    warpPending: Number(row.warp_pending) || 0,
    sortie: json<SortieOpen | null>(row.sortie, null),
    maxStage: Math.max(1, Number(row.max_stage) || 1),
    earnDay: Number(row.earn_day),
    earned: sanitizeBalances(json(row.earned, {})),
    todayDay: Number(row.today_day),
    todayOps: json<WalletOp[]>(row.today_ops, []),
    recentOps: json<string[]>(row.recent_ops, []),
    pendingPurchases: json<Record<string, WalletOp>>(row.pending_purchases, {}),
    fixedClaims: json<string[]>(row.fixed_claims, []),
    held: json<HeldReward[]>(row.held, []),
    flags: json<Flag[]>(row.flags, []),
    version: Number(row.version) || 0,
    origin: row.origin,
    createdDay: createdDay(row.created_at),
    reconcileRequired: row.reconcile_required === 1,
  };
}

function createdDay(createdAt: string | null | undefined): number {
  const time = typeof createdAt === "string" ? Date.parse(createdAt) : Number.NaN;
  return Number.isFinite(time) ? gameDay(time) : 0;
}

export async function loadWallet(db: Sql, accountId: string, now: number): Promise<Wallet | null> {
  const row = await db.first<WalletRow>("select * from wallets where account_id = ?1", accountId);
  return row === null ? null : parse(row, now);
}

/** Today's state: day ledger and caps turned over, Warp regenerated, waiting Warp added if it fits. */
function roll(input: Wallet, now: number): { wallet: Wallet; archive: { day: number; ops: WalletOp[] } | null } {
  const wallet = structuredClone(input);
  const day = gameDay(now);
  wallet.fixedClaims = wallet.fixedClaims.filter((id) => Number(id.split(":")[1]) > day - 90);
  let archive: { day: number; ops: WalletOp[] } | null = null;
  if (wallet.todayDay < day) {
    if (wallet.todayDay >= 0 && wallet.todayOps.length > 0) archive = { day: wallet.todayDay, ops: wallet.todayOps };
    wallet.todayDay = day;
    wallet.todayOps = [];
  }
  if (wallet.earnDay < day) {
    wallet.earnDay = day;
    wallet.earned = emptyBalances();
  }
  const filled = fillWarp(wallet.warp, wallet.warpPending, 0, now);
  wallet.warp = filled.warp;
  wallet.warpPending = filled.pending;
  return { wallet, archive };
}

function record(wallet: Wallet, op: WalletOp): void {
  wallet.todayOps = [...wallet.todayOps, op].slice(-DAY_LEDGER_MAX_OPS);
  if (!wallet.recentOps.includes(op.o)) wallet.recentOps = [...wallet.recentOps, op.o].slice(-RECENT_OPS);
}

function flag(wallet: Wallet, code: string, detail: string | undefined, now: number): void {
  wallet.flags = [...wallet.flags, { t: now, code, ...(detail === undefined ? {} : { detail: detail.slice(0, 200) }) }].slice(-MAX_FLAGS);
}

/** The update of one wallet row, only if nobody wrote it since `before` (plus an optional extra condition). */
export function walletUpdateStmt(db: Sql, accountId: string, before: Wallet, after: Wallet, opId: string, now: number, extraCondition = "", extraParams: unknown[] = []): D1PreparedStatement {
  return db.stmt(
    `update wallets set credits = ?3, alloy = ?4, star_crystal = ?5, quantum_core = ?6, warp = ?7, warp_pending = ?8, sortie = ?9,
            max_stage = ?10, earn_day = ?11, earned = ?12, today_day = ?13, today_ops = ?14, recent_ops = ?15, held = ?16, flags = ?17,
            version = version + 1, last_op = ?18, updated_at = ?19, pending_purchases = ?20, fixed_claims = ?21, reconcile_required = ?22
      where account_id = ?1 and version = ?2 ${extraCondition}`,
    accountId,
    before.version,
    after.balances.credits,
    after.balances.alloy,
    after.balances.starCrystal,
    after.balances.quantumCore,
    JSON.stringify(after.warp),
    after.warpPending,
    after.sortie === null ? null : JSON.stringify(after.sortie),
    after.maxStage,
    after.earnDay,
    JSON.stringify(after.earned),
    after.todayDay,
    JSON.stringify(after.todayOps),
    JSON.stringify(after.recentOps),
    JSON.stringify(after.held),
    JSON.stringify(after.flags),
    opId,
    nowIso(now),
    JSON.stringify(after.pendingPurchases),
    JSON.stringify(after.fixedClaims),
    after.reconcileRequired ? 1 : 0,
    ...extraParams,
  );
}

/** Yesterday's ledger into wallet_days, only if this request's wallet write happened (last_op). */
export function archiveStmt(db: Sql, accountId: string, archive: { day: number; ops: WalletOp[] }, opId: string): D1PreparedStatement {
  return db.stmt(
    `insert into wallet_days (account_id, day, ops, totals)
     select ?1, ?2, ?3, ?4 where (select last_op from wallets where account_id = ?1) = ?5
     on conflict (account_id, day) do nothing`,
    accountId,
    archive.day,
    // Grouped by kind and source (src/economy/wallet-rules.ts compactLedger): small enough for 90 days.
    JSON.stringify(compactLedger(archive.ops)),
    JSON.stringify(ledgerTotals(archive.ops)),
    opId,
  );
}

export type WalletView = {
  accountId: string;
  phase: WalletPhase;
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
};

export function walletView(wallet: Wallet, env: Env, now: number): WalletView {
  const today = roll(wallet, now).wallet;
  return {
    accountId: today.accountId,
    phase: walletPhase(env),
    balances: today.balances,
    warp: today.warp,
    warpPending: today.warpPending,
    held: today.held,
    sortie: today.sortie === null ? null : { id: today.sortie.id, stage: today.sortie.stage },
    maxStage: today.maxStage,
    earnedToday: today.earned,
    dailyCap: dailyEarnCap(today.maxStage),
    flagged: today.flags.length,
    version: today.version,
    serverTime: now,
  };
}

function verified(account: AccountRow): boolean {
  return account.kind === "registered" && account.email_verified_at !== null;
}

type Change = { wallet: Wallet; extra?: Record<string, unknown> };

/**
 * One money change: load, turn over the day, skip a repeated opId, apply
 * `change`, record it in the day ledger, and write with a version check
 * (retried if another request wrote in between).
 */
async function mutate(
  db: Sql,
  env: Env,
  accountId: string,
  opId: string,
  now: number,
  change: (wallet: Wallet) => Change,
  extra: (wallet: Wallet) => D1PreparedStatement[] = () => [],
): Promise<WalletView & Record<string, unknown>> {
  if (typeof opId !== "string" || !/^[A-Za-z0-9:._-]{6,120}$/.test(opId) || ["__proto__", "constructor", "prototype"].includes(opId)) throw new ApiError(400, "invalid", "Missing or invalid opId.");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const stored = await loadWallet(db, accountId, now);
    if (stored === null) throw new ApiError(409, "no-wallet", "Open the wallet first.");
    const { wallet, archive } = roll(stored, now);
    if (wallet.recentOps.includes(opId) || Object.hasOwn(wallet.pendingPurchases, opId) || wallet.fixedClaims.includes(opId)) {
      const receipt = wallet.todayOps.find((item) => item.o === opId);
      return { ...walletView(stored, env, now), duplicate: true,
        ...(receipt?.k === "refuel" ? { price: -(receipt.d.starCrystal ?? 0) } : {}) };
    }
    const result = change(wallet);
    const statements = [walletUpdateStmt(db, accountId, stored, result.wallet, opId, now), ...extra(result.wallet), ...(archive === null ? [] : [archiveStmt(db, accountId, archive, opId)])];
    const changes = await db.batch(statements);
    if (changes[0] === 1) {
      const saved = { ...result.wallet, version: stored.version + 1 };
      return { ...walletView(saved, env, now), ...(result.extra ?? {}) };
    }
  }
  throw new ApiError(409, "busy", "Your wallet is updating on another device. Try again.");
}

function requirePhase(env: Env, minimum: WalletPhase): WalletPhase {
  const phase = walletPhase(env);
  if (phase < minimum) throw new ApiError(409, "wallet-off", "The server wallet is not active.");
  return phase;
}

// ---------- Opening (and moving an existing save in) ----------

type Seed = { balances?: unknown; warp?: unknown; stage?: unknown };

function seedFromSave(data: Record<string, unknown>): Seed {
  const currencies = (data.expansionCurrencies ?? {}) as Record<string, unknown>;
  const account = (data.account ?? {}) as Record<string, unknown>;
  const campaign = (data.campaign ?? {}) as Record<string, unknown>;
  return {
    balances: { credits: data.credits, alloy: currencies.alloy, starCrystal: currencies.starCrystal, quantumCore: currencies.quantumCore },
    warp: account.warp,
    stage: campaign.highestUnlockedStage,
  };
}

/**
 * The player's wallet, created on first use from their cloud save (or, if
 * there is none yet, from the balances the game sends), within the
 * migration caps; cut amounts are flagged for Admin. A verified email
 * releases held big rewards here too.
 */
export async function openWallet(db: Sql, env: Env, account: AccountRow, seedInput: unknown, now: number): Promise<WalletView> {
  if (walletPhase(env) === 0) {
    await db.run("update wallets set reconcile_required = 1 where account_id = ?1 and reconcile_required = 0", account.id);
    throw new ApiError(409, "wallet-off", "The server wallet is not active.");
  }
  requirePhase(env, 1);
  let wallet = await loadWallet(db, account.id, now);
  if (wallet === null) {
    const save = await db.first<{ data: string; data_gz: unknown; revision: number }>("select data, data_gz, revision from player_saves where account_id = ?1", account.id);
    let seed: Seed;
    let origin: string;
    const cutoff = Date.parse(env.WALLET_SEED_BEFORE ?? "");
    const accountCreated = Date.parse(account.created_at);
    const mayMigrate = Number.isFinite(cutoff) && Number.isFinite(accountCreated) && accountCreated < cutoff;
    if (!mayMigrate) {
      // A pre-wallet PUT /save is still client input. New accounts never seed from it either.
      seed = {};
      origin = "new";
    } else if (save !== null) {
      seed = seedFromSave(JSON.parse(await storedSaveText(save)) as Record<string, unknown>);
      origin = "save:r" + save.revision;
    } else {
      seed = (seedInput !== null && typeof seedInput === "object" ? seedInput : {}) as Seed;
      origin = seed.balances === undefined ? "new" : "device";
    }
    const { balances, warp, clamped } = capMigration(seed.balances, seed.warp, now);
    const requestedStage = stageOf(seed.stage);
    const stage = Math.min(requestedStage, origin === "device" ? 20 : 1000);
    const day = gameDay(now);
    const flags: Flag[] = clamped.length === 0 ? [] : [{ t: now, code: "migration-cap", detail: clamped.join(", ") }];
    if (origin === "device") flags.push({ t: now, code: "migration-stage", detail: requestedStage + " → " + stage + " (no cloud save)" });
    const ops: WalletOp[] = [{ o: "migrate", k: "migrate", s: origin, d: balances, t: now }];
    await db.run(
      `insert into wallets (account_id, credits, alloy, star_crystal, quantum_core, warp, max_stage, earn_day, today_day, today_ops, recent_ops, flags, origin, created_at, updated_at)
       values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8, ?9, '["migrate"]', ?10, ?11, ?12, ?12) on conflict (account_id) do nothing`,
      account.id, balances.credits, balances.alloy, balances.starCrystal, balances.quantumCore, JSON.stringify(warp), stage, day,
      JSON.stringify(ops), JSON.stringify(flags), origin, nowIso(now),
    );
    wallet = (await loadWallet(db, account.id, now))!;
  }
  let reconciled = false;
  if (wallet.reconcileRequired && walletPhase(env) >= 2) {
    await mutate(db, env, account.id, "resume:" + now, now, current => {
      if (!current.reconcileRequired) return { wallet: current };
      const seed = seedInput !== null && typeof seedInput === "object" ? seedInput as Seed : {};
      if (seed.balances !== undefined) {
        const migration = capMigration(seed.balances, seed.warp, now);
        const before = current.balances;
        current.balances = migration.balances;
        current.warp = migration.warp;
        flag(current, "phase-resume", migration.clamped.join(",") || "device reconciliation", now);
        const delta: WalletDeltas = {};
        for (const key of WALLET_CURRENCIES) delta[key] = current.balances[key] - before[key];
        record(current, { o: "resume:" + now, k: "migrate", s: "phase-resume", d: delta, t: now });
      }
      current.reconcileRequired = false;
      return { wallet: current };
    });
    wallet = (await loadWallet(db, account.id, now))!;
    reconciled = true;
  }
  if (wallet.held.length > 0 && verified(account)) {
    await releaseHeld(db, env, account.id, now);
    wallet = (await loadWallet(db, account.id, now))!;
  }
  if (Object.values(wallet.pendingPurchases).some(op => op.t < now - 7 * 86_400_000)) {
    const expired = await mutate(db, env, account.id, "expire:" + now, now, current => {
      for (const [id, op] of Object.entries(current.pendingPurchases)) {
        if (op.t >= now - 7 * 86_400_000) continue;
        const back: WalletDeltas = {};
        for (const key of WALLET_CURRENCIES) if ((op.d[key] ?? 0) < 0) back[key] = -op.d[key]!;
        current.balances = addDeltas(current.balances, back);
        delete current.pendingPurchases[id];
        record(current, { o: "refund:auto:" + id, k: "refund", s: op.s, d: back, t: now });
      }
      return { wallet: current };
    });
    return { ...expired, ...(reconciled ? { reconciled: true } : {}) };
  }
  return { ...walletView(wallet, env, now), ...(reconciled ? { reconciled: true } : {}) };
}

export async function getWallet(db: Sql, env: Env, accountId: string, now: number): Promise<WalletView> {
  requirePhase(env, 1);
  const wallet = await loadWallet(db, accountId, now);
  if (wallet === null) throw new ApiError(404, "no-wallet", "No wallet yet.");
  return walletView(wallet, env, now);
}

// ---------- Spending and earning ----------

const SOURCE = /^[a-z][a-z0-9:._-]{0,59}$/;

/** Reserved namespaces cannot suppress an unrelated operation's receipt. */
function validateNamespace(id: string, kind: string): void {
  const reserved = /^(start:|sortie-|finish:|lessons:|mission:|earn-|refuel-|spend-|refund:|confirm:|admin:|expire:|resume:)/.exec(id)?.[1];
  const allowed: Record<string, string[]> = { spend: ["spend-"], earn: ["lessons:", "mission:", "earn-"], sortie: ["start:", "sortie-", "finish:"], refuel: ["refuel-"] };
  if (reserved && !allowed[kind]?.includes(reserved)) throw new ApiError(400, "invalid-op-kind", "opId belongs to another wallet operation.");
  if (reserved === "lessons:" && fixedEarning(id) === null) throw new ApiError(400, "invalid", "Invalid lesson reward id.");
}

function source(value: unknown, fallback: string): string {
  return typeof value === "string" && SOURCE.test(value) ? value : fallback;
}

/** A purchase: every cost must be covered (phase ≥ 2), or it is refused and nothing changes. */
export async function spend(db: Sql, env: Env, accountId: string, input: Record<string, unknown>, now: number): Promise<WalletView & Record<string, unknown>> {
  validateNamespace(String(input.opId), "spend");
  const phase = requirePhase(env, 1);
  const costs = sanitizeDeltas(input.deltas);
  if (isEmptyDeltas(costs)) throw new ApiError(400, "invalid", "Nothing to pay.");
  return mutate(db, env, accountId, String(input.opId), now, (wallet) => {
    if (phase >= 2) {
      const price = walletPrice(input.purchase, wallet.maxStage);
      if (price === null) throw new ApiError(400, "invalid-offer", "This purchase is not in the server catalogue.");
      if (!sameWalletPrice(costs, price)) throw new ApiError(409, "price-changed", "This offer differs from the server catalogue. Refresh the shop before buying.", { price });
    }
    if (phase >= 2 && Object.keys(wallet.pendingPurchases).length >= 20) throw new ApiError(409, "pending-purchases", "Finish pending purchases before buying again.");
    const paid: WalletDeltas = {};
    for (const key of WALLET_CURRENCIES) {
      const cost = costs[key] ?? 0;
      if (cost === 0) continue;
      if (cost > wallet.balances[key]) {
        if (phase >= 2) {
          throw new ApiError(409, "insufficient", "Not enough " + key + " on your account.", { balances: wallet.balances });
        }
        flag(wallet, "spend-short", key + " " + cost + " > " + wallet.balances[key], now);
      }
      paid[key] = -Math.min(cost, wallet.balances[key]);
    }
    wallet.balances = addDeltas(wallet.balances, paid);
    const receipt = { o: String(input.opId), k: "spend", s: source(input.source, "shop"), d: paid, t: now };
    if (phase >= 2) wallet.pendingPurchases[receipt.o] = receipt;
    record(wallet, receipt);
    return { wallet, extra: { applied: paid } };
  });
}

/**
 * Gives back a purchase the game could not complete (its save failed after
 * the server took the price). A pending receipt survives day rollover, once
 * (opId "refund:<spend opId>").
 */
export async function refund(db: Sql, env: Env, accountId: string, input: Record<string, unknown>, now: number): Promise<WalletView & Record<string, unknown>> {
  requirePhase(env, 1);
  const spendOpId = String(input.spendOpId ?? "");
  return mutate(db, env, accountId, "refund:" + spendOpId, now, (wallet) => {
    const original = Object.hasOwn(wallet.pendingPurchases, spendOpId) ? wallet.pendingPurchases[spendOpId] : undefined;
    if (original === undefined) {
      if (wallet.recentOps.includes("confirm:" + spendOpId)) throw new ApiError(409, "purchase-saved", "This purchase was already saved.");
      // Cancel an uncertain request even if it has not arrived yet. A delayed spend with this id is a no-op.
      record(wallet, { o: spendOpId, k: "cancel", s: "purchase", d: {}, t: now });
      record(wallet, { o: "refund:" + spendOpId, k: "refund", s: "purchase", d: {}, t: now });
      return { wallet };
    }
    const back: WalletDeltas = {};
    for (const key of WALLET_CURRENCIES) if ((original.d[key] ?? 0) < 0) back[key] = -original.d[key]!;
    wallet.balances = addDeltas(wallet.balances, back);
    delete wallet.pendingPurchases[spendOpId];
    record(wallet, { o: "refund:" + spendOpId, k: "refund", s: original.s, d: back, t: now });
    return { wallet, extra: { applied: back } };
  });
}

/** Called only after the purchase and its receipt have been committed in the local save. */
export async function confirmPurchase(db: Sql, env: Env, accountId: string, input: Record<string, unknown>, now: number): Promise<WalletView & Record<string, unknown>> {
  requirePhase(env, 1);
  const spendOpId = String(input.spendOpId ?? "");
  return mutate(db, env, accountId, "confirm:" + spendOpId, now, (wallet) => {
    const original = Object.hasOwn(wallet.pendingPurchases, spendOpId) ? wallet.pendingPurchases[spendOpId] : undefined;
    if (!original) throw new ApiError(409, "purchase-missing", "The purchase is not pending on the server.");
    delete wallet.pendingPurchases[spendOpId];
    record(wallet, { o: "confirm:" + spendOpId, k: "confirm", s: original.s, d: {}, t: now });
    return { wallet };
  });
}

/**
 * Earnings outside a sortie (missions, lessons, Expedition and the like).
 * Fixed rewards (Daily Lessons) are paid at most their table amount; from
 * phase 2 generic earnings count against the daily cap.
 */
export async function earn(db: Sql, env: Env, accountId: string, input: Record<string, unknown>, now: number): Promise<WalletView & Record<string, unknown>> {
  validateNamespace(String(input.opId), "earn");
  const phase = requirePhase(env, 1);
  const opId = String(input.opId);
  const reported = sanitizeDeltas(input.deltas);
  const fixed = fixedEarning(opId);
  return mutate(db, env, accountId, opId, now, (wallet) => {
    let credited: WalletDeltas;
    let decayed: string[] = [];
    if (fixed !== null) {
      const day = Number(opId.split(":")[1]);
      const today = gameDay(now);
      // Days before the wallet existed are already in its opening balance (seed).
      if (day > today || day <= today - 90 || day < wallet.createdDay) throw new ApiError(400, "invalid-reward-day", "This lesson reward is outside the supported game days.");
      wallet.fixedClaims.push(opId);
      // A fixed reward (Daily Lessons): at most its table amount, once per opId; not counted in the caps.
      const limited: WalletDeltas = {};
      for (const key of WALLET_CURRENCIES) if ((reported[key] ?? 0) > 0) limited[key] = Math.min(reported[key]!, fixed[key] ?? 0);
      credited = sanitizeDeltas(limited);
    } else {
      // Any other earning: at most EARN_OP_SORTIES sorties' worth in one change, then the daily cap.
      const ceiling = sortieEarnMax(wallet.maxStage);
      const limited: WalletDeltas = {};
      let over = false;
      for (const key of WALLET_CURRENCIES) {
        const amount = reported[key] ?? 0;
        if (amount <= 0) continue;
        const max = ceiling[key] * EARN_OP_SORTIES;
        if (amount > max) over = true;
        limited[key] = Math.min(amount, max);
      }
      const capped = applyDailyCap(wallet.earned, phase >= 2 ? limited : reported, dailyEarnCap(wallet.maxStage), EARN_OUTSIDE_HARD_CAPS);
      wallet.earned = capped.earned;
      if (phase >= 2) {
        credited = capped.credited;
        decayed = capped.decayed;
        if (over) flag(wallet, "earn-over-max", source(input.source, "other"), now);
        if (decayed.length > 0) flag(wallet, "daily-cap", decayed.join(","), now);
      } else {
        credited = reported;
      }
    }
    wallet.balances = addDeltas(wallet.balances, credited);
    record(wallet, { o: opId, k: "earn", s: source(input.source, "other"), d: credited, t: now });
    return { wallet, extra: { applied: credited, decayed } };
  });
}

// ---------- Sorties ----------

function stageOf(value: unknown): number {
  return Math.max(1, Math.min(1000, Math.floor(Number(value) || 1)));
}

/**
 * Finishes the previous sortie (its earnings: checked from phase 2) and/or
 * starts the next one (spends its Warp), in one request and one row write.
 */
export async function sortie(db: Sql, env: Env, accountId: string, input: Record<string, unknown>, now: number): Promise<WalletView & Record<string, unknown>> {
  validateNamespace(String(input.opId), "sortie");
  const phase = requirePhase(env, 1);
  const finish = (input.finish !== null && typeof input.finish === "object" ? input.finish : null) as Record<string, unknown> | null;
  const start = (input.start !== null && typeof input.start === "object" ? input.start : null) as Record<string, unknown> | null;
  if (finish === null && start === null) throw new ApiError(400, "invalid", "Nothing to do.");
  const opId = String(input.opId);
  let recoveryStage = 0;
  if (start !== null && phase >= 2) {
    const stored = await loadWallet(db, accountId, now);
    const target = stageOf(start.stage);
    if (stored && target === stored.maxStage + 1) {
      const save = await db.first<{ data: string; data_gz: unknown }>("select data, data_gz from player_saves where account_id = ?1", accountId);
      if (save) {
        const data = JSON.parse(await storedSaveText(save)) as { campaign?: { highestUnlockedStage?: number }; account?: { receipts?: { id?: string; kind?: string; stage?: number }[] } };
        if (data.campaign?.highestUnlockedStage === target && data.account?.receipts?.some(receipt => receipt.kind === "clear" && receipt.id?.endsWith(":clear") && (receipt.stage === target - 1 || (stored.sortie?.stage === target - 1 && receipt.id === stored.sortie.id + ":clear")))) recoveryStage = target;
      }
    }
  }
  return mutate(db, env, accountId, opId, now, (wallet) => {
    const extra: Record<string, unknown> = {};
    if (finish !== null) {
      const attemptId = String(finish.attemptId ?? "");
      const open = wallet.sortie !== null && wallet.sortie.id === attemptId ? wallet.sortie : null;
      if (phase >= 2 && open === null) throw new ApiError(409, "sortie-unknown", "This sortie was not started or has already ended.");
      // The stage a sortie can pay for is at most one past the highest the server accepted.
      const stage = open?.stage ?? Math.min(stageOf(finish.stage), wallet.maxStage + 1);
      const outcome: SortieOutcome = finish.outcome === "cleared" || finish.outcome === "abandoned" ? finish.outcome : "failed";
      const reported = sanitizeDeltas(finish.earnings);
      let credited: WalletDeltas = reported;
      let flags: string[] = [];
      let decayed: string[] = [];
      if (phase >= 2) {
        const check = checkSortie({ stage, words: Number(finish.words) || 0, earnings: reported }, open?.startedAt ?? null, now);
        flags = check.flags;
        const capped = applyDailyCap(wallet.earned, check.earnings, dailyEarnCap(wallet.maxStage));
        wallet.earned = capped.earned;
        credited = capped.credited;
        decayed = capped.decayed;
        for (const code of flags) flag(wallet, code, "stage " + stage + " " + attemptId.slice(0, 40), now);
        if (decayed.length > 0) flag(wallet, "daily-cap", decayed.join(","), now);
      } else {
        wallet.earned = applyDailyCap(wallet.earned, reported, dailyEarnCap(wallet.maxStage)).earned;
      }
      wallet.balances = addDeltas(wallet.balances, credited);
      if (outcome === "cleared" && open !== null) wallet.maxStage = Math.max(wallet.maxStage, Math.min(1000, stage + 1));
      if (open !== null) wallet.sortie = null;
      record(wallet, { o: opId, k: "sortie", s: "finish:" + outcome + ":" + stage, d: credited, t: now });
      Object.assign(extra, { applied: credited, flags, decayed });
    }
    if (start !== null) {
      if (recoveryStage === wallet.maxStage + 1) {
        wallet.maxStage = recoveryStage;
        flag(wallet, "stage-recovered", "clear receipt → " + recoveryStage, now);
      }
      if (phase >= 2 && stageOf(start.stage) > wallet.maxStage) throw new ApiError(403, "stage-locked", "This Campaign stage is not unlocked on your account.");
      if (wallet.sortie !== null) {
        flag(wallet, "sortie-unfinished", wallet.sortie.id.slice(0, 40), now);
        wallet.sortie = null;
      }
      if (start.reserveConsent === true) wallet.warp = { ...wallet.warp, reserveConsent: true };
      let cost = 0;
      try {
        const spent = spendWarp(wallet.warp, now);
        wallet.warp = spent.warp;
        cost = spent.active + spent.reserve;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Not enough Warp.";
        if (phase >= 2) throw new ApiError(409, "no-warp", message, { warp: wallet.warp });
        flag(wallet, "warp-short", message, now);
      }
      wallet.sortie = { id: String(start.attemptId ?? "").slice(0, 80), stage: stageOf(start.stage), activity: String(start.activity ?? "campaign").slice(0, 20), startedAt: now, cost };
      record(wallet, { o: opId + ":start", k: "sortie", s: "start:" + wallet.sortie.stage, d: {}, w: -cost, t: now });
      if (!wallet.recentOps.includes(opId)) wallet.recentOps = [...wallet.recentOps, opId].slice(-RECENT_OPS);
    }
    return { wallet, extra };
  });
}

/** Refuel +20 Warp for Star Crystals (the game's price table), on the server's Warp and balance. */
export async function refuel(db: Sql, env: Env, accountId: string, input: Record<string, unknown>, now: number): Promise<WalletView & Record<string, unknown>> {
  validateNamespace(String(input.opId), "refuel");
  requirePhase(env, 2);
  const opId = String(input.opId);
  return mutate(db, env, accountId, opId, now, (wallet) => {
    let quote;
    try {
      quote = refuelQuote(wallet.warp, now);
    } catch (error) {
      throw new ApiError(409, "refuel-refused", error instanceof Error ? error.message : "Refuel is not available.", { warp: wallet.warp });
    }
    const consent = input.quote as { index?: unknown; price?: unknown } | undefined;
    if (!consent || consent.index !== quote.index || consent.price !== quote.price) throw new ApiError(409, "price-changed", "Refuel price changed. Confirm the new quote.", { quote });
    if (wallet.balances.starCrystal < quote.price) throw new ApiError(409, "insufficient", "Not enough Star Crystals on your account.", { balances: wallet.balances });
    const result = refuelWarp(wallet.warp, now, wallet.balances.starCrystal, quote);
    wallet.warp = result.warp;
    wallet.balances = { ...wallet.balances, starCrystal: result.crystals };
    record(wallet, { o: opId, k: "refuel", s: "warp:" + (quote.index + 1), d: { starCrystal: -quote.price }, w: quote.amount, t: now });
    return { wallet, extra: { price: quote.price } };
  });
}

// ---------- Daily Hub claims (cloud/src/liveops.ts) ----------

/**
 * A confirmed Daily Hub claim paid into the wallet (currencies, and Warp
 * with any overflow waiting), or held when it is big and the email is not
 * verified. Null when the wallet has paid this key before.
 */
export function claimIntoWallet(
  stored: Wallet,
  key: string,
  reward: { credits?: number; alloy?: number; starCrystal?: number; quantumCore?: number; warp?: number },
  label: string,
  big: boolean,
  account: AccountRow,
  now: number,
): { before: Wallet; wallet: Wallet; archive: { day: number; ops: WalletOp[] } | null; held: boolean } | null {
  const { wallet, archive } = roll(stored, now);
  if (wallet.recentOps.includes(key)) return null;
  const currencies = sanitizeDeltas(reward);
  const warp = Math.max(0, Math.floor(Number(reward.warp) || 0));
  if (big && !verified(account)) {
    wallet.held = [...wallet.held, { key, label: label.slice(0, 120), reward: { ...currencies, ...(warp > 0 ? { warp } : {}) } }].slice(-50);
    record(wallet, { o: key, k: "claim", s: "held", d: {}, t: now });
    return { before: stored, wallet, archive, held: true };
  }
  wallet.balances = addDeltas(wallet.balances, currencies);
  if (warp > 0) {
    const filled = fillWarp(wallet.warp, wallet.warpPending, warp, now);
    wallet.warp = filled.warp;
    wallet.warpPending = filled.pending;
  }
  record(wallet, { o: key, k: "claim", s: "liveops", d: currencies, ...(warp > 0 ? { w: warp } : {}), t: now });
  return { before: stored, wallet, archive, held: false };
}

/** A spend inside another batch (the streak shield): refused if the wallet cannot cover it. */
export function spendFromWallet(
  stored: Wallet,
  costs: WalletDeltas,
  opId: string,
  sourceName: string,
  now: number,
): { wallet: Wallet; archive: { day: number; ops: WalletOp[] } | null } {
  const { wallet, archive } = roll(stored, now);
  const paid: WalletDeltas = {};
  for (const key of WALLET_CURRENCIES) {
    const cost = Math.max(0, costs[key] ?? 0);
    if (cost === 0) continue;
    if (cost > wallet.balances[key]) throw new ApiError(409, "insufficient", "Not enough " + key + " on your account.", { balances: wallet.balances });
    paid[key] = -cost;
  }
  wallet.balances = addDeltas(wallet.balances, paid);
  record(wallet, { o: opId, k: "spend", s: sourceName, d: paid, t: now });
  return { wallet, archive };
}

/** Pays held big rewards once the email is verified. */
export async function releaseHeld(db: Sql, env: Env, accountId: string, now: number): Promise<WalletView> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const stored = await loadWallet(db, accountId, now);
    if (stored === null) throw new ApiError(404, "no-wallet", "No wallet yet.");
    if (stored.held.length === 0) return walletView(stored, env, now);
    const { wallet, archive } = roll(stored, now);
    const opId = "release:" + now;
    for (const item of wallet.held) {
      const { warp, ...currencies } = item.reward;
      wallet.balances = addDeltas(wallet.balances, currencies);
      if (warp !== undefined && warp > 0) {
        const filled = fillWarp(wallet.warp, wallet.warpPending, warp, now);
        wallet.warp = filled.warp;
        wallet.warpPending = filled.pending;
      }
      record(wallet, { o: opId + ":" + item.key, k: "release", s: item.key, d: currencies, ...(warp ? { w: warp } : {}), t: now });
    }
    wallet.held = [];
    const changes = await db.batch([walletUpdateStmt(db, accountId, stored, wallet, opId, now), ...(archive === null ? [] : [archiveStmt(db, accountId, archive, opId)])]);
    if (changes[0] === 1) return walletView({ ...wallet, version: stored.version + 1 }, env, now);
  }
  throw new ApiError(409, "busy", "Try again.");
}

// ---------- Admin ----------

/** Admin correction: signed amounts and Warp, with a reason; written to admin_audit in the same batch. */
export async function adminAdjust(db: Sql, env: Env, accountId: string, input: Record<string, unknown>, actor: string, now: number): Promise<WalletView & Record<string, unknown>> {
  const reason = typeof input.reason === "string" ? input.reason.trim().slice(0, 300) : "";
  if (reason === "") throw new ApiError(400, "invalid", "An adjustment needs a reason.");
  const deltas = sanitizeDeltas(input.deltas, true);
  const warp = Math.max(-400, Math.min(400, Math.floor(Number(input.warp) || 0)));
  if (isEmptyDeltas(deltas) && warp === 0) throw new ApiError(400, "invalid", "Nothing to change.");
  const key = input.idempotencyKey;
  if (typeof key !== "string" || !/^[A-Za-z0-9._-]{6,80}$/.test(key)) throw new ApiError(400, "invalid", "An idempotencyKey is required.");
  const opId = "admin:" + key;
  return mutate(
    db,
    env,
    accountId,
    opId,
    now,
    (wallet) => {
      wallet.balances = addDeltas(wallet.balances, deltas);
      if (warp > 0) {
        const filled = fillWarp(wallet.warp, wallet.warpPending, warp, now);
        wallet.warp = filled.warp;
        wallet.warpPending = filled.pending;
      } else if (warp < 0) {
        const w = reconcileWarp(wallet.warp, now);
        const fromActive = Math.min(w.current, -warp);
        w.current -= fromActive;
        w.reserve = Math.max(0, w.reserve - (-warp - fromActive));
        wallet.warp = w;
      }
      record(wallet, { o: opId, k: "admin", s: ("admin:" + actor).slice(0, 60), d: deltas, ...(warp !== 0 ? { w: warp } : {}), t: now });
      return { wallet };
    },
    () => [
      db.stmt(
        "insert into admin_audit (actor, action, target, details, created_at) select ?1, 'player.wallet.adjust', ?2, ?3, ?4 where changes() = 1 and (select last_op from wallets where account_id = ?2) = ?5",
        actor,
        accountId,
        JSON.stringify({ deltas, warp, reason }),
        nowIso(now),
        opId,
      ),
    ],
  );
}

/** Wallet, flags, today's ledger and the last 7 earlier days, for the Admin player page. */
export async function adminWallet(db: Sql, env: Env, accountId: string, now: number): Promise<Record<string, unknown> | null> {
  const wallet = await loadWallet(db, accountId, now);
  if (wallet === null) return null;
  const days = await db.all<{ day: number; totals: string; ops: string }>(
    "select day, totals, ops from wallet_days where account_id = ?1 order by day desc limit 7",
    accountId,
  );
  return {
    ...walletView(wallet, env, now),
    origin: wallet.origin,
    flags: wallet.flags,
    pendingPurchases: Object.values(wallet.pendingPurchases),
    today: { day: wallet.todayDay, ops: wallet.todayOps.slice(-100) },
    days: days.map((row) => ({ day: Number(row.day), totals: json(row.totals, {}), groups: json<unknown[]>(row.ops, []).slice(0, 50) })),
  };
}

/** Support settles a pending debit using the same wallet version fence as player requests. */
export async function adminSettlePurchase(db: Sql, env: Env, accountId: string, input: Record<string, unknown>, actor: string, now: number): Promise<WalletView & Record<string, unknown>> {
  const reason = typeof input.reason === "string" ? input.reason.trim().slice(0, 300) : "";
  const kind = input.purchaseAction;
  const id = String(input.spendOpId ?? "");
  const key = input.idempotencyKey;
  if (!reason || (kind !== "refund" && kind !== "confirm") || !/^[A-Za-z0-9:._-]{6,100}$/.test(id) || typeof key !== "string" || !/^[A-Za-z0-9._-]{6,80}$/.test(key)) throw new ApiError(400, "invalid", "A pending purchase, action, reason and idempotencyKey are required.");
  const opId = "admin:" + key;
  return mutate(db, env, accountId, opId, now, wallet => {
    const receipt = Object.hasOwn(wallet.pendingPurchases, id) ? wallet.pendingPurchases[id] : undefined;
    if (!receipt) throw new ApiError(409, "purchase-missing", "The purchase has already been settled.");
    const back: WalletDeltas = {};
    if (kind === "refund") for (const currency of WALLET_CURRENCIES) if ((receipt.d[currency] ?? 0) < 0) back[currency] = -receipt.d[currency]!;
    wallet.balances = addDeltas(wallet.balances, back);
    delete wallet.pendingPurchases[id];
    record(wallet, { o: kind + ":" + id, k: kind, s: "admin", d: back, t: now });
    record(wallet, { o: opId, k: "admin", s: "purchase:" + kind, d: {}, t: now });
    return { wallet };
  }, () => [db.stmt(
    "insert into admin_audit (actor, action, target, details, created_at) select ?1, 'player.wallet.purchase', ?2, ?3, ?4 where changes() = 1 and (select last_op from wallets where account_id = ?2) = ?5",
    actor, accountId, JSON.stringify({ kind, spendOpId: id, reason }), nowIso(now), opId,
  )]);
}
