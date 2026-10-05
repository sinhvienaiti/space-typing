import type { DuelGameMode } from "./game-mode";
import type { ReflexPlayerPublicState, ReflexPublicChallenge } from "./reflex";
import type { DuelPlayerId } from "./model";
import type { WordChainPlayerPublicState, WordChainPublicBeat } from "./word-chain";

export type DuelAlternativeGameMode = Exclude<DuelGameMode, "standard">;

/**
 * Browser-safe, player-scoped state for alternative Duel modes.
 * Competitive answer material and rival private buffers are intentionally
 * absent from this contract.
 */
export type DuelAlternativeModePlayerView =
  | Readonly<{
      gameMode: "reflex";
      modeEpoch: number;
      challenge: ReflexPublicChallenge | null;
      player: ReflexPlayerPublicState;
    }>
  | Readonly<{
      gameMode: "word-chain";
      modeEpoch: number;
      beat: WordChainPublicBeat | null;
      player: WordChainPlayerPublicState;
    }>;

type JsonObject = Record<string, unknown>;

const PLAYER_IDS: readonly DuelPlayerId[] = ["player-1", "player-2"];
const REFLEX_KINDS = new Set([
  "translation-vn-en",
  "definition",
  "synonym",
  "antonym",
  "cloze-one-token",
]);

function object(value: unknown): JsonObject | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function exactKeys(value: JsonObject, keys: readonly string[]): boolean {
  const expected = new Set(keys);
  return Object.keys(value).length === keys.length &&
    Object.keys(value).every((key) => expected.has(key));
}

function safeInteger(value: unknown, min = 0): value is number {
  return Number.isSafeInteger(value) && (value as number) >= min;
}

function timestamp(value: unknown): value is number {
  return safeInteger(value, 0);
}

function asciiWord(value: unknown, max = 40): value is string {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= max &&
    /^[a-z]+$/.test(value);
}

function validateReflexPlayer(value: unknown): value is ReflexPlayerPublicState {
  const source = object(value);
  return source !== null &&
    exactKeys(source, [
      "buffer",
      "physicalTypingMistakes",
      "semanticMistakes",
      "retries",
      "completed",
      "lastAcceptedSequence",
    ]) &&
    typeof source.buffer === "string" &&
    source.buffer.length <= 40 &&
    /^[a-z]*$/.test(source.buffer) &&
    safeInteger(source.physicalTypingMistakes) &&
    safeInteger(source.semanticMistakes) &&
    safeInteger(source.retries) &&
    typeof source.completed === "boolean" &&
    safeInteger(source.lastAcceptedSequence, -1);
}

function validateReflexChallenge(
  value: unknown,
  modeEpoch: number,
): value is ReflexPublicChallenge {
  const source = object(value);
  if (
    source === null ||
    !exactKeys(source, [
      "challengeId",
      "modeEpoch",
      "kind",
      "prompt",
      "candidates",
      "issuedAtMs",
      "deadlineAtMs",
    ]) ||
    typeof source.challengeId !== "string" ||
    source.challengeId.length === 0 ||
    source.challengeId.length > 160 ||
    source.modeEpoch !== modeEpoch ||
    typeof source.kind !== "string" ||
    !REFLEX_KINDS.has(source.kind) ||
    typeof source.prompt !== "string" ||
    source.prompt.length === 0 ||
    source.prompt.length > 512 ||
    !Array.isArray(source.candidates) ||
    source.candidates.length !== 3 ||
    !timestamp(source.issuedAtMs) ||
    !timestamp(source.deadlineAtMs) ||
    source.deadlineAtMs < source.issuedAtMs
  ) {
    return false;
  }

  const ids = new Set<string>();
  const tokens = new Set<string>();
  for (const candidateValue of source.candidates) {
    const candidate = object(candidateValue);
    if (
      candidate === null ||
      !exactKeys(candidate, ["candidateId", "token"]) ||
      typeof candidate.candidateId !== "string" ||
      !/^[a-z][a-z'-]{0,39}$/.test(candidate.candidateId) ||
      !asciiWord(candidate.token) ||
      ids.has(candidate.candidateId) ||
      tokens.has(candidate.token)
    ) {
      return false;
    }
    ids.add(candidate.candidateId);
    tokens.add(candidate.token);
  }

  const values = [...tokens];
  return values.every((left, leftIndex) =>
    values.every((right, rightIndex) =>
      leftIndex === rightIndex ||
      (!left.startsWith(right) && !right.startsWith(left)),
    ),
  );
}

function playerRecord(
  value: unknown,
  validator: (entry: unknown) => boolean,
): boolean {
  const source = object(value);
  return source !== null &&
    exactKeys(source, PLAYER_IDS) &&
    PLAYER_IDS.every((playerId) => validator(source[playerId]));
}

function validateWordChainPlayer(
  value: unknown,
): value is WordChainPlayerPublicState {
  const source = object(value);
  return source !== null &&
    exactKeys(source, ["buffer", "accepted", "lastAcceptedSequence"]) &&
    typeof source.buffer === "string" &&
    source.buffer.length <= 20 &&
    /^[a-z]*$/.test(source.buffer) &&
    typeof source.accepted === "boolean" &&
    safeInteger(source.lastAcceptedSequence, -1);
}

function validateWordChainBeat(
  value: unknown,
  modeEpoch: number,
): value is WordChainPublicBeat {
  const source = object(value);
  if (
    source === null ||
    !exactKeys(source, [
      "beatId",
      "modeEpoch",
      "requiredInitial",
      "acceptedWord",
      "legalMoveCount",
      "resetCount",
      "issuedAtMs",
      "deadlineAtMs",
    ]) ||
    typeof source.beatId !== "string" ||
    source.beatId.length === 0 ||
    source.beatId.length > 160 ||
    source.modeEpoch !== modeEpoch ||
    !playerRecord(
      source.requiredInitial,
      (entry) => typeof entry === "string" && /^[a-z]$/.test(entry),
    ) ||
    !playerRecord(
      source.acceptedWord,
      (entry) => entry === null || asciiWord(entry, 20),
    ) ||
    !playerRecord(source.legalMoveCount, (entry) => safeInteger(entry)) ||
    !safeInteger(source.resetCount) ||
    !timestamp(source.issuedAtMs) ||
    !timestamp(source.deadlineAtMs) ||
    source.deadlineAtMs < source.issuedAtMs
  ) {
    return false;
  }
  return true;
}

export function isDuelAlternativeModePlayerView(
  value: unknown,
): value is DuelAlternativeModePlayerView {
  const source = object(value);
  if (
    source === null ||
    (source.gameMode !== "reflex" && source.gameMode !== "word-chain") ||
    !safeInteger(source.modeEpoch, 1)
  ) {
    return false;
  }

  const modeEpoch = source.modeEpoch;
  if (source.gameMode === "reflex") {
    return exactKeys(source, ["gameMode", "modeEpoch", "challenge", "player"]) &&
      validateReflexPlayer(source.player) &&
      (source.challenge === null ||
        validateReflexChallenge(source.challenge, modeEpoch));
  }

  return exactKeys(source, ["gameMode", "modeEpoch", "beat", "player"]) &&
    validateWordChainPlayer(source.player) &&
    (source.beat === null || validateWordChainBeat(source.beat, modeEpoch));
}
