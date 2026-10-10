import { describe, expect, it } from "vitest";
import { AlternativeMatchRuntime } from "../server/duel/alternative-match-runtime";
import { DuelEngine } from "../src/duel/engine";

describe("alternative Duel bot quality", () => {
  it("uses WPM plus reaction time before a Reflex answer is due", () => {
    const runtime = new AlternativeMatchRuntime(
      new DuelEngine(),
      "reflex",
      "practice",
      { nowMs: 1_000, challengeIndex: 0 },
    );

    // Pilot challenge 0 has answer "cat" (3 chars). At 60 WPM using the
    // conventional 5-char word, typing is 600 ms; reaction adds 250 ms.
    expect(runtime.botTurnDelayMs("player-2", 60, 250)).toBe(850);
    expect(runtime.botTurnDelayMs("player-2", 120, 250)).toBe(550);
  });

  it("turns a Reflex accuracy miss into a real failed mode-input attempt before retry", () => {
    const engine = new DuelEngine({ maxHull: 100, maxShield: 0, startingShield: 0 });
    const runtime = new AlternativeMatchRuntime(
      engine,
      "reflex",
      "practice",
      { nowMs: 1_000, challengeIndex: 0, attackTravelMs: 600 },
    );

    const miss = runtime.runBotTurn("player-2", 1_100, 0);
    expect(miss.some((event) => event.type === "cannon-fired")).toBe(false);
    const afterMiss = runtime.reconnectSnapshot("player-2");
    expect(afterMiss.gameMode).toBe("reflex");
    if (afterMiss.gameMode !== "reflex") throw new Error("Expected Reflex view.");
    expect(afterMiss.player.completed).toBe(false);
    expect(afterMiss.player.physicalTypingMistakes).toBe(1);
    expect(engine.snapshot().players["player-1"].hull).toBe(100);

    const retry = runtime.runBotTurn("player-2", 1_950, 1);
    expect(retry.some((event) => event.type === "cannon-fired")).toBe(true);
    const afterRetry = runtime.reconnectSnapshot("player-2");
    expect(afterRetry.gameMode).toBe("reflex");
    if (afterRetry.gameMode !== "reflex") throw new Error("Expected Reflex view.");
    expect(afterRetry.player.completed).toBe(true);
    expect(engine.snapshot().players["player-1"].hull).toBe(100);

    runtime.tick(2_550);
    expect(engine.snapshot().players["player-1"].hull).toBe(92);
  });

  it("retries a failed Word Chain submission through the same input boundary", () => {
    const runtime = new AlternativeMatchRuntime(
      new DuelEngine(),
      "word-chain",
      "practice",
      { nowMs: 5_000 },
    );

    const miss = runtime.runBotTurn("player-2", 5_100, 0);
    expect(miss.some((event) => event.type === "cannon-fired")).toBe(false);
    const afterMiss = runtime.reconnectSnapshot("player-2");
    expect(afterMiss.gameMode).toBe("word-chain");
    if (afterMiss.gameMode !== "word-chain") throw new Error("Expected Word Chain view.");
    expect(afterMiss.player.accepted).toBe(false);

    const retry = runtime.runBotTurn("player-2", 6_000, 1);
    expect(retry.some((event) => event.type === "cannon-fired")).toBe(true);
    const afterRetry = runtime.reconnectSnapshot("player-2");
    expect(afterRetry.gameMode).toBe("word-chain");
    if (afterRetry.gameMode !== "word-chain") throw new Error("Expected Word Chain view.");
    expect(afterRetry.player.accepted).toBe(true);
  });
});