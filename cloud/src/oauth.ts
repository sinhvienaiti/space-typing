import { finishSocialIdentity, type Auth, type Context } from "./accounts";
import { displayNameProblem, emailProblem, hmacHex, randomToken, sha256Hex, toBase64Url } from "./crypto";
import { hitRateLimit, type Sql } from "./db";
import type { Env } from "./env";
import { ApiError, isHttps, json, readCookie, readJson, sessionCookie } from "./http";

export type SocialProvider = "google" | "facebook";
export type SocialIdentity = {
  provider: SocialProvider;
  subject: string;
  email: string | null;
  emailVerified: boolean;
  /** Google is authoritative for Gmail and hosted Workspace addresses; other
   * verified third-party addresses still require our mailbox confirmation. */
  emailAuthoritative?: boolean;
  displayName: string | null;
};
export type SocialAttempt = {
  intent: "login" | "register" | "link";
  accountId: string | null;
  sessionId: string | null;
  acceptTerms: boolean;
  displayName: string | null;
  birthYear: number | null;
};
type AttemptRow = {
  state_hash: string;
  browser_hash: string;
  provider: SocialProvider;
  verifier: string;
  intent: SocialAttempt["intent"];
  account_id: string | null;
  session_id: string | null;
  accept_terms: number;
  display_name: string | null;
  birth_year: number | null;
  expires_at: number;
};

const ATTEMPT_MS = 10 * 60_000;
const PREFIX = "/api/account/oauth/";
const encoder = new TextEncoder();

/** The destination and callback origin come only from deployment configuration. */
function publicOrigin(env: Env): string {
  try {
    const url = new URL(env.PUBLIC_URL ?? "");
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error();
    if (url.protocol !== "https:" && !(env.LOCAL_DEV === "1" && url.protocol === "http:" && loopback)) throw new Error();
    return url.origin;
  } catch {
    throw new ApiError(503, "oauth-unavailable", "Social sign-in needs a valid PUBLIC_URL.");
  }
}

function configured(env: Env, provider: SocialProvider): boolean {
  try { publicOrigin(env); } catch { return false; }
  return provider === "google"
    ? Boolean(env.OAUTH_GOOGLE_CLIENT_ID?.trim() && env.OAUTH_GOOGLE_CLIENT_SECRET?.trim())
    : Boolean(env.OAUTH_FACEBOOK_APP_ID?.trim() && env.OAUTH_FACEBOOK_APP_SECRET?.trim() && /^v\d{1,3}\.\d{1,2}$/.test(env.OAUTH_FACEBOOK_API_VERSION ?? ""));
}

export function socialProviders(env: Env): { id: SocialProvider; name: string; enabled: boolean }[] {
  return [
    { id: "google", name: "Google", enabled: configured(env, "google") },
    { id: "facebook", name: "Facebook", enabled: configured(env, "facebook") },
  ];
}

function callbackUrl(env: Env, provider: SocialProvider): string {
  return publicOrigin(env) + PREFIX + provider + "/callback";
}

function stateCookie(request: Request, provider: SocialProvider, token: string | null): string {
  const parts = [
    "st_oauth_" + provider + "=" + (token ?? ""),
    "Path=" + PREFIX + provider + "/callback",
    "HttpOnly", "SameSite=Lax", "Max-Age=" + (token === null ? 0 : ATTEMPT_MS / 1000),
  ];
  if (isHttps(request)) parts.push("Secure");
  return parts.join("; ");
}

/** All upstream failures are deliberately sanitized: URLs/bodies may contain credentials. */
async function providerJson(url: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error();
    const text = await response.text();
    if (text.length > 64 * 1024) throw new Error();
    const body: unknown = JSON.parse(text);
    if (body === null || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch {
    throw new ApiError(502, "oauth-provider", "The sign-in provider could not complete this request. Try again.");
  }
}

function safeName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, 24);
  return displayNameProblem(name) === null ? name : null;
}

function safeEmail(value: unknown): string | null {
  return emailProblem(value) === null ? (value as string).trim() : null;
}

function requiredString(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 4096) {
    throw new ApiError(502, "oauth-provider", "The provider returned incomplete sign-in details.");
  }
  return value;
}

async function identityFromCode(env: Env, provider: SocialProvider, code: string, verifier: string, now: number): Promise<SocialIdentity> {
  if (provider === "google") {
    const token = await providerJson("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, code_verifier: verifier, client_id: env.OAUTH_GOOGLE_CLIENT_ID!, client_secret: env.OAUTH_GOOGLE_CLIENT_SECRET!, redirect_uri: callbackUrl(env, provider), grant_type: "authorization_code" }).toString(),
    });
    const accessToken = requiredString(token.access_token);
    if (typeof token.token_type !== "string" || token.token_type.toLowerCase() !== "bearer") {
      throw new ApiError(502, "oauth-provider", "The provider returned an invalid token type.");
    }
    // Token is obtained by this confidential client with its exact callback + PKCE.
    // Use the authenticated UserInfo endpoint; never decode an unverified JWT.
    const user = await providerJson("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: "Bearer " + accessToken } });
    const subject = requiredString(user.sub);
    if (subject.length > 255) throw new ApiError(502, "oauth-provider", "Invalid provider identity.");
    const email = safeEmail(user.email);
    const domain = email?.slice(email.lastIndexOf("@") + 1).toLowerCase();
    // https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
    // Third-party mailbox ownership can change after Google's initial check.
    const authoritative = user.email_verified === true && (["gmail.com", "googlemail.com"].includes(domain ?? "") || (typeof user.hd === "string" && user.hd.trim() !== ""));
    return { provider, subject, email, emailVerified: user.email_verified === true, emailAuthoritative: authoritative, displayName: safeName(user.name) };
  }
  const graph = "https://graph.facebook.com/" + env.OAUTH_FACEBOOK_API_VERSION;
  const token = await providerJson(graph + "/oauth/access_token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: env.OAUTH_FACEBOOK_APP_ID!, client_secret: env.OAUTH_FACEBOOK_APP_SECRET!, redirect_uri: callbackUrl(env, provider) }).toString(),
  });
  const accessToken = requiredString(token.access_token);
  const inspected = await providerJson(graph + "/debug_token?" + new URLSearchParams({ input_token: accessToken }).toString(), {
    headers: { authorization: "Bearer " + env.OAUTH_FACEBOOK_APP_ID + "|" + env.OAUTH_FACEBOOK_APP_SECRET },
  });
  const data = inspected.data as Record<string, unknown> | undefined;
  if (!data || data.is_valid !== true || data.app_id !== env.OAUTH_FACEBOOK_APP_ID || typeof data.user_id !== "string" || !/^\d{1,100}$/.test(data.user_id) || typeof data.expires_at !== "number" || data.expires_at * 1000 <= now || (typeof data.data_access_expires_at === "number" && data.data_access_expires_at !== 0 && data.data_access_expires_at * 1000 <= now)) {
    throw new ApiError(502, "oauth-provider", "The Facebook token could not be verified for this app.");
  }
  const user = await providerJson(graph + "/me?" + new URLSearchParams({ fields: "id,name,email", appsecret_proof: await hmacHex(env.OAUTH_FACEBOOK_APP_SECRET!, accessToken) }).toString(), {
    headers: { authorization: "Bearer " + accessToken },
  });
  if (user.id !== data.user_id) throw new ApiError(502, "oauth-provider", "Facebook returned a mismatched identity.");
  // Facebook does not return Google's email_verified claim. Its email remains
  // unverified until our normal email verification flow completes.
  return { provider, subject: env.OAUTH_FACEBOOK_APP_ID + ":" + data.user_id, email: safeEmail(user.email), emailVerified: false, displayName: safeName(user.name) };
}

async function start(request: Request, env: Env, db: Sql, provider: SocialProvider, auth: Auth | null, context: Context): Promise<Response> {
  if (!configured(env, provider)) throw new ApiError(503, "oauth-unavailable", "This sign-in provider is not configured yet.");
  const origin = request.headers.get("origin");
  if (request.headers.get("x-space-typing") !== "1" || (origin !== null && origin !== publicOrigin(env))) {
    throw new ApiError(403, "csrf", "Start social sign-in from the game website.");
  }
  const input = await readJson(request, 4096);
  const intent = input.intent;
  if (intent !== "login" && intent !== "register" && intent !== "link") throw new ApiError(400, "invalid", "Choose sign in, create account, or link account.");
  if (intent === "link" && auth?.account.kind !== "registered") throw new ApiError(401, "signed-out", "Sign in to your existing account before linking a provider.");
  if (intent === "register" && input.acceptTerms !== true) throw new ApiError(400, "terms", "Please accept the terms and privacy policy.");
  if (input.displayName !== undefined && input.displayName !== "" && displayNameProblem(input.displayName) !== null) {
    throw new ApiError(400, "invalid", displayNameProblem(input.displayName)!);
  }
  const birthYear = input.birthYear === undefined || input.birthYear === null || input.birthYear === "" ? null : Number(input.birthYear);
  if (birthYear !== null && (!Number.isInteger(birthYear) || birthYear < 1900 || birthYear > new Date(context.now).getUTCFullYear())) throw new ApiError(400, "invalid", "Enter a valid birth year.");
  if ((await hitRateLimit(db, "oauth-start:" + context.ip, ATTEMPT_MS, context.now)) > 20) throw new ApiError(429, "rate-limited", "Too many social sign-in requests. Wait a few minutes.");
  const state = randomToken();
  const browser = randomToken();
  const verifier = randomToken(48);
  await db.run(
    `insert into oauth_attempts (state_hash, browser_hash, provider, verifier, intent, account_id, session_id, accept_terms, display_name, birth_year, created_at, expires_at)
     values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`,
    await sha256Hex(state), await sha256Hex(browser), provider, verifier, intent, auth?.account.id ?? null, auth?.sessionId ?? null, input.acceptTerms === true, safeName(input.displayName), birthYear, context.now, context.now + ATTEMPT_MS,
  );
  const url = new URL(provider === "google" ? "https://accounts.google.com/o/oauth2/v2/auth" : "https://www.facebook.com/" + env.OAUTH_FACEBOOK_API_VERSION + "/dialog/oauth");
  url.search = new URLSearchParams({ client_id: provider === "google" ? env.OAUTH_GOOGLE_CLIENT_ID! : env.OAUTH_FACEBOOK_APP_ID!, redirect_uri: callbackUrl(env, provider), response_type: "code", scope: provider === "google" ? "openid email profile" : "email,public_profile", state }).toString();
  if (provider === "google") {
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("code_challenge", toBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(verifier)))));
    url.searchParams.set("prompt", "select_account");
  }
  return json({ url: url.toString() }, 200, { "set-cookie": stateCookie(request, provider, browser) });
}

