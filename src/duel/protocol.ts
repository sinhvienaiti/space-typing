// V7: 5 s round break, slower cannon/attack flight. Restart the Duel server.
export const DUEL_PROTOCOL_VERSION = 7;
export const DUEL_PROTOCOL_MAX_MESSAGE_BYTES = 4096;

export type DuelWireIntent =
  | {
      type: "TYPE_CHAR";
      char: string;
      targetInstanceId?: string;
    }
  | {
      type: "CANCEL_TARGET";
      targetInstanceId: string;
    }
  | {
      type: "USE_ITEM";
      itemId: string;
    }
  | {
      type: "ACTIVATE_SKILL";
      skillId: string;
    }
  | {
      type: "SELECT_TARGET";
      targetInstanceId: string;
    };

export type DuelClientMessage =
  | {
      type: "HELLO";
      protocolVersion: number;
      clientVersion: string;
      sessionToken: string;
      reconnectToken?: string;
    }
  | {
      type: "CREATE_ROOM";
      requestId: string;
      room: unknown;
    }
  | {
      type: "JOIN_ROOM";
      requestId: string;
      roomId: string;
      password?: string;
      displayName: string;
    }
  | {
      type: "LEAVE_ROOM";
      requestId: string;
      roomId: string;
    }
  | {
      type: "SET_READY";
      requestId: string;
      roomId: string;
      ready: boolean;
    }
  | {
      type: "SET_LOADOUT";
      requestId: string;
      roomId: string;
      shipId: string | null;
      characterId: string | null;
    }
  | {
      type: "SET_BOT";
      requestId: string;
      roomId: string;
      bot: {
        wpm: number;
        accuracy: number;
        reactionMs: number;
        personality:
          | "turtle"
          | "aggro"
          | "tactician"
          | "trickster"
          | "fortune"
          | "sniper"
          | "balanced";
      };
    }
  | {
      type: "REMOVE_BOT";
      requestId: string;
      roomId: string;
    }
  | {
      type: "START_MATCH";
      requestId: string;
      roomId: string;
    }
  | {
      type: "QUEUE_RANKED";
      requestId: string;
    }
  | {
      type: "LEAVE_RANKED_QUEUE";
      requestId: string;
    }
  | {
      type: "INTENT";
      matchId: string;
      roundId: string;
      sequence: number;
      intent: DuelWireIntent;
    }
  | {
      type: "PONG";
      nonce: string;
    };

export type DuelServerMessage =
  | {
      type: "WELCOME";
      protocolVersion: number;
      sessionId: string;
      reconnectToken: string;
    }
  | {
      type: "ROOM_SNAPSHOT";
      room: unknown;
    }
  | {
      type: "MATCH_SNAPSHOT";
      matchId: string;
      roundId: string;
      sequence: number;
      snapshot: unknown;
    }
  | {
      type: "MATCH_EVENTS";
      matchId: string;
      roundId: string;
      sequence: number;
      events: readonly unknown[];
    }
  | {
      type: "MATCH_UPDATE";
      matchId: string;
      roundId: string;
      serverSequence: number;
      events: readonly unknown[];
      snapshot: unknown;
    }
  | {
      type: "ROOM_CLOSED";
      roomId: string;
      reason: string;
    }
  | {
      type: "RANKED_QUEUE_STATUS";
      status: "idle" | "queued";
      ticketId?: string;
      matchmakingRating?: number;
    }
  | {
      type: "RANKED_MATCH_FOUND";
      matchId: string;
    }
  | {
      type: "RANKED_PROFILE";
      typingRating: number;
      duelRating: number;
      matchmakingRating: number;
      matchesPlayed: number;
      wins: number;
      losses: number;
      draws: number;
    }
  | {
      type: "PING";
      nonce: string;
    }
  | {
      type: "ERROR";
      code: string;
      message: string;
      requestId?: string;
    };

