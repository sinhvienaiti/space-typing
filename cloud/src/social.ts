import type { Auth } from "./accounts";
import { channelName, type ChatKind } from "./chat-rules";
import { pilotCode } from "./crypto";
import { isUniqueViolation, type Sql } from "./db";
import type { Env } from "./env";
import { ApiError, nowIso } from "./http";

/**
 * Friends (private chat), groups (group chat) and who may open which chat
 * room. Friendships are stored twice (one row per side) so each player's
 * list is a single indexed read.
 */
const MAX_FRIENDS = 200;
const MAX_GROUPS_PER_PLAYER = 10;
const MAX_GROUP_MEMBERS = 50;

function registered(auth: Auth): void {
  if (auth.account.kind !== "registered") throw new ApiError(403, "guest", "Create a free account to add friends and join groups.");
}

export async function socialOverview(db: Sql, auth: Auth): Promise<Record<string, unknown>> {
  const id = auth.account.id;
  const [friends, groups] = await Promise.all([
    db.all(
      `select f.friend_id as id, a.display_name as name, a.pilot_code as code, f.status, a.last_seen_at
         from friendships f join accounts a on a.id = f.friend_id
        where f.account_id = ?1 and a.status <> 'deleted' order by f.status, a.display_name`,
      id,
    ),
    db.all(
      `select g.id, g.name, g.invite_code, m.role, (select count(*) from chat_group_members x where x.group_id = g.id) as members
         from chat_group_members m join chat_groups g on g.id = m.group_id
        where m.account_id = ?1 and g.archived_at is null order by g.name`,
      id,
    ),
  ]);
  return { pilotCode: auth.account.pilot_code, friends, groups };
}

export async function requestFriend(db: Sql, auth: Auth, codeInput: unknown, now: number): Promise<{ status: string; name: string }> {
  registered(auth);
  const code = String(codeInput ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) throw new ApiError(400, "invalid", "Enter the 6-character pilot code.");
  const other = await db.first<{ id: string; display_name: string; kind: string }>("select id, display_name, kind from accounts where pilot_code = ?1 and status = 'active'", code);
  if (other === null) throw new ApiError(404, "not-found", "No pilot has that code.");
  if (other.id === auth.account.id) throw new ApiError(400, "invalid", "That is your own code.");
  if (other.kind !== "registered") throw new ApiError(400, "invalid", "That pilot plays as a guest and cannot add friends yet.");
  const count = await db.first<{ n: number }>("select count(*) as n from friendships where account_id = ?1", auth.account.id);
  if (Number(count?.n ?? 0) >= MAX_FRIENDS) throw new ApiError(409, "limit", "Your friend list is full.");
  const existing = await db.first<{ status: string }>("select status from friendships where account_id = ?1 and friend_id = ?2", auth.account.id, other.id);
  const reverse = await db.first<{ status: string }>("select status from friendships where account_id = ?2 and friend_id = ?1", auth.account.id, other.id);
  if (reverse?.status === "blocked") throw new ApiError(404, "not-found", "No pilot has that code.");
  if (existing?.status === "accepted") return { status: "accepted", name: other.display_name };
  const at = nowIso(now);
  if (existing?.status === "pending-in") {
    await db.batch([
      db.stmt("update friendships set status = 'accepted', updated_at = ?3 where account_id = ?1 and friend_id = ?2", auth.account.id, other.id, at),
      db.stmt("update friendships set status = 'accepted', updated_at = ?3 where account_id = ?2 and friend_id = ?1", auth.account.id, other.id, at),
    ]);
    return { status: "accepted", name: other.display_name };
  }
  await db.batch([
    db.stmt(
      "insert into friendships (account_id, friend_id, status, created_at, updated_at) values (?1, ?2, 'pending-out', ?3, ?3) on conflict do nothing",
      auth.account.id, other.id, at,
    ),
    db.stmt(
      "insert into friendships (account_id, friend_id, status, created_at, updated_at) values (?2, ?1, 'pending-in', ?3, ?3) on conflict do nothing",
      auth.account.id, other.id, at,
    ),
  ]);
  return { status: "pending-out", name: other.display_name };
}

