import {
  displayNameProblem,
  emailProblem,
  hashClientKey,
  isClientKey,
  normalizeEmail,
  pilotCode,
  randomToken,
  sha256Hex,
  verifyClientKey,
} from "./crypto";
import { hitRateLimit, isUniqueViolation, peekRateLimit, type Sql } from "./db";
import type { Env } from "./env";
import { feedbackForExport, forgetFeedbackSender } from "./feedback";
import { ApiError, nowIso } from "./http";
import { storedSaveText } from "./saves";
import { loadWallet, releaseHeld, walletPhase } from "./wallet";
import type { SocialAttempt, SocialIdentity, SocialProvider } from "./oauth";

export type AccountRow = {
  id: string;
  kind: "guest" | "registered";
  pilot_code: string;
  email: string | null;
  email_normalized: string | null;
  email_verified_at: string | null;
  password_hash: string | null;
  password_salt: string | null;
  display_name: string;
  status: "active" | "banned" | "deleted";
  ban_reason: string | null;
  banned_until: string | null;
  chat_muted_until: string | null;
  birth_year: number | null;
  created_at: string;
  last_login_at: string | null;
  last_seen_at: string | null;
  password_login_enabled?: number;
};

export type PublicAccount = {
  id: string;
  kind: "guest" | "registered";
  pilotCode: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string;
  createdAt: string;
  hasPassword: boolean;
  oauthProviders?: SocialProvider[];
};

/** `renewed`: the session's expiry was just moved forward, so the cookie should be re-sent too. */
export type Auth = { account: AccountRow; sessionId: string; renewed?: boolean };
export type Context = { ip: string; userAgent: string; now: number };

const SESSION_TOUCH_MS = 10 * 60_000;

export function publicAccount(row: AccountRow): PublicAccount {
  return {
    id: row.id,
    kind: row.kind,
    pilotCode: row.pilot_code,
    email: row.email,
    emailVerified: row.email_verified_at !== null,
    displayName: row.display_name,
    createdAt: row.created_at,
    hasPassword: row.password_login_enabled !== 0 && row.password_hash !== null,
  };
}

export async function publicAccountDetails(db: Sql, row: AccountRow): Promise<PublicAccount> {
  const identities = await db.all<{ provider: SocialProvider }>(
    "select provider from auth_identities where account_id = ?1 and provider in ('google', 'facebook') order by provider", row.id,
  );
  return { ...publicAccount(row), oauthProviders: [...new Set(identities.map(identity => identity.provider))] };
}

function pepper(env: Env): string {
  if (env.PASSWORD_PEPPER) return env.PASSWORD_PEPPER;
  if (env.LOCAL_DEV === "1") return "local-dev-pepper";
  throw new ApiError(500, "config", "PASSWORD_PEPPER is not set.");
}

function sessionMs(env: Env): number {
  return Math.max(1, Number(env.SESSION_DAYS ?? 30)) * 86_400_000;
}

function banned(row: AccountRow, now: number): boolean {
  return row.status === "banned" && (row.banned_until === null || new Date(row.banned_until).getTime() > now);
}

function bannedError(row: AccountRow): ApiError {
  return new ApiError(403, "banned", "This account is suspended" + (row.ban_reason ? ": " + row.ban_reason : "."), {
    until: row.banned_until,
  });
}

async function newSession(db: Sql, env: Env, accountId: string, context: Context, identity?: SocialIdentity, sourceSessionId?: string): Promise<{ token: string; statements: D1PreparedStatement[] }> {
  const token = randomToken();
  const sessionId = crypto.randomUUID();
  const at = nowIso(context.now);
  return {
    token,
    statements: [
      db.stmt(
        `insert into sessions (id, account_id, token_hash, created_at, expires_at, last_seen_at, ip, user_agent)
         select ?1, ?2, ?3, ?4, ?5, ?4, ?6, ?7 where (?8 is null or exists
         (select 1 from auth_identities i join accounts a on a.id = i.account_id
          where i.provider = ?8 and i.subject = ?9 and i.account_id = ?2 and a.status <> 'deleted'
          and (a.status <> 'banned' or (a.banned_until is not null and a.banned_until <= ?4))))
          and (?10 is null or exists (select 1 from sessions where id = ?10 and account_id = ?2 and revoked_at is null and expires_at > ?4))`,
        sessionId,
        accountId,
        await sha256Hex(token),
        at,
        nowIso(context.now + sessionMs(env)),
        context.ip,
        context.userAgent.slice(0, 300),
        identity?.provider ?? null,
        identity?.subject ?? null,
        sourceSessionId ?? null,
      ),
      db.stmt("update accounts set last_login_at = ?2, last_seen_at = ?2 where id = ?1 and exists (select 1 from sessions where id = ?3)", accountId, at, sessionId),
    ],
  };
}