export type DuelProtocolParseResult =
  | { ok: true; message: DuelClientMessage }
  | { ok: false; error: string };

type JsonObject = Record<string, unknown>;

const FORBIDDEN_AUTHORITATIVE_TYPES = new Set([
  "KEY_OK",
  "KEY_MISS",
  "WORD_COMPLETE",
  "ANSWER_CORRECT",
  "DAMAGE_APPLIED",
  "COUNTER_COMPLETE",
  "FATE_COMPLETE",
  "MYSTERY_COMPLETE",
  "OBJECTIVE_COMPLETE",
]);

function isObject(value: unknown): value is JsonObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function stringField(
  object: JsonObject,
  key: string,
  maxLength: number,
): string | null {
  const value = object[key];
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maxLength
  ) {
    return null;
  }
  return value;
}

function optionalStringField(
  object: JsonObject,
  key: string,
  maxLength: number,
): string | undefined | null {
  const value = object[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > maxLength) {
    return null;
  }
  return value;
}

function integerField(
  object: JsonObject,
  key: string,
  min: number,
  max: number,
): number | null {
  const value = object[key];
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    return null;
  }
  return value;
}

function exactKeys(
  object: JsonObject,
  allowed: readonly string[],
): boolean {
  const set = new Set(allowed);
  return Object.keys(object).every((key) => set.has(key));
}

function parseIntent(value: unknown): DuelWireIntent | null {
  if (!isObject(value)) return null;
  const type = value.type;
  if (typeof type !== "string") return null;
  if (FORBIDDEN_AUTHORITATIVE_TYPES.has(type)) return null;
  if ("playerId" in value || "damage" in value || "winner" in value) {
    return null;
  }

  switch (type) {
    case "TYPE_CHAR": {
      if (
        !exactKeys(value, [
          "type",
          "char",
          "targetInstanceId",
        ])
      ) {
        return null;
      }
      const char = stringField(value, "char", 1);
      const targetInstanceId = optionalStringField(
        value,
        "targetInstanceId",
        96,
      );
      if (
        char === null ||
        !/^[a-zA-Z]$/.test(char) ||
        targetInstanceId === null
      ) {
        return null;
      }
      return {
        type,
        char: char.toLocaleLowerCase("en-US"),
        ...(targetInstanceId === undefined
          ? {}
          : { targetInstanceId }),
      };
    }
    case "CANCEL_TARGET":
    case "SELECT_TARGET": {
      if (!exactKeys(value, ["type", "targetInstanceId"])) {
        return null;
      }
      const targetInstanceId = stringField(
        value,
        "targetInstanceId",
        96,
      );
      return targetInstanceId === null
        ? null
        : { type, targetInstanceId };
    }
    case "USE_ITEM": {
      if (!exactKeys(value, ["type", "itemId"])) return null;
      const itemId = stringField(value, "itemId", 80);
      return itemId === null ? null : { type, itemId };
    }
    case "ACTIVATE_SKILL": {
      if (!exactKeys(value, ["type", "skillId"])) return null;
      const skillId = stringField(value, "skillId", 80);
      return skillId === null ? null : { type, skillId };
    }
    default:
      return null;
  }
}

