import {
  authenticate,
  changePassword,
  deleteAccount,
  exportAccount,
  forgotPassword,
  guest,
  listSessions,
  login,
  logout,
  publicAccount,
  register,
  resendVerification,
  resetLinkEmail,
  resetPassword,
  revokeOtherSessions,
  updateProfile,
  verifyEmail,
  type Auth,
  type Context,
} from "./accounts";
import { handleAdmin } from "./admin";
import { sameSecret } from "./crypto";
import { sql, type Sql } from "./db";
import type { Env } from "./env";
import { submitFeedback } from "./feedback";
import { ApiError, clientIp, errorResponse, json, jsonText, readCookie, readJson, SESSION_COOKIE, sessionCookie } from "./http";
import { buyShield, claim, getLiveops, importLiveops, recordProgress, redeemCode, setGoal, type ClaimRequest } from "./liveops";
import { cleanup } from "./maintenance";
import { backupsKept, getSaveText, putSave } from "./saves";
import { confirmPurchase, earn, getWallet, openWallet, refuel, refund, sortie, spend, walletPhase } from "./wallet";
import { walletRateLimit } from "./wallet-rate-limit";
import { answerFriend, createGroup, groupMembers, joinGroup, kickFromGroup, leaveGroup, requestFriend, resolveChannel, socialOverview } from "./social";

export { ChatChannel } from "./chat";

/**
 * space-typing-api: accounts, cloud save, Daily Hub, friends/groups/chat,
 * player feedback and the internal Admin API, on Cloudflare Workers + D1 +
 * Durable Objects.
 *
 * Player API under /api/account/* (same origin as the game). Every write
 * needs the header "x-space-typing: 1" (cross-site forms cannot send it).
 */
const SAVE_BODY = 2_000_000;

async function flushOutbox(env: Env, db: Sql): Promise<void> {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) return;
  const pending = await db.all<{ id: number; to_email: string; subject: string; body: string }>(
    "select id, to_email, subject, body from email_outbox where sent_at is null and error is null order by id limit 5",
  );
  for (const mail of pending) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: "Bearer " + env.RESEND_API_KEY, "content-type": "application/json" },
        body: JSON.stringify({ from: env.MAIL_FROM, to: [mail.to_email], subject: mail.subject, text: mail.body }),
      });
      if (!response.ok) throw new Error("HTTP " + response.status + " " + (await response.text()).slice(0, 200));
      // Links are secrets: once delivered, do not keep them readable in the outbox.
      await db.run("update email_outbox set sent_at = ?2, body = '[sent]' where id = ?1", mail.id, new Date().toISOString());
    } catch (error) {
      await db.run("update email_outbox set error = ?2 where id = ?1", mail.id, String(error).slice(0, 300));
    }
  }
}

function sessionSeconds(env: Env): number {
  return Math.max(1, Number(env.SESSION_DAYS ?? 30)) * 86_400;
}

/**
 * The session's expiry slides forward with use (authenticate), so the
 * cookie's Max-Age must slide too, or active players are signed out (back
 * to a new guest) 30 days after signing in.
 */
async function playerWithRenewal(request: Request, env: Env, ctx: ExecutionContext, db: Sql, path: string, now: number): Promise<Response> {
  const renew: { token?: string } = {};
  const response = await player(request, env, ctx, db, path, now, renew);
  if (renew.token !== undefined && response.status === 200 && !response.headers.has("set-cookie")) {
    try {
      response.headers.append("set-cookie", sessionCookie(request, renew.token, sessionSeconds(env)));
    } catch {
      /* Immutable headers (a proxied response): the next renewal sends it. */
    }
  }
  return response;
}

