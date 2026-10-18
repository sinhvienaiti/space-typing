import type { DailyGoal, LiveOpsReward } from "../../src/liveops/policy";
import { runClaim, type ClaimRequest } from "../../src/liveops/claims";
import {
  buyStreakShield,
  createLiveOpsState,
  deliverMessages,
  recordLiveOps,
  rolloverLiveOps,
  sanitizeLiveOpsState,
  sanitizeReward,
  setDailyGoal,
  type LiveOpsClaim,
  type LiveOpsDelivery,
  type LiveOpsProgress,
  type LiveOpsState,
} from "../../src/liveops/state";
import { gameDay } from "../../src/liveops/time";
import { sha256Hex } from "./crypto";
import { isUniqueViolation, peekRateLimit, rateLimitStmt, type Sql } from "./db";
import { ApiError, nowIso } from "./http";
import { FIRST_REPORT_WINDOW_MS, plausibleProgress, trustImportedLiveops } from "./liveops-rules";
import { isBigClaimKey } from "../../src/economy/wallet-rules";
import type { AccountRow } from "./accounts";
import type { Env } from "./env";
import { archiveStmt, claimIntoWallet, loadWallet, spendFromWallet, walletPhase, walletUpdateStmt, walletView, type WalletView } from "./wallet";

/**
 * Daily Hub on the server clock, with the same pure rules the game uses
 * offline (src/liveops). The state row has a version: every write says
 * "only if the version is still N", and a claim's ledger row is inserted in
 * the same atomic batch under the same condition, so concurrent requests
 * can neither lose an update nor pay a reward twice.
 *
 * Delivery: the ledger is the record of what the server paid. GET
 * /liveops?after=<id> returns the player's ledger rows after that id, so a
 * save that missed a confirmed claim (timeout, closed tab, full Warp tanks)
 * can apply it later by its key (src/liveops/controller.ts).
 */
export type { ClaimRequest };

function factory(request: ClaimRequest): (state: LiveOpsState, day: number, now: number) => LiveOpsClaim {
  if (request === null || typeof request !== "object") throw new ApiError(400, "invalid", "Unknown claim.");
  return (state, day, now) => runClaim(request, state, day, now);
}

/** A ledger row as the client sees it (cloud → src/liveops/controller.ts). */
export type LedgerEntry = { id: number; key: string; source: string; reward: LiveOpsReward };
/** Ledger rows per GET; a client that is further behind catches up over several visits. */
const LEDGER_PAGE = 100;

/** Admin mail and redeemed gift codes that should be in this player's mailbox now. */
async function deliveries(db: Sql, accountId: string, now: number): Promise<LiveOpsDelivery[]> {
  const at = nowIso(now);
  const [mail, codes] = await Promise.all([
    db.all<{ id: string; title: string; body: string; reward: string; ends_at: string | null }>(
      `select id, title, body, reward, ends_at from mail
        where revoked_at is null and starts_at <= ?2 and (ends_at is null or ends_at > ?2)
          and (target_account_id is null or target_account_id = ?1)`,
      accountId,
      at,
    ),
    db.all<{ id: string; title: string; body: string; reward: string }>(
      `select g.id, g.title, g.body, g.reward from gift_code_redemptions r join gift_codes g on g.id = r.code_id where r.account_id = ?1`,
      accountId,
    ),
  ]);
  return [
    ...mail.map((row) => ({
      id: "mail-" + row.id,
      title: row.title,
      body: row.body,
      reward: sanitizeReward(JSON.parse(row.reward)),
      ...(row.ends_at !== null ? { expiresDay: gameDay(new Date(row.ends_at).getTime()) } : {}),
    })),
    ...codes.map((row) => ({ id: "code-" + row.id, title: row.title, body: row.body, reward: sanitizeReward(JSON.parse(row.reward)) })),
  ];
}

/** `progressAt`: time of the last accepted progress report (ms), null before the first. */
type Loaded = { state: LiveOpsState; version: number; progressAt: number | null };

