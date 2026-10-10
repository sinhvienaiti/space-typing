import { describe, expect, it } from "vitest";
import {
  ALTERNATIVE_MODE_REGISTRY,
  alternativeModeSupportsMatchType,
} from "../src/duel/alternative-modes";
import { AlternativeMatchRuntime } from "../src/duel/alternative-match-runtime";

describe("R03 alternative modes runtime", () => {
  it("registers real runtime ownership while keeping ranked fail-closed", () => {
    expect(ALTERNATIVE_MODE_REGISTRY.reflex.runtimeOwner).toBe("AlternativeMatchRuntime");
    expect(ALTERNATIVE_MODE_REGISTRY["word-chain"].runtimeOwner).toBe("AlternativeMatchRuntime");
    expect(alternativeModeSupportsMatchType("reflex", "friend")).toBe(true);
    expect(alternativeModeSupportsMatchType("word-chain", "practice")).toBe(true);
    expect(alternativeModeSupportsMatchType("reflex", "ranked")).toBe(false);
    expect(alternativeModeSupportsMatchType("word-chain", "ranked")).toBe(false);
    expect(() =>
      new AlternativeMatchRuntime({
        mode: "reflex",
        matchType: "ranked",
        matchId: "ranked-must-fail",
        seed: 1,
        startedAtMs: 0,
      }),
    ).toThrow(/ranked remains fail-closed/i);
  });

  it("runs Reflex authoritatively and applies damage only on the impact clock", () => {
    const runtime = new AlternativeMatchRuntime({
      mode: "reflex",
      matchType: "friend",
      matchId: "reflex-1",
      seed: 4,
      startedAtMs: 1000,
      reflexPrompts: ["nova"],
      impactDelayMs: 200,
      damagePerHit: 25,
    });

    const accepted = runtime.submit({
      type: "MODE_INPUT",
      mode: "reflex",
      playerId: "player-1",
      sequence: 1,
      text: "NOVA",
      receivedAtMs: 1100,
    });
    expect(accepted.accepted).toBe(true);
    expect(accepted.snapshot.scoreByPlayer["player-1"]).toBe(1);
    expect(accepted.snapshot.hullByPlayer["player-2"]).toBe(100);

    expect(runtime.advance(1299).hullByPlayer["player-2"]).toBe(100);
    expect(runtime.advance(1300).hullByPlayer["player-2"]).toBe(75);
  });

  it("rejects duplicate Reflex sequences and survives snapshot/reconnect", () => {
    const runtime = new AlternativeMatchRuntime({
      mode: "reflex",
      matchType: "practice",
      matchId: "reflex-resume",
      seed: 7,
      startedAtMs: 0,
      reflexPrompts: ["pulse"],
    });
    expect(runtime.submit({
      type: "MODE_INPUT",
      mode: "reflex",
      playerId: "player-1",
      sequence: 1,
      text: "pulse",
      receivedAtMs: 50,
    }).accepted).toBe(true);

    const restored = AlternativeMatchRuntime.restore(runtime.snapshot(), {
      reflexPrompts: ["pulse"],
    });
    const duplicate = restored.submit({
      type: "MODE_INPUT",
      mode: "reflex",
      playerId: "player-1",
      sequence: 1,
      text: "pulse",
      receivedAtMs: 60,
    });
    expect(duplicate).toMatchObject({
      accepted: false,
      reason: "duplicate-sequence",
    });
    expect(restored.snapshot()).toEqual(runtime.snapshot());
  });

  it("enforces Word Chain turn, lexicon, transition and duplicate-word rules", () => {
    const lexicon = new Set(["nova", "aster", "relay", "yield"]);
    const runtime = new AlternativeMatchRuntime({
      mode: "word-chain",
      matchType: "friend",
      matchId: "chain-1",
      seed: 10,
      startedAtMs: 0,
      wordChainLexicon: lexicon,
      impactDelayMs: 0,
    });

    expect(runtime.submit({
      type: "MODE_INPUT",
      mode: "word-chain",
      playerId: "player-1",
      sequence: 1,
      word: "nova",
      receivedAtMs: 10,
    }).accepted).toBe(true);
    runtime.advance(10);

    expect(runtime.submit({
      type: "MODE_INPUT",
      mode: "word-chain",
      playerId: "player-1",
      sequence: 2,
      word: "aster",
      receivedAtMs: 20,
    })).toMatchObject({ accepted: false, reason: "wrong-turn" });

    expect(runtime.submit({
      type: "MODE_INPUT",
      mode: "word-chain",
      playerId: "player-2",
      sequence: 1,
      word: "relay",
      receivedAtMs: 30,
    })).toMatchObject({ accepted: false, reason: "invalid-chain" });

    expect(runtime.submit({
      type: "MODE_INPUT",
      mode: "word-chain",
      playerId: "player-2",
      sequence: 2,
      word: "aster",
      receivedAtMs: 40,
    }).accepted).toBe(true);

    expect(runtime.submit({
      type: "MODE_INPUT",
      mode: "word-chain",
      playerId: "player-1",
      sequence: 3,
      word: "relay",
      receivedAtMs: 50,
    }).accepted).toBe(true);

    expect(runtime.submit({
      type: "MODE_INPUT",
      mode: "word-chain",
      playerId: "player-2",
      sequence: 3,
      word: "yield",
      receivedAtMs: 60,
    }).accepted).toBe(true);

    expect(runtime.submit({
      type: "MODE_INPUT",
      mode: "word-chain",
      playerId: "player-1",
      sequence: 4,
      word: "nova",
      receivedAtMs: 70,
    })).toMatchObject({ accepted: false, reason: "duplicate-word" });
  });

  it("rejects a stale Reflex answer instead of applying it to the next round", () => {
    const runtime = new AlternativeMatchRuntime({
      mode: "reflex",
      matchType: "friend",
      matchId: "reflex-stale",
      seed: 2,
      startedAtMs: 0,
      reflexPrompts: ["nova"],
      reflexWindowMs: 500,
    });
    const stale = runtime.submit({
      type: "MODE_INPUT",
      mode: "reflex",
      playerId: "player-1",
      sequence: 1,
      text: "nova",
      receivedAtMs: 501,
    });
    expect(stale).toMatchObject({ accepted: false, reason: "expired" });
    expect(stale.snapshot.scoreByPlayer["player-1"]).toBe(0);
    expect(stale.snapshot.reflex?.round).toBe(2);
  });

  it("fails reconnect closed when canonical mode content changed", () => {
    const runtime = new AlternativeMatchRuntime({
      mode: "word-chain",
      matchType: "practice",
      matchId: "chain-content",
      seed: 9,
      startedAtMs: 0,
      wordChainLexicon: new Set(["nova", "aster"]),
    });
    expect(() =>
      AlternativeMatchRuntime.restore(runtime.snapshot(), {
        wordChainLexicon: new Set(["nova", "atlas"]),
      }),
    ).toThrow(/content fingerprint mismatch/i);
  });

  it("restores Word Chain state without replaying applied impacts", () => {
    const runtime = new AlternativeMatchRuntime({
      mode: "word-chain",
      matchType: "practice",
      matchId: "chain-resume",
      seed: 3,
      startedAtMs: 0,
      wordChainLexicon: new Set(["nova"]),
      impactDelayMs: 10,
      damagePerHit: 20,
    });
    runtime.submit({
      type: "MODE_INPUT",
      mode: "word-chain",
      playerId: "player-1",
      sequence: 1,
      word: "nova",
      receivedAtMs: 10,
    });
    runtime.advance(20);
    const snapshot = runtime.snapshot();
    expect(snapshot.hullByPlayer["player-2"]).toBe(80);

    const restored = AlternativeMatchRuntime.restore(snapshot, {
      wordChainLexicon: new Set(["nova"]),
      impactDelayMs: 10,
      damagePerHit: 20,
    });
    restored.advance(1000);
    expect(restored.snapshot().hullByPlayer["player-2"]).toBe(80);
  });
});
