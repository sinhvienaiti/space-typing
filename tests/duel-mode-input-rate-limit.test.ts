import { describe, expect, it } from "vitest";
import {
  DuelAuthorityService,
  type DuelAuthorityDependencies,
} from "../src/duel/authority";
import { DUEL_PROTOCOL_VERSION } from "../src/duel/protocol";

function deps(): DuelAuthorityDependencies {
  let token = 0;
  return {
    authenticate(sessionToken) {
      return sessionToken === "auth:user"
        ? { accountId: "user", displayName: "Pilot" }
        : null;
    },
    token() { return `token-${++token}`; },
    roomId() { return "ROOM-1"; },
    matchId() { return "MATCH-1"; },
    seed() { return 1; },
  };
}

describe("Duel MODE_INPUT anti-abuse boundary", () => {
  it("charges rejected packets before match/envelope validation", () => {
    const authority = new DuelAuthorityService(deps(), {
      maxMessagesPerSecond: 2,
    });
    const opened = authority.openSession({
      protocolVersion: DUEL_PROTOCOL_VERSION,
      sessionToken: "auth:user",
      now: 1_000,
    });
    if (!opened.ok) throw new Error(opened.message);

    const invalid = {
      matchId: "missing-match",
      roundId: "missing-round",
      envelope: {
        gameMode: "reflex",
        modeEpoch: 1,
        inputId: "spam",
        clientSequence: 0,
        kind: "mode-input",
        payload: { type: "TYPE_CHAR", char: "x" },
      },
      now: 1_100,
    } as const;

    expect(authority.submitModeInput(opened.value.sessionId, invalid)).toMatchObject({
      ok: false,
      code: "MATCH_NOT_FOUND",
    });
    expect(authority.submitModeInput(opened.value.sessionId, invalid)).toMatchObject({
      ok: false,
      code: "MATCH_NOT_FOUND",
    });
    expect(authority.submitModeInput(opened.value.sessionId, invalid)).toMatchObject({
      ok: false,
      code: "RATE_LIMITED",
    });
  });
});
