import { describe, expect, it } from "vitest";
import {
  DUEL_PROTOCOL_MAX_MESSAGE_BYTES,
  DUEL_PROTOCOL_VERSION,
  DUEL_ROOM_LIST_MAX_ROOMS,
  parseDuelClientMessage,
  parseDuelRoomListMessage,
  toEngineIntent,
  type DuelRoomListing,
} from "../src/duel/protocol";

function parse(value: unknown) {
  return parseDuelClientMessage(JSON.stringify(value));
}

function listing(
  overrides: Partial<DuelRoomListing> = {},
): DuelRoomListing {
  return {
    roomId: "A1B2C3D4E5",
    roomName: "Late Night Duel",
    hostDisplayName: "Pilot-host",
    hostCharacterId: "vanguard",
    mapSelection: { mode: "fixed", mapId: "inferno-rift" },
    roundFormat: 3,
    matchLengthSeconds: 240,
    hazardLevel: "standard",
    modifier: "standard",
    playerCount: 1,
    capacity: 2,
    hasBot: false,
    hasPassword: false,
    status: "waiting",
    createdAt: 1_790_000_000_000,
    ...overrides,
  };
}

/** Serialize like the server, parse like the browser. */
function roundTrip(value: unknown) {
  return parseDuelRoomListMessage(
    JSON.parse(JSON.stringify(value)),
  );
}