/**
 * Current state, turned over to today, stored if it changed. `withMail`
 * also delivers Admin mail and gift-code mail. Only opening the hub (GET)
 * and redeeming a code ask for it: the mail query reads every broadcast
 * mail still running, and play progress arrives every minute, which would
 * spend the D1 Free plan's 5 million rows read a day at a few hundred players.
 */
async function load(db: Sql, accountId: string, now: number, withMail = false): Promise<Loaded> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    let row = await db.first<{ data: string; version: number; progress_at: number | null }>(
      "select data, version, progress_at from liveops_states where account_id = ?1",
      accountId,
    );
    if (row === null) {
      await db.run(
        "insert into liveops_states (account_id, data, version, updated_at) values (?1, ?2, 0, ?3) on conflict (account_id) do nothing",
        accountId,
        JSON.stringify(createLiveOpsState()),
        nowIso(now),
      );
      continue;
    }
    const version = Number(row.version);
    const progressAt = row.progress_at === null ? null : Number(row.progress_at);
    const stored = sanitizeLiveOpsState(JSON.parse(row.data));
    const day = gameDay(now);
    const turned = rolloverLiveOps(stored, day);
    const next = withMail ? deliverMessages(turned, await deliveries(db, accountId, now), day) : turned;
    if (next === stored) return { state: next, version, progressAt };
    const changed = await db.run(
      "update liveops_states set data = ?3, version = version + 1, updated_at = ?4 where account_id = ?1 and version = ?2",
      accountId,
      version,
      JSON.stringify(next),
      nowIso(now),
    );
    if (changed === 1) return { state: next, version: version + 1, progressAt };
    row = null;
  }
  throw new ApiError(409, "busy", "Your Daily Hub is updating on another device. Try again.");
}

/** Stores `next` if nobody wrote in between; `progressAt` also moves the progress clock. */
async function save(db: Sql, accountId: string, loaded: Loaded, next: LiveOpsState, now: number, progressAt?: number): Promise<boolean> {
  const changed = await db.run(
    `update liveops_states set data = ?3, version = version + 1, updated_at = ?4, progress_at = coalesce(?5, progress_at)
      where account_id = ?1 and version = ?2`,
    accountId,
    loaded.version,
    JSON.stringify(next),
    nowIso(now),
    progressAt ?? null,
  );
  return changed === 1;
}

/**
 * The hub for a GET, with delivery data:
 * - `ledgerHead`: the newest ledger id of the account (a save that has never
 *   tracked deliveries starts counting there);
 * - with `after` (the client's ledger cursor): `ledger`, the rows after it,
 *   oldest first, at most LEDGER_PAGE (the client advances its cursor to the
 *   last row it got, never to `ledgerHead`, which may be newer).
 * Both reads use the (account_id, id) index: about one row read plus one
 * per new ledger row.
 */
export async function getLiveops(
  db: Sql,
  accountId: string,
  now: number,
  after: number | null = null,
  walletPhaseNow = 0,
): Promise<{ state: LiveOpsState; serverTime: number; accountId: string; ledgerHead: number; walletPhase: number; ledger?: LedgerEntry[] }> {
  const state = (await load(db, accountId, now, true)).state;
  const [head, rows] = await Promise.all([
    db.first<{ head: number | null }>("select max(id) as head from reward_ledger where account_id = ?1", accountId),
    after === null
      ? Promise.resolve([])
      : db.all<{ id: number; key: string; source: string; reward: string }>(
          `select id, key, source, reward from reward_ledger where account_id = ?1 and id > ?2 order by id limit ${LEDGER_PAGE}`,
          accountId,
          after,
        ),
  ]);
  // walletPhase ≥ 2: claims are paid into the server wallet; the client adopts its balances.
  const base = { state, serverTime: now, accountId, ledgerHead: Number(head?.head ?? 0), walletPhase: walletPhaseNow };
  if (after === null) return base;
  return { ...base, ledger: rows.map((row) => ({ id: Number(row.id), key: row.key, source: row.source, reward: sanitizeReward(JSON.parse(row.reward)) })) };
}

