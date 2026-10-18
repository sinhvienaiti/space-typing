import { DurableObject } from "cloudflare:workers";
import { admitMessage, CHAT_HISTORY, newBucket, sanitizeLook, type Bucket, type ChatKind, type ChatMessage } from "./chat-rules";
import type { Env } from "./env";

/**
 * One chat room per channel (world, a group, or two friends), as a
 * SQLite-backed Durable Object using the WebSocket Hibernation API: idle
 * rooms cost nothing, and per-socket state lives in the socket attachment.
 *
 * The Worker authenticates the player and checks they may join, then
 * forwards the upgrade with x-chat-* headers. Only the Worker can reach
 * /admin/*: Durable Objects are not addressable from the internet.
 */
type Attachment = {
  accountId: string;
  name: string;
  code: string;
  canSend: boolean;
  mutedUntil: number;
  kind: ChatKind;
  channel: string;
  bucket: Bucket;
  /** Last time the account's ban/mute and room access were read from D1. */
  checkedAt?: number;
  /** Report allowance (token bucket); each report is a D1 write. */
  reportTokens?: number;
  reportAt?: number;
};

/** Ban, mute, unfriend and group removal reach open sockets within this time. */
const RECHECK_MS = 60_000;
/** At most 3 reports at once, then one more every 2 minutes, per socket. */
const REPORT_CAPACITY = 3;
const REPORT_REFILL_MS = 120_000;

type Incoming =
  | { type: "send"; text: string; nonce?: string; look?: unknown }
  | { type: "report"; id: string; reason?: string }
  | { type: "ping" };

const KEEP = 300;

function lookOf(raw: string | null): { look?: ChatMessage["from"]["look"] } {
  if (raw === null) return {};
  try {
    const look = sanitizeLook(JSON.parse(raw));
    return look === undefined ? {} : { look };
  } catch {
    return {};
  }
}

