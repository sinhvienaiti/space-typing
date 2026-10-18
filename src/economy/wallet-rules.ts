import { LESSON_REWARDS } from "../lessons/chain";
import { createWarpCharge, isValidWarpCharge, reconcileWarp, WARP_POLICY, type WarpCharge } from "./warp-charge";

/**
 * Server wallet rules, shared by the game and the Worker (cloud/src/wallet.ts).
 * Pure functions, no DOM. Design and numbers:
 * docs/ONLINE_SERVER_WALLET_DESIGN_2026-10-16.md (decisions of 17/10/2026).
 */

export type WalletCurrency = "credits" | "alloy" | "starCrystal" | "quantumCore";
export const WALLET_CURRENCIES: readonly WalletCurrency[] = ["credits", "alloy", "starCrystal", "quantumCore"];
export type WalletBalances = Record<WalletCurrency, number>;
export type WalletDeltas = Partial<WalletBalances>;
export const WALLET_MAX = 999_999_999;
/** Largest single change a client may report (anything larger is a bug or a forgery). */
export const WALLET_OP_MAX = 100_000_000;

export function emptyBalances(): WalletBalances {
  return { credits: 0, alloy: 0, starCrystal: 0, quantumCore: 0 };
}

function whole(value: unknown, min: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.floor(value))) : 0;
}