function parseMessageObject(
  value: JsonObject,
): DuelClientMessage | null {
  const type = value.type;
  if (typeof type !== "string") return null;
  if (FORBIDDEN_AUTHORITATIVE_TYPES.has(type)) return null;

  switch (type) {
    case "HELLO": {
      if (
        !exactKeys(value, [
          "type",
          "protocolVersion",
          "clientVersion",
          "sessionToken",
          "reconnectToken",
        ])
      ) {
        return null;
      }
      const protocolVersion = integerField(
        value,
        "protocolVersion",
        1,
        1000,
      );
      const clientVersion = stringField(
        value,
        "clientVersion",
        64,
      );
      const sessionToken = stringField(
        value,
        "sessionToken",
        512,
      );
      const reconnectToken = optionalStringField(
        value,
        "reconnectToken",
        256,
      );
      if (
        protocolVersion === null ||
        clientVersion === null ||
        sessionToken === null ||
        reconnectToken === null
      ) {
        return null;
      }
      return {
        type,
        protocolVersion,
        clientVersion,
        sessionToken,
        ...(reconnectToken === undefined
          ? {}
          : { reconnectToken }),
      };
    }
    case "CREATE_ROOM": {
      if (!exactKeys(value, ["type", "requestId", "room"])) {
        return null;
      }
      const requestId = stringField(value, "requestId", 64);
      if (requestId === null || !isObject(value.room)) return null;
      return { type, requestId, room: value.room };
    }
    case "JOIN_ROOM": {
      if (
        !exactKeys(value, [
          "type",
          "requestId",
          "roomId",
          "password",
          "displayName",
        ])
      ) {
        return null;
      }
      const requestId = stringField(value, "requestId", 64);
      const roomId = stringField(value, "roomId", 32);
      const password = optionalStringField(
        value,
        "password",
        64,
      );
      const displayName = stringField(
        value,
        "displayName",
        32,
      );
      if (
        requestId === null ||
        roomId === null ||
        password === null ||
        displayName === null
      ) {
        return null;
      }
      return {
        type,
        requestId,
        roomId,
        displayName,
        ...(password === undefined ? {} : { password }),
      };
    }
    case "LEAVE_ROOM": {
      if (!exactKeys(value, ["type", "requestId", "roomId"])) {
        return null;
      }
      const requestId = stringField(value, "requestId", 64);
      const roomId = stringField(value, "roomId", 32);
      return requestId === null || roomId === null
        ? null
        : { type, requestId, roomId };
    }
    case "SET_READY": {
      if (
        !exactKeys(value, [
          "type",
          "requestId",
          "roomId",
          "ready",
        ]) ||
        typeof value.ready !== "boolean"
      ) {
        return null;
      }
      const requestId = stringField(value, "requestId", 64);
      const roomId = stringField(value, "roomId", 32);
      return requestId === null || roomId === null
        ? null
        : {
            type,
            requestId,
            roomId,
            ready: value.ready,
          };
    }
    case "SET_LOADOUT": {
      if (
        !exactKeys(value, [
          "type",
          "requestId",
          "roomId",
          "shipId",
          "characterId",
        ])
      ) {
        return null;
      }
      const requestId = stringField(value, "requestId", 64);
      const roomId = stringField(value, "roomId", 32);
      const shipRaw = value.shipId;
      const characterRaw = value.characterId;
      if (
        requestId === null ||
        roomId === null ||
        (shipRaw !== null &&
          (typeof shipRaw !== "string" ||
            shipRaw.length === 0 ||
            shipRaw.length > 64)) ||
        (characterRaw !== null &&
          (typeof characterRaw !== "string" ||
            characterRaw.length === 0 ||
            characterRaw.length > 64))
      ) {
        return null;
      }
      const shipId = shipRaw as string | null;
      const characterId = characterRaw as string | null;
      return {
        type,
        requestId,
        roomId,
        shipId,
        characterId,
      };
    }
    case "SET_BOT": {
      if (
        !exactKeys(value, [
          "type",
          "requestId",
          "roomId",
          "bot",
        ])
      ) {
        return null;
      }
      const requestId = stringField(value, "requestId", 64);
      const roomId = stringField(value, "roomId", 32);
      if (
        requestId === null ||
        roomId === null ||
        !isObject(value.bot) ||
        !exactKeys(value.bot, [
          "wpm",
          "accuracy",
          "reactionMs",
          "personality",
        ])
      ) {
        return null;
      }
      const wpm = value.bot.wpm;
      const accuracy = value.bot.accuracy;
      const reactionMs = value.bot.reactionMs;
      const personality = value.bot.personality;
      if (
        typeof wpm !== "number" ||
        !Number.isFinite(wpm) ||
        wpm < 10 ||
        wpm > 300 ||
        typeof accuracy !== "number" ||
        !Number.isFinite(accuracy) ||
        accuracy < 0.5 ||
        accuracy > 1 ||
        typeof reactionMs !== "number" ||
        !Number.isFinite(reactionMs) ||
        reactionMs < 0 ||
        reactionMs > 3000 ||
        typeof personality !== "string" ||
        ![
          "turtle",
          "aggro",
          "tactician",
          "trickster",
          "fortune",
          "sniper",
          "balanced",
        ].includes(personality)
      ) {
        return null;
      }
      return {
        type,
        requestId,
        roomId,
        bot: {
          wpm,
          accuracy,
          reactionMs,
          personality: personality as
            | "turtle"
            | "aggro"
            | "tactician"
            | "trickster"
            | "fortune"
            | "sniper"
            | "balanced",
        },
      };
    }
    case "REMOVE_BOT":
    case "START_MATCH": {
      if (!exactKeys(value, ["type", "requestId", "roomId"])) {
        return null;
      }
      const requestId = stringField(value, "requestId", 64);
      const roomId = stringField(value, "roomId", 32);
      return requestId === null || roomId === null
        ? null
        : { type, requestId, roomId };
    }
    case "QUEUE_RANKED":
    case "LEAVE_RANKED_QUEUE": {
      if (!exactKeys(value, ["type", "requestId"])) {
        return null;
      }
      const requestId = stringField(value, "requestId", 64);
      return requestId === null
        ? null
        : { type, requestId };
    }
    case "INTENT": {
      if (
        !exactKeys(value, [
          "type",
          "matchId",
          "roundId",
          "sequence",
          "intent",
        ])
      ) {
        return null;
      }
      const matchId = stringField(value, "matchId", 64);
      const roundId = stringField(value, "roundId", 64);
      const sequence = integerField(
        value,
        "sequence",
        0,
        Number.MAX_SAFE_INTEGER,
      );
      const intent = parseIntent(value.intent);
      if (
        matchId === null ||
        roundId === null ||
        sequence === null ||
        intent === null
      ) {
        return null;
      }
      return {
        type,
        matchId,
        roundId,
        sequence,
        intent,
      };
    }
    case "PONG": {
      if (!exactKeys(value, ["type", "nonce"])) return null;
      const nonce = stringField(value, "nonce", 64);
      return nonce === null ? null : { type, nonce };
    }
    default:
      return null;
  }
}

