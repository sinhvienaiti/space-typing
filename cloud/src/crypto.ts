/**
 * Crypto that fits the Workers Free plan (10 ms CPU per request).
 *
 * Passwords use "server relief": the browser derives a key with PBKDF2-SHA256
 * (310,000 rounds, salt = "space-typing:v1:" + email) and sends only that
 * key. The server stores HMAC-SHA256(pepper, randomSalt ‖ key), which costs
 * microseconds. Someone who steals the database (and even the pepper) still
 * has to run 310,000 PBKDF2 rounds per guess, and the plain password never
 * reaches the server. The browser half is src/online/password-key.ts.
 */
const encoder = new TextEncoder();

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function toBase64Url(bytes: Uint8Array): string {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomToken(bytes = 32): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256Hex(text: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

/** The browser-derived key: 32 bytes as base64url (43 characters). */
export function isClientKey(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}

export async function hashClientKey(pepper: string, clientKey: string): Promise<{ hash: string; salt: string }> {
  const salt = randomToken(16);
  return { hash: await hmacHex(pepper, salt + ":" + clientKey), salt };
}

export async function verifyClientKey(pepper: string, clientKey: string, salt: string | null, hash: string | null): Promise<boolean> {
  if (salt === null || hash === null) {
    await hmacHex(pepper, "dummy:" + clientKey);
    return false;
  }
  const actual = await hmacHex(pepper, salt + ":" + clientKey);
  if (actual.length !== hash.length) return false;
  let diff = 0;
  for (let index = 0; index < actual.length; index += 1) diff |= actual.charCodeAt(index) ^ hash.charCodeAt(index);
  return diff === 0;
}

export function sameSecret(a: string | null, b: string): boolean {
  if (a === null || a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailProblem(email: unknown): string | null {
  if (typeof email !== "string" || email.trim() === "") return "Email is required.";
  const trimmed = email.trim();
  if (trimmed.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) return "Enter a valid email address.";
  return null;
}

export function displayNameProblem(name: unknown): string | null {
  if (typeof name !== "string") return "Pilot name is required.";
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 24) return "Pilot name must have 2–24 characters.";
  if (/[<>\u0000-\u001f]/.test(trimmed)) return "Pilot name has characters that are not allowed.";
  return null;
}

/** 6-character code without look-alike letters, e.g. "K7Q2MX". */
export function pilotCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return [...crypto.getRandomValues(new Uint8Array(6))].map((byte) => alphabet[byte % alphabet.length]).join("");
}