export class ChatChannel extends DurableObject<Env> {
  private readonly sql: SqlStorage;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`create table if not exists messages (
      id text primary key, account_id text not null, name text not null, code text not null,
      text text not null, at integer not null, system integer not null default 0, deleted integer not null default 0)`);
    this.sql.exec("create index if not exists messages_at on messages (at)");
    // Rooms created before Style Shop looks have no `look` column yet.
    const columns = this.sql.exec<{ name: string }>("pragma table_info(messages)").toArray();
    if (!columns.some((column) => column.name === "look")) this.sql.exec("alter table messages add column look text");
  }

  private history(limit = CHAT_HISTORY, includeDeleted = false): (ChatMessage & { deleted?: boolean })[] {
    const rows = this.sql
      .exec<{ id: string; account_id: string; name: string; code: string; text: string; at: number; system: number; deleted: number; look: string | null }>(
        `select * from messages ${includeDeleted ? "" : "where deleted = 0"} order by at desc limit ?`,
        limit,
      )
      .toArray();
    return rows.reverse().map((row) => ({
      id: row.id,
      from: { id: row.account_id, name: row.name, code: row.code, ...lookOf(row.look) },
      text: row.text,
      at: row.at,
      ...(row.system === 1 ? { system: true } : {}),
      ...(includeDeleted && row.deleted === 1 ? { deleted: true } : {}),
    }));
  }

  private broadcast(payload: unknown): void {
    const data = JSON.stringify(payload);
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.send(data);
      } catch {
        /* Closing socket. */
      }
    }
  }

  private store(message: ChatMessage): void {
    this.sql.exec(
      "insert into messages (id, account_id, name, code, text, at, system, look) values (?, ?, ?, ?, ?, ?, ?, ?)",
      message.id,
      message.from.id,
      message.from.name,
      message.from.code,
      message.text,
      message.at,
      message.system === true ? 1 : 0,
      message.from.look === undefined ? null : JSON.stringify(message.from.look),
    );
    if (Math.random() < 0.05) {
      this.sql.exec("delete from messages where id not in (select id from messages order by at desc limit ?)", KEEP);
    }
  }

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/connect") return this.openSocket(request);
    if (url.pathname === "/admin/recent") return Response.json({ messages: this.history(100, true), online: this.ctx.getWebSockets().length });
    if (url.pathname === "/admin/delete" && request.method === "POST") {
      const { id } = (await request.json()) as { id?: string };
      this.sql.exec("update messages set deleted = 1 where id = ?", String(id));
      this.broadcast({ type: "delete", id });
      return Response.json({ ok: true });
    }
    if (url.pathname === "/admin/kick" && request.method === "POST") {
      const { accountId, reason } = (await request.json()) as { accountId?: string; reason?: string };
      for (const socket of this.ctx.getWebSockets(String(accountId))) {
        try {
          socket.send(JSON.stringify({ type: "error", message: reason ?? "You were removed from this chat." }));
          socket.close(4003, "removed");
        } catch {
          /* Already closed. */
        }
      }
      return Response.json({ ok: true });
    }
    if (url.pathname === "/admin/system" && request.method === "POST") {
      const { text } = (await request.json()) as { text?: string };
      const message: ChatMessage = { id: crypto.randomUUID(), from: { id: "system", name: "Fleet Command", code: "" }, text: String(text ?? "").slice(0, 300), at: Date.now(), system: true };
      this.store(message);
      this.broadcast({ type: "message", message });
      return Response.json({ ok: true });
    }
    return new Response("not found", { status: 404 });
  }

  private openSocket(request: Request): Response {
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") return new Response("Expected WebSocket", { status: 426 });
    const accountId = request.headers.get("x-chat-account") ?? "";
    const kind = (request.headers.get("x-chat-kind") ?? "world") as ChatKind;
    const attachment: Attachment = {
      accountId,
      name: decodeURIComponent(request.headers.get("x-chat-name") ?? "Pilot"),
      code: request.headers.get("x-chat-code") ?? "",
      canSend: request.headers.get("x-chat-can-send") === "1",
      mutedUntil: Number(request.headers.get("x-chat-muted-until") ?? 0),
      kind,
      channel: request.headers.get("x-chat-channel") ?? "",
      bucket: newBucket(kind, Date.now()),
      // The Worker checked the account and room access just now.
      checkedAt: Date.now(),
      reportTokens: REPORT_CAPACITY,
      reportAt: Date.now(),
    };
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server, [accountId]);
    server.serializeAttachment(attachment);
    const online = this.ctx.getWebSockets().length;
    server.send(JSON.stringify({ type: "hello", channel: attachment.channel, history: this.history(), online, canSend: attachment.canSend && attachment.mutedUntil <= Date.now(), mutedUntil: attachment.mutedUntil }));
    this.broadcast({ type: "presence", online });
    return new Response(null, { status: 101, webSocket: client });
  }

  /**
   * Re-reads ban, mute and room access at most once a minute per socket, so
   * a ban or mute (Admin only kicks world sockets), an unfriend, a block or
   * a group removal also stops group and private chat that is already open.
   * Returns false when the socket was closed.
   */
  private async recheck(socket: WebSocket, me: Attachment, now: number): Promise<boolean> {
    if (me.checkedAt !== undefined && now - me.checkedAt < RECHECK_MS) return true;
    me.checkedAt = now;
    // Stored before the D1 read, so messages that arrive meanwhile do not check again.
    socket.serializeAttachment(me);
    let allowed = false;
    try {
      const account = await this.env.DB.prepare("select status, banned_until, chat_muted_until from accounts where id = ?1")
        .bind(me.accountId)
        .first<{ status: string; banned_until: string | null; chat_muted_until: string | null }>();
      allowed =
        account !== null &&
        account.status !== "deleted" &&
        !(account.status === "banned" && (account.banned_until === null || Date.parse(account.banned_until) > now));
      if (account !== null) me.mutedUntil = account.chat_muted_until === null ? 0 : Date.parse(account.chat_muted_until) || 0;
      if (allowed && me.kind === "dm") {
        const other = me.channel.split(":").slice(1).find((id) => id !== me.accountId) ?? "";
        allowed =
          (await this.env.DB.prepare("select 1 as ok from friendships where account_id = ?1 and friend_id = ?2 and status = 'accepted'")
            .bind(me.accountId, other)
            .first()) !== null;
      } else if (allowed && me.kind === "group") {
        allowed =
          (await this.env.DB.prepare(
            "select 1 as ok from chat_group_members m join chat_groups g on g.id = m.group_id where m.group_id = ?1 and m.account_id = ?2 and g.archived_at is null",
          )
            .bind(me.channel.slice("group:".length), me.accountId)
            .first()) !== null;
      }
    } catch (error) {
      // D1 unavailable (or its daily limit reached): keep the socket and try again next time.
      console.error("chat recheck failed", error);
      me.checkedAt = now - RECHECK_MS / 2;
      socket.serializeAttachment(me);
      return true;
    }
    socket.serializeAttachment(me);
    if (allowed) return true;
    try {
      socket.send(JSON.stringify({ type: "error", message: "You can no longer use this chat." }));
      socket.close(4003, "removed");
    } catch {
      /* Already closed. */
    }
    return false;
  }

  override async webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (typeof raw !== "string" || raw.length > 2000) return;
    let message: Incoming;
    try {
      message = JSON.parse(raw) as Incoming;
    } catch {
      return;
    }
    let me = socket.deserializeAttachment() as Attachment;
    const now = Date.now();
    if (message.type === "ping") {
      socket.send(JSON.stringify({ type: "pong", online: this.ctx.getWebSockets().length }));
      return;
    }
    if (message.type !== "report" && message.type !== "send") return;
    if (!(await this.recheck(socket, me, now))) return;
    // Other messages of this socket may have run during the D1 read: continue from the stored copy.
    me = socket.deserializeAttachment() as Attachment;
    if (message.type === "report") {
      const row = this.sql.exec<{ account_id: string; name: string; text: string }>("select account_id, name, text from messages where id = ?", String(message.id)).toArray()[0];
      if (row === undefined || row.account_id === me.accountId || row.account_id === "system") return;
      // Every report is a D1 write (Free plan: 100,000 a day for the whole game), so a
      // socket looping reports must not be able to spend them.
      const tokens = Math.min(REPORT_CAPACITY, (me.reportTokens ?? REPORT_CAPACITY) + (now - (me.reportAt ?? now)) / REPORT_REFILL_MS);
      if (tokens < 1) {
        me.reportTokens = tokens;
        me.reportAt = now;
        socket.serializeAttachment(me);
        socket.send(JSON.stringify({ type: "notice", message: "You have sent several reports. Please wait a few minutes." }));
        return;
      }
      me.reportTokens = tokens - 1;
      me.reportAt = now;
      socket.serializeAttachment(me);
      // One report per message and reporter (unique index from migration 0002).
      try {
        await this.env.DB.prepare(
          "insert into chat_reports (channel, message_id, reporter_id, target_id, target_name, text, reason, created_at) values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8) on conflict do nothing",
        )
          .bind(me.channel, String(message.id), me.accountId, row.account_id, row.name, row.text, String(message.reason ?? "").slice(0, 200), new Date(now).toISOString())
          .run();
      } catch (error) {
        console.error("chat report failed", error);
        socket.send(JSON.stringify({ type: "notice", message: "The report could not be saved. Try again later." }));
        return;
      }
      socket.send(JSON.stringify({ type: "notice", message: "Thanks. A moderator will review it." }));
      return;
    }
    if (!me.canSend) {
      socket.send(JSON.stringify({ type: "error", nonce: message.nonce, message: "Create a free account (Sign up) to chat. Guests can read." }));
      return;
    }
    if (me.mutedUntil > now) {
      socket.send(JSON.stringify({ type: "error", nonce: message.nonce, message: "You are muted until " + new Date(me.mutedUntil).toLocaleString() + "." }));
      return;
    }
    const check = admitMessage(me.kind, message.text, me.bucket, now);
    me.bucket = check.bucket;
    socket.serializeAttachment(me);
    if (!check.ok) {
      socket.send(JSON.stringify({ type: "error", nonce: message.nonce, message: check.reason }));
      return;
    }
    const look = sanitizeLook(message.look);
    const out: ChatMessage = { id: crypto.randomUUID(), from: { id: me.accountId, name: me.name, code: me.code, ...(look === undefined ? {} : { look }) }, text: check.text, at: now };
    this.store(out);
    this.broadcast({ type: "message", message: out, nonce: message.nonce, sender: me.accountId });
  }

  override async webSocketClose(socket: WebSocket, code: number): Promise<void> {
    try {
      socket.close(code === 1005 ? 1000 : code, "bye");
    } catch {
      /* Already closed. */
    }
    this.broadcast({ type: "presence", online: Math.max(0, this.ctx.getWebSockets().length - 1) });
  }

  override async webSocketError(socket: WebSocket): Promise<void> {
    try {
      socket.close(1011, "error");
    } catch {
      /* Already closed. */
    }
  }
}
