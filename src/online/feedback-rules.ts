/**
 * Pure rules for player feedback (no database): what a message may contain
 * and which bits of game context are kept. Shared by the Worker
 * (cloud/src/feedback.ts) and the game's dialog (src/ui/feedback-dialog.ts),
 * so the form refuses what the server would refuse.
 */
export const FEEDBACK_CATEGORIES = ["idea", "bug", "contact"] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];
export const FEEDBACK_STATUSES = ["new", "read", "resolved"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const FEEDBACK_MIN = 10;
export const FEEDBACK_MAX = 2000;
/** Messages per player and per network, per hour. */
export const FEEDBACK_PER_ACCOUNT_HOUR = 5;
export const FEEDBACK_PER_IP_HOUR = 20;

/** Game context a report may carry, and how long each value may be (numbers: the largest allowed). */
const CONTEXT_TEXT: Record<string, number> = {
  screen: 40,
  phase: 20,
  mode: 40,
  ship: 40,
  quality: 12,
  page: 200,
  version: 40,
  viewport: 20,
  language: 20,
  online: 16,
  userAgent: 300,
};
const CONTEXT_NUMBER: Record<string, number> = { stage: 100_000, saveVersion: 10_000 };
const ERRORS_KEPT = 5;
const ERROR_LENGTH = 300;

export type FeedbackInput = {
  category: FeedbackCategory;
  message: string;
  contactEmail: string | null;
  context: Record<string, string | number | string[]>;
};

export type FeedbackCheck = { ok: true; value: FeedbackInput } | { ok: false; field: "category" | "message" | "contactEmail"; reason: string };

/**
 * Control characters, zero-width and direction marks, line/paragraph
 * separators and the byte-order mark (built from code points, so the source
 * holds no invisible characters).
 */
const INVISIBLE = new RegExp(
  "[" +
    [[0x00, 0x08], [0x0b, 0x1f], [0x7f, 0x7f], [0x200b, 0x200f], [0x2028, 0x202e], [0x2066, 0x2069], [0xfeff, 0xfeff]]
      .map(([from, to]) => "\\u" + from!.toString(16).padStart(4, "0") + "-\\u" + to!.toString(16).padStart(4, "0"))
      .join("") +
    "]",
  "g",
);

/** Control and invisible characters go; line breaks stay (a bug report has steps). */
export function cleanFeedbackText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(INVISIBLE, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function length(text: string): number {
  return [...text].length;
}

function cleanContext(raw: unknown): FeedbackInput["context"] {
  const out: FeedbackInput["context"] = {};
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return out;
  const input = raw as Record<string, unknown>;
  for (const [key, max] of Object.entries(CONTEXT_TEXT)) {
    const value = input[key];
    if (typeof value === "string" && value.trim() !== "") out[key] = cleanFeedbackText(value).replace(/\s+/g, " ").slice(0, max);
  }
  for (const [key, max] of Object.entries(CONTEXT_NUMBER)) {
    const value = input[key];
    if (typeof value === "number" && Number.isFinite(value)) out[key] = Math.max(0, Math.min(max, Math.round(value)));
  }
  if (Array.isArray(input.errors)) {
    const errors = input.errors
      .filter((item): item is string => typeof item === "string" && item.trim() !== "")
      .slice(-ERRORS_KEPT)
      .map((item) => cleanFeedbackText(item).replace(/\s+/g, " ").slice(0, ERROR_LENGTH));
    if (errors.length > 0) out.errors = errors;
  }
  return out;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Checks and cleans what the dialog sends; on a problem, names the field to fix. */
export function checkFeedback(raw: unknown): FeedbackCheck {
  const input = raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const category = input.category;
  if (typeof category !== "string" || !(FEEDBACK_CATEGORIES as readonly string[]).includes(category)) {
    return { ok: false, field: "category", reason: "Choose what kind of message this is." };
  }
  const message = typeof input.message === "string" ? cleanFeedbackText(input.message) : "";
  if (length(message) < FEEDBACK_MIN) return { ok: false, field: "message", reason: `Write a little more (at least ${FEEDBACK_MIN} characters).` };
  if (length(message) > FEEDBACK_MAX) return { ok: false, field: "message", reason: `Keep it under ${FEEDBACK_MAX} characters.` };
  let contactEmail: string | null = null;
  if (typeof input.contactEmail === "string" && input.contactEmail.trim() !== "") {
    contactEmail = input.contactEmail.trim();
    if (contactEmail.length > 254 || !EMAIL.test(contactEmail)) return { ok: false, field: "contactEmail", reason: "Enter a valid email address, or leave it empty." };
  }
  return { ok: true, value: { category: category as FeedbackCategory, message, contactEmail, context: cleanContext(input.context) } };
}
