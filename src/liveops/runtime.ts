import { sanitizeReward, type LiveOpsDelivery } from "./state";
import { gameDay } from "./time";

/**
 * Server side of live-ops while there is no game server yet: the Admin
 * runtime (`/api/runtime/space-typing/liveops`) may publish mailbox
 * messages and gift codes, and every runtime response carries a `Date`
 * header that gives a clock the player cannot move. Missing endpoint, no
 * network or junk data all fall back to built-in rules and the local clock.
 *
 * Expected JSON (all optional):
 * { "liveOps": {
 *     "messages": [{ "id", "title", "body", "reward": {...}, "startsAt", "endsAt" }],
 *     "giftCodes": [{ "id", "sha256", "title", "body", "reward": {...}, "expiresAt" }] } }
 * `sha256` is the hex SHA-256 of the code in upper case, so the code itself
 * never ships in the JSON. Times are ISO strings.
 */
const ENDPOINT = "/api/runtime/space-typing/liveops";
/** Ignore server offsets below this; Date headers have 1 s resolution. */
const OFFSET_NOISE_MS = 5_000;

export type LiveOpsGiftCode = LiveOpsDelivery & { sha256: string; expiresAt: number | null };
type TimedDelivery = LiveOpsDelivery & { startsAt: number | null; endsAt: number | null };

let serverOffsetMs: number | null = null;
let messages: TimedDelivery[] = [];
let giftCodes: LiveOpsGiftCode[] = [];

function obj(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
function time(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function delivery(value: unknown): TimedDelivery | null {
  const raw = obj(value);
  if (raw === null || typeof raw.id !== "string" || !/^[\w.:-]{1,80}$/.test(raw.id)) return null;
  const endsAt = time(raw.endsAt);
  return {
    id: "admin-" + raw.id,
    title: typeof raw.title === "string" ? raw.title.slice(0, 120) : "Fleet message",
    body: typeof raw.body === "string" ? raw.body.slice(0, 600) : "",
    reward: sanitizeReward(raw.reward),
    startsAt: time(raw.startsAt),
    endsAt,
    ...(endsAt !== null ? { expiresDay: gameDay(endsAt) } : {}),
  };
}

export function applyLiveOpsRuntime(json: unknown): void {
  const root = obj(obj(json)?.liveOps);
  messages = Array.isArray(root?.messages)
    ? root.messages.map(delivery).filter((item): item is TimedDelivery => item !== null).slice(0, 50)
    : [];
  giftCodes = Array.isArray(root?.giftCodes)
    ? root.giftCodes.flatMap((value) => {
        const base = delivery(value);
        const raw = obj(value);
        if (base === null || typeof raw?.sha256 !== "string" || !/^[0-9a-f]{64}$/i.test(raw.sha256)) return [];
        return [{ ...base, id: "code-" + base.id.slice("admin-".length), sha256: raw.sha256.toLowerCase(), expiresAt: time(raw.expiresAt) }];
      }).slice(0, 100)
    : [];
}

export function noteServerDate(header: string | null, receivedAt = Date.now()): void {
  if (header === null) return;
  const server = Date.parse(header);
  if (!Number.isFinite(server)) return;
  const offset = server - receivedAt;
  serverOffsetMs = Math.abs(offset) < OFFSET_NOISE_MS ? 0 : offset;
}

/** Clock for live-ops: server time when known, else the account's monotonic clock. */
export function liveOpsNow(localNow: number): number {
  return serverOffsetMs === null ? localNow : Date.now() + serverOffsetMs;
}

export function hasServerClock(): boolean {
  return serverOffsetMs !== null;
}

/** Messages that should be in the mailbox now. */
export function activeRuntimeMessages(nowMs: number): LiveOpsDelivery[] {
  return messages.filter(
    (item) => (item.startsAt === null || nowMs >= item.startsAt) && (item.endsAt === null || nowMs < item.endsAt),
  );
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function normalizeGiftCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

/** Finds the published gift code; the caller delivers it to the mailbox once. */
export async function findGiftCode(code: string, nowMs: number): Promise<LiveOpsGiftCode | null> {
  const normalized = normalizeGiftCode(code);
  if (normalized.length < 4 || normalized.length > 40) return null;
  const hash = await sha256Hex(normalized);
  return giftCodes.find((item) => item.sha256 === hash && (item.expiresAt === null || nowMs < item.expiresAt)) ?? null;
}

export async function loadLiveOpsRuntime(fetcher: typeof fetch = fetch): Promise<void> {
  try {
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), 2500);
    try {
      const sentAt = Date.now();
      const response = await fetcher(ENDPOINT, {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      });
      // Half the round trip is the best guess for when the server stamped it.
      noteServerDate(response.headers.get("date"), (sentAt + Date.now()) / 2);
      if (!response.ok) return;
      const type = response.headers.get("content-type") ?? "";
      if (!type.includes("json")) return;
      applyLiveOpsRuntime(await response.json());
    } finally {
      globalThis.clearTimeout(timeout);
    }
  } catch {
    /* Offline or no Admin server: built-in rules and the local clock. */
  }
}