/** Provider subject owns identity. Matching email alone never grants another account. */
export async function finishSocialIdentity(
  db: Sql, env: Env, identity: SocialIdentity, attempt: SocialAttempt, context: Context,
): Promise<{ account: PublicAccount; token: string }> {
  if (!["google", "facebook"].includes(identity.provider) || !identity.subject || identity.subject.length > 255) {
    throw new ApiError(400, "oauth-provider", "Invalid provider identity.");
  }
  const linked = await db.first<AccountRow>(
    "select a.* from auth_identities i join accounts a on a.id = i.account_id where i.provider = ?1 and i.subject = ?2",
    identity.provider, identity.subject,
  );
  if (linked?.status === "deleted") throw new ApiError(403, "account-deleted", "This account was deleted.");
  if (linked && banned(linked, context.now)) throw bannedError(linked);
  const current = attempt.accountId ? await db.first<AccountRow>("select * from accounts where id = ?1", attempt.accountId) : null;
  if (current && banned(current, context.now)) throw bannedError(current);
  const at = nowIso(context.now);

  if (attempt.intent === "link") {
    if (!current || current.kind !== "registered" || current.status === "deleted" || !attempt.sessionId) {
      throw new ApiError(401, "signed-out", "Sign in before linking another sign-in method.");
    }
    if (linked && linked.id !== current.id) throw new ApiError(409, "oauth-linked", "That sign-in is already linked to a different account.");
    const session = await newSession(db, env, current.id, context, identity, attempt.sessionId);
    try {
      const statements = linked ? [] : [db.stmt(
        `insert into auth_identities (provider, subject, account_id, created_at) select ?1, ?2, ?3, ?4
         where exists (select 1 from sessions s join accounts a on a.id = s.account_id
           where s.id = ?5 and s.account_id = ?3 and s.revoked_at is null and s.expires_at > ?4
             and a.kind = 'registered' and a.status <> 'deleted'
             and (a.status <> 'banned' or (a.banned_until is not null and a.banned_until <= ?4)))`,
        identity.provider, identity.subject, current.id, at, attempt.sessionId,
      )];
      const result = await db.batch([...statements, ...session.statements]);
      if (result[statements.length] !== 1) throw new ApiError(401, "oauth-session", "Your session changed while linking. Sign in and try again.");
    } catch (error) {
      if (isUniqueViolation(error)) throw new ApiError(409, "oauth-linked", "That sign-in is already linked. Try again.");
      throw error;
    }
    return { account: await publicAccountDetails(db, current), token: session.token };
  }

  if (linked) {
    const session = await newSession(db, env, linked.id, context, identity);
    const changes = await db.batch(session.statements);
    if (changes[0] !== 1) throw new ApiError(401, "oauth-session", "The account changed while signing in. Try again.");
    return { account: await publicAccountDetails(db, linked), token: session.token };
  }
  if (attempt.intent !== "register") {
    throw new ApiError(400, "oauth-account-required", "No pilot is connected to this sign-in yet. Choose Create account first.");
  }
  if (!attempt.acceptTerms) {
    throw new ApiError(400, "terms", "Create an account and accept the terms before using this sign-in for the first time.");
  }
  if (emailProblem(identity.email) !== null) throw new ApiError(400, "oauth-email-required", "The provider did not share an email. Use Google or email, or allow Facebook to share your email.");
  if (identity.provider === "google" && !identity.emailVerified) throw new ApiError(400, "oauth-email-unverified", "Confirm your Google email before creating an account.");
  if (current && current.kind !== "guest") throw new ApiError(409, "oauth-linked", "Use Link in your profile to add this sign-in to your current account.");
  if (current && current.status !== "active") throw new ApiError(401, "signed-out", "Sign in again before creating an account.");
  const email = identity.email!.trim();
  const normalized = normalizeEmail(email);
  const verifiedEmail = identity.emailVerified && identity.emailAuthoritative !== false;
  if (await db.first("select id from accounts where email_normalized = ?1 and status <> 'deleted'", normalized)) {
    throw new ApiError(409, "email-taken", "An account already uses this email. Sign in with its current method, then link this provider in your profile.");
  }
  if ((await hitRateLimit(db, "register:" + context.ip, 3_600_000, context.now)) > 10) {
    throw new ApiError(429, "rate-limited", "Too many sign-ups from this network. Try again later.");
  }
  const name = attempt.displayName ?? identity.displayName ?? "Pilot";
  const nameProblem = displayNameProblem(name);
  if (nameProblem) throw new ApiError(400, "invalid", nameProblem);
  const id = current?.id ?? crypto.randomUUID();
  // Preserve the original SQLite CHECK without inventing a login password or email.
  // This inaccessible random value is disabled explicitly until an email reset sets a password.
  const disabledHash = await sha256Hex(randomToken());
  const disabledSalt = randomToken(16);
  const session = await newSession(db, env, id, context, identity);
  const verify = verifiedEmail ? [] : (await emailToken(db, env, id, email, "verify-email", context.now)).statements;
  try {
    if (current) {
      // D1 batch is atomic but has no interactive transaction. The existing
      // kind CHECK is a transactional assertion: a concurrently upgraded or
      // suspended guest aborts every identity/session/email write in this batch.
      const changes = await db.batch([
        db.stmt(`update accounts set kind = case when kind = 'guest' and status = 'active' and exists
                 (select 1 from sessions where id = ?10 and account_id = ?1 and revoked_at is null and expires_at > ?8)
                 then 'registered' else 'oauth-conflict' end,
                 email = ?2, email_normalized = ?3, password_hash = ?4, password_salt = ?5,
                 password_login_enabled = 0, display_name = ?6, birth_year = ?7, terms_accepted_at = ?8, email_verified_at = ?9
                 where id = ?1`, id, email, normalized, disabledHash, disabledSalt, name.trim(), attempt.birthYear, at, verifiedEmail ? at : null, attempt.sessionId),
        db.stmt("insert into auth_identities (provider, subject, account_id, created_at) values (?1, ?2, ?3, ?4)", identity.provider, identity.subject, id, at),
        db.stmt("delete from auth_identities where account_id = ?1 and provider = 'device'", id),
        db.stmt("update sessions set revoked_at = ?2 where account_id = ?1 and revoked_at is null", id, at),
        ...session.statements,
        // Email links are attached only to a successfully upgraded account.
        ...verify,
      ]);
      if (changes[0] !== 1 || changes[1] !== 1) throw new ApiError(409, "oauth-session", "Your account changed during sign-in. Please try again.");
    } else {
      await uniqueCodeInsert(db, code => [
        db.stmt(`insert into accounts (id, kind, pilot_code, email, email_normalized, password_hash, password_salt, password_login_enabled,
                 display_name, birth_year, terms_accepted_at, created_at, email_verified_at)
                 values (?1, 'registered', ?2, ?3, ?4, ?5, ?6, 0, ?7, ?8, ?9, ?9, ?10)`,
          id, code, email, normalized, disabledHash, disabledSalt, name.trim(), attempt.birthYear, at, verifiedEmail ? at : null),
        db.stmt("insert into auth_identities (provider, subject, account_id, created_at) values (?1, ?2, ?3, ?4)", identity.provider, identity.subject, id, at),
        ...session.statements, ...verify,
      ]);
    }
  } catch (error) {
    if (/CHECK constraint failed/i.test(String(error))) throw new ApiError(409, "oauth-session", "Your account changed during sign-in. Please try again.");
    if (isUniqueViolation(error)) throw new ApiError(409, "email-taken", "This email or sign-in is already in use. Sign in with the existing method and link it from your profile.");
    throw error;
  }
  const row = (await db.first<AccountRow>("select * from accounts where id = ?1", id))!;
  return { account: await publicAccountDetails(db, row), token: session.token };
}