async function player(request: Request, env: Env, ctx: ExecutionContext, db: Sql, path: string, now: number, renew: { token?: string }): Promise<Response> {
  const method = request.method;
  if (method !== "GET" && request.headers.get("x-space-typing") !== "1") throw new ApiError(403, "csrf", "Missing request header.");
  const context: Context = { ip: clientIp(request), userAgent: request.headers.get("user-agent") ?? "", now };
  const withCookie = (body: unknown, token: string | null): Response =>
    json(body, 200, { "set-cookie": sessionCookie(request, token, sessionSeconds(env)) });

  let auth: Auth | null = null;
  try {
    const token = readCookie(request, SESSION_COOKIE);
    auth = await authenticate(db, env, token, now);
    if (auth?.renewed === true) renew.token = token;
  } catch (error) {
    if (error instanceof ApiError && error.code === "banned") {
      if (path === "/logout") return withCookie({ ok: true }, null);
      if (path === "/me") return json({ account: null, banned: error.message, serverTime: now });
    }
    throw error;
  }
  const need = (): Auth => {
    if (auth === null) throw new ApiError(401, "signed-out", "Please sign in again.");
    return auth;
  };

  switch (method + " " + path) {
    case "GET /me":
      return json({ account: auth === null ? null : publicAccount(auth.account), serverTime: now });
    case "POST /guest": {
      const body = await readJson(request);
      const result = await guest(db, env, body.deviceKey, context);
      return withCookie({ account: result.account }, result.token);
    }
    case "POST /register": {
      const result = await register(db, env, await readJson(request), auth?.account ?? null, context);
      ctx.waitUntil(flushOutbox(env, db));
      return withCookie({ account: result.account }, result.token);
    }
    case "POST /login": {
      const result = await login(db, env, await readJson(request), context);
      return withCookie({ account: result.account }, result.token);
    }
    case "POST /logout":
      if (auth !== null) await logout(db, auth.sessionId, now);
      return withCookie({ ok: true }, null);
    case "POST /password/forgot":
      await forgotPassword(db, env, (await readJson(request)).email, context);
      ctx.waitUntil(flushOutbox(env, db));
      return json({ ok: true });
    case "POST /password/reset-email":
      return json({ email: await resetLinkEmail(db, (await readJson(request)).token, now) });
    case "POST /password/reset":
      await resetPassword(db, env, await readJson(request), now);
      return withCookie({ ok: true }, null);
    case "POST /password/change":
      await changePassword(db, env, need(), await readJson(request), now);
      return json({ ok: true });
    case "POST /email/verify":
      await verifyEmail(db, env, (await readJson(request)).token, now);
      return json({ ok: true });
    case "POST /email/resend":
      await resendVerification(db, env, need(), now);
      ctx.waitUntil(flushOutbox(env, db));
      return json({ ok: true });
    case "POST /profile":
      return json({ account: await updateProfile(db, need(), await readJson(request)) });
    case "GET /sessions": {
      const current = need();
      return json({ sessions: await listSessions(db, current.account.id, now), current: current.sessionId });
    }
    case "POST /sessions/revoke-others":
      return json({ revoked: await revokeOtherSessions(db, need(), now) });
    case "GET /export":
      return json(await exportAccount(db, need(), now), 200, { "content-disposition": 'attachment; filename="space-typing-account.json"' });
    case "POST /delete":
      await deleteAccount(db, env, need(), await readJson(request), now);
      return withCookie({ ok: true }, null);
    case "GET /save": {
      const save = await getSaveText(db, need().account.id);
      return save === null ? json({ error: "no-save", message: "No cloud save yet." }, 404) : jsonText(save);
    }
    case "PUT /save":
      return json(await putSave(db, need().account.id, await readJson(request, SAVE_BODY), now, backupsKept(env.SAVE_BACKUPS)));
    case "GET /liveops": {
      const after = Number(new URL(request.url).searchParams.get("after") ?? NaN);
      return json(await getLiveops(db, need().account.id, now, Number.isSafeInteger(after) && after >= 0 ? after : null, walletPhase(env)));
    }
    case "POST /wallet/open":
      return json(await openWallet(db, env, need().account, (await readJson(request)).seed, now));
    case "GET /wallet":
      return json(await getWallet(db, env, need().account.id, now));
    case "POST /wallet/op": {
      walletRateLimit.hit(need().account.id, now);
      const body = await readJson(request);
      if (body.kind === "spend") return json(await spend(db, env, need().account.id, body, now));
      if (body.kind === "earn") return json(await earn(db, env, need().account.id, body, now));
      if (body.kind === "refund") return json(await refund(db, env, need().account.id, body, now));
      if (body.kind === "confirm") return json(await confirmPurchase(db, env, need().account.id, body, now));
      throw new ApiError(400, "invalid", "Unknown wallet operation.");
    }
    case "POST /wallet/sortie":
      return json(await sortie(db, env, need().account.id, await readJson(request), now));
    case "POST /wallet/refuel":
      return json(await refuel(db, env, need().account.id, await readJson(request), now));
    case "POST /liveops/import":
      return json(await importLiveops(db, need().account.id, (await readJson(request)).state, now));
    case "POST /liveops/progress":
      return json(await recordProgress(db, need().account.id, ((await readJson(request)).progress ?? {}) as Record<string, unknown>, now));
    case "POST /liveops/goal":
      return json({ state: await setGoal(db, need().account.id, (await readJson(request)).goal, now) });
    case "POST /liveops/claim":
      return json(await claim(db, env, need().account, (await readJson(request)) as unknown as ClaimRequest, now));
    case "POST /liveops/shield":
      return json(await buyShield(db, env, need().account.id, (await readJson(request)).starCrystals, now));
    case "POST /liveops/redeem":
      return json(await redeemCode(db, need().account.id, (await readJson(request)).code, now, context.ip));
    case "POST /feedback":
      return json(await submitFeedback(db, need(), await readJson(request, 16 * 1024), context));
    case "GET /social":
      return json(await socialOverview(db, need()));
    case "POST /social/friends/request":
      return json(await requestFriend(db, need(), (await readJson(request)).code, now));
    case "POST /social/groups":
      return json(await createGroup(db, need(), (await readJson(request)).name, now));
    case "POST /social/groups/join":
      return json(await joinGroup(db, need(), (await readJson(request)).code, now));
    default:
      break;
  }

  const parts = path.split("/").filter(Boolean);
  if (method === "POST" && parts[0] === "social" && parts[1] === "friends" && parts[2] !== undefined && ["accept", "decline", "remove", "block"].includes(parts[3] ?? "")) {
    await answerFriend(db, need(), parts[2], parts[3] as "accept" | "decline" | "remove" | "block", now);
    return json({ ok: true });
  }
  if (parts[0] === "social" && parts[1] === "groups" && parts[2] !== undefined) {
    const groupId = parts[2];
    if (method === "GET" && parts[3] === "members") return json({ members: await groupMembers(db, need(), groupId) });
    if (method === "POST" && parts[3] === "leave") {
      await leaveGroup(db, need(), groupId, now);
      return json({ ok: true });
    }
    if (method === "POST" && parts[3] === "kick") {
      await kickFromGroup(db, env, need(), groupId, (await readJson(request)).accountId);
      return json({ ok: true });
    }
  }
  if (method === "GET" && path === "/chat/connect") {
    const current = need();
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") throw new ApiError(426, "upgrade", "Expected a WebSocket.");
    // Browsers send the session cookie with WebSocket upgrades from any page and CORS does not
    // apply, so another site could open the chat as this player: accept only our own origin.
    // (Non-browser clients send no Origin; local dev runs behind proxies on other ports.)
    const origin = request.headers.get("origin");
    if (origin !== null && env.LOCAL_DEV !== "1") {
      let same = false;
      try {
        same = new URL(origin).host === new URL(request.url).host;
      } catch {
        same = false;
      }
      if (!same) throw new ApiError(403, "origin", "Chat is only available from the game page.");
    }
    const channel = await resolveChannel(db, current, new URL(request.url).searchParams.get("channel") ?? "world");
    const muted = current.account.chat_muted_until === null ? 0 : new Date(current.account.chat_muted_until).getTime();
    const headers = new Headers(request.headers);
    headers.set("x-chat-account", current.account.id);
    headers.set("x-chat-name", encodeURIComponent(current.account.display_name));
    headers.set("x-chat-code", current.account.pilot_code);
    headers.set("x-chat-kind", channel.kind);
    headers.set("x-chat-channel", channel.name);
    headers.set("x-chat-can-send", current.account.kind === "registered" ? "1" : "0");
    headers.set("x-chat-muted-until", String(muted));
    const room = env.CHAT.get(env.CHAT.idFromName(channel.name));
    return room.fetch(new Request("https://chat/connect", { headers }));
  }
  throw new ApiError(404, "not-found", "Unknown account endpoint.");
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const db = sql(env.DB);
    const now = Date.now();
    try {
      if (url.pathname === "/healthz" || url.pathname === "/api/account/healthz") {
        return json({ ok: true, service: "space-typing-account", localInstance: (env as Env & { LOCAL_INSTANCE?: string }).LOCAL_INSTANCE ?? null });
      }
      if (url.pathname.startsWith("/api/account/")) return await playerWithRenewal(request, env, ctx, db, url.pathname.slice("/api/account".length), now);
      if (url.pathname.startsWith("/internal/admin/")) {
        const token = env.ADMIN_TOKEN ?? (env.LOCAL_DEV === "1" ? "local-account-admin" : null);
        if (token === null || !sameSecret(request.headers.get("x-account-admin-token"), token)) {
          throw new ApiError(401, "unauthorized", "Admin token required.");
        }
        return await handleAdmin(request, db, env, url.pathname.slice("/internal/admin".length), now);
      }
      throw new ApiError(404, "not-found", "Not found.");
    } catch (error) {
      return errorResponse(error);
    }
  },

  /** Daily Cron Trigger (cloud/wrangler.jsonc): removes expired sessions, tokens and counters. */
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      cleanup(sql(env.DB), controller.scheduledTime).then(
        (removed) => console.log("space-typing-api cleanup", JSON.stringify(removed)),
        (error) => console.error("space-typing-api cleanup failed", error),
      ),
    );
  },
} satisfies ExportedHandler<Env>;
