import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { signDuelSessionToken, verifyDuelSessionToken } from "./auth";

export type LocalSessionConfig = {
  enabled: boolean;
  nodeEnv: string;
  host: string;
  secret: string;
  allowedOrigins: ReadonlySet<string>;
};

// Explicit local-only identity provider, NEVER a replacement for production login.
export function createLocalSessionHandler(config: LocalSessionConfig) {
  if (config.enabled && (config.nodeEnv !== "development" ||
      !["127.0.0.1", "::1"].includes(config.host))) {
    throw new Error("Local Duel sessions require development mode and a loopback bind address.");
  }
  const allowedHosts = new Set([...config.allowedOrigins].map(origin => new URL(origin).host));
  return (request: IncomingMessage, response: ServerResponse): boolean => {
    if (!config.enabled || request.url !== "/api/duel/session") return false;
    const reject = (status: number, error: string) => {
      response.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
      response.end(JSON.stringify({ error }));
      return true;
    };
    if (request.method !== "GET") return reject(405, "GET required");
    const peer = request.socket.remoteAddress;
    if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(peer ?? "")) return reject(403, "Local access only");
    if (!allowedHosts.has(request.headers.host ?? "")) return reject(403, "Host not allowed");
    const origin = request.headers.origin;
    if ((origin !== undefined && !config.allowedOrigins.has(origin)) ||
        request.headers["sec-fetch-site"] === "cross-site") return reject(403, "Origin not allowed");

    const cookie = request.headers.cookie?.split(";").map(part => part.trim())
      .find(part => part.startsWith("duel_local_identity="))?.slice("duel_local_identity=".length);
    const previous = cookie === undefined ? null : verifyDuelSessionToken(cookie, config.secret);
    const identity = previous ?? { accountId: "local-" + randomUUID(), displayName: "Local Pilot" };
    const token = signDuelSessionToken({ sub: identity.accountId, name: identity.displayName,
      exp: Math.floor(Date.now() / 1000) + 3600 }, config.secret);
    // Stable per-browser identity, signed and HttpOnly; same-site Portal iframe supported.
    const secure = request.headers["x-forwarded-proto"] === "https" || "encrypted" in request.socket;
    response.writeHead(200, {
      "content-type": "application/json",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "set-cookie": `duel_local_identity=${token}; Path=/api/duel/session; HttpOnly; SameSite=Strict; Max-Age=3600${secure ? "; Secure" : ""}`,
    });
    response.end(JSON.stringify({ token, mode: "local-guest" }));
    return true;
  };
}
