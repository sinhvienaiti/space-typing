import type { DuelModeEpoch } from "./game-mode";

export const REFLEX_CANDIDATE_COUNT = 3;

export type ReflexChallengeKind =
  | "translation-vn-en"
  | "definition"
  | "synonym"
  | "antonym"
  | "cloze-one-token";

export type ReflexCandidate = Readonly<{
  candidateId: string;
  token: string;
}>;

export type ReflexPublicChallenge = Readonly<{
  challengeId: string;
  modeEpoch: DuelModeEpoch;
  kind: ReflexChallengeKind;
  prompt: string;
  candidates: readonly ReflexCandidate[];
  issuedAtMs: number;
  deadlineAtMs: number;
}>;

export type ReflexPlayerPublicState = Readonly<{
  buffer: string;
  physicalTypingMistakes: number;
  semanticMistakes: number;
  retries: number;
  completed: boolean;
  /** Sequence floor a reconnecting client must continue above. */
  lastAcceptedSequence: number;
}>;

export type ReflexModeInput =
  | { type: "TYPE_CHAR"; char: string }
  | { type: "BACKSPACE" }
  | { type: "CLEAR" };

export type ReflexInputParseResult =
  | { ok: true; value: ReflexModeInput }
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

export function normalizeReflexToken(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

export function validateReflexCandidates(
  candidates: readonly ReflexCandidate[],
): readonly string[] {
  const errors: string[] = [];
  if (candidates.length !== REFLEX_CANDIDATE_COUNT) {
    errors.push(`Reflex challenge must have exactly ${REFLEX_CANDIDATE_COUNT} candidates.`);
  }

  const ids = new Set<string>();
  const tokens = new Set<string>();
  for (const candidate of candidates) {
    if (!/^[a-z][a-z'-]*$/.test(candidate.candidateId)) {
      errors.push(`Invalid candidate id: ${candidate.candidateId}`);
    }
    if (ids.has(candidate.candidateId)) {
      errors.push(`Duplicate candidate id: ${candidate.candidateId}`);
    }
    ids.add(candidate.candidateId);

    const token = normalizeReflexToken(candidate.token);
    if (!/^[a-z]+$/.test(token)) {
      errors.push(`Reflex candidate must be one ASCII English token: ${candidate.token}`);
    }
    if (tokens.has(token)) {
      errors.push(`Duplicate Reflex candidate token: ${token}`);
    }
    tokens.add(token);
  }

  const normalized = [...tokens];
  for (let left = 0; left < normalized.length; left += 1) {
    for (let right = left + 1; right < normalized.length; right += 1) {
      const a = normalized[left]!;
      const b = normalized[right]!;
      if (a.startsWith(b) || b.startsWith(a)) {
        errors.push(`Reflex candidates must be whole-token prefix-free: ${a}/${b}`);
      }
    }
  }
  return errors;
}

export function parseReflexModeInput(raw: unknown): ReflexInputParseResult {
  const value = asObject(raw);
  if (value === null || typeof value.type !== "string") {
    return { ok: false, reason: "schema" };
  }
  if (value.type === "TYPE_CHAR") {
    if (!exactKeys(value, TYPE_CHAR_KEYS)) {
      return { ok: false, reason: "schema" };
    }
    if (typeof value.char !== "string" || !/^[a-zA-Z]$/.test(value.char)) {
      return { ok: false, reason: "schema" };
    }
    return {
      ok: true,
      value: {
        type: "TYPE_CHAR",
        char: value.char.toLocaleLowerCase("en-US"),
      },
    };
  }
  if (value.type === "BACKSPACE" || value.type === "CLEAR") {
    if (!exactKeys(value, TYPE_ONLY_KEYS)) {
      return { ok: false, reason: "schema" };
    }
    return { ok: true, value: { type: value.type } };
  }
  return { ok: false, reason: "schema" };
}

export function matchingReflexCandidates(
  prefix: string,
  candidates: readonly ReflexCandidate[],
): readonly ReflexCandidate[] {
  const normalizedPrefix = normalizeReflexToken(prefix);
  return candidates.filter((candidate) =>
    normalizeReflexToken(candidate.token).startsWith(normalizedPrefix),
  );
}