/** The account behind a session cookie, or null. Throws 403 for a banned account. */
export async function authenticate(db: Sql, env: Env, token: string | undefined, now: number): Promise<Auth | null> {
  if (token === undefined || token.length < 20) return null;
  const row = await db.first<AccountRow & { session_id: string; expires_at: string; session_seen: string }>(
    `select a.*, s.id as session_id, s.expires_at, s.last_seen_at as session_seen
       from sessions s join accounts a on a.id = s.account_id
      where s.token_hash = ?1 and s.revoked_at is null`,
    await sha256Hex(token),
  );
  if (row === null || new Date(row.expires_at).getTime() <= now || row.status === "deleted") return null;
  if (banned(row, now)) throw bannedError(row);
  const renewed = now - new Date(row.session_seen).getTime() > SESSION_TOUCH_MS;
  if (renewed) {
    await db.batch([
      db.stmt("update sessions set last_seen_at = ?2, expires_at = ?3 where id = ?1", row.session_id, nowIso(now), nowIso(now + sessionMs(env))),
      db.stmt("update accounts set last_seen_at = ?2 where id = ?1", row.id, nowIso(now)),
    ]);
  }
  return { account: row, sessionId: row.session_id, renewed };
}

export async function logout(db: Sql, sessionId: string, now: number): Promise<void> {
  await db.run("update sessions set revoked_at = ?2 where id = ?1 and revoked_at is null", sessionId, nowIso(now));
}

async function uniqueCodeInsert(db: Sql, build: (code: string) => D1PreparedStatement[]): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await db.batch(build(pilotCode()));
      return;
    } catch (error) {
      if (!isUniqueViolation(error) || !String(error).includes("pilot_code")) throw error;
    }
  }
  throw new ApiError(500, "server", "Could not create an account. Try again.");
}

/** Guest play: a random device key kept by the browser signs back into the same guest. */
export async function guest(db: Sql, env: Env, deviceKey: unknown, context: Context): Promise<{ account: PublicAccount; token: string }> {
  if (typeof deviceKey !== "string" || deviceKey.length < 32 || deviceKey.length > 200) {
    throw new ApiError(400, "bad-device", "Invalid device key.");
  }
  const subject = await sha256Hex("device:" + deviceKey);
  let row = await db.first<AccountRow>(
    "select a.* from auth_identities i join accounts a on a.id = i.account_id where i.provider = 'device' and i.subject = ?1",
    subject,
  );
  if (row !== null && banned(row, context.now)) throw bannedError(row);
  // A device key only ever signs into a guest. Once that guest became a
  // registered account (register upgrades it in place), the key must not
  // sign back into it without the password, or "Sign out" would do nothing
  // on a shared computer. The device gets a fresh guest instead (the
  // identity row is re-pointed by the upsert below).
  if (row === null || row.status === "deleted" || row.kind !== "guest") {
    if ((await hitRateLimit(db, "guest:" + context.ip, 3_600_000, context.now)) > 30) {
      throw new ApiError(429, "rate-limited", "Too many new guest accounts from this network. Try again later.");
    }
    const id = crypto.randomUUID();
    const at = nowIso(context.now);
    const name = "Pilot-" + (1000 + Math.floor(Math.random() * 9000));
    await uniqueCodeInsert(db, (code) => [
      db.stmt("insert into accounts (id, kind, pilot_code, display_name, created_at) values (?1, 'guest', ?2, ?3, ?4)", id, code, name, at),
      db.stmt(
        "insert into auth_identities (provider, subject, account_id, created_at) values ('device', ?1, ?2, ?3) on conflict (provider, subject) do update set account_id = excluded.account_id",
        subject,
        id,
        at,
      ),
    ]);
    row = (await db.first<AccountRow>("select * from accounts where id = ?1", id))!;
  }
  const session = await newSession(db, env, row.id, context);
  await db.batch(session.statements);
  return { account: await publicAccountDetails(db, row), token: session.token };
}

async function emailToken(db: Sql, env: Env, accountId: string, email: string, purpose: "verify-email" | "reset-password", now: number): Promise<{ token: string; statements: D1PreparedStatement[] }> {
  const token = randomToken();
  const hours = purpose === "verify-email" ? 72 : 1;
  const link = (env.PUBLIC_URL ?? "") + "/?" + (purpose === "verify-email" ? "verify" : "reset") + "=" + token;
  const subject = purpose === "verify-email" ? "Confirm your Space Typing email" : "Reset your Space Typing password";
  const body =
    purpose === "verify-email"
      ? "Welcome, pilot! Confirm your email to protect your progress:\n" + link + "\nThis link works for 72 hours."
      : "Someone asked to reset your password. If it was you, open:\n" + link + "\nThis link works for 1 hour. If not, ignore this email.";
  return {
    token,
    statements: [
      db.stmt(
        "insert into one_time_tokens (token_hash, account_id, purpose, created_at, expires_at) values (?1, ?2, ?3, ?4, ?5)",
        await sha256Hex(token),
        accountId,
        purpose,
        nowIso(now),
        nowIso(now + hours * 3_600_000),
      ),
      db.stmt("insert into email_outbox (to_email, subject, body, created_at) values (?1, ?2, ?3, ?4)", email, subject, body, nowIso(now)),
    ],
  };
}

export async function register(
  db: Sql,
  env: Env,
  input: Record<string, unknown>,
  current: AccountRow | null,
  context: Context,
): Promise<{ account: PublicAccount; token: string }> {
  const problem = emailProblem(input.email) ?? displayNameProblem(input.displayName);
  if (problem !== null) throw new ApiError(400, "invalid", problem);
  if (!isClientKey(input.key)) throw new ApiError(400, "invalid", "Password key missing. Reload the game and try again.");
  if (input.acceptTerms !== true) throw new ApiError(400, "terms", "Please accept the terms and privacy policy.");
  const birthYear = input.birthYear === undefined || input.birthYear === null || input.birthYear === "" ? null : Number(input.birthYear);
  if (birthYear !== null && (!Number.isInteger(birthYear) || birthYear < 1900 || birthYear > new Date(context.now).getUTCFullYear())) {
    throw new ApiError(400, "invalid", "Enter a valid birth year.");
  }
  if ((await hitRateLimit(db, "register:" + context.ip, 3_600_000, context.now)) > 10) {
    throw new ApiError(429, "rate-limited", "Too many sign-ups from this network. Try again later.");
  }
  const email = (input.email as string).trim();
  const normalized = normalizeEmail(email);
  const displayName = (input.displayName as string).trim();
  const { hash, salt } = await hashClientKey(pepper(env), input.key);
  const at = nowIso(context.now);
  const upgrade = current !== null && current.kind === "guest" && current.status === "active";
  const id = upgrade ? current.id : crypto.randomUUID();
  const verify = await emailToken(db, env, id, email, "verify-email", context.now);
  const session = await newSession(db, env, id, context);
  try {
    if (upgrade) {
      await db.batch([
        db.stmt(
          `update accounts set kind = 'registered', email = ?2, email_normalized = ?3, password_hash = ?4, password_salt = ?5,
                  display_name = ?6, birth_year = ?7, terms_accepted_at = ?8 where id = ?1 and kind = 'guest'`,
          id, email, normalized, hash, salt, displayName, birthYear, at,
        ),
        // The guest's device key must not sign into the registered account.
        db.stmt("delete from auth_identities where account_id = ?1 and provider = 'device'", id),
        ...session.statements,
        ...verify.statements,
      ]);
    } else {
      await uniqueCodeInsert(db, (code) => [
        db.stmt(
          `insert into accounts (id, kind, pilot_code, email, email_normalized, password_hash, password_salt, display_name, birth_year, terms_accepted_at, created_at)
           values (?1, 'registered', ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)`,
          id, code, email, normalized, hash, salt, displayName, birthYear, at,
        ),
        ...session.statements,
        ...verify.statements,
      ]);
    }
  } catch (error) {
    if (isUniqueViolation(error) && String(error).includes("email")) {
      throw new ApiError(409, "email-taken", "An account with this email already exists. Sign in instead.");
    }
    throw error;
  }
  const row = (await db.first<AccountRow>("select * from accounts where id = ?1", id))!;
  return { account: await publicAccountDetails(db, row), token: session.token };
}

