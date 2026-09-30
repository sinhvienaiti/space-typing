import { describe, expect, it } from "vitest";
import {
  DUEL_PROTOCOL_MAX_MESSAGE_BYTES,
  DUEL_PROTOCOL_VERSION,
  parseDuelClientMessage,
  toEngineIntent,
} from "../src/duel/protocol";

function parse(value: unknown) {
  return parseDuelClientMessage(JSON.stringify(value));
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
});
