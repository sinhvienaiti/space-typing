import { describe, expect, it } from "vitest";
import { AlternativeMatchRuntime } from "../src/duel/alternative-match-runtime";
import { AlternativePracticeMatch } from "../src/duel/alternative-practice";
import { projectAlternativeMatchView } from "../src/duel/alternative-presentation";

describe("R03 alternative practice and presentation", () => {
  it("projects authoritative state relative to each player", () => {
    const runtime = new AlternativeMatchRuntime({
      mode: "reflex",
      matchType: "friend",
      matchId: "view-1",
      seed: 1,
      startedAtMs: 0,
      reflexPrompts: ["nova"],
      impactDelayMs: 200,
    });
    runtime.submit({
      type: "MODE_INPUT",
      mode: "reflex",
      playerId: "player-1",
      sequence: 1,
      text: "nova",
      receivedAtMs: 100,
    });

    const left = projectAlternativeMatchView(runtime.snapshot(), "player-1");
    const right = projectAlternativeMatchView(runtime.snapshot(), "player-2");
    expect(left.self.score).toBe(1);
    expect(right.opponent.score).toBe(1);
    expect(left.projectiles[0]).toMatchObject({ direction: "outgoing", remainingMs: 200 });
    expect(right.projectiles[0]).toMatchObject({ direction: "incoming", remainingMs: 200 });
  });

  it("runs deterministic Reflex practice bot on the authoritative clock", () => {
    const practice = new AlternativePracticeMatch({
      mode: "reflex",
      matchId: "practice-reflex",
      seed: 3,
      startedAtMs: 0,
      reflexPrompts: ["pulse"],
      botReactionMs: 500,
      impactDelayMs: 100,
    });

    expect(practice.advance(499).scoreByPlayer["player-2"]).toBe(0);
    const fired = practice.advance(500);
    expect(fired.scoreByPlayer["player-2"]).toBe(1);
    expect(fired.hullByPlayer["player-1"]).toBe(100);
    expect(practice.advance(600).hullByPlayer["player-1"]).toBe(80);
  });

  it("answers Word Chain practice turns from the canonical lexicon", () => {
    const practice = new AlternativePracticeMatch({
      mode: "word-chain",
      matchId: "practice-chain",
      seed: 5,
      startedAtMs: 0,
      wordChainLexicon: new Set(["nova", "aster", "relay"]),
      impactDelayMs: 0,
    });
    expect(practice.submitWord("nova", 10).accepted).toBe(true);
    const afterBot = practice.advance(20);
    expect(afterBot.wordChain?.chain).toEqual(["nova", "aster"]);
    expect(afterBot.wordChain?.nextPlayerId).toBe("player-1");
    expect(afterBot.hullByPlayer["player-1"]).toBe(80);
    expect(afterBot.hullByPlayer["player-2"]).toBe(80);
  });

  it("restores practice without losing bot timing or authoritative state", () => {
    const original = new AlternativePracticeMatch({
      mode: "reflex",
      matchId: "practice-resume",
      seed: 7,
      startedAtMs: 0,
      reflexPrompts: ["nova"],
      botReactionMs: 600,
    });
    original.advance(300);
    const restored = AlternativePracticeMatch.restore(original.snapshot(), {
      reflexPrompts: ["nova"],
      botReactionMs: 600,
    });
    expect(restored.snapshot()).toEqual(original.snapshot());
    expect(restored.advance(599).scoreByPlayer["player-2"]).toBe(0);
    expect(restored.advance(600).scoreByPlayer["player-2"]).toBe(1);
  });
});