export async function login(db: Sql, env: Env, input: Record<string, unknown>, context: Context): Promise<{ account: PublicAccount; token: string }> {
  if (typeof input.email !== "string" || !isClientKey(input.key)) throw new ApiError(400, "invalid", "Enter your email and password.");
  const normalized = normalizeEmail(input.email);
  const failKey = "login-fail:" + normalized;
  if ((await peekRateLimit(db, failKey, context.now)) >= 8) {
    throw new ApiError(429, "rate-limited", "Too many wrong passwords. Wait 5 minutes or reset your password.");
  }
  const row = await db.first<AccountRow>("select * from accounts where email_normalized = ?1 and status <> 'deleted'", normalized);
  const ok = await verifyClientKey(pepper(env), input.key, row?.password_salt ?? null, row?.password_hash ?? null);
  if (!ok || row === null || row.password_login_enabled === 0) {
    await hitRateLimit(db, failKey, 300_000, context.now);
    throw new ApiError(401, "wrong-login", "Email or password is not correct.");
  }
  if (banned(row, context.now)) throw bannedError(row);
  const session = await newSession(db, env, row.id, context);
  await db.batch(session.statements);
  return { account: await publicAccountDetails(db, row), token: session.token };
}

export async function changePassword(db: Sql, env: Env, auth: Auth, input: Record<string, unknown>, now: number): Promise<void> {
  if (!isClientKey(input.current) || !isClientKey(input.next)) throw new ApiError(400, "invalid", "Password key missing.");
  if (!(await verifyClientKey(pepper(env), input.current, auth.account.password_salt, auth.account.password_hash))) {
    throw new ApiError(401, "wrong-password", "Current password is not correct.");
  }
  const { hash, salt } = await hashClientKey(pepper(env), input.next);
  await db.batch([
    db.stmt("update accounts set password_hash = ?2, password_salt = ?3 where id = ?1", auth.account.id, hash, salt),
    db.stmt("update sessions set revoked_at = ?3 where account_id = ?1 and id <> ?2 and revoked_at is null", auth.account.id, auth.sessionId, nowIso(now)),
  ]);
}

export async function forgotPassword(db: Sql, env: Env, emailInput: unknown, context: Context): Promise<void> {
  if (emailProblem(emailInput) !== null) return;
  const normalized = normalizeEmail(emailInput as string);
  if ((await hitRateLimit(db, "forgot:" + normalized, 600_000, context.now)) > 3) return;
  if ((await hitRateLimit(db, "forgot-ip:" + context.ip, 600_000, context.now)) > 10) {
    throw new ApiError(429, "rate-limited", "Too many requests. Try again later.");
  }
  const row = await db.first<AccountRow>("select * from accounts where email_normalized = ?1 and status = 'active'", normalized);
  if (row === null || row.email === null) return;
  const reset = await emailToken(db, env, row.id, row.email, "reset-password", context.now);
  await db.batch(reset.statements);
}

async function useToken(db: Sql, token: unknown, purpose: "verify-email" | "reset-password", now: number): Promise<string> {
  if (typeof token !== "string" || token.length < 20) throw new ApiError(400, "bad-link", "This link is not valid.");
  const hash = await sha256Hex(token);
  const row = await db.first<{ account_id: string }>(
    "update one_time_tokens set used_at = ?3 where token_hash = ?1 and purpose = ?2 and used_at is null and expires_at > ?3 returning account_id",
    hash,
    purpose,
    nowIso(now),
  );
  if (row === null) throw new ApiError(400, "bad-link", "This link has expired or was already used.");
  return row.account_id;
}

/**
 * New password from a reset link. The link is used up only together with the
 * password change (one batch), so a request with the wrong email or a
 * malformed key leaves the link working.
 */