/** Only stable app error codes enter the URL; no tokens or provider error text. */
function redirect(request: Request, env: Env, provider: SocialProvider, code: string, token?: string): Response {
  const headers = new Headers({ location: publicOrigin(env) + "/?oauth=" + code, "cache-control": "no-store", "referrer-policy": "no-referrer", "x-content-type-options": "nosniff" });
  headers.append("set-cookie", stateCookie(request, provider, null));
  if (token !== undefined) headers.append("set-cookie", sessionCookie(request, token, Math.max(1, Number(env.SESSION_DAYS ?? 30)) * 86_400));
  return new Response(null, { status: 303, headers });
}

async function callback(request: Request, env: Env, db: Sql, provider: SocialProvider, auth: Auth | null, context: Context): Promise<Response> {
  try {
    if (!configured(env, provider)) throw new ApiError(503, "oauth-unavailable", "This sign-in provider is not configured yet.");
    const url = new URL(request.url);
    const state = url.searchParams.get("state");
    let browser: string | undefined;
    try { browser = readCookie(request, "st_oauth_" + provider); } catch { /* malformed cookie */ }
    if (!state || !/^[A-Za-z0-9_-]{43}$/.test(state) || !browser || !/^[A-Za-z0-9_-]{43}$/.test(browser)) throw new ApiError(400, "oauth-state", "This sign-in attempt expired. Try again.");
    if ((await hitRateLimit(db, "oauth-callback:" + context.ip, ATTEMPT_MS, context.now)) > 60) throw new ApiError(429, "rate-limited", "Too many social sign-in requests.");
    // UPDATE RETURNING makes replay/racing callbacks fail before any provider call.
    const attempt = await db.first<AttemptRow>(
      `update oauth_attempts set consumed_at = ?4
        where state_hash = ?1 and browser_hash = ?2 and provider = ?3 and consumed_at is null and expires_at > ?4 returning *`,
      await sha256Hex(state), await sha256Hex(browser), provider, context.now,
    );
    if (!attempt) throw new ApiError(400, "oauth-state", "This sign-in attempt expired. Try again.");
    if (attempt.account_id !== null && (auth?.account.id !== attempt.account_id || auth?.sessionId !== attempt.session_id)) throw new ApiError(401, "oauth-session", "Your session changed. Start sign-in again.");
    if (url.searchParams.has("error")) throw new ApiError(400, "oauth-cancelled", "Sign-in was cancelled.");
    const code = url.searchParams.get("code");
    if (!code || code.length > 4096) throw new ApiError(400, "oauth-provider", "The provider did not return a sign-in code.");
    const identity = await identityFromCode(env, provider, code, attempt.verifier, context.now);
    const result = await finishSocialIdentity(db, env, identity, {
      intent: attempt.intent, accountId: attempt.account_id, sessionId: attempt.session_id,
      acceptTerms: attempt.accept_terms === 1, displayName: attempt.display_name, birthYear: attempt.birth_year,
    }, context);
    return redirect(request, env, provider, "success", result.token);
  } catch (error) {
    const known = new Set(["oauth-unavailable", "oauth-state", "oauth-session", "oauth-cancelled", "oauth-provider", "oauth-email-required", "oauth-email-unverified", "oauth-account-required", "oauth-linked", "email-taken", "terms", "signed-out", "banned", "rate-limited", "account-deleted"]);
    const code = error instanceof ApiError && known.has(error.code) ? error.code : "oauth-failed";
    return redirect(request, env, provider, code);
  }
}

/** Called after the existing session is authenticated by worker.ts. */
export async function handleOAuth(request: Request, env: Env, db: Sql, path: string, auth: Auth | null, context: Context): Promise<Response | null> {
  if (path === "/oauth/providers" && request.method === "GET") return json({ providers: socialProviders(env) });
  const match = /^\/oauth\/(google|facebook)\/(start|callback)$/.exec(path);
  if (!match) return null;
  const provider = match[1] as SocialProvider;
  if (match[2] === "start" && request.method === "POST") return start(request, env, db, provider, auth, context);
  if (match[2] === "callback" && request.method === "GET") return callback(request, env, db, provider, auth, context);
  return null;
}
