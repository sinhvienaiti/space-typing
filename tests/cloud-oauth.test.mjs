import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { finishSocialIdentity, forgotPassword, guest, login, register, resetPassword } from "../cloud/src/accounts";
import { hashClientKey } from "../cloud/src/crypto";
import { handleOAuth, socialProviders } from "../cloud/src/oauth";

const NOW = Date.UTC(2026, 9, 20, 4);
const databases = [];
afterEach(() => { vi.unstubAllGlobals(); for (const db of databases.splice(0)) db.close(); });

function fixture() {
  const sqlite = new DatabaseSync(":memory:");
  databases.push(sqlite);
  sqlite.exec("pragma foreign_keys=on");
  const folder = new URL("../cloud/migrations/", import.meta.url);
  for (const name of readdirSync(folder).filter((name) => name.endsWith(".sql")).sort()) sqlite.exec(readFileSync(new URL(name, folder), "utf8"));
  const query = (text, params) => {
    const statement = sqlite.prepare(text);
    statement.setAllowBareNamedParameters(true);
    return { statement, bindings: Object.fromEntries(params.map((value, i) => [String(i + 1), value === undefined ? null : typeof value === "boolean" ? Number(value) : value])) };
  };
  const run = (text, params) => { const { statement, bindings } = query(text, params); return Number(statement.run(bindings).changes); };
  const db = {
    async first(text, ...params) { const { statement, bindings } = query(text, params); return statement.get(bindings) ?? null; },
    async all(text, ...params) { const { statement, bindings } = query(text, params); return statement.all(bindings); },
    async run(text, ...params) { return run(text, params); },
    stmt: (text, ...params) => ({ text, params }),
    async batch(statements) {
      sqlite.exec("begin");
      try { const changed = statements.map((s) => run(s.text, s.params)); sqlite.exec("commit"); return changed; }
      catch (error) { sqlite.exec("rollback"); throw error; }
    },
  };
  const env = { LOCAL_DEV: "1", PUBLIC_URL: "https://game.example", OAUTH_GOOGLE_CLIENT_ID: "google-app", OAUTH_GOOGLE_CLIENT_SECRET: "google-secret", OAUTH_FACEBOOK_APP_ID: "facebook-app", OAUTH_FACEBOOK_APP_SECRET: "facebook-secret", OAUTH_FACEBOOK_API_VERSION: "v23.0" };
  const context = { ip: "203.0.113.10", userAgent: "OAuth test browser", now: NOW };
  async function begin(provider = "google", auth = null, input = {}) {
    const path = "/oauth/" + provider + "/start";
    const response = await handleOAuth(new Request(env.PUBLIC_URL + "/api/account" + path, { method: "POST", headers: { "content-type": "application/json", "x-space-typing": "1" }, body: JSON.stringify({ intent: "register", acceptTerms: true, ...input }) }), env, db, path, auth, context);
    const body = await response.json();
    const state = new URL(body.url).searchParams.get("state");
    const cookie = response.headers.get("set-cookie").split(";")[0];
    return { response, url: new URL(body.url), state, cookie, provider, auth };
  }
  async function finish(attempt, { state = attempt.state, cookie = attempt.cookie, auth = attempt.auth, now = NOW, extra = "&code=authorization-code" } = {}) {
    const path = "/oauth/" + attempt.provider + "/callback";
    return handleOAuth(new Request(env.PUBLIC_URL + "/api/account" + path + "?state=" + state + extra, { headers: { cookie } }), env, db, path, auth, { ...context, now });
  }
  return { sqlite, db, env, context, begin, finish };
}

const googleIdentity = { sub: "google-subject-1", email: "pilot@gmail.com", email_verified: true, name: "Space Pilot" };
function googleFetch(user = googleIdentity) {
  const fetcher = vi.fn(async (url) => new Response(JSON.stringify(url === "https://oauth2.googleapis.com/token" ? { access_token: "provider-secret-token", token_type: "Bearer" } : user), { headers: { "content-type": "application/json" } }));
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}
const resultCode = (response) => new URL(response.headers.get("location")).searchParams.get("oauth");

