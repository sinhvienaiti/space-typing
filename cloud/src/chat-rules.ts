import { cosmeticById } from "../../src/cosmetics/catalog";
/**
 * Chat rules shared by the chat room (Durable Object) and the game client.
 * Pure functions: length, flood control, link removal and a small
 * Vietnamese/English profanity mask. Admins handle the rest through reports.
 */
export const CHAT_MAX_LENGTH = 200;
export const CHAT_HISTORY = 50;

export type ChatKind = "world" | "group" | "dm";

/** Style Shop ids the sender wears (avatar, frame, title), checked against the catalogue. */
export type ChatLook = { avatar: string; frame: string; title: string };

export type ChatMessage = {
  id: string;
  from: { id: string; name: string; code: string; look?: ChatLook };
  text: string;
  at: number;
  system?: boolean;
};

/** Token bucket per sender: `capacity` messages, one more every `refillMs`. */
export type Bucket = { tokens: number; at: number; lastText: string; lastAt: number };

export const FLOOD: Readonly<Record<ChatKind, { capacity: number; refillMs: number }>> = {
  world: { capacity: 3, refillMs: 4000 },
  group: { capacity: 5, refillMs: 1500 },
  dm: { capacity: 6, refillMs: 1000 },
};

export function newBucket(kind: ChatKind, now: number): Bucket {
  return { tokens: FLOOD[kind].capacity, at: now, lastText: "", lastAt: 0 };
}

const BAD_WORDS = [
  // English
  "fuck", "fucking", "shit", "bitch", "asshole", "cunt", "dick", "pussy", "nigger", "faggot", "motherfucker", "bastard",
  // Vietnamese (with and without tone marks, common chat spellings)
  "địt", "đụ", "đéo", "lồn", "buồi", "cặc", "đĩ", "vãi lồn", "đm", "dm", "đmm", "dmm", "vcl", "vkl", "vl", "clm", "cmm", "dit", "deo", "lon me", "cac",
];

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Word edges by letters (incl. Vietnamese) so "class" never matches "cl".
const BAD_PATTERN = new RegExp(
  "(^|[^\\p{L}\\p{N}])(" + BAD_WORDS.sort((a, b) => b.length - a.length).map(escape).join("|") + ")(?=$|[^\\p{L}\\p{N}])",
  "giu",
);
const LINK_PATTERN = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|vn|io|gg|xyz|ru|ly|me|co)(?:\/\S*)?\b/gi;

export function maskProfanity(text: string): string {
  return text.replace(BAD_PATTERN, (_match, edge: string, word: string) => edge + word[0] + "*".repeat(Math.max(1, [...word].length - 1)));
}

export type ChatCheck = { ok: true; text: string; bucket: Bucket } | { ok: false; reason: string; bucket: Bucket };

/** Cleans and admits one message, or explains why not. */
export function admitMessage(kind: ChatKind, raw: unknown, bucket: Bucket, now: number): ChatCheck {
  if (typeof raw !== "string") return { ok: false, reason: "Empty message.", bucket };
  let text = raw.replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202e]/g, " ").replace(/\s+/g, " ").trim();
  if (text === "") return { ok: false, reason: "Empty message.", bucket };
  if ([...text].length > CHAT_MAX_LENGTH) return { ok: false, reason: "Messages can have up to " + CHAT_MAX_LENGTH + " characters.", bucket };
  const flood = FLOOD[kind];
  const refilled = Math.min(flood.capacity, bucket.tokens + (now - bucket.at) / flood.refillMs);
  if (refilled < 1) {
    return { ok: false, reason: "Slow down a little.", bucket: { ...bucket, tokens: refilled, at: now } };
  }
  if (text.toLowerCase() === bucket.lastText && now - bucket.lastAt < 30_000) {
    return { ok: false, reason: "You just sent that.", bucket: { ...bucket, tokens: refilled, at: now } };
  }
  if (kind === "world") text = text.replace(LINK_PATTERN, "[link]");
  text = maskProfanity(text);
  return { ok: true, text, bucket: { tokens: refilled - 1, at: now, lastText: text.toLowerCase(), lastAt: now } };
}

/** Durable Object name for a channel. DMs are keyed by both ids in order. */
export function channelName(kind: ChatKind, a: string, b?: string): string {
  if (kind === "world") return "world:" + a;
  if (kind === "group") return "group:" + a;
  const [first, second] = [a, b ?? ""].sort();
  return "dm:" + first + ":" + second;
}

/** Keeps a look only if every id is a real item of the right slot. */
export function sanitizeLook(raw: unknown): ChatLook | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const value = raw as Record<string, unknown>;
  const ok = (slot: "avatar" | "frame" | "title") => {
    const id = value[slot];
    return typeof id === "string" && cosmeticById(id)?.slot === slot ? id : null;
  };
  const avatar = ok("avatar");
  const frame = ok("frame");
  const title = ok("title");
  return avatar !== null && frame !== null && title !== null ? { avatar, frame, title } : undefined;
}