export function sanitizeBalances(value: unknown): WalletBalances {
  const raw = (value !== null && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const out = emptyBalances();
  for (const key of WALLET_CURRENCIES) out[key] = whole(raw[key], 0, WALLET_MAX);
  return out;
}

/** Amounts of a change: whole numbers, zero dropped; negative only with `signed`. */
export function sanitizeDeltas(value: unknown, signed = false): WalletDeltas {
  const raw = (value !== null && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const out: WalletDeltas = {};
  for (const key of WALLET_CURRENCIES) {
    const amount = whole(raw[key], signed ? -WALLET_OP_MAX : 0, WALLET_OP_MAX);
    if (amount !== 0) out[key] = amount;
  }
  return out;
}

export function addDeltas(balances: WalletBalances, deltas: WalletDeltas): WalletBalances {
  const out = { ...balances };
  for (const key of WALLET_CURRENCIES) out[key] = Math.min(WALLET_MAX, Math.max(0, out[key] + (deltas[key] ?? 0)));
  return out;
}

export function diffBalances(after: WalletBalances, before: WalletBalances): WalletDeltas {
  const out: WalletDeltas = {};
  for (const key of WALLET_CURRENCIES) if (after[key] !== before[key]) out[key] = after[key] - before[key];
  return out;
}

export function isEmptyDeltas(deltas: WalletDeltas): boolean {
  return WALLET_CURRENCIES.every((key) => (deltas[key] ?? 0) === 0);
}

// ---------- Moving existing saves to the wallet (decision 2) ----------

/** Most of each currency an existing save can bring into its new wallet. */
export const MIGRATION_CAPS: Readonly<WalletBalances> = { credits: 2_000_000, alloy: 50_000, starCrystal: 20_000, quantumCore: 500 };

/**
 * The wallet a save starts with: balances within MIGRATION_CAPS, Warp at most
 * full tanks (a valid WarpCharge is; anything else becomes a fresh one) and
 * never from the future. `clamped` lists what was cut (flagged for Admin).
 */
export function capMigration(balancesInput: unknown, warpInput: unknown, now: number): { balances: WalletBalances; warp: WarpCharge; clamped: string[] } {
  const raw = sanitizeBalances(balancesInput);
  const balances = emptyBalances();
  const clamped: string[] = [];
  for (const key of WALLET_CURRENCIES) {
    balances[key] = Math.min(raw[key], MIGRATION_CAPS[key]);
    if (raw[key] > MIGRATION_CAPS[key]) clamped.push(key + ":" + raw[key]);
  }
  let warp: WarpCharge;
  if (isValidWarpCharge(warpInput)) {
    const input = warpInput.watermarkMs > now ? { ...warpInput, watermarkMs: now } : warpInput;
    warp = reconcileWarp(input, now);
  } else {
    warp = createWarpCharge(now);
    if (warpInput !== undefined && warpInput !== null) clamped.push("warp:invalid");
  }
  return { balances, warp, clamped };
}

// ---------- Daily earning caps (decision 4) ----------

/** A heavy player: 60 active minutes a day at about 90 s per sortie. */
export const HEAVY_SORTIES_PER_DAY = 40;
/** The cap is this many times a heavy player's expected income at their highest stage. */
export const DAILY_CAP_FACTOR = 3;
/** Above the cap, earnings are paid at this rate and the wallet is flagged. */
export const EARN_DECAY = 0.25;
export const DAILY_CAP_FLOOR: Readonly<WalletBalances> = { credits: 6000, alloy: 300, starCrystal: 30, quantumCore: 3 };

/**
 * [stage, Credits, Alloy, Star Crystal, Quantum Core] from
 * src/balance/wallet-cap-audit.ts (checked by tests/wallet-rules.test.ts):
 * - HEAVY_DAILY: expected income per day of a heavy player replaying the 10
 *   stages up to `stage` (40 sorties, Balanced, 97 % accuracy);
 * - MAX_SORTIE: the most one sortie on those stages can pay (any mode and
 *   Ascension tier, every bonus, a sector checkpoint, the Credit booster).
 */
export const HEAVY_DAILY: readonly (readonly [number, number, number, number, number])[] = [
  [1, 2200, 90, 0, 0],
  [10, 3232, 138, 8, 0],
  [25, 4176, 146, 12, 0],
  [50, 5740, 138, 8, 0],
  [100, 9216, 170, 20, 8.2],
  [200, 15488, 216, 22, 8.2],
  [300, 22544, 274, 26, 8.2],
  [500, 34904, 366, 28, 8.2],
  [750, 52032, 492, 20, 0],
  [1000, 68780, 624, 38, 12.2],
];
export const MAX_SORTIE: readonly (readonly [number, number, number, number, number])[] = [
  [1, 376, 9, 0, 0],
  [10, 1005, 41, 7, 0],
  [25, 1160, 46, 10, 0],
  [50, 1643, 41, 7, 0],
  [100, 2443, 61, 21, 5],
  [200, 4038, 68, 22, 5],
  [300, 5633, 74, 22, 5],
  [500, 8828, 86, 26, 7],
  [750, 12818, 88, 21, 2],
  [1000, 21308, 169, 41, 13],
];
/** Room above the formula ceiling of one sortie before it counts as implausible. */
export const SORTIE_SLACK = 1.25;
export const SORTIE_FLOOR: Readonly<WalletBalances> = { credits: 200, alloy: 5, starCrystal: 2, quantumCore: 1 };

function interpolate(table: readonly (readonly number[])[], stageInput: number): WalletBalances {
  const stage = Math.max(1, Math.min(1000, Math.floor(Number.isFinite(stageInput) ? stageInput : 1)));
  const out = emptyBalances();
  WALLET_CURRENCIES.forEach((key, index) => {
    // A higher stage never lowers a limit: running maximum, then linear between rows.
    let running = 0;
    let previous: [number, number] | null = null;
    for (const row of table) {
      running = Math.max(running, row[index + 1]!);
      if (row[0]! >= stage) {
        out[key] = previous === null ? running : previous[1] + ((running - previous[1]) * (stage - previous[0])) / (row[0]! - previous[0]);
        return;
      }
      previous = [row[0]!, running];
    }
    out[key] = running;
  });
  return out;
}

export function dailyEarnCap(stage: number): WalletBalances {
  const heavy = interpolate(HEAVY_DAILY, stage);
  const out = emptyBalances();
  for (const key of WALLET_CURRENCIES) out[key] = Math.max(DAILY_CAP_FLOOR[key], Math.ceil(heavy[key] * DAILY_CAP_FACTOR));
  return out;
}

export function sortieEarnMax(stage: number): WalletBalances {
  const max = interpolate(MAX_SORTIE, stage);
  const out = emptyBalances();
  for (const key of WALLET_CURRENCIES) out[key] = Math.max(SORTIE_FLOOR[key], Math.ceil(max[key] * SORTIE_SLACK));
  return out;
}

/**
 * Pays earnings against today's cap: in full up to the cap, at EARN_DECAY
 * above it. `earned` counts what was reported, so a second over-cap batch
 * decays as well. With `hardFactor`, reported earnings beyond hardFactor ×
 * cap pay nothing (earnings outside sorties, which no Warp limits).
 */
export function applyDailyCap(
  earnedToday: WalletBalances,
  deltas: WalletDeltas,
  cap: WalletBalances,
  hardFactor = Number.POSITIVE_INFINITY,
): { credited: WalletDeltas; earned: WalletBalances; decayed: WalletCurrency[] } {
  const credited: WalletDeltas = {};
  const earned = { ...earnedToday };
  const decayed: WalletCurrency[] = [];
  for (const key of WALLET_CURRENCIES) {
    const amount = Math.max(0, deltas[key] ?? 0);
    if (amount === 0) continue;
    const room = Math.max(0, cap[key] - earned[key]);
    const within = Math.min(amount, room);
    const over = amount - within;
    if (over > 0) decayed.push(key);
    const tailRoom = Math.max(0, cap[key] * hardFactor - Math.max(cap[key], earned[key]));
    const pay = within + Math.floor(Math.min(over, tailRoom) * EARN_DECAY);
    if (pay > 0) credited[key] = pay;
    earned[key] = Math.min(WALLET_MAX, earned[key] + amount);
  }
  return { credited, earned, decayed };
}

/** An earning outside a sortie (mission, Expedition…) is at most this many sorties' ceiling. */
export const EARN_OP_SORTIES = 3;
/**
 * Earnings outside a sortie stop paying once the day's reported earnings
 * reach this many daily caps (at most cap + 25% of one more cap a day).
 */
export const EARN_OUTSIDE_HARD_CAPS = 2;

// ---------- Sortie plausibility (design §5.2) ----------

export const MIN_SORTIE_MS = 15_000;
export const MAX_WORDS_PER_SECOND = 4;
/** A sortie that is too fast keeps this share of its earnings (and is flagged). */
export const IMPLAUSIBLE_SHARE = 0.1;

export type SortieOutcome = "cleared" | "failed" | "abandoned";

/**
 * Earnings of a finished sortie that are plausible for the time it took on
 * the server clock. `startedAt` is null when the server never saw it start.
 */
export function checkSortie(
  input: { stage: number; words: number; earnings: WalletDeltas },
  startedAt: number | null,
  now: number,
): { earnings: WalletDeltas; flags: string[] } {
  const flags: string[] = [];
  const max = sortieEarnMax(input.stage);
  let share = 1;
  if (startedAt === null) {
    flags.push("sortie-unknown");
  } else {
    const seconds = Math.max(0, now - startedAt) / 1000;
    if (seconds * 1000 < MIN_SORTIE_MS) {
      flags.push("sortie-too-fast");
      share = IMPLAUSIBLE_SHARE;
    }
    const words = Math.max(0, Math.floor(Number(input.words) || 0));
    if (seconds > 0 && words / seconds > MAX_WORDS_PER_SECOND) {
      flags.push("typing-too-fast");
      share = Math.min(share, EARN_DECAY);
    }
  }
  const earnings: WalletDeltas = {};
  for (const key of WALLET_CURRENCIES) {
    let amount = Math.max(0, input.earnings[key] ?? 0);
    if (amount > max[key]) {
      if (!flags.includes("sortie-over-max")) flags.push("sortie-over-max");
      amount = max[key];
    }
    amount = Math.floor(amount * share);
    if (amount > 0) earnings[key] = amount;
  }
  return { earnings, flags };
}

// ---------- Earnings with a fixed amount ----------

/** Daily Lessons rewards are fixed (src/lessons/chain.ts): opId "lessons:<day>:three|five". */
export function fixedEarning(opId: string): WalletDeltas | null {
  const lesson = /^lessons:\d+:(three|five)$/.exec(opId);
  if (lesson !== null) {
    const reward = LESSON_REWARDS[lesson[1] as "three" | "five"];
    return sanitizeDeltas({ credits: reward.credits, starCrystal: reward.starCrystal });
  }
  return null;
}

// ---------- Big rewards (decision 5) ----------

export const BIG_NEWBIE_DAY = 7;
export const BIG_STREAK_DAYS = 30;

/** Daily Hub claims that need a registered account with a verified email (gift codes: their own flag). */
export function isBigClaimKey(key: string): boolean {
  if (key === "liveops:newbie:" + BIG_NEWBIE_DAY) return true;
  const streak = /^liveops:streak:(\d+)$/.exec(key);
  return streak !== null && Number(streak[1]) >= BIG_STREAK_DAYS;
}

// ---------- Warp on the server ----------

export const WARP_TANKS = 100 + 300;

/** Adds Warp (Active first, then Reserve); what does not fit waits in `pending`. */
export function fillWarp(input: WarpCharge, pending: number, amount: number, now: number): { warp: WarpCharge; pending: number } {
  const w = reconcileWarp(input, now);
  let rest = Math.max(0, Math.floor(pending)) + Math.max(0, Math.floor(amount));
  const active = Math.min(WARP_POLICY.activeCap - w.current, rest);
  w.current += active;
  rest -= active;
  const reserve = Math.min(WARP_POLICY.reserveCap - w.reserve, rest);
  w.reserve += reserve;
  rest -= reserve;
  if (w.current === WARP_POLICY.activeCap) w.activeProgressMs = 0;
  if (w.reserve === WARP_POLICY.reserveCap) w.reserveProgressMs = 0;
  return { warp: w, pending: rest };
}

// ---------- The day ledger ----------

/** One money change in the wallet's day ledger. */
export type WalletOp = {
  /** opId */
  o: string;
  /** kind: spend | earn | sortie | refuel | claim | admin | migrate | release */
  k: string;
  /** source */
  s: string;
  /** what was applied (signed) */
  d: WalletDeltas;
  /** Warp change, if any */
  w?: number;
  /** server time (ms) */
  t: number;
};

/** opIds remembered for idempotency (a retry with one of them changes nothing). */
export const RECENT_OPS = 300;
export const DAY_LEDGER_MAX_OPS = 500;

/** An earlier day of the ledger, grouped by kind and source (count and sums). */
export type WalletDayGroup = { k: string; s: string; n: number; d: WalletDeltas; w?: number };

/**
 * Days kept 90 days must stay small on the 500 MB database: every op of a
 * day is grouped by kind and source (about 0.6 KB a player-day instead of
 * about 6 KB). Today's full ledger stays in the wallet row.
 */
export function compactLedger(ops: readonly WalletOp[]): WalletDayGroup[] {
  const groups = new Map<string, WalletDayGroup>();
  for (const op of ops) {
    // Sortie sources carry the stage ("finish:cleared:12"): one group per outcome, not per stage.
    const sourceName = op.k === "sortie" ? op.s.replace(/:\d+$/, "") : op.s;
    const id = op.k + "|" + sourceName;
    const group = groups.get(id) ?? { k: op.k, s: sourceName, n: 0, d: {} };
    group.n += 1;
    for (const key of WALLET_CURRENCIES) if (op.d[key]) group.d[key] = (group.d[key] ?? 0) + op.d[key]!;
    if (op.w) group.w = (group.w ?? 0) + op.w;
    groups.set(id, group);
  }
  return [...groups.values()];
}

export function ledgerTotals(ops: readonly WalletOp[]): WalletDeltas & { warp?: number } {
  const total: Record<string, number> = {};
  for (const op of ops) {
    for (const key of WALLET_CURRENCIES) if (op.d[key]) total[key] = (total[key] ?? 0) + op.d[key]!;
    if (op.w) total.warp = (total.warp ?? 0) + op.w;
  }
  return total;
}
