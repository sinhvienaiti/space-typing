import { sanitizeReward } from "../../src/liveops/state";
import type { AccountRow } from "./accounts";
import { channelName } from "./chat-rules";
import { randomToken, sha256Hex } from "./crypto";
import { isUniqueViolation, type Sql } from "./db";
import type { Env } from "./env";
import { feedbackSender, feedbackStatusStmt, listFeedback } from "./feedback";
import { ApiError, json, nowIso, readJson } from "./http";
import { cleanup } from "./maintenance";
import { adminAdjust, adminSettlePurchase, adminWallet, loadWallet } from "./wallet";
import { SAVE_SUMMARY_SQL, storedSaveText } from "./saves";

/** Broadcast mail without an end date runs this long (every player's mailbox reads every running broadcast). */
const BROADCAST_DEFAULT_DAYS = 30;

/**
 * /internal/admin/* — called only by the Admin server (admin/account-bridge.mjs),
 * which checks the admin's role first. Each change writes admin_audit here
 * with the actor the bridge passes in x-admin-actor.
 */
const ID = /^[0-9a-f-]{36}$/;

function parseJson(text: unknown): unknown {
  try {
    return typeof text === "string" ? JSON.parse(text) : text;
  } catch {
    return null;
  }
}

function auditStmt(db: Sql, actor: string, action: string, target: string | null, details: Record<string, unknown>, now: number): D1PreparedStatement {
  return db.stmt("insert into admin_audit (actor, action, target, details, created_at) values (?1, ?2, ?3, ?4, ?5)", actor, action, target, JSON.stringify(details), nowIso(now));
}

function rewardLimits(reward: ReturnType<typeof sanitizeReward>): void {
  if ((reward.quantumCore ?? 0) > 50 || (reward.starCrystal ?? 0) > 5000 || (reward.credits ?? 0) > 1_000_000 || (reward.warp ?? 0) > 300 || (reward.alloy ?? 0) > 100_000) {
    throw new ApiError(400, "invalid", "Reward is above the safety limit (50 Quantum Core, 5,000 Star Crystal, 100,000 Alloy, 1,000,000 Credits, 300 Warp).");
  }
}

function dateInput(value: unknown, fallback: Date | null): Date | null {
  if (typeof value !== "string" || value === "") return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ApiError(400, "invalid", "Invalid date.");
  return date;
}

async function chatRoom(env: Env, channel: string): Promise<DurableObjectStub> {
  if (!/^(world:global|group:[0-9a-f-]{36}|dm:[0-9a-f-]{36}:[0-9a-f-]{36})$/.test(channel)) throw new ApiError(400, "invalid", "Unknown channel.");
  return env.CHAT.get(env.CHAT.idFromName(channel));
}