export async function resetPassword(db: Sql, env: Env, input: Record<string, unknown>, now: number): Promise<void> {
  if (!isClientKey(input.key) || typeof input.email !== "string") throw new ApiError(400, "invalid", "Password key missing.");
  if (typeof input.token !== "string" || input.token.length < 20) throw new ApiError(400, "bad-link", "This link is not valid.");
  const tokenHash = await sha256Hex(input.token);
  const at = nowIso(now);
  const row = await db.first<{ account_id: string; email_normalized: string | null }>(
    `select t.account_id, a.email_normalized from one_time_tokens t join accounts a on a.id = t.account_id
      where t.token_hash = ?1 and t.purpose = 'reset-password' and t.used_at is null and t.expires_at > ?2`,
    tokenHash,
    at,
  );
  if (row === null) throw new ApiError(400, "bad-link", "This link has expired or was already used.");
  // The browser derives the key with the account's email; make sure it used the right one.
  if (row.email_normalized !== normalizeEmail(input.email)) {
    throw new ApiError(400, "bad-link", "This link belongs to a different email address.");
  }
  const { hash, salt } = await hashClientKey(pepper(env), input.key);
  // Statements 2 and 3 run only if statement 1 used the link just now (used_at = this request's time).
  const changes = await db.batch([
    db.stmt("update one_time_tokens set used_at = ?2 where token_hash = ?1 and used_at is null and expires_at > ?2", tokenHash, at),
    db.stmt(
      "update accounts set password_hash = ?2, password_salt = ?3, password_login_enabled = 1, email_verified_at = coalesce(email_verified_at, ?5) where id = ?1 and exists (select 1 from one_time_tokens where token_hash = ?4 and used_at = ?5)",
      row.account_id, hash, salt, tokenHash, at,
    ),
    db.stmt(
      "update sessions set revoked_at = ?2 where account_id = ?1 and revoked_at is null and exists (select 1 from one_time_tokens where token_hash = ?3 and used_at = ?2)",
      row.account_id, at, tokenHash,
    ),
  ]);
  if (changes[0] !== 1) throw new ApiError(400, "bad-link", "This link has expired or was already used.");
}

/** Email of the account a reset link belongs to (the browser needs it to derive the key). */
export async function resetLinkEmail(db: Sql, token: unknown, now: number): Promise<string> {
  if (typeof token !== "string" || token.length < 20) throw new ApiError(400, "bad-link", "This link is not valid.");
  const row = await db.first<{ email: string | null }>(
    `select a.email from one_time_tokens t join accounts a on a.id = t.account_id
      where t.token_hash = ?1 and t.purpose = 'reset-password' and t.used_at is null and t.expires_at > ?2`,
    await sha256Hex(token),
    nowIso(now),
  );
  if (row?.email == null) throw new ApiError(400, "bad-link", "This link has expired or was already used.");
  return row.email;
}

export async function verifyEmail(db: Sql, env: Env, token: unknown, now: number): Promise<void> {
  const accountId = await useToken(db, token, "verify-email", now);
  await db.run("update accounts set email_verified_at = coalesce(email_verified_at, ?2) where id = ?1", accountId, nowIso(now));
  // Big rewards held for a verified email are paid now (decision 5).
  if (walletPhase(env) >= 2 && (await loadWallet(db, accountId, now))?.held.length) await releaseHeld(db, env, accountId, now);
}

export async function resendVerification(db: Sql, env: Env, auth: Auth, now: number): Promise<void> {
  const account = auth.account;
  if (account.kind !== "registered" || account.email === null || account.email_verified_at !== null) return;
  if ((await hitRateLimit(db, "resend:" + account.id, 600_000, now)) > 3) throw new ApiError(429, "rate-limited", "Wait a few minutes before asking again.");
  const verify = await emailToken(db, env, account.id, account.email, "verify-email", now);
  await db.batch(verify.statements);
}

