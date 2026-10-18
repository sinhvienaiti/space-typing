import { checkFeedback, FEEDBACK_PER_ACCOUNT_HOUR, FEEDBACK_PER_IP_HOUR, FEEDBACK_STATUSES, type FeedbackStatus } from "../../src/online/feedback-rules";
import type { Auth, Context } from "./accounts";
import { peekRateLimit, rateLimitStmt, type Sql } from "./db";
import { ApiError, nowIso } from "./http";

/**
 * Player feedback: ideas, bug reports and contact messages sent from the
 * game (POST /api/account/feedback), kept in player_feedback for the Admin's
 * Feedback queue (admin.ts). Guests may send too (every online player has an
 * account); a player and a network may send only a few an hour, counted only
 * when a message is stored.
 */
const HOUR = 3_600_000;

export async function submitFeedback(db: Sql, auth: Auth, raw: Record<string, unknown>, context: Context): Promise<{ id: string }> {
  const check = checkFeedback(raw);
  if (!check.ok) throw new ApiError(400, "invalid", check.reason, { field: check.field });
  const { category, message, contactEmail } = check.value;
  const details = { ...check.value.context };
  // The browser's own description, when the game did not send one.
  if (details.userAgent === undefined && context.userAgent !== "") details.userAgent = context.userAgent.slice(0, 300);
  const accountKey = "feedback:" + auth.account.id;
  const ipKey = "feedback-ip:" + context.ip;
  const now = context.now;
  if ((await peekRateLimit(db, accountKey, now)) >= FEEDBACK_PER_ACCOUNT_HOUR || (await peekRateLimit(db, ipKey, now)) >= FEEDBACK_PER_IP_HOUR) {
    throw new ApiError(429, "rate-limited", "You have sent several messages just now. Please try again in an hour.");
  }
  const id = crypto.randomUUID();
  await db.batch([
    db.stmt(
      `insert into player_feedback (id, account_id, account_kind, display_name, category, message, contact_email, context, status, created_at)
       values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'new', ?9)`,
      id, auth.account.id, auth.account.kind, auth.account.display_name, category, message, contactEmail, JSON.stringify(details), nowIso(now),
    ),
    rateLimitStmt(db, accountKey, HOUR, now),
    rateLimitStmt(db, ipKey, HOUR, now),
  ]);
  return { id };
}

/** What a player's own export carries (GET /export). */
export async function feedbackForExport(db: Sql, accountId: string): Promise<Record<string, unknown>[]> {
  return db.all("select id, category, message, contact_email, status, created_at from player_feedback where account_id = ?1 order by created_at", accountId);
}

/** Account deletion keeps a report readable but forgets who sent it and how to reach them. */
export function forgetFeedbackSender(db: Sql, accountId: string): D1PreparedStatement {
  return db.stmt("update player_feedback set account_id = null, display_name = 'Deleted pilot', contact_email = null where account_id = ?1", accountId);
}

export type FeedbackRow = {
  id: string;
  account_id: string | null;
  account_kind: string | null;
  display_name: string | null;
  category: string;
  message: string;
  contact_email: string | null;
  context: string;
  status: FeedbackStatus;
  admin_note: string | null;
  created_at: string;
  handled_at: string | null;
  handled_by: string | null;
};

/** Admin queue: newest first, filtered by status, category and text; with the count of each status. */
export async function listFeedback(db: Sql, query: URLSearchParams): Promise<Record<string, unknown>> {
  const where: string[] = [];
  const params: unknown[] = [];
  const status = query.get("status");
  // "open": everything not resolved yet (new and read), the working queue.
  if (status === "open") where.push("f.status <> 'resolved'");
  else if (status !== null && (FEEDBACK_STATUSES as readonly string[]).includes(status)) {
    params.push(status);
    where.push(`f.status = ?${params.length}`);
  }
  const category = query.get("category");
  if (category === "idea" || category === "bug" || category === "contact") {
    params.push(category);
    where.push(`f.category = ?${params.length}`);
  }
  const text = (query.get("q") ?? "").trim().toLowerCase().replace(/[%_]/g, "");
  if (text !== "") {
    params.push("%" + text + "%");
    const n = params.length;
    where.push(`(lower(f.message) like ?${n} or lower(coalesce(f.display_name, '')) like ?${n} or lower(coalesce(f.contact_email, '')) like ?${n} or f.account_id like ?${n})`);
  }
  const clause = where.length === 0 ? "" : "where " + where.join(" and ");
  const limit = Math.max(1, Math.min(100, Number(query.get("limit") ?? 30) || 30));
  const offset = Math.max(0, Number(query.get("offset") ?? 0) || 0);
  const [total, counts, rows] = await Promise.all([
    db.first<{ n: number }>(`select count(*) as n from player_feedback f ${clause}`, ...params),
    db.all<{ status: string; n: number }>("select status, count(*) as n from player_feedback group by status"),
    db.all<FeedbackRow & { account_status: string | null; pilot_code: string | null; account_email: string | null }>(
      `select f.*, a.status as account_status, a.pilot_code, a.email as account_email
         from player_feedback f left join accounts a on a.id = f.account_id
         ${clause} order by f.created_at desc limit ${limit} offset ${offset}`,
      ...params,
    ),
  ]);
  const byStatus: Record<string, number> = { new: 0, read: 0, resolved: 0 };
  for (const row of counts) byStatus[row.status] = Number(row.n);
  return {
    total: Number(total?.n ?? 0),
    counts: byStatus,
    feedback: rows.map((row) => ({ ...row, context: parseContext(row.context) })),
  };
}

function parseContext(text: string): Record<string, unknown> {
  try {
    const value = JSON.parse(text) as unknown;
    return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Marks a message new, read or resolved, with an optional note for other Admins. */
export function feedbackStatusStmt(db: Sql, id: string, status: unknown, note: unknown, actor: string, now: number): D1PreparedStatement {
  if (typeof status !== "string" || !(FEEDBACK_STATUSES as readonly string[]).includes(status)) throw new ApiError(400, "invalid", "Unknown status.");
  const text = typeof note === "string" ? note.trim().slice(0, 500) : null;
  return db.stmt(
    `update player_feedback set status = ?2, handled_at = case when ?2 = 'new' then null else ?3 end,
            handled_by = case when ?2 = 'new' then null else ?4 end, admin_note = coalesce(?5, admin_note)
      where id = ?1`,
    id, status, nowIso(now), actor, text === "" ? null : text,
  );
}

export async function feedbackSender(db: Sql, id: string): Promise<{ account_id: string | null } | null> {
  return db.first<{ account_id: string | null }>("select account_id from player_feedback where id = ?1", id);
}
