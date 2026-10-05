import { describe, expect, it } from "vitest";
import { alternativeBattlePresentation } from "../src/duel/alternative-battle-ui";
import type { DuelAlternativeModePlayerView } from "../src/duel/alternative-mode-view";

describe("alternative Duel battle presentation", () => {
  it("renders only public Reflex challenge data", () => {
    const view: DuelAlternativeModePlayerView = {
      gameMode: "reflex",
      modeEpoch: 4,
      challenge: {
        challengeId: "reflex:1:e4:q2",
        modeEpoch: 4,
        kind: "synonym",
        prompt: "A synonym for quick",
        candidates: [
          { candidateId: "fast", token: "fast" },
          { candidateId: "slow", token: "slow" },
          { candidateId: "calm", token: "calm" },
        ],
        issuedAtMs: 1000,
        deadlineAtMs: 9000,
      },
      player: {
        buffer: "fa",
        physicalTypingMistakes: 1,
        semanticMistakes: 0,
        retries: 0,
        completed: false,
        lastAcceptedSequence: 2,
      },
    };

    const result = alternativeBattlePresentation(view, "player-1");
    expect(result.mode).toBe("reflex");
    expect(result.buffer).toBe("fa");
    expect(result.choices).toEqual(["fast", "slow", "calm"]);
    expect(result.title).toBe("A synonym for quick");
    expect(JSON.stringify(result)).not.toContain("correctCandidateId");
  });

  it("projects only the current player's Word Chain initial and public rival result", () => {
    const view: DuelAlternativeModePlayerView = {
      gameMode: "word-chain",
      modeEpoch: 7,
      beat: {
        beatId: "word-chain:e7:b3",
        modeEpoch: 7,
        requiredInitial: {
          "player-1": "r",
          "player-2": "t",
        },
        acceptedWord: {
          "player-1": null,
          "player-2": "tree",
        },
        legalMoveCount: {
          "player-1": 8,
          "player-2": 5,
        },
        resetCount: 1,
        issuedAtMs: 1000,
        deadlineAtMs: 13000,
      },
      player: {
        buffer: "ro",
        accepted: false,
        lastAcceptedSequence: 5,
      },
    };

    const result = alternativeBattlePresentation(view, "player-1");
    expect(result.mode).toBe("word-chain");
    expect(result.title).toContain("R");
    expect(result.buffer).toBe("ro");
    expect(result.meta).toContain("Legal moves 8");
    expect(result.meta).toContain("Rival: tree");
  });
});
