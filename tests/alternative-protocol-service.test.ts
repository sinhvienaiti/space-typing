import { describe, expect, it } from "vitest";
import {
  parseAlternativeModeWireMessage,
  toAlternativeModeInput,
} from "../src/duel/alternative-protocol";
import { AlternativeMatchService } from "../server/duel/alternative-service";

describe("R03 alternative mode wire authority", () => {
  it("accepts only semantic MODE_INPUT and rejects authoritative client claims", () => {
    const parsed = parseAlternativeModeWireMessage({
      type: "MODE_INPUT",
      matchId: "alt-1",
      sequence: 7,
      mode: "reflex",
      input: { text: "nova" },
    });
    expect(parsed).toEqual({
      type: "MODE_INPUT",
      matchId: "alt-1",
      sequence: 7,
      mode: "reflex",
      input: { text: "nova" },
    });

    expect(parseAlternativeModeWireMessage({
      type: "MODE_INPUT",
      matchId: "alt-1",
      sequence: 7,
      mode: "reflex",
      input: { text: "nova", damage: 9999 },
    })).toBeNull();
    expect(parseAlternativeModeWireMessage({
      type: "MODE_INPUT",
      matchId: "alt-1",
      sequence: 7,
      mode: "reflex",
      playerId: "player-1",
      input: { text: "nova" },
    })).toBeNull();
    expect(parseAlternativeModeWireMessage({
      type: "MODE_INPUT",
      matchId: "alt-1",
      sequence: 7,
      mode: "word-chain",
      receivedAtMs: 1,
      input: { word: "nova" },
    })).toBeNull();
  });

  it("derives player identity and receive clock from server context", () => {
    const message = parseAlternativeModeWireMessage({
      type: "MODE_INPUT",
      matchId: "alt-2",
      sequence: 3,
      mode: "word-chain",
      input: { word: "Orbit" },
    });
    if (message === null) throw new Error("Expected MODE_INPUT");
    expect(toAlternativeModeInput({
      message,
      playerId: "player-2",
      receivedAtMs: 1234,
    })).toEqual({
      type: "MODE_INPUT",
      mode: "word-chain",
      sequence: 3,
      playerId: "player-2",
      word: "Orbit",
      receivedAtMs: 1234,
    });
  });

  it("binds authenticated sessions to runtime players and restores reconnect state", () => {
    const service = new AlternativeMatchService();
    service.createMatch({
      leftSessionId: "session-a",
      rightSessionId: "session-b",
      runtime: {
        mode: "word-chain",
        matchType: "friend",
        matchId: "alt-chain",
        seed: 10,
        startedAtMs: 0,
        wordChainLexicon: new Set(["nova", "aster"]),
        impactDelayMs: 0,
      },
    });

    const first = service.submit("session-a", {
      type: "MODE_INPUT",
      matchId: "alt-chain",
      sequence: 1,
      mode: "word-chain",
      input: { word: "nova" },
    }, 10);
    expect(first.ok && first.decision.accepted).toBe(true);
    service.advance("alt-chain", 10);

    const saved = service.export("alt-chain");
    if (saved === null) throw new Error("Expected saved match");
    const resumed = new AlternativeMatchService();
    resumed.restore(saved, {
      wordChainLexicon: new Set(["nova", "aster"]),
      impactDelayMs: 0,
    });
    expect(resumed.snapshotForSession("session-a", "alt-chain")).toEqual(saved.snapshot);
    expect(resumed.snapshotForSession("intruder", "alt-chain")).toBeNull();

    const second = resumed.submit("session-b", {
      type: "MODE_INPUT",
      matchId: "alt-chain",
      sequence: 1,
      mode: "word-chain",
      input: { word: "aster" },
    }, 20);
    expect(second.ok && second.decision.accepted).toBe(true);
  });

  it("does not let a foreign session drive an alternative match", () => {
    const service = new AlternativeMatchService();
    service.createMatch({
      leftSessionId: "left",
      rightSessionId: "right",
      runtime: {
        mode: "reflex",
        matchType: "practice",
        matchId: "reflex-auth",
        seed: 1,
        startedAtMs: 0,
        reflexPrompts: ["pulse"],
      },
    });
    expect(service.submit("other", {
      type: "MODE_INPUT",
      matchId: "reflex-auth",
      sequence: 1,
      mode: "reflex",
      input: { text: "pulse" },
    }, 10)).toEqual({ ok: false, code: "SESSION_NOT_IN_MATCH" });
  });
});