export async function handleAdmin(request: Request, db: Sql, env: Env, path: string, now: number): Promise<Response> {
  const actor = (request.headers.get("x-admin-actor") ?? "admin").slice(0, 120);
  const method = request.method;
  const url = new URL(request.url);
  const parts = path.split("/").filter(Boolean);

  if (method === "GET" && path === "/stats") {
    const dayStart = new Date(Math.floor((now + 7 * 3_600_000) / 86_400_000) * 86_400_000 - 7 * 3_600_000).toISOString();
    const row = await db.first<Record<string, number>>(
      `select
         sum(case when status <> 'deleted' then 1 else 0 end) as players,
         sum(case when kind = 'registered' and status <> 'deleted' then 1 else 0 end) as registered,
         sum(case when kind = 'guest' and status <> 'deleted' then 1 else 0 end) as guests,
         sum(case when status = 'banned' then 1 else 0 end) as banned,
         sum(case when created_at >= ?1 then 1 else 0 end) as newToday,
         sum(case when last_seen_at >= ?1 then 1 else 0 end) as activeToday,
         sum(case when last_seen_at >= ?2 then 1 else 0 end) as activeWeek
       from accounts`,
      dayStart,
      nowIso(now - 7 * 86_400_000),
    );
    const rewards = await db.first<{ n: number }>("select count(*) as n from reward_ledger where created_at >= ?1", dayStart);
    const reports = await db.first<{ n: number }>("select count(*) as n from chat_reports where resolved_at is null");
    const feedback = await db.first<{ n: number }>("select count(*) as n from player_feedback where status = 'new'");
    return json({
      players: Number(row?.players ?? 0),
      registered: Number(row?.registered ?? 0),
      guests: Number(row?.guests ?? 0),
      banned: Number(row?.banned ?? 0),
      newToday: Number(row?.newToday ?? 0),
      activeToday: Number(row?.activeToday ?? 0),
      activeWeek: Number(row?.activeWeek ?? 0),
      rewardsToday: Number(rewards?.n ?? 0),
      openReports: Number(reports?.n ?? 0),
      newFeedback: Number(feedback?.n ?? 0),
    });
  }

  if (method === "GET" && path === "/players") {
    const where: string[] = [];
    const params: unknown[] = [];
    const text = (url.searchParams.get("q") ?? "").trim().toLowerCase().replace(/[%_]/g, "");
    if (text !== "") {
      params.push("%" + text + "%");
      const n = params.length;
      where.push(`(lower(a.display_name) like ?${n} or a.email_normalized like ?${n} or a.id like ?${n} or lower(a.pilot_code) like ?${n})`);
    }
    const status = url.searchParams.get("status");
    if (status === "active" || status === "banned" || status === "deleted") {
      params.push(status);
      where.push(`a.status = ?${params.length}`);
    } else where.push("a.status <> 'deleted'");
    const kind = url.searchParams.get("kind");
    if (kind === "guest" || kind === "registered") {
      params.push(kind);
      where.push(`a.kind = ?${params.length}`);
    }
    const clause = "where " + where.join(" and ");
    const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") ?? 50) || 50));
    const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);
    const total = await db.first<{ n: number }>(`select count(*) as n from accounts a ${clause}`, ...params);
    const players = await db.all(
      `select a.id, a.kind, a.pilot_code, a.email, a.email_verified_at, a.display_name, a.status, a.ban_reason, a.banned_until, a.chat_muted_until,
              a.created_at, a.last_login_at, a.last_seen_at, s.revision as save_revision, s.updated_at as save_updated_at,
              json_extract(${SAVE_SUMMARY_SQL}, '$.highestUnlockedStage') as highest_stage, json_extract(${SAVE_SUMMARY_SQL}, '$.credits') as credits
         from accounts a left join player_saves s on s.account_id = a.id
         ${clause} order by coalesce(a.last_seen_at, a.created_at) desc limit ${limit} offset ${offset}`,
      ...params,
    );
    return json({ total: Number(total?.n ?? 0), players });
  }

  if (parts[0] === "players" && parts[1] !== undefined) {
    const id = parts[1];
    if (!ID.test(id)) throw new ApiError(400, "invalid", "Invalid player id.");
    const action = parts.slice(2).join("/");
    if (method === "GET" && action === "") {
      const account = await db.first(
        "select id, kind, pilot_code, email, email_verified_at, display_name, status, ban_reason, banned_until, chat_muted_until, birth_year, created_at, last_login_at, last_seen_at, deleted_at from accounts where id = ?1",
        id,
      );
      if (account === null) throw new ApiError(404, "not-found", "Player not found.");
      const [save, backups, liveops, ledger, sessions, mail, reports] = await Promise.all([
        db.first<{ revision: number; save_version: number; bytes: number; device: string | null; updated_at: string; summary: string }>(
          `select revision, save_version, bytes, device, updated_at, ${SAVE_SUMMARY_SQL} as summary from player_saves where account_id = ?1`,
          id,
        ),
        db.all("select id, revision, save_version, reason, created_at from player_save_backups where account_id = ?1 order by id desc", id),
        db.first<{ data: string; updated_at: string }>("select data, updated_at from liveops_states where account_id = ?1", id),
        db.all<{ reward: string }>("select key, source, reward, note, admin_actor, created_at from reward_ledger where account_id = ?1 order by id desc limit 100", id),
        db.all("select id, created_at, last_seen_at, expires_at, ip, user_agent from sessions where account_id = ?1 and revoked_at is null and expires_at > ?2 order by last_seen_at desc", id, nowIso(now)),
        db.all<{ reward: string }>("select id, title, body, reward, starts_at, ends_at, created_by, created_at, revoked_at from mail where target_account_id = ?1 order by created_at desc limit 50", id),
        db.all("select id, channel, text, reason, created_at, resolved_at from chat_reports where target_id = ?1 order by id desc limit 30", id),
      ]);
      return json({
        account,
        save: save === null ? null : { revision: save.revision, saveVersion: save.save_version, bytes: save.bytes, device: save.device, updatedAt: save.updated_at, summary: parseJson(save.summary) },
        backups,
        liveOps: liveops === null ? null : { data: parseJson(liveops.data), updated_at: liveops.updated_at },
        wallet: await adminWallet(db, env, id, now),
        ledger: ledger.map((row) => ({ ...row, reward: parseJson(row.reward) })),
        sessions,
        mail: mail.map((row) => ({ ...row, reward: parseJson(row.reward) })),
        reports,
      });
    }
    if (method === "GET" && action === "save") {
      const row = await db.first<{ revision: number; save_version: number; updated_at: string; data: string; data_gz: unknown }>(
        "select revision, save_version, updated_at, data, data_gz from player_saves where account_id = ?1",
        id,
      );
      if (row === null) throw new ApiError(404, "not-found", "This player has no cloud save.");
      return json({ revision: row.revision, saveVersion: row.save_version, updatedAt: row.updated_at, data: parseJson(await storedSaveText(row)) });
    }
    const body = method === "POST" ? await readJson(request) : {};
    if (method === "POST" && action === "ban") {
      const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : "";
      if (reason === "") throw new ApiError(400, "invalid", "A ban needs a reason.");
      const until = dateInput(body.until, null);
      const changes = await db.batch([
        db.stmt("update accounts set status = 'banned', ban_reason = ?2, banned_until = ?3 where id = ?1 and status <> 'deleted'", id, reason, until?.toISOString() ?? null),
        db.stmt("update sessions set revoked_at = ?2 where account_id = ?1 and revoked_at is null", id, nowIso(now)),
        auditStmt(db, actor, "player.ban", id, { reason, until: until?.toISOString() ?? null }, now),
      ]);
      if (changes[0] === 0) throw new ApiError(404, "not-found", "Player not found.");
      await (await chatRoom(env, channelName("world", "global"))).fetch("https://chat/admin/kick", { method: "POST", body: JSON.stringify({ accountId: id, reason: "Account suspended." }) });
      return json({ ok: true });
    }
    if (method === "POST" && action === "unban") {
      const changes = await db.batch([
        db.stmt("update accounts set status = 'active', ban_reason = null, banned_until = null where id = ?1 and status = 'banned'", id),
        auditStmt(db, actor, "player.unban", id, {}, now),
      ]);
      if (changes[0] === 0) throw new ApiError(404, "not-found", "Player is not banned.");
      return json({ ok: true });
    }
    if (method === "POST" && action === "mute") {
      const minutes = Math.max(0, Math.min(60 * 24 * 365, Number(body.minutes) || 0));
      const until = minutes === 0 ? null : nowIso(now + minutes * 60_000);
      await db.batch([
        db.stmt("update accounts set chat_muted_until = ?2 where id = ?1", id, until),
        auditStmt(db, actor, minutes === 0 ? "player.unmute" : "player.mute", id, { minutes, reason: String(body.reason ?? "").slice(0, 200) }, now),
      ]);
      if (minutes > 0) {
        await (await chatRoom(env, channelName("world", "global"))).fetch("https://chat/admin/kick", {
          method: "POST",
          body: JSON.stringify({ accountId: id, reason: "You are muted for " + minutes + " minutes." }),
        });
      }
      return json({ ok: true, mutedUntil: until });
    }
    if (method === "POST" && action === "sessions/revoke") {
      const changes = await db.batch([
        db.stmt("update sessions set revoked_at = ?2 where account_id = ?1 and revoked_at is null", id, nowIso(now)),
        auditStmt(db, actor, "player.sessions.revoke", id, {}, now),
      ]);
      return json({ revoked: changes[0] });
    }
    if (method === "POST" && action === "password-reset-link") {
      const row = await db.first<AccountRow>("select * from accounts where id = ?1 and kind = 'registered' and status <> 'deleted'", id);
      if (row?.email == null) throw new ApiError(404, "not-found", "Only registered players have a password.");
      const token = randomToken();
      const link = (env.PUBLIC_URL ?? "") + "/?reset=" + token;
      await db.batch([
        db.stmt(
          "insert into one_time_tokens (token_hash, account_id, purpose, created_at, expires_at) values (?1, ?2, 'reset-password', ?3, ?4)",
          await sha256Hex(token), id, nowIso(now), nowIso(now + 3_600_000),
        ),
        db.stmt("insert into email_outbox (to_email, subject, body, created_at) values (?1, ?2, ?3, ?4)", row.email, "Reset your Space Typing password", "Support sent you a password reset link:\n" + link + "\nIt works for 1 hour.", nowIso(now)),
        auditStmt(db, actor, "player.password-reset-link", id, {}, now),
      ]);
      return json({ link });
    }
    if (method === "POST" && action === "save/restore") {
      const backupId = Number(body.backupId);
      const backup = await db.first<{ data: string; data_gz: unknown; summary: string | null; save_version: number }>(
        "select data, data_gz, summary, save_version from player_save_backups where id = ?1 and account_id = ?2",
        backupId,
        id,
      );
      if (backup === null) throw new ApiError(404, "not-found", "Backup not found.");
      const bytes = new TextEncoder().encode(await storedSaveText(backup)).length;
      const current = await db.first<{ revision: number }>("select revision from player_saves where account_id = ?1", id);
      const revision = Number(current?.revision ?? 0) + 1;
      await db.batch([
        db.stmt(
          `insert into player_save_backups (account_id, revision, save_version, data, data_gz, summary, reason, created_at)
           select account_id, revision, save_version, data, data_gz, summary, 'before-admin-restore', ?2 from player_saves where account_id = ?1`,
          id, nowIso(now),
        ),
        db.stmt(
          `insert into player_saves (account_id, revision, save_version, data, data_gz, summary, upload_id, bytes, device, updated_at)
           select ?1, ?2, save_version, data, data_gz, summary, null, ?3, 'admin-restore', ?4 from player_save_backups where id = ?5 and account_id = ?1
           on conflict (account_id) do update set revision = excluded.revision, save_version = excluded.save_version, data = excluded.data,
             data_gz = excluded.data_gz, summary = excluded.summary, upload_id = null, bytes = excluded.bytes, device = excluded.device,
             updated_at = excluded.updated_at`,
          id, revision, bytes, nowIso(now), backupId,
        ),
        auditStmt(db, actor, "player.save.restore", id, { backupId, revision }, now),
      ]);
      return json({ revision });
    }
    if (method === "POST" && action === "mail") return json(await sendMail(db, actor, { ...body, target: id }, now));
    if (method === "POST" && action === "wallet") {
      if ((await loadWallet(db, id, now)) === null) throw new ApiError(404, "not-found", "This player has no server wallet yet.");
      return json(await (body.purchaseAction ? adminSettlePurchase : adminAdjust)(db, env, id, body, actor, now));
    }
  }

  if (method === "GET" && path === "/mail") {
    const rows = await db.all<{ reward: string }>(
      `select m.*, a.display_name as target_name, m.claimed_count as claimed
         from mail m left join accounts a on a.id = m.target_account_id order by m.created_at desc limit 200`,
    );
    return json({ mail: rows.map((row) => ({ ...row, reward: parseJson(row.reward) })) });
  }
  if (method === "POST" && path === "/mail") return json(await sendMail(db, actor, await readJson(request), now));
  if (method === "POST" && parts[0] === "mail" && parts[2] === "revoke" && parts[1] !== undefined) {
    const changes = await db.batch([
      db.stmt("update mail set revoked_at = ?2 where id = ?1 and revoked_at is null", parts[1], nowIso(now)),
      auditStmt(db, actor, "mail.revoke", parts[1], {}, now),
    ]);
    if (changes[0] === 0) throw new ApiError(404, "not-found", "Mail not found or already revoked.");
    return json({ ok: true });
  }

  if (method === "GET" && path === "/gift-codes") {
    const rows = await db.all<{ reward: string }>(
      "select id, code_hint, title, body, reward, max_redemptions, redeemed_count, starts_at, ends_at, created_by, created_at, disabled_at, big from gift_codes order by created_at desc limit 300",
    );
    return json({ codes: rows.map((row) => ({ ...row, reward: parseJson(row.reward) })) });
  }
  if (method === "POST" && path === "/gift-codes") {
    const body = await readJson(request);
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase().replace(/\s+/g, "") : "";
    if (!/^[A-Z0-9-]{4,40}$/.test(code)) throw new ApiError(400, "invalid", "Code: 4–40 letters, digits or dashes.");
    const reward = sanitizeReward(body.reward);
    if (Object.keys(reward).length === 0) throw new ApiError(400, "invalid", "A gift code needs a reward.");
    rewardLimits(reward);
    const max = body.maxRedemptions === undefined || body.maxRedemptions === null || body.maxRedemptions === "" ? null : Number(body.maxRedemptions);
    if (max !== null && (!Number.isInteger(max) || max < 1)) throw new ApiError(400, "invalid", "Max uses must be a whole number from 1.");
    const startsAt = dateInput(body.startsAt, new Date(now))!;
    const endsAt = dateInput(body.endsAt, null);
    if (endsAt !== null && endsAt <= startsAt) throw new ApiError(400, "invalid", "The end must be after the start.");
    const id = crypto.randomUUID();
    const hint = code.slice(0, 2) + "…" + code.slice(-2);
    try {
      await db.batch([
        db.stmt(
          `insert into gift_codes (id, code_hash, code_hint, title, body, reward, max_redemptions, starts_at, ends_at, created_by, created_at, big)
           values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`,
          id, await sha256Hex("gift:" + code), hint,
          typeof body.title === "string" && body.title.trim() !== "" ? body.title.trim().slice(0, 120) : "Gift code",
          typeof body.body === "string" ? body.body.trim().slice(0, 600) : "",
          JSON.stringify(reward), max, startsAt.toISOString(), endsAt?.toISOString() ?? null, actor, nowIso(now),
          // "big": paid only to a registered account with a verified email (decision 5).
          body.big === true ? 1 : 0,
        ),
        auditStmt(db, actor, "giftcode.create", id, { hint, reward, max, big: body.big === true }, now),
      ]);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ApiError(409, "duplicate", "This code already exists.");
      throw error;
    }
    return json({ id, code });
  }
  if (method === "POST" && parts[0] === "gift-codes" && parts[2] === "disable" && parts[1] !== undefined) {
    const changes = await db.batch([
      db.stmt("update gift_codes set disabled_at = ?2 where id = ?1 and disabled_at is null", parts[1], nowIso(now)),
      auditStmt(db, actor, "giftcode.disable", parts[1], {}, now),
    ]);
    if (changes[0] === 0) throw new ApiError(404, "not-found", "Code not found or already disabled.");
    return json({ ok: true });
  }

  // Chat moderation.
  if (method === "GET" && path === "/chat/recent") {
    const room = await chatRoom(env, url.searchParams.get("channel") ?? "world:global");
    return new Response((await room.fetch("https://chat/admin/recent")).body, { headers: { "content-type": "application/json" } });
  }
  if (method === "POST" && path === "/chat/delete") {
    const body = await readJson(request);
    const room = await chatRoom(env, String(body.channel ?? "world:global"));
    await room.fetch("https://chat/admin/delete", { method: "POST", body: JSON.stringify({ id: String(body.id ?? "") }) });
    await db.batch([auditStmt(db, actor, "chat.delete", String(body.id ?? ""), { channel: body.channel }, now)]);
    return json({ ok: true });
  }
  if (method === "POST" && path === "/chat/announce") {
    const body = await readJson(request);
    const text = typeof body.text === "string" ? body.text.trim().slice(0, 300) : "";
    if (text === "") throw new ApiError(400, "invalid", "Write the announcement.");
    await (await chatRoom(env, "world:global")).fetch("https://chat/admin/system", { method: "POST", body: JSON.stringify({ text }) });
    await db.batch([auditStmt(db, actor, "chat.announce", null, { text }, now)]);
    return json({ ok: true });
  }
  if (method === "GET" && path === "/chat/reports") {
    return json({
      reports: await db.all(
        `select r.*, (select count(*) from chat_reports x where x.target_id = r.target_id) as target_reports
           from chat_reports r order by r.resolved_at is not null, r.id desc limit 200`,
      ),
    });
  }
  if (method === "POST" && parts[0] === "chat" && parts[1] === "reports" && parts[3] === "resolve" && parts[2] !== undefined) {
    const body = await readJson(request);
    const changes = await db.batch([
      db.stmt("update chat_reports set resolved_at = ?2, resolved_by = ?3, resolution = ?4 where id = ?1 and resolved_at is null", Number(parts[2]), nowIso(now), actor, String(body.resolution ?? "dismissed").slice(0, 120)),
      auditStmt(db, actor, "chat.report.resolve", parts[2], { resolution: body.resolution }, now),
    ]);
    if (changes[0] === 0) throw new ApiError(404, "not-found", "Report not found or already resolved.");
    return json({ ok: true });
  }

  // Player feedback (feedback.ts): the queue, its status, and a reply as in-game mail.
  if (method === "GET" && path === "/feedback") return json(await listFeedback(db, url.searchParams));
  if (method === "POST" && parts[0] === "feedback" && parts[1] !== undefined && ID.test(parts[1]) && parts.length === 3) {
    const id = parts[1];
    const body = await readJson(request);
    if (parts[2] === "status") {
      const changes = await db.batch([
        feedbackStatusStmt(db, id, body.status, body.note, actor, now),
        auditStmt(db, actor, "feedback.status", id, { status: body.status }, now),
      ]);
      if (changes[0] === 0) throw new ApiError(404, "not-found", "Message not found.");
      return json({ ok: true });
    }
    if (parts[2] === "reply") {
      const sender = await feedbackSender(db, id);
      if (sender === null) throw new ApiError(404, "not-found", "Message not found.");
      if (sender.account_id === null) throw new ApiError(409, "no-account", "The sender deleted their account, so they cannot get mail.");
      // A plain letter: no reward rides on a reply.
      const mail = await sendMail(db, actor, { target: sender.account_id, title: body.title, body: body.body }, now);
      await db.batch([
        feedbackStatusStmt(db, id, "resolved", "Replied by in-game mail: " + String(body.title ?? "").trim().slice(0, 120), actor, now),
        auditStmt(db, actor, "feedback.reply", id, { mail: mail.id }, now),
      ]);
      return json({ ok: true, mail: mail.id });
    }
  }

  if (method === "POST" && path === "/maintenance") {
    const removed = await cleanup(db, now);
    await db.batch([auditStmt(db, actor, "maintenance.cleanup", null, removed, now)]);
    return json({ removed });
  }
  if (method === "GET" && path === "/outbox") return json({ emails: await db.all("select * from email_outbox order by id desc limit 50") });
  if (method === "GET" && path === "/audit") return json({ entries: await db.all("select * from admin_audit order by id desc limit 200") });
  throw new ApiError(404, "not-found", "Unknown admin endpoint.");
}