export async function answerFriend(db: Sql, auth: Auth, friendId: unknown, action: "accept" | "decline" | "remove" | "block", now: number): Promise<void> {
  registered(auth);
  const id = String(friendId ?? "");
  const row = await db.first<{ status: string }>("select status from friendships where account_id = ?1 and friend_id = ?2", auth.account.id, id);
  if (row === null && action !== "block") throw new ApiError(404, "not-found", "Not in your list.");
  const at = nowIso(now);
  if (action === "accept") {
    if (row?.status !== "pending-in") throw new ApiError(409, "invalid", "There is no request to accept.");
    await db.batch([
      db.stmt("update friendships set status = 'accepted', updated_at = ?3 where account_id = ?1 and friend_id = ?2", auth.account.id, id, at),
      db.stmt("update friendships set status = 'accepted', updated_at = ?3 where account_id = ?2 and friend_id = ?1", auth.account.id, id, at),
    ]);
    return;
  }
  if (action === "block") {
    // Blocking someone not in the list: they must exist (the row references accounts).
    if (id === auth.account.id) throw new ApiError(400, "invalid", "You cannot block yourself.");
    if (row === null && (await db.first("select 1 as ok from accounts where id = ?1 and status <> 'deleted'", id)) === null) {
      throw new ApiError(404, "not-found", "No pilot with that id.");
    }
    await db.batch([
      db.stmt(
        "insert into friendships (account_id, friend_id, status, created_at, updated_at) values (?1, ?2, 'blocked', ?3, ?3) on conflict (account_id, friend_id) do update set status = 'blocked', updated_at = ?3",
        auth.account.id, id, at,
      ),
      db.stmt("delete from friendships where account_id = ?2 and friend_id = ?1 and status <> 'blocked'", auth.account.id, id),
    ]);
    return;
  }
  // decline / remove: both sides forget each other.
  await db.batch([
    db.stmt("delete from friendships where account_id = ?1 and friend_id = ?2", auth.account.id, id),
    db.stmt("delete from friendships where account_id = ?2 and friend_id = ?1 and status <> 'blocked'", auth.account.id, id),
  ]);
}

function groupNameProblem(name: unknown): string | null {
  if (typeof name !== "string") return "Group name is required.";
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 32) return "Group name must have 3–32 characters.";
  if (/[<>\u0000-\u001f]/.test(trimmed)) return "Group name has characters that are not allowed.";
  return null;
}

