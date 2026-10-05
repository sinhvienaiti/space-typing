import { describe, expect, it } from "vitest";
import { isDuelAlternativeModePlayerView } from "../src/duel/alternative-mode-view";

const reflex = {
  gameMode: "reflex",
  modeEpoch: 2,
  challenge: {
    challengeId: "reflex:2",
    modeEpoch: 2,
    kind: "definition",
    prompt: "A small domestic feline",
    candidates: [
      { candidateId: "cat", token: "cat" },
      { candidateId: "dog", token: "dog" },
      { candidateId: "bird", token: "bird" },
    ],
    issuedAtMs: 1000,
    deadlineAtMs: 9000,
  },
  player: {
    buffer: "ca",
    physicalTypingMistakes: 0,
    semanticMistakes: 0,
    retries: 0,
    completed: false,
    lastAcceptedSequence: 1,
  },
} as const;

describe("alternative mode player view validation", () => {
  it("accepts an exact valid Reflex snapshot", () => {
    expect(isDuelAlternativeModePlayerView(reflex)).toBe(true);
  });

  it("rejects injected private answer material", () => {
    expect(isDuelAlternativeModePlayerView({
      ...reflex,
      challenge: {
        ...reflex.challenge,
        correctCandidateId: "cat",
      },
    })).toBe(false);
  });

  it("rejects a challenge whose epoch does not match the envelope", () => {
    expect(isDuelAlternativeModePlayerView({
      ...reflex,
      challenge: {
        ...reflex.challenge,
        modeEpoch: 3,
      },
    })).toBe(false);
  });

  it("accepts a reconnect Word Chain state with sequence -1", () => {
    expect(isDuelAlternativeModePlayerView({
      gameMode: "word-chain",
      modeEpoch: 1,
      beat: {
        beatId: "word-chain:1",
        modeEpoch: 1,
        requiredInitial: { "player-1": "a", "player-2": "b" },
        acceptedWord: { "player-1": null, "player-2": null },
        legalMoveCount: { "player-1": 8, "player-2": 7 },
        resetCount: 0,
        issuedAtMs: 0,
        deadlineAtMs: 12000,
      },
      player: {
        buffer: "",
        accepted: false,
        lastAcceptedSequence: -1,
      },
    })).toBe(true);
  });
});