export function parseDuelClientMessage(
  raw: string,
  maxBytes = DUEL_PROTOCOL_MAX_MESSAGE_BYTES,
): DuelProtocolParseResult {
  if (typeof raw !== "string") {
    return { ok: false, error: "Message must be text." };
  }
  const bytes = new TextEncoder().encode(raw).byteLength;
  if (bytes === 0 || bytes > maxBytes) {
    return { ok: false, error: "Message size is invalid." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Message is not valid JSON." };
  }
  if (!isObject(parsed)) {
    return { ok: false, error: "Message must be an object." };
  }
  const message = parseMessageObject(parsed);
  return message === null
    ? { ok: false, error: "Message schema is invalid." }
    : { ok: true, message };
}

export function toEngineIntent(input: {
  playerId: "player-1" | "player-2";
  sequence: number;
  intent: DuelWireIntent;
}): import("./model").DuelIntent {
  const base = {
    playerId: input.playerId,
    sequence: input.sequence,
  };
  switch (input.intent.type) {
    case "TYPE_CHAR":
      return { ...base, ...input.intent };
    case "CANCEL_TARGET":
      return { ...base, ...input.intent };
    case "SELECT_TARGET":
      return { ...base, ...input.intent };
    case "USE_ITEM":
      return { ...base, ...input.intent };
    case "ACTIVATE_SKILL":
      return { ...base, ...input.intent };
  }
}
