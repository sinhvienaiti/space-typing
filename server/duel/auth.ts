import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import type { DuelAuthenticatedIdentity } from "../../src/duel/authority";

export type DuelSignedSessionPayload = {
  sub: string;
  name: string;
  exp: number;
};

function encodeBase64Url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function signature(
  body: string,
  secret: string,
): Buffer {
  return createHmac("sha256", secret).update(body).digest();
}

function parsePayload(
  value: unknown,
  nowSeconds: number,
): DuelSignedSessionPayload | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return null;
  }
  const payload = value as Record<string, unknown>;
  if (
    typeof payload.sub !== "string" ||
    payload.sub.length === 0 ||
    payload.sub.length > 128 ||
    typeof payload.name !== "string" ||
    payload.name.length === 0 ||
    payload.name.length > 32 ||
    typeof payload.exp !== "number" ||
    !Number.isInteger(payload.exp) ||
    payload.exp <= nowSeconds
  ) {
    return null;
  }
  return {
    sub: payload.sub,
    name: payload.name,
    exp: payload.exp,
  };
}

export function signDuelSessionToken(
  payload: DuelSignedSessionPayload,
  secret: string,
): string {
  if (secret.length < 32) {
    throw new Error(
      "DUEL_AUTH_SECRET must contain at least 32 characters.",
    );
  }
  const body = encodeBase64Url(JSON.stringify(payload));
  const sig = signature(body, secret).toString("base64url");
  return body + "." + sig;
}

export function verifyDuelSessionToken(
  token: string,
  secret: string,
  nowMs = Date.now(),
): DuelAuthenticatedIdentity | null {
  if (
    secret.length < 32 ||
    token.length === 0 ||
    token.length > 2048
  ) {
    return null;
  }
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, encodedSignature] = parts;
  if (
    body === undefined ||
    encodedSignature === undefined ||
    body.length === 0 ||
    encodedSignature.length === 0
  ) {
    return null;
  }

  let supplied: Buffer;
  let parsed: unknown;
  try {
    supplied = Buffer.from(encodedSignature, "base64url");
    parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    );
  } catch {
    return null;
  }

  const expected = signature(body, secret);
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    return null;
  }

  const payload = parsePayload(
    parsed,
    Math.floor(nowMs / 1000),
  );
  return payload === null
    ? null
    : {
        accountId: payload.sub,
        displayName: payload.name,
      };
}
