import type { DuelModeEpoch } from "./game-mode";
import type { DuelPlayerId } from "./model";

export const WORD_CHAIN_MAX_WORD_LENGTH = 20;

export type WordChainPublicBeat = Readonly<{
  beatId: string;
  modeEpoch: DuelModeEpoch;
  requiredInitial: Readonly<Record<DuelPlayerId, string>>;
  acceptedWord: Readonly<Record<DuelPlayerId, string | null>>;
  legalMoveCount: Readonly<Record<DuelPlayerId, number>>;
  resetCount: number;
  issuedAtMs: number;
  deadlineAtMs: number;
}>;

export type WordChainPlayerPublicState = Readonly<{
  buffer: string;
  accepted: boolean;
  /** Sequence floor a reconnecting client must continue above. */
  lastAcceptedSequence: number;
}>;

export type WordChainModeInput =
  | { type: "TYPE_CHAR"; char: string }
  | { type: "BACKSPACE" }
  | { type: "CLEAR" }
  | { type: "SUBMIT" };

export type WordChainInputParseResult =
  | { ok: true; value: WordChainModeInput }
  | { ok: false; reason: "schema" };

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

const TYPE_CHAR_KEYS: ReadonlySet<string> = new Set(["type", "char"]);
const TYPE_ONLY_KEYS: ReadonlySet<string> = new Set(["type"]);

function exactKeys(value: JsonObject, allowed: ReadonlySet<string>): boolean {
  return Object.keys(value).every((key) => allowed.has(key));
}

export function normalizeWordChainWord(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

export function parseWordChainModeInput(raw: unknown): WordChainInputParseResult {
  const value = asObject(raw);
  if (value === null || typeof value.type !== "string") {
    return { ok: false, reason: "schema" };
  }
  if (value.type === "TYPE_CHAR") {
    if (!exactKeys(value, TYPE_CHAR_KEYS)) return { ok: false, reason: "schema" };
    if (typeof value.char !== "string" || !/^[a-zA-Z]$/.test(value.char)) {
      return { ok: false, reason: "schema" };
    }
    return {
      ok: true,
      value: { type: "TYPE_CHAR", char: value.char.toLocaleLowerCase("en-US") },
    };
  }
  if (value.type === "BACKSPACE" || value.type === "CLEAR" || value.type === "SUBMIT") {
    if (!exactKeys(value, TYPE_ONLY_KEYS)) return { ok: false, reason: "schema" };
    return { ok: true, value: { type: value.type } };
  }
  return { ok: false, reason: "schema" };
}

export function lastWordChainLetter(word: string): string {
  const normalized = normalizeWordChainWord(word);
  return normalized.slice(-1);
}
