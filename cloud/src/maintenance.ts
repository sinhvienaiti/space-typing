import type { Sql } from "./db";
import { nowIso } from "./http";
import { gameDay } from "../../src/liveops/time";

/**
 * Daily clean-up (Cron Trigger in cloud/wrangler.jsonc, or POST
 * /internal/admin/maintenance). Removes rows nothing reads any more, so the
 * 500 MB database and its indexes do not fill with dead sessions.
 *
 * Each deleted row is a written row on the D1 Free plan (index rows too), so
 * every statement removes at most BATCH rows per run; a backlog clears over
 * a few days.
 */
const BATCH = 5000;
const DAY = 86_400_000;

/** Wallet day ledgers older than this many game days are deleted (decision 3). */
export const WALLET_DAYS_KEPT = 90;

/** Feedback marked resolved is kept this long, then deleted. */
export const RESOLVED_FEEDBACK_DAYS_KEPT = 365;

export async function cleanup(db: Sql, now: number): Promise<Record<string, number>> {
  const [sessions, tokens, limits, outbox, links, walletDays, feedback] = await db.batch([
    // Expired, or signed out more than a week ago (kept a week for the Admin's session list).
    db.stmt(
      `delete from sessions where rowid in (select rowid from sessions
         where expires_at < ?1 or (revoked_at is not null and revoked_at < ?2) limit ${BATCH})`,
      nowIso(now),
      nowIso(now - 7 * DAY),
    ),
    // Email links: expired, or used more than a day ago.
    db.stmt(
      `delete from one_time_tokens where rowid in (select rowid from one_time_tokens
         where expires_at < ?1 or (used_at is not null and used_at < ?2) limit ${BATCH})`,
      nowIso(now),
      nowIso(now - DAY),
    ),
    // Rate-limit windows that have ended (rate_limits.reset_at is ms since epoch).
    db.stmt(`delete from rate_limits where rowid in (select rowid from rate_limits where reset_at < ?1 limit ${BATCH})`, now),
    // Sent or failed emails older than a month.
    db.stmt(
      `delete from email_outbox where rowid in (select rowid from email_outbox
         where created_at < ?1 and (sent_at is not null or error is not null) limit ${BATCH})`,
      nowIso(now - 30 * DAY),
    ),
    // Unsent emails keep no live link after their 3-day validity.
    db.stmt("update email_outbox set body = '[expired]' where sent_at is null and created_at < ?1 and body <> '[expired]'", nowIso(now - 3 * DAY)),
    // Wallet day ledgers (one row per player and day; WITHOUT ROWID, so by key).
    db.stmt(
      `delete from wallet_days where (account_id, day) in (select account_id, day from wallet_days where day < ?1 limit ${BATCH})`,
      gameDay(now) - WALLET_DAYS_KEPT,
    ),
    // Player feedback an Admin resolved long ago (new and read messages stay).
    db.stmt(
      `delete from player_feedback where rowid in (select rowid from player_feedback
         where status = 'resolved' and handled_at < ?1 limit ${BATCH})`,
      nowIso(now - RESOLVED_FEEDBACK_DAYS_KEPT * DAY),
    ),
  ]);
  return {
    sessions: sessions ?? 0,
    tokens: tokens ?? 0,
    rateLimits: limits ?? 0,
    emails: outbox ?? 0,
    expiredLinks: links ?? 0,
    walletDays: walletDays ?? 0,
    feedback: feedback ?? 0,
  };
}