/** First sign-in on a device that played offline: keep its Daily Hub if the server has none yet. */
export async function importLiveops(db: Sql, accountId: string, local: unknown, now: number): Promise<{ state: LiveOpsState; serverTime: number }> {
  const day = gameDay(now);
  const imported = rolloverLiveOps(trustImportedLiveops(sanitizeLiveOpsState(local), day), day);
  await db.run(
    "insert into liveops_states (account_id, data, version, updated_at) values (?1, ?2, 0, ?3) on conflict (account_id) do nothing",
    accountId,
    JSON.stringify(imported),
    nowIso(now),
  );
  return getLiveops(db, accountId, now);
}

/**
 * Play progress, kept only as far as it is plausible for the wall time since
 * this account's last accepted report (liveops-rules.ts: at most 4 words a
 * second, play time no faster than real time, and so on), and at most one
 * report's worth (PROGRESS_CAPS). What does not fit is dropped.
 */
export async function recordProgress(db: Sql, accountId: string, progress: Record<string, unknown>, now: number): Promise<{ state: LiveOpsState; goalReached: boolean }> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const loaded = await load(db, accountId, now);
    const elapsed = loaded.progressAt === null ? FIRST_REPORT_WINDOW_MS : now - loaded.progressAt;
    const clean: LiveOpsProgress = plausibleProgress(progress, elapsed);
    const result = recordLiveOps(loaded.state, clean, gameDay(now));
    if (result.state === loaded.state || (await save(db, accountId, loaded, result.state, now, now))) return result;
  }
  throw new ApiError(409, "busy", "Try again.");
}

export async function setGoal(db: Sql, accountId: string, goal: unknown, now: number): Promise<LiveOpsState> {
  if (goal !== 50 && goal !== 100 && goal !== 200) throw new ApiError(400, "invalid", "Goal must be 50, 100 or 200.");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const loaded = await load(db, accountId, now);
    const next = setDailyGoal(loaded.state, goal as DailyGoal, gameDay(now));
    if (await save(db, accountId, loaded, next, now)) return next;
  }
  throw new ApiError(409, "busy", "Try again.");
}