export async function updateProfile(db: Sql, auth: Auth, input: Record<string, unknown>): Promise<PublicAccount> {
  const problem = displayNameProblem(input.displayName);
  if (problem !== null) throw new ApiError(400, "invalid", problem);
  const row = await db.first<AccountRow>("update accounts set display_name = ?2 where id = ?1 returning *", auth.account.id, (input.displayName as string).trim());
  return publicAccountDetails(db, row!);
}

export async function listSessions(db: Sql, accountId: string, now: number): Promise<Record<string, unknown>[]> {
  return db.all(
    "select id, created_at, last_seen_at, expires_at, ip, user_agent from sessions where account_id = ?1 and revoked_at is null and expires_at > ?2 order by last_seen_at desc",
    accountId,
    nowIso(now),
  );
}

export async function revokeOtherSessions(db: Sql, auth: Auth, now: number): Promise<number> {
  return db.run("update sessions set revoked_at = ?3 where account_id = ?1 and id <> ?2 and revoked_at is null", auth.account.id, auth.sessionId, nowIso(now));
}

/** Soft delete: sign-in stops at once, personal fields and saves are removed. */
export async function deleteAccount(db: Sql, env: Env, auth: Auth, input: Record<string, unknown>, now: number): Promise<void> {
  if (auth.account.kind === "registered") {
    if (auth.account.password_login_enabled === 0) throw new ApiError(400, "password-required", "Set a password through your email before deleting this account.");
    if (!isClientKey(input.key) || !(await verifyClientKey(pepper(env), input.key, auth.account.password_salt, auth.account.password_hash))) {
      throw new ApiError(401, "wrong-password", "Password is not correct.");
    }
  }
  const id = auth.account.id;
  await db.batch([
    db.stmt(
      `update accounts set status = 'deleted', deleted_at = ?2, email = null, email_normalized = null, password_hash = null,
              password_salt = null, kind = 'guest', display_name = 'Deleted pilot', birth_year = null where id = ?1`,
      id,
      nowIso(now),
    ),
    db.stmt("update sessions set revoked_at = ?2 where account_id = ?1 and revoked_at is null", id, nowIso(now)),
    db.stmt("delete from auth_identities where account_id = ?1", id),
    db.stmt("delete from player_saves where account_id = ?1", id),
    db.stmt("delete from player_save_backups where account_id = ?1", id),
    db.stmt("delete from wallets where account_id = ?1", id),
    db.stmt("delete from wallet_days where account_id = ?1", id),
    db.stmt("delete from friendships where account_id = ?1 or friend_id = ?1", id),
    db.stmt("delete from chat_group_members where account_id = ?1", id),
    forgetFeedbackSender(db, id),
  ]);
}

export async function exportAccount(db: Sql, auth: Auth, now: number): Promise<Record<string, unknown>> {
  const id = auth.account.id;
  const [save, liveops, ledger, sessions, friends, groups, feedback] = await Promise.all([
    db.first<{ revision: number; save_version: number; updated_at: string; data: string; data_gz: unknown }>(
      "select revision, save_version, updated_at, data, data_gz from player_saves where account_id = ?1",
      id,
    ),
    db.first("select data, updated_at from liveops_states where account_id = ?1", id),
    db.all("select key, source, reward, note, created_at from reward_ledger where account_id = ?1 order by id", id),
    listSessions(db, id, now),
    db.all("select friend_id, status, created_at from friendships where account_id = ?1", id),
    db.all("select g.id, g.name, m.role, m.joined_at from chat_group_members m join chat_groups g on g.id = m.group_id where m.account_id = ?1", id),
    feedbackForExport(db, id),
  ]);
  return {
    account: await publicAccountDetails(db, auth.account),
    birthYear: auth.account.birth_year,
    save:
      save === null
        ? null
        : { revision: save.revision, save_version: save.save_version, updated_at: save.updated_at, data: JSON.parse(await storedSaveText(save)) },
    liveOps: liveops === null ? null : { ...liveops, data: JSON.parse(String(liveops.data)) },
    rewards: ledger.map((row) => ({ ...row, reward: JSON.parse(String(row.reward)) })),
    sessions,
    friends,
    groups,
    feedback,
    wallet: await loadWallet(db, id, now),
    exportedAt: nowIso(now),
  };
}