describe("social OAuth with the real D1 schema", () => {
  it("only advertises providers when all server configuration and a trusted origin exist", () => {
    const { env } = fixture();
    expect(socialProviders(env).every((provider) => provider.enabled)).toBe(true);
    expect(socialProviders({ ...env, OAUTH_GOOGLE_CLIENT_SECRET: undefined })[0].enabled).toBe(false);
    expect(socialProviders({ ...env, OAUTH_FACEBOOK_API_VERSION: undefined })[1].enabled).toBe(false);
    expect(socialProviders({ ...env, PUBLIC_URL: "https://game.example/?next=https://evil.example" }).every((provider) => !provider.enabled)).toBe(true);
    expect(socialProviders({ ...env, PUBLIC_URL: "http://game.example" }).every((provider) => !provider.enabled)).toBe(true);
  });

  it("requires terms at signup and an authenticated registered account to link", async () => {
    const { begin } = fixture();
    await expect(begin("google", null, { acceptTerms: false })).rejects.toMatchObject({ code: "terms" });
    await expect(begin("google", null, { intent: "link" })).rejects.toMatchObject({ code: "signed-out" });
  });

  it("rejects cross-origin starts before writing any state", async () => {
    const { sqlite, env, db, context } = fixture();
    const path = "/oauth/google/start";
    const make = (headers) => new Request(env.PUBLIC_URL + "/api/account" + path, { method: "POST", headers, body: JSON.stringify({ intent: "register", acceptTerms: true }) });
    await expect(handleOAuth(make({ "x-space-typing": "1", origin: "https://evil.example" }), env, db, path, null, context)).rejects.toMatchObject({ code: "csrf" });
    await expect(handleOAuth(make({ origin: env.PUBLIC_URL }), env, db, path, null, context)).rejects.toMatchObject({ code: "csrf" });
    expect(sqlite.prepare("select count(*) n from oauth_attempts").get().n).toBe(0);
  });

  it("uses PKCE, opaque browser-bound state and only the configured callback", async () => {
    const { sqlite, begin, env } = fixture();
    const attempt = await begin();
    expect(attempt.url.origin).toBe("https://accounts.google.com");
    expect(attempt.url.searchParams.get("redirect_uri")).toBe(env.PUBLIC_URL + "/api/account/oauth/google/callback");
    expect(attempt.url.searchParams.get("code_challenge_method")).toBe("S256");
    const row = sqlite.prepare("select * from oauth_attempts").get();
    expect(row.state_hash).not.toBe(attempt.state);
    expect(row.browser_hash).not.toBe(attempt.cookie.split("=")[1]);
    expect(attempt.response.headers.get("set-cookie")).toContain("HttpOnly; SameSite=Lax; Max-Age=600; Secure");
    const actual = Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(row.verifier))).toString("base64url");
    expect(attempt.url.searchParams.get("code_challenge")).toBe(actual);
  });

  it("creates a Google account, consumes the state once and never stores provider tokens", async () => {
    const { sqlite, begin, finish } = fixture();
    const fetcher = googleFetch();
    const attempt = await begin();
    const response = await finish(attempt);
    expect(response.status).toBe(303);
    expect(resultCode(response)).toBe("success");
    expect(response.headers.get("set-cookie")).toContain("st_session=");
    const row = sqlite.prepare("select * from accounts").get();
    expect(row).toMatchObject({ kind: "registered", email_normalized: "pilot@gmail.com", password_login_enabled: 0 });
    expect(row.email_verified_at).toBeTruthy();
    expect(sqlite.prepare("select * from auth_identities").get()).toMatchObject({ provider: "google", subject: "google-subject-1", account_id: row.id });
    expect(JSON.stringify(sqlite.prepare("select * from accounts").all())).not.toContain("provider-secret-token");
    expect(resultCode(await finish(attempt))).toBe("oauth-state");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("asks unknown social users to create an account when they choose sign in", async () => {
    const { sqlite, begin, finish } = fixture();
    googleFetch();
    const response = await finish(await begin("google", null, { intent: "login", acceptTerms: false }));
    expect(resultCode(response)).toBe("oauth-account-required");
    expect(response.headers.get("set-cookie")).not.toContain("st_session=");
    expect(sqlite.prepare("select count(*) n from accounts").get().n).toBe(0);
  });

  it("refuses wrong browser, expired state, replay and a session changed during OAuth before provider calls", async () => {
    const { db, env, context, begin, finish } = fixture();
    const fetcher = googleFetch();
    const attempt = await begin();
    expect(resultCode(await finish(attempt, { cookie: "st_oauth_google=" + "a".repeat(43) }))).toBe("oauth-state");
    expect(resultCode(await finish(attempt, { now: NOW + 600_001 }))).toBe("oauth-state");
    const created = await guest(db, env, "device-key-" + "a".repeat(43), context);
    const account = await db.first("select * from accounts where id = ?1", created.account.id);
    const session = await db.first("select id from sessions where account_id = ?1", account.id);
    const bound = await begin("google", { account, sessionId: session.id });
    expect(resultCode(await finish(bound, { auth: null }))).toBe("oauth-session");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("upgrades the current guest in place and keeps their save and wallet identity", async () => {
    const { sqlite, db, env, context, begin, finish } = fixture();
    googleFetch();
    const created = await guest(db, env, "device-key-" + "b".repeat(43), context);
    const account = await db.first("select * from accounts where id = ?1", created.account.id);
    const session = await db.first("select id from sessions where account_id = ?1", account.id);
    await db.run("insert into player_saves (account_id, revision, save_version, data, bytes, updated_at) values (?1, 1, 1, '{}', 2, ?2)", account.id, new Date(NOW).toISOString());
    const attempt = await begin("google", { account, sessionId: session.id });
    expect(resultCode(await finish(attempt))).toBe("success");
    expect(sqlite.prepare("select id, kind from accounts").all()).toEqual([{ id: account.id, kind: "registered" }]);
    expect(sqlite.prepare("select account_id from player_saves").get().account_id).toBe(account.id);
    expect(sqlite.prepare("select count(*) n from auth_identities where provider='device'").get().n).toBe(0);
    expect(sqlite.prepare("select revoked_at from sessions where id=?").get(session.id).revoked_at).toBeTruthy();
  });

  it("rolls back every dependent write if another callback promotes the guest before the batch", async () => {
    const { sqlite, db, env, context } = fixture();
    const created = await guest(db, env, "device-key-" + "c".repeat(43), context);
    const account = await db.first("select * from accounts where id = ?1", created.account.id);
    const session = await db.first("select id from sessions where account_id = ?1", account.id);
    const batch = db.batch;
    let raced = false;
    db.batch = async (statements) => {
      if (!raced) {
        raced = true;
        // The other callback commits after our account SELECT and before our
        // atomic batch. Its registered account must not receive our email link.
        sqlite.prepare("update accounts set kind='registered', email='winner@example.com', email_normalized='winner@example.com', password_hash='winner-hash', password_salt='winner-salt', password_login_enabled=0 where id=?").run(account.id);
      }
      return batch(statements);
    };
    await expect(finishSocialIdentity(db, env, { provider: "facebook", subject: "facebook-app:loser", email: "loser@example.com", emailVerified: false, displayName: "Second Pilot" }, { intent: "register", accountId: account.id, sessionId: session.id, acceptTerms: true, displayName: null, birthYear: null }, context)).rejects.toBeTruthy();
    expect(sqlite.prepare("select email from accounts where id=?").get(account.id).email).toBe("winner@example.com");
    expect(sqlite.prepare("select count(*) n from auth_identities where provider='facebook'").get().n).toBe(0);
    expect(sqlite.prepare("select count(*) n from one_time_tokens").get().n).toBe(0);
    expect(sqlite.prepare("select count(*) n from email_outbox").get().n).toBe(0);
  });

  it("never links a password account by matching provider email", async () => {
    const { sqlite, db, env, context, begin, finish } = fixture();
    await register(db, env, { email: "pilot@gmail.com", key: "a".repeat(43), displayName: "Original Pilot", acceptTerms: true }, null, context);
    googleFetch();
    const response = await finish(await begin());
    expect(resultCode(response)).toBe("email-taken");
    expect(sqlite.prepare("select count(*) n from accounts").get().n).toBe(1);
    expect(sqlite.prepare("select count(*) n from auth_identities where provider='google'").get().n).toBe(0);
  });

  it("links a Google identity only through the signed-in existing account's explicit link flow", async () => {
    const { sqlite, db, env, context, begin, finish } = fixture();
    const created = await register(db, env, { email: "password@example.com", key: "a".repeat(43), displayName: "Existing Pilot", acceptTerms: true }, null, context);
    const account = await db.first("select * from accounts where id = ?1", created.account.id);
    const session = await db.first("select id from sessions where account_id = ?1", account.id);
    googleFetch();
    expect(resultCode(await finish(await begin("google", { account, sessionId: session.id }, { intent: "link", acceptTerms: false })))).toBe("success");
    expect(sqlite.prepare("select account_id from auth_identities where provider='google'").get().account_id).toBe(account.id);
    expect(sqlite.prepare("select email, password_login_enabled from accounts where id=?").get(account.id)).toEqual({ email: "password@example.com", password_login_enabled: 1 });
    expect(sqlite.prepare("select count(*) n from accounts").get().n).toBe(1);
    expect(resultCode(await finish(await begin("google", null, { intent: "login", acceptTerms: false })))).toBe("success");
  });

  it.each(["link", "register"])("does not finish %s if the player signs out while the provider request is in flight", async (intent) => {
    const { sqlite, db, env, context, begin, finish } = fixture();
    const created = intent === "link"
      ? await register(db, env, { email: "original@example.com", key: "a".repeat(43), displayName: "Original Pilot", acceptTerms: true }, null, context)
      : await guest(db, env, "device-key-" + "d".repeat(43), context);
    const account = await db.first("select * from accounts where id = ?1", created.account.id);
    const session = await db.first("select id from sessions where account_id = ?1", account.id);
    vi.stubGlobal("fetch", vi.fn(async (url) => {
      if (url === "https://oauth2.googleapis.com/token") return new Response(JSON.stringify({ access_token: "google-token", token_type: "Bearer" }));
      await db.run("update sessions set revoked_at = ?2 where id = ?1", session.id, new Date(NOW).toISOString());
      return new Response(JSON.stringify(googleIdentity));
    }));
    const response = await finish(await begin("google", { account, sessionId: session.id }, { intent, acceptTerms: intent === "register" }));
    expect(["oauth-session", "signed-out"]).toContain(resultCode(response));
    expect(sqlite.prepare("select count(*) n from auth_identities where provider='google'").get().n).toBe(0);
    expect(sqlite.prepare("select count(*) n from sessions where revoked_at is null").get().n).toBe(0);
  });

  it("requires an actual email to create an account and lets known subjects sign in without it", async () => {
    const { sqlite, begin, finish } = fixture();
    googleFetch({ ...googleIdentity, email: undefined });
    expect(resultCode(await finish(await begin()))).toBe("oauth-email-required");
    expect(sqlite.prepare("select count(*) n from accounts").get().n).toBe(0);
    googleFetch();
    expect(resultCode(await finish(await begin()))).toBe("success");
    googleFetch({ ...googleIdentity, email: undefined });
    expect(resultCode(await finish(await begin("google", null, { intent: "login", acceptTerms: false })))).toBe("success");
    expect(sqlite.prepare("select count(*) n from accounts").get().n).toBe(1);
  });

  it("refuses a new Google identity with an unverified contact email", async () => {
    const { sqlite, begin, finish } = fixture();
    googleFetch({ ...googleIdentity, email_verified: false });
    expect(resultCode(await finish(await begin()))).toBe("oauth-email-unverified");
    expect(sqlite.prepare("select count(*) n from accounts").get().n).toBe(0);
  });

  it("requires mailbox confirmation for Google third-party emails without hosted-domain authority", async () => {
    const { sqlite, begin, finish } = fixture();
    googleFetch({ ...googleIdentity, email: "pilot@thirdparty.example", email_verified: true });
    expect(resultCode(await finish(await begin()))).toBe("success");
    expect(sqlite.prepare("select email_verified_at from accounts").get().email_verified_at).toBeNull();
    expect(sqlite.prepare("select to_email from email_outbox").get().to_email).toBe("pilot@thirdparty.example");
  });

  it("accepts Google's hosted-domain assertion for a verified Workspace email", async () => {
    const { sqlite, begin, finish } = fixture();
    googleFetch({ ...googleIdentity, email: "pilot@workspace.example", email_verified: true, hd: "workspace.example" });
    expect(resultCode(await finish(await begin()))).toBe("success");
    expect(sqlite.prepare("select email_verified_at from accounts").get().email_verified_at).toBeTruthy();
    expect(sqlite.prepare("select count(*) n from email_outbox").get().n).toBe(0);
  });

  it("creates a usable session after a timed ban has expired", async () => {
    const { sqlite, begin, finish } = fixture();
    googleFetch();
    expect(resultCode(await finish(await begin()))).toBe("success");
    sqlite.prepare("update accounts set status='banned', banned_until=?").run(new Date(NOW - 1).toISOString());
    expect(resultCode(await finish(await begin("google", null, { intent: "login", acceptTerms: false })))).toBe("success");
    expect(sqlite.prepare("select count(*) n from sessions where revoked_at is null").get().n).toBe(2);
  });

  it("disables password login for social-only accounts until a real email reset sets their password", async () => {
    const { sqlite, db, env, context, begin, finish } = fixture();
    googleFetch();
    expect(resultCode(await finish(await begin()))).toBe("success");
    const candidate = "a".repeat(43);
    // Even a matching hash must not bypass the explicit disabled flag.
    const hashed = await hashClientKey("local-dev-pepper", candidate);
    await db.run("update accounts set password_hash = ?1, password_salt = ?2", hashed.hash, hashed.salt);
    await expect(login(db, env, { email: googleIdentity.email, key: candidate }, context)).rejects.toMatchObject({ code: "wrong-login" });
    await forgotPassword(db, env, googleIdentity.email, context);
    const mail = sqlite.prepare("select body from email_outbox order by id desc limit 1").get();
    const link = mail.body.split("\n").find((line) => line.startsWith("https://"));
    const token = new URL(link).searchParams.get("reset");
    await resetPassword(db, env, { token, email: googleIdentity.email, key: "b".repeat(43) }, NOW + 1);
    expect(sqlite.prepare("select password_login_enabled from accounts").get().password_login_enabled).toBe(1);
    expect(sqlite.prepare("select count(*) n from sessions where revoked_at is null").get().n).toBe(0);
    await expect(login(db, env, { email: googleIdentity.email, key: "b".repeat(43) }, { ...context, now: NOW + 2 })).resolves.toMatchObject({ account: { email: googleIdentity.email, hasPassword: true } });
    await expect(resetPassword(db, env, { token, email: googleIdentity.email, key: "c".repeat(43) }, NOW + 3)).rejects.toMatchObject({ code: "bad-link" });
  });

  it("validates Facebook token app and user before trusting its profile", async () => {
    const { sqlite, begin, finish } = fixture();
    const fetcher = vi.fn(async (url) => new Response(JSON.stringify(url.includes("/oauth/access_token") ? { access_token: "facebook-user-token" } : url.includes("/debug_token") ? { data: { is_valid: true, app_id: "other-app", user_id: "12345", expires_at: NOW / 1000 + 3600 } } : { id: "12345", email: "pilot@example.com", name: "Facebook Pilot" })));
    vi.stubGlobal("fetch", fetcher);
    expect(resultCode(await finish(await begin("facebook")))).toBe("oauth-provider");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(sqlite.prepare("select count(*) n from accounts").get().n).toBe(0);
  });

  it("creates Facebook identity with appsecret_proof and leaves email verification pending", async () => {
    const { sqlite, begin, finish } = fixture();
    const fetcher = vi.fn(async (url) => new Response(JSON.stringify(url.includes("/oauth/access_token") ? { access_token: "facebook-user-token" } : url.includes("/debug_token") ? { data: { is_valid: true, app_id: "facebook-app", user_id: "12345", expires_at: NOW / 1000 + 3600 } } : { id: "12345", email: "pilot@example.com", name: "Facebook Pilot" })));
    vi.stubGlobal("fetch", fetcher);
    expect(resultCode(await finish(await begin("facebook")))).toBe("success");
    expect(fetcher.mock.calls[2][0]).toContain("appsecret_proof=");
    expect(sqlite.prepare("select email_verified_at, password_login_enabled from accounts").get()).toEqual({ email_verified_at: null, password_login_enabled: 0 });
    expect(sqlite.prepare("select subject from auth_identities where provider='facebook'").get().subject).toBe("facebook-app:12345");
    expect(sqlite.prepare("select count(*) n from email_outbox").get().n).toBe(1);
  });

  it("sanitizes upstream errors and cancellations without leaking tokens in redirects", async () => {
    const { begin, finish } = fixture();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("google-secret provider-secret-token https://bad.example"); }));
    const response = await finish(await begin());
    expect(response.headers.get("location")).toBe("https://game.example/?oauth=oauth-provider");
    expect(resultCode(await finish(await begin(), { extra: "&error=access_denied&error_description=secret" }))).toBe("oauth-cancelled");
  });
});
