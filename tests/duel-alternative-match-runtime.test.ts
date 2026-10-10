import { describe, expect, it } from "vitest";
import { DuelEngine } from "../src/duel/engine";
import { AlternativeMatchRuntime } from "../server/duel/alternative-match-runtime";

describe("AlternativeMatchRuntime", () => {
  it("keeps Reflex answer authority private and routes bot through mode input + impact", () => {
    const engine = new DuelEngine({
      maxHull: 100,
      maxShield: 0,
      startingShield: 0,
    });
    const runtime = new AlternativeMatchRuntime(
      engine,
      "reflex",
      "practice",
      { nowMs: 1_000, challengeIndex: 0, attackTravelMs: 600 },
    );

    const publicView = runtime.reconnectSnapshot("player-1");
    expect(publicView.gameMode).toBe("reflex");
    expect(JSON.stringify(publicView)).not.toContain("correctCandidateId");
    expect(JSON.stringify(publicView)).not.toContain("correctToken");

    const fired = runtime.runBotTurn("player-1", 1_100);
    expect(fired.some((event) => event.type === "cannon-fired")).toBe(true);
    expect(engine.snapshot().players["player-2"].hull).toBe(100);

    expect(runtime.tick(1_699).combatEvents.some((event) => event.type === "cannon-hit")).toBe(false);
    expect(engine.snapshot().players["player-2"].hull).toBe(100);

    const impact = runtime.tick(1_700).combatEvents;
    expect(impact.some((event) => event.type === "cannon-hit")).toBe(true);
    expect(engine.snapshot().players["player-2"].hull).toBe(92);
  });

  it("returns round-ended from the shared engine so outer authority can settle the series", () => {
    const engine = new DuelEngine({
      maxHull: 8,
      maxShield: 0,
      startingShield: 0,
    });
    const runtime = new AlternativeMatchRuntime(
      engine,
      "reflex",
      "friend",
      { nowMs: 0, challengeIndex: 1, attackTravelMs: 500 },
    );

    runtime.runBotTurn("player-1", 100);
    const impact = runtime.tick(600).combatEvents;
    expect(impact).toContainEqual({
      type: "round-ended",
      result: { status: "won", winnerId: "player-1" },
    });
  });

  it("uses the same mode-input boundary for Word Chain bot play and advances cross-fed beats", () => {
    const engine = new DuelEngine({
      maxHull: 100,
      maxShield: 0,
      startingShield: 0,
    });
    const runtime = new AlternativeMatchRuntime(
      engine,
      "word-chain",
      "practice",
      { nowMs: 5_000, attackTravelMs: 600 },
    );

    const before = runtime.reconnectSnapshot("player-1");
    expect(before.gameMode).toBe("word-chain");
    if (before.gameMode !== "word-chain" || before.beat === null) {
      throw new Error("Word Chain beat was not created.");
    }
    const firstBeatId = before.beat.beatId;

    const one = runtime.runBotTurn("player-1", 5_100);
    expect(one.some((event) => event.type === "cannon-fired")).toBe(true);
    const afterOne = runtime.reconnectSnapshot("player-1");
    expect(afterOne.gameMode === "word-chain" && afterOne.player.accepted).toBe(true);

    const two = runtime.runBotTurn("player-2", 5_100);
    expect(two.some((event) => event.type === "cannon-fired")).toBe(true);
    const afterBoth = runtime.reconnectSnapshot("player-1");
    expect(afterBoth.gameMode).toBe("word-chain");
    if (afterBoth.gameMode !== "word-chain" || afterBoth.beat === null) {
      throw new Error("Word Chain beat disappeared.");
    }
    expect(afterBoth.beat.beatId).not.toBe(firstBeatId);

    const impact = runtime.tick(5_700).combatEvents.filter(
      (event) => event.type === "cannon-hit",
    );
    expect(impact).toHaveLength(2);
    expect(engine.snapshot().players["player-1"].hull).toBe(90);
    expect(engine.snapshot().players["player-2"].hull).toBe(90);
  });

  it("rotates Reflex challenge content after both players finish without exposing rival input", () => {
    const engine = new DuelEngine();
    const runtime = new AlternativeMatchRuntime(
      engine,
      "reflex",
      "friend",
      { nowMs: 10_000, challengeIndex: 2 },
    );

    const beforeOne = runtime.reconnectSnapshot("player-1");
    const beforeTwo = runtime.reconnectSnapshot("player-2");
    if (
      beforeOne.gameMode !== "reflex" ||
      beforeTwo.gameMode !== "reflex" ||
      beforeOne.challenge === null ||
      beforeTwo.challenge === null
    ) {
      throw new Error("Reflex challenge was not created.");
    }
    const firstChallengeId = beforeOne.challenge.challengeId;

    runtime.runBotTurn("player-1", 10_100);
    expect(runtime.reconnectSnapshot("player-2")).toEqual(beforeTwo);
    runtime.runBotTurn("player-2", 10_100);

    const tick = runtime.tick(10_101);
    expect(tick.stateChanged).toBe(true);
    const next = runtime.reconnectSnapshot("player-1");
    expect(next.gameMode).toBe("reflex");
    if (next.gameMode !== "reflex" || next.challenge === null) {
      throw new Error("Next Reflex challenge was not created.");
    }
    expect(next.challenge.challengeId).not.toBe(firstChallengeId);
    expect(next.player.completed).toBe(false);
  });
});
