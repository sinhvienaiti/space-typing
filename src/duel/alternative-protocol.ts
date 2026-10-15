import type {
  AlternativeModeInput,
  AlternativePlayerId,
} from "./alternative-match-runtime";
import type { AlternativeModeId } from "./alternative-modes";

export type AlternativeModeWireMessage =
  | {
      type: "MODE_INPUT";
      matchId: string;
      sequence: number;
      mode: "reflex";
      input: { text: string };
    }
  | {
      type: "MODE_INPUT";
      matchId: string;
      sequence: number;
      mode: "word-chain";
      input: { word: string };
    };

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: JsonObject, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function parseMode(value: unknown): AlternativeModeId | null {
  return value === "reflex" || value === "word-chain" ? value : null;
}

export function parseAlternativeModeWireMessage(
  value: unknown,
): AlternativeModeWireMessage | null {
  if (!isObject(value) || !exactKeys(value, ["type", "matchId", "sequence", "mode", "input"])) {
    return null;
  }
  if (value.type !== "MODE_INPUT") return null;
  if (typeof value.matchId !== "string" || value.matchId.length === 0 || value.matchId.length > 96) {
    return null;
  }
  if (
    typeof value.sequence !== "number" ||
    !Number.isInteger(value.sequence) ||
    value.sequence < 1 ||
    value.sequence > 2_147_483_647
  ) {
    return null;
  }
  const mode = parseMode(value.mode);
  if (mode === null || !isObject(value.input)) return null;

  if (mode === "reflex") {
    if (!exactKeys(value.input, ["text"]) || typeof value.input.text !== "string") return null;
    const text = value.input.text.trim();
    if (text.length === 0 || text.length > 64) return null;
    return {
      type: "MODE_INPUT",
      matchId: value.matchId,
      sequence: value.sequence,
      mode,
      input: { text },
    };
  }

  if (!exactKeys(value.input, ["word"]) || typeof value.input.word !== "string") return null;
  const word = value.input.word.trim();
  if (word.length === 0 || word.length > 32) return null;
  return {
    type: "MODE_INPUT",
    matchId: value.matchId,
    sequence: value.sequence,
    mode,
    input: { word },
  };
}

export function toAlternativeModeInput(input: {
  message: AlternativeModeWireMessage;
  playerId: AlternativePlayerId;
  receivedAtMs: number;
}): AlternativeModeInput {
  const { message } = input;
  if (message.mode === "reflex") {
    return {
      type: "MODE_INPUT",
      mode: "reflex",
      sequence: message.sequence,
      playerId: input.playerId,
      text: message.input.text,
      receivedAtMs: input.receivedAtMs,
    };
  }
  return {
    type: "MODE_INPUT",
    mode: "word-chain",
    sequence: message.sequence,
    playerId: input.playerId,
    word: message.input.word,
    receivedAtMs: input.receivedAtMs,
  };
}