async function sendMail(db: Sql, actor: string, input: Record<string, unknown>, now: number): Promise<{ id: string }> {
  const title = typeof input.title === "string" ? input.title.trim().slice(0, 120) : "";
  if (title === "") throw new ApiError(400, "invalid", "Mail needs a title.");
  const body = typeof input.body === "string" ? input.body.trim().slice(0, 600) : "";
  const target = input.target === "all" || input.target === undefined || input.target === null ? null : String(input.target);
  if (target !== null && !ID.test(target)) throw new ApiError(400, "invalid", "Invalid player id.");
  const reward = sanitizeReward(input.reward);
  rewardLimits(reward);
  const startsAt = dateInput(input.startsAt, new Date(now))!;
  // A broadcast is read by every player's mailbox while it runs, and players keep only the
  // last 200 delivered ids, so a broadcast always ends (default: 30 days after it starts).
  const endsAt = dateInput(input.endsAt, target === null ? new Date(startsAt.getTime() + BROADCAST_DEFAULT_DAYS * 86_400_000) : null);
  if (endsAt !== null && endsAt <= startsAt) throw new ApiError(400, "invalid", "The end must be after the start.");
  if (target !== null && (await db.first("select 1 from accounts where id = ?1 and status <> 'deleted'", target)) === null) {
    throw new ApiError(404, "not-found", "Player not found.");
  }
  const id = crypto.randomUUID();
  await db.batch([
    db.stmt(
      "insert into mail (id, target_account_id, title, body, reward, starts_at, ends_at, created_by, created_at) values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
      id, target, title, body, JSON.stringify(reward), startsAt.toISOString(), endsAt?.toISOString() ?? null, actor, nowIso(now),
    ),
    auditStmt(db, actor, target === null ? "mail.broadcast" : "mail.player", target, { id, title, reward }, now),
  ]);
  return { id };
}