describe("Duel M-DUEL-10 authoritative protocol", () => {
  it("accepts only semantic combat intents", () => {
    const result = parse({
      type: "INTENT",
      matchId: "match-1",
      roundId: "round-1",
      sequence: 7,
      intent: {
        type: "TYPE_CHAR",
        char: "A",
        targetInstanceId: "offer-9",
      },
    });
    expect(result).toEqual({
      ok: true,
      message: {
        type: "INTENT",
        matchId: "match-1",
        roundId: "round-1",
        sequence: 7,
        intent: {
          type: "TYPE_CHAR",
          char: "a",
          targetInstanceId: "offer-9",
        },
      },
    });
  });

  it.each([
    "WORD_COMPLETE",
    "ANSWER_CORRECT",
    "DAMAGE_APPLIED",
    "KEY_OK",
    "KEY_MISS",
    "COUNTER_COMPLETE",
    "FATE_COMPLETE",
    "MYSTERY_COMPLETE",
    "OBJECTIVE_COMPLETE",
  ])("rejects authoritative client claim %s", (type) => {
    expect(
      parse({
        type,
        matchId: "m",
        roundId: "r",
        sequence: 1,
      }).ok,
    ).toBe(false);
    expect(
      parse({
        type: "INTENT",
        matchId: "m",
        roundId: "r",
        sequence: 1,
        intent: { type },
      }).ok,
    ).toBe(false);
  });

  it("rejects client-supplied player identity and damage fields", () => {
    expect(
      parse({
        type: "INTENT",
        matchId: "m",
        roundId: "r",
        sequence: 1,
        intent: {
          type: "TYPE_CHAR",
          char: "a",
          playerId: "player-1",
        },
      }).ok,
    ).toBe(false);
    expect(
      parse({
        type: "INTENT",
        matchId: "m",
        roundId: "r",
        sequence: 1,
        intent: {
          type: "USE_ITEM",
          itemId: "missile",
          damage: 9999,
        },
      }).ok,
    ).toBe(false);
  });

  it("rejects extra envelope fields instead of silently trusting them", () => {
    expect(
      parse({
        type: "INTENT",
        matchId: "m",
        roundId: "r",
        sequence: 1,
        intent: {
          type: "SELECT_TARGET",
          targetInstanceId: "offer-1",
        },
        winner: "player-1",
      }).ok,
    ).toBe(false);
  });

  it("derives engine player identity from authenticated server context", () => {
    const result = parse({
      type: "INTENT",
      matchId: "m",
      roundId: "r",
      sequence: 11,
      intent: {
        type: "CANCEL_TARGET",
        targetInstanceId: "offer-1",
      },
    });
    if (!result.ok || result.message.type !== "INTENT") {
      throw new Error("Expected parsed intent.");
    }
    expect(
      toEngineIntent({
        playerId: "player-2",
        sequence: result.message.sequence,
        intent: result.message.intent,
      }),
    ).toEqual({
      type: "CANCEL_TARGET",
      playerId: "player-2",
      sequence: 11,
      targetInstanceId: "offer-1",
    });
  });

  it("enforces protocol version handshake fields", () => {
    expect(
      parse({
        type: "HELLO",
        protocolVersion: DUEL_PROTOCOL_VERSION,
        clientVersion: "0.1.0",
        sessionToken: "signed-session-token",
      }).ok,
    ).toBe(true);
    expect(
      parse({
        type: "HELLO",
        protocolVersion: "3",
        clientVersion: "0.1.0",
        sessionToken: "signed-session-token",
      }).ok,
    ).toBe(false);
  });

  it("accepts room-control messages without expanding combat intent types", () => {
    expect(
      parse({
        type: "SET_LOADOUT",
        requestId: "req-1",
        roomId: "ROOM-1",
        shipId: "vanguard",
        characterId: null,
      }).ok,
    ).toBe(true);

    expect(
      parse({
        type: "SET_BOT",
        requestId: "req-2",
        roomId: "ROOM-1",
        bot: {
          wpm: 75,
          accuracy: 0.96,
          reactionMs: 240,
          personality: "tactician",
        },
      }).ok,
    ).toBe(true);

    expect(
      parse({
        type: "START_MATCH",
        requestId: "req-3",
        roomId: "ROOM-1",
      }).ok,
    ).toBe(true);

    expect(
      parse({
        type: "INTENT",
        matchId: "m",
        roundId: "r",
        sequence: 1,
        intent: {
          type: "START_MATCH",
          roomId: "ROOM-1",
        },
      }).ok,
    ).toBe(false);
  });

  it("rejects out-of-contract Bot room settings at protocol boundary", () => {
    expect(
      parse({
        type: "SET_BOT",
        requestId: "req-4",
        roomId: "ROOM-1",
        bot: {
          wpm: 999,
          accuracy: 1,
          reactionMs: 0,
          personality: "aggro",
        },
      }).ok,
    ).toBe(false);

    expect(
      parse({
        type: "SET_BOT",
        requestId: "req-5",
        roomId: "ROOM-1",
        bot: {
          wpm: 60,
          accuracy: 0.2,
          reactionMs: 200,
          personality: "balanced",
        },
      }).ok,
    ).toBe(false);
  });

  it("accepts the player's hull with the Ranked queue, and rejects a bad one", () => {
    expect(parse({ type: "QUEUE_RANKED", requestId: "ranked-2", characterId: "zenith" })).toEqual({
      ok: true,
      message: { type: "QUEUE_RANKED", requestId: "ranked-2", characterId: "zenith" },
    });
    expect(parse({ type: "QUEUE_RANKED", requestId: "ranked-3", characterId: 7 }).ok).toBe(false);
    expect(parse({ type: "QUEUE_RANKED", requestId: "ranked-4", extra: true }).ok).toBe(false);
  });

  it("accepts Ranked queue control messages outside combat intent grammar", () => {
    expect(
      parse({
        type: "QUEUE_RANKED",
        requestId: "ranked-1",
      }),
    ).toEqual({
      ok: true,
      message: {
        type: "QUEUE_RANKED",
        requestId: "ranked-1",
      },
    });
    expect(
      parse({
        type: "LEAVE_RANKED_QUEUE",
        requestId: "ranked-2",
      }),
    ).toEqual({
      ok: true,
      message: {
        type: "LEAVE_RANKED_QUEUE",
        requestId: "ranked-2",
      },
    });
    expect(
      parse({
        type: "INTENT",
        matchId: "m",
        roundId: "r",
        sequence: 1,
        intent: {
          type: "QUEUE_RANKED",
        },
      }).ok,
    ).toBe(false);
  });

  it("rejects oversized payloads before JSON parsing", () => {
    const raw = JSON.stringify({
      type: "PONG",
      nonce: "x".repeat(DUEL_PROTOCOL_MAX_MESSAGE_BYTES),
    });
    expect(parseDuelClientMessage(raw)).toEqual({
      ok: false,
      error: "Message size is invalid.",
    });
  });

  it("rejects duplicate/unknown fields within intent schemas", () => {
    expect(
      parse({
        type: "INTENT",
        matchId: "m",
        roundId: "r",
        sequence: 1,
        intent: {
          type: "ACTIVATE_SKILL",
          skillId: "scan",
          hiddenOutcome: "jackpot",
        },
      }).ok,
    ).toBe(false);
  });

  it("accepts WATCH_ROOMS on and off, and rejects bad shapes", () => {
    expect(
      parse({ type: "WATCH_ROOMS", requestId: "req-9", watch: true }),
    ).toEqual({
      ok: true,
      message: { type: "WATCH_ROOMS", requestId: "req-9", watch: true },
    });
    expect(
      parse({ type: "WATCH_ROOMS", requestId: "req-10", watch: false }),
    ).toEqual({
      ok: true,
      message: { type: "WATCH_ROOMS", requestId: "req-10", watch: false },
    });
    expect(parse({ type: "WATCH_ROOMS", requestId: "req-11" }).ok).toBe(false);
    expect(
      parse({ type: "WATCH_ROOMS", requestId: "req-12", watch: "yes" }).ok,
    ).toBe(false);
    expect(parse({ type: "WATCH_ROOMS", watch: true }).ok).toBe(false);
    expect(
      parse({
        type: "WATCH_ROOMS",
        requestId: "x".repeat(65),
        watch: true,
      }).ok,
    ).toBe(false);
    expect(
      parse({
        type: "WATCH_ROOMS",
        requestId: "req-13",
        watch: true,
        filter: "public",
      }).ok,
    ).toBe(false);
  });

  it("round-trips a ROOM_LIST with fixed, random and vote maps", () => {
    const message = {
      type: "ROOM_LIST",
      rooms: [
        listing(),
        listing({
          roomId: "PRIVATE001",
          hasPassword: true,
          hostCharacterId: null,
          mapSelection: {
            mode: "random",
            pool: ["frost-wastes", "terra-core"],
          },
          roundFormat: 5,
          matchLengthSeconds: 300,
          hazardLevel: "high",
          modifier: "sudden-death",
        }),
        listing({
          roomId: "INMATCH001",
          status: "in-match",
          playerCount: 2,
          hasBot: true,
          mapSelection: { mode: "vote", pool: ["celestial-void"] },
        }),
      ],
    };
    expect(roundTrip(message)).toEqual(message);
    expect(roundTrip({ type: "ROOM_LIST", rooms: [] })).toEqual({
      type: "ROOM_LIST",
      rooms: [],
    });
  });

  it.each([
    ["wrong message type", { type: "ROOM_SNAPSHOT", rooms: [] }],
    ["extra envelope field", { type: "ROOM_LIST", rooms: [], total: 9 }],
    ["rooms not an array", { type: "ROOM_LIST", rooms: {} }],
    ["password leak", { type: "ROOM_LIST", rooms: [{ ...listing(), password: "space" }] }],
    ["missing field", { type: "ROOM_LIST", rooms: [{ ...listing(), roomId: undefined }] }],
    ["unknown map", { type: "ROOM_LIST", rooms: [listing({ mapSelection: { mode: "fixed", mapId: "moon" as never } })] }],
    ["fixed map with pool", { type: "ROOM_LIST", rooms: [listing({ mapSelection: { mode: "fixed", mapId: "terra-core", pool: [] } as never })] }],
    ["empty pool", { type: "ROOM_LIST", rooms: [listing({ mapSelection: { mode: "random", pool: [] } })] }],
    ["duplicate pool map", { type: "ROOM_LIST", rooms: [listing({ mapSelection: { mode: "random", pool: ["terra-core", "terra-core"] } })] }],
    ["bad round format", { type: "ROOM_LIST", rooms: [listing({ roundFormat: 2 as never })] }],
    ["bad status", { type: "ROOM_LIST", rooms: [listing({ status: "ended" as never })] }],
    ["bad modifier", { type: "ROOM_LIST", rooms: [listing({ modifier: "god-mode" as never })] }],
    ["more players than capacity", { type: "ROOM_LIST", rooms: [listing({ playerCount: 3 })] }],
    ["fractional time", { type: "ROOM_LIST", rooms: [listing({ createdAt: 1.5 })] }],
    ["long room name", { type: "ROOM_LIST", rooms: [listing({ roomName: "x".repeat(41) })] }],
    ["non-boolean flag", { type: "ROOM_LIST", rooms: [listing({ hasPassword: 1 as never })] }],
    ["empty hull id", { type: "ROOM_LIST", rooms: [listing({ hostCharacterId: "" })] }],
    ["duplicate room id", { type: "ROOM_LIST", rooms: [listing(), listing()] }],
  ])("rejects a ROOM_LIST with %s", (_label, message) => {
    expect(roundTrip(message)).toBeNull();
  });

  it("caps ROOM_LIST at the room limit", () => {
    const rooms = (count: number) =>
      Array.from({ length: count }, (_, index) =>
        listing({ roomId: "ROOM-" + String(index) }),
      );
    expect(
      roundTrip({ type: "ROOM_LIST", rooms: rooms(DUEL_ROOM_LIST_MAX_ROOMS) })
        ?.rooms.length,
    ).toBe(DUEL_ROOM_LIST_MAX_ROOMS);
    expect(
      roundTrip({
        type: "ROOM_LIST",
        rooms: rooms(DUEL_ROOM_LIST_MAX_ROOMS + 1),
      }),
    ).toBeNull();
  });
});
