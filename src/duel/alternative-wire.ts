import type { AlternativeInputDecision } from "./alternative-match-runtime";
import type { AlternativeMatchView } from "./alternative-presentation";
import type { AlternativeModeId } from "./alternative-modes";
import {
  parseAlternativeModeWireMessage,
  type AlternativeModeWireMessage,
} from "./alternative-protocol";

export type StartAlternativeMatchWireMessage = {
  type: "START_ALTERNATIVE_MATCH";
  requestId: string;
  roomId: string;
  mode: AlternativeModeId;
};

export type AlternativeTransportClientMessage =
  | StartAlternativeMatchWireMessage
  | AlternativeModeWireMessage;

export type AlternativeMatchUpdateWireMessage = {
  type: "ALTERNATIVE_MATCH_UPDATE";
  matchId: string;
  serverSequence: number;
  view: AlternativeMatchView;
};

export type AlternativeInputResultWireMessage = {
  type: "ALTERNATIVE_INPUT_RESULT";
  matchId: string;
  sequence: number;
  accepted: boolean;
  reason: AlternativeInputDecision["reason"];
};

export type AlternativeTransportServerMessage =
  | AlternativeMatchUpdateWireMessage
  | AlternativeInputResultWireMessage;

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: JsonObject, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function boundedId(value: unknown, max = 96): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= max ? trimmed : null;
}

export function parseAlternativeTransportClientMessage(
  value: unknown,
): AlternativeTransportClientMessage | null {
  const modeInput = parseAlternativeModeWireMessage(value);
  if (modeInput !== null) return modeInput;
  if (!isObject(value) || value.type !== "START_ALTERNATIVE_MATCH") return null;
  if (!exactKeys(value, ["type", "requestId", "roomId", "mode"])) return null;
  const requestId = boundedId(value.requestId, 64);
  const roomId = boundedId(value.roomId, 96);
  const mode = value.mode === "reflex" || value.mode === "word-chain"
    ? value.mode
    : null;
  if (requestId === null || roomId === null || mode === null) return null;
  return {
    type: "START_ALTERNATIVE_MATCH",
    requestId,
    roomId,
    mode,
  };
}

export function isAlternativeServerMessage(
  value: unknown,
): value is AlternativeTransportServerMessage {
  if (!isObject(value) || typeof value.type !== "string") return false;
  if (value.type === "ALTERNATIVE_MATCH_UPDATE") {
    return (
      typeof value.matchId === "string" &&
      typeof value.serverSequence === "number" &&
      Number.isInteger(value.serverSequence) &&
      isObject(value.view)
    );
  }
  if (value.type === "ALTERNATIVE_INPUT_RESULT") {
    return (
      typeof value.matchId === "string" &&
      typeof value.sequence === "number" &&
      Number.isInteger(value.sequence) &&
      typeof value.accepted === "boolean" &&
      typeof value.reason === "string"
    );
  }
  return false;
}
