import { describe, expect, it } from "vitest";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createLocalSessionHandler, type LocalSessionConfig } from "../server/duel/local-session";
import { verifyDuelSessionToken } from "../server/duel/auth";

const config: LocalSessionConfig = {
  enabled: true, nodeEnv: "development", host: "127.0.0.1",
  secret: "test-only-local-secret-with-at-least-32-characters",
  allowedOrigins: new Set(["https://space.typing-game.local", "http://localhost:3004"]),
};
function request(overrides: Partial<IncomingMessage> = {}, options = config) {
  let status = 0;
  let headers: Record<string, string> = {};
  let body = "";
  const handled = createLocalSessionHandler(options)({
    method: "GET", url: "/api/duel/session",
    headers: { host: "space.typing-game.local", "sec-fetch-site": "same-origin", "x-forwarded-proto": "https" },
    socket: { remoteAddress: "127.0.0.1" }, ...overrides,
  } as IncomingMessage, {
    writeHead(code: number, values: Record<string, string>) { status = code; headers = values; },
    end(value: string) { body = value; },
  } as unknown as ServerResponse);
  return { handled, status, headers, body };
}

describe("opt-in local Duel sessions", () => {
  it("is absent unless explicitly enabled", () => {
    expect(request({}, { ...config, enabled: false }).handled).toBe(false);
  });
  it("refuses production and non-loopback binding", () => {
    expect(() => createLocalSessionHandler({ ...config, nodeEnv: "production" })).toThrow();
    expect(() => createLocalSessionHandler({ ...config, host: "0.0.0.0" })).toThrow();
  });
  it("issues signed, short-lived guest identities without exposing the signing secret", () => {
    const result = request();
    const token = JSON.parse(result.body).token as string;
    expect(result.status).toBe(200);
    expect(verifyDuelSessionToken(token, config.secret)?.accountId).toMatch(/^local-/);
    expect(verifyDuelSessionToken(token, config.secret, Date.now() + 3601_000)).toBeNull();
    expect(result.headers["cache-control"]).toBe("no-store");
    expect(result.headers["set-cookie"]).toContain("HttpOnly; SameSite=Strict; Max-Age=3600; Secure");
    expect(result.body).not.toContain(config.secret);
  });
  it("keeps a signed browser identity on refresh, but separates other browsers", () => {
    const first = request();
    const second = request({ headers: { host: "space.typing-game.local", cookie: first.headers["set-cookie"] } });
    const identity = (body: string) => verifyDuelSessionToken(JSON.parse(body).token, config.secret)?.accountId;
    expect(identity(first.body)).toBe(identity(second.body));
    expect(identity(request().body)).not.toBe(identity(first.body));
  });
  it("rejects cross-site requests and untrusted hosts/origins", () => {
    for (const headers of [
      { host: "attacker.example" },
      { host: "space.typing-game.local", origin: "https://attacker.example" },
      { host: "space.typing-game.local", "sec-fetch-site": "cross-site" },
    ]) expect(request({ headers }).status).toBe(403);
  });
  it("rejects remote peers and non-GET methods", () => {
    expect(request({ socket: { remoteAddress: "192.168.1.1" } as IncomingMessage["socket"] }).status).toBe(403);
    expect(request({ method: "POST" }).status).toBe(405);
  });
  it("does not intercept other routes or reuse a forged cookie", () => {
    expect(request({ url: "/healthz" }).handled).toBe(false);
    const result = request({ headers: { host: "localhost:3004", cookie: "duel_local_identity=forged" } });
    expect(result.status).toBe(200);
    expect(result.headers["set-cookie"]).not.toContain("; Secure");
    expect(verifyDuelSessionToken(JSON.parse(result.body).token, config.secret)).not.toBeNull();
  });
});