export async function createGroup(db: Sql, auth: Auth, nameInput: unknown, now: number): Promise<{ id: string; inviteCode: string }> {
  registered(auth);
  const problem = groupNameProblem(nameInput);
  if (problem !== null) throw new ApiError(400, "invalid", problem);
  const count = await db.first<{ n: number }>("select count(*) as n from chat_group_members where account_id = ?1", auth.account.id);
  if (Number(count?.n ?? 0) >= MAX_GROUPS_PER_PLAYER) throw new ApiError(409, "limit", "You can be in up to " + MAX_GROUPS_PER_PLAYER + " groups.");
  const id = crypto.randomUUID();
  const at = nowIso(now);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const invite = pilotCode() + pilotCode().slice(0, 2);
    try {
      await db.batch([
        db.stmt("insert into chat_groups (id, name, owner_id, invite_code, created_at) values (?1, ?2, ?3, ?4, ?5)", id, (nameInput as string).trim(), auth.account.id, invite, at),
        db.stmt("insert into chat_group_members (group_id, account_id, role, joined_at) values (?1, ?2, 'owner', ?3)", id, auth.account.id, at),
      ]);
      return { id, inviteCode: invite };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  throw new ApiError(500, "server", "Could not create the group. Try again.");
}

export async function joinGroup(db: Sql, auth: Auth, codeInput: unknown, now: number): Promise<{ id: string; name: string }> {
  registered(auth);
  const code = String(codeInput ?? "").trim().toUpperCase();
  const group = await db.first<{ id: string; name: string }>("select id, name from chat_groups where invite_code = ?1 and archived_at is null", code);
  if (group === null) throw new ApiError(404, "not-found", "No group has that invite code.");
  const sizes = await db.first<{ members: number; mine: number }>(
    "select (select count(*) from chat_group_members where group_id = ?1) as members, (select count(*) from chat_group_members where account_id = ?2) as mine",
    group.id,
    auth.account.id,
  );
  if (Number(sizes?.members ?? 0) >= MAX_GROUP_MEMBERS) throw new ApiError(409, "limit", "This group is full.");
  if (Number(sizes?.mine ?? 0) >= MAX_GROUPS_PER_PLAYER) throw new ApiError(409, "limit", "You can be in up to " + MAX_GROUPS_PER_PLAYER + " groups.");
  await db.run("insert into chat_group_members (group_id, account_id, role, joined_at) values (?1, ?2, 'member', ?3) on conflict do nothing", group.id, auth.account.id, nowIso(now));
  return group;
}

export async function leaveGroup(db: Sql, auth: Auth, groupId: string, now: number): Promise<void> {
  const member = await db.first<{ role: string }>("select role from chat_group_members where group_id = ?1 and account_id = ?2", groupId, auth.account.id);
  if (member === null) throw new ApiError(404, "not-found", "You are not in this group.");
  if (member.role === "owner") {
    // The owner leaving hands the group to the longest-standing member, or closes it.
    const heir = await db.first<{ account_id: string }>(
      "select account_id from chat_group_members where group_id = ?1 and account_id <> ?2 order by joined_at limit 1",
      groupId,
      auth.account.id,
    );
    await db.batch([
      db.stmt("delete from chat_group_members where group_id = ?1 and account_id = ?2", groupId, auth.account.id),
      heir === null
        ? db.stmt("update chat_groups set archived_at = ?2 where id = ?1", groupId, nowIso(now))
        : db.stmt("update chat_group_members set role = 'owner' where group_id = ?1 and account_id = ?2", groupId, heir.account_id),
      ...(heir === null ? [] : [db.stmt("update chat_groups set owner_id = ?2 where id = ?1", groupId, heir.account_id)]),
    ]);
    return;
  }
  await db.run("delete from chat_group_members where group_id = ?1 and account_id = ?2", groupId, auth.account.id);
}

export async function kickFromGroup(db: Sql, env: Env, auth: Auth, groupId: string, memberId: unknown): Promise<void> {
  const owner = await db.first("select 1 from chat_groups where id = ?1 and owner_id = ?2", groupId, auth.account.id);
  if (owner === null) throw new ApiError(403, "forbidden", "Only the group owner can remove members.");
  const id = String(memberId ?? "");
  if (id === auth.account.id) throw new ApiError(400, "invalid", "Use Leave to leave your own group.");
  await db.run("delete from chat_group_members where group_id = ?1 and account_id = ?2", groupId, id);
  await env.CHAT.get(env.CHAT.idFromName(channelName("group", groupId))).fetch("https://chat/admin/kick", {
    method: "POST",
    body: JSON.stringify({ accountId: id, reason: "You were removed from this group." }),
  });
}

export async function groupMembers(db: Sql, auth: Auth, groupId: string): Promise<Record<string, unknown>[]> {
  const member = await db.first("select 1 from chat_group_members where group_id = ?1 and account_id = ?2", groupId, auth.account.id);
  if (member === null) throw new ApiError(404, "not-found", "You are not in this group.");
  return db.all(
    `select a.id, a.display_name as name, a.pilot_code as code, m.role, a.last_seen_at
       from chat_group_members m join accounts a on a.id = m.account_id where m.group_id = ?1 order by m.role desc, a.display_name`,
    groupId,
  );
}

/** Resolves ?channel=world | group:<id> | dm:<friendId> to a room, checking access. */
export async function resolveChannel(db: Sql, auth: Auth, request: string): Promise<{ kind: ChatKind; name: string }> {
  if (request === "world") return { kind: "world", name: channelName("world", "global") };
  const [kind, id] = request.split(":");
  if (kind === "group" && id) {
    const member = await db.first("select 1 from chat_group_members m join chat_groups g on g.id = m.group_id where m.group_id = ?1 and m.account_id = ?2 and g.archived_at is null", id, auth.account.id);
    if (member === null) throw new ApiError(403, "forbidden", "You are not in this group.");
    return { kind: "group", name: channelName("group", id) };
  }
  if (kind === "dm" && id) {
    const friend = await db.first("select 1 from friendships where account_id = ?1 and friend_id = ?2 and status = 'accepted'", auth.account.id, id);
    if (friend === null) throw new ApiError(403, "forbidden", "You can only message friends.");
    return { kind: "dm", name: channelName("dm", auth.account.id, id) };
  }
  throw new ApiError(400, "invalid", "Unknown chat channel.");
}