export async function claim(
  db: Sql,
  env: Env,
  account: AccountRow,
  request: ClaimRequest,
  now: number,
): Promise<{ state: LiveOpsState; reward: LiveOpsReward; key: string; label: string; wallet?: WalletView; held?: boolean }> {
  const accountId = account.id;
  const make = factory(request);
  // Admin mail already in an inbox stays claimable after a revoke unless checked here.
  const mailId = request.kind === "message" && String(request.id).startsWith("mail-") ? String(request.id) : null;
  const withdrawn =
    mailId !== null &&
    (await db.first<{ revoked_at: string | null }>("select revoked_at from mail where id = ?1", mailId.slice("mail-".length)))?.revoked_at != null;
  // Gift codes marked "big" by Admin (decision 5): paid only to a verified email.
  const codeId = request.kind === "message" && String(request.id).startsWith("code-") ? String(request.id).slice("code-".length) : null;
  const bigCode = codeId !== null && Number((await db.first<{ big: number }>("select big from gift_codes where id = ?1", codeId))?.big ?? 0) === 1;
  const walletMode = walletPhase(env) >= 2;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const loaded = await load(db, accountId, now);
    if (withdrawn) {
      const inbox = loaded.state.inbox.filter((item) => item.id !== mailId || item.claimed);
      if (inbox.length !== loaded.state.inbox.length) await save(db, accountId, loaded, { ...loaded.state, inbox }, now);
      throw new ApiError(409, "withdrawn", "This gift was withdrawn.");
    }
    const result = make(loaded.state, gameDay(now), now);
    if (!result.ok) throw new ApiError(409, "claim-refused", result.reason);
    const wallet = walletMode ? await loadWallet(db, accountId, now) : null;
    if (wallet !== null) {
      // Wallet mode: the reward goes straight into the server wallet, in the same atomic
      // batch as the hub state (no reward_ledger row: the wallet's day ledger records it).
      const paid = claimIntoWallet(wallet, result.key, result.reward, result.label, bigCode || isBigClaimKey(result.key), account, now);
      if (paid === null) throw new ApiError(409, "already-claimed", "Already claimed.");
      const changes = await db.batch([
        ...(mailId === null
          ? []
          : [
              db.stmt(
                `update mail set claimed_count = claimed_count + 1 where id = ?1
                  and (select version from liveops_states where account_id = ?2) = ?3 and (select version from wallets where account_id = ?2) = ?4`,
                mailId.slice("mail-".length), accountId, loaded.version, wallet.version,
              ),
            ]),
        walletUpdateStmt(db, accountId, paid.before, paid.wallet, result.key, now, "and (select version from liveops_states where account_id = ?1) = ?23", [loaded.version]),
        ...(paid.archive === null ? [] : [archiveStmt(db, accountId, paid.archive, result.key)]),
        db.stmt(
          `update liveops_states set data = ?3, version = version + 1, updated_at = ?4 where account_id = ?1 and version = ?2
            and (select last_op from wallets where account_id = ?1) = ?5 and (select version from wallets where account_id = ?1) = ?6`,
          accountId, loaded.version, JSON.stringify(result.state), nowIso(now), result.key, wallet.version + 1,
        ),
      ]);
      if (changes[changes.length - 1] === 1) {
        return {
          state: result.state,
          reward: result.reward,
          key: result.key,
          label: result.label,
          wallet: walletView({ ...paid.wallet, version: wallet.version + 1 }, env, now),
          held: paid.held,
        };
      }
      continue;
    }
    let changes: number[];
    try {
      changes = await db.batch([
        // Admin's "claimed" count, under the same condition as the ledger row (rolled back with it).
        ...(mailId === null
          ? []
          : [
              db.stmt(
                "update mail set claimed_count = claimed_count + 1 where id = ?1 and (select version from liveops_states where account_id = ?2) = ?3",
                mailId.slice("mail-".length), accountId, loaded.version,
              ),
            ]),
        db.stmt(
          `insert into reward_ledger (account_id, key, source, reward, created_at)
           select ?1, ?2, ?3, ?4, ?5 where (select version from liveops_states where account_id = ?1) = ?6`,
          accountId, result.key, "liveops:" + request.kind, JSON.stringify(result.reward), nowIso(now), loaded.version,
        ),
        db.stmt(
          "update liveops_states set data = ?3, version = version + 1, updated_at = ?4 where account_id = ?1 and version = ?2",
          accountId, loaded.version, JSON.stringify(result.state), nowIso(now),
        ),
      ]);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ApiError(409, "already-claimed", "Already claimed.");
      throw error;
    }
    if (changes[changes.length - 1] === 1) return { state: result.state, reward: result.reward, key: result.key, label: result.label };
  }
  throw new ApiError(409, "busy", "Your Daily Hub is updating on another device. Try again.");
}

/**
 * Streak shield. Wallet mode (phase ≥ 2): the Star Crystals come from the
 * server wallet in the same batch. Otherwise the client pays from its save.
 */
export async function buyShield(db: Sql, env: Env, accountId: string, starCrystals: unknown, now: number): Promise<{ state: LiveOpsState; price: number; wallet?: WalletView }> {
  const walletMode = walletPhase(env) >= 2;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const loaded = await load(db, accountId, now);
    const stored = walletMode ? await loadWallet(db, accountId, now) : null;
    if (stored !== null) {
      const check = buyStreakShield(loaded.state, stored.balances.starCrystal);
      if (!check.ok) throw new ApiError(409, "claim-refused", check.reason);
      const opId = "shield:" + crypto.randomUUID();
      const paid = spendFromWallet(stored, { starCrystal: check.price }, opId, "liveops:shield", now);
      const changes = await db.batch([
        walletUpdateStmt(db, accountId, stored, paid.wallet, opId, now, "and (select version from liveops_states where account_id = ?1) = ?23", [loaded.version]),
        ...(paid.archive === null ? [] : [archiveStmt(db, accountId, paid.archive, opId)]),
        db.stmt(
          `update liveops_states set data = ?3, version = version + 1, updated_at = ?4 where account_id = ?1 and version = ?2
            and (select last_op from wallets where account_id = ?1) = ?5`,
          accountId, loaded.version, JSON.stringify(check.state), nowIso(now), opId,
        ),
      ]);
      if (changes[changes.length - 1] === 1) return { state: check.state, price: check.price, wallet: walletView({ ...paid.wallet, version: stored.version + 1 }, env, now) };
      continue;
    }
    const result = buyStreakShield(loaded.state, Number(starCrystals) || 0);
    if (!result.ok) throw new ApiError(409, "claim-refused", result.reason);
    const changes = await db.batch([
      db.stmt(
        `insert into reward_ledger (account_id, key, source, reward, note, created_at)
         select ?1, ?2, 'liveops:shield', ?3, 'Star Crystal purchase', ?4 where (select version from liveops_states where account_id = ?1) = ?5`,
        accountId, "liveops:shield:" + crypto.randomUUID(), JSON.stringify({ shields: 1, starCrystal: -result.price }), nowIso(now), loaded.version,
      ),
      db.stmt(
        "update liveops_states set data = ?3, version = version + 1, updated_at = ?4 where account_id = ?1 and version = ?2",
        accountId, loaded.version, JSON.stringify(result.state), nowIso(now),
      ),
    ]);
    if (changes[1] === 1) return { state: result.state, price: result.price };
  }
  throw new ApiError(409, "busy", "Try again.");
}

/** Wrong gift codes allowed per window, per player and per network (guessing codes online). */
const REDEEM_FAILS_PER_ACCOUNT = 10;
const REDEEM_FAILS_PER_IP = 40;
const REDEEM_FAIL_WINDOW_MS = 15 * 60_000;

/** Gift code: recorded once per player; the reward arrives as mail on the next load. */
export async function redeemCode(db: Sql, accountId: string, codeInput: unknown, now: number, ip = "local"): Promise<{ state: LiveOpsState; title: string }> {
  if (typeof codeInput !== "string") throw new ApiError(400, "invalid", "Enter a code.");
  const code = codeInput.trim().toUpperCase().replace(/\s+/g, "");
  const accountKey = "redeem-fail:" + accountId;
  const ipKey = "redeem-fail-ip:" + ip;
  // Only failures are counted (a write each), so honest redeems cost no extra write.
  if ((await peekRateLimit(db, accountKey, now)) >= REDEEM_FAILS_PER_ACCOUNT || (await peekRateLimit(db, ipKey, now)) >= REDEEM_FAILS_PER_IP) {
    throw new ApiError(429, "rate-limited", "Too many wrong codes. Try again in 15 minutes.");
  }
  const unknown = async (): Promise<never> => {
    await db.batch([rateLimitStmt(db, accountKey, REDEEM_FAIL_WINDOW_MS, now), rateLimitStmt(db, ipKey, REDEEM_FAIL_WINDOW_MS, now)]);
    throw new ApiError(404, "bad-code", "Unknown or expired code.");
  };
  if (code.length < 4 || code.length > 40) return unknown();
  const at = nowIso(now);
  const gift = await db.first<{ id: string; title: string; max_redemptions: number | null; redeemed_count: number }>(
    "select id, title, max_redemptions, redeemed_count from gift_codes where code_hash = ?1 and disabled_at is null and starts_at <= ?2 and (ends_at is null or ends_at > ?2)",
    await sha256Hex("gift:" + code),
    at,
  );
  if (gift === null) return unknown();
  let changes: number[];
  try {
    changes = await db.batch([
      db.stmt(
        `insert into gift_code_redemptions (code_id, account_id, redeemed_at)
         select ?1, ?2, ?3 where exists (select 1 from gift_codes where id = ?1 and (max_redemptions is null or redeemed_count < max_redemptions))`,
        gift.id, accountId, at,
      ),
      db.stmt(
        "update gift_codes set redeemed_count = redeemed_count + 1 where id = ?1 and exists (select 1 from gift_code_redemptions where code_id = ?1 and account_id = ?2 and redeemed_at = ?3)",
        gift.id, accountId, at,
      ),
    ]);
  } catch (error) {
    if (isUniqueViolation(error)) throw new ApiError(409, "code-used", "You already used this code.");
    throw error;
  }
  if (changes[0] === 0) throw new ApiError(409, "code-used-up", "This code has been fully redeemed.");
  return { state: (await load(db, accountId, now, true)).state, title: gift.title };
}
