import { describe, expect, it } from "vitest";
import {
  validateReflexCandidates,
  type ReflexPublicChallenge,
} from "../src/duel/reflex";
import { DuelModeRuntime, type DuelModeAttack, type DuelModeCombatPort } from "../server/duel/mode-runtime";
import {
  correctReflexToken,
  createReviewedReflexChallenge,
  reviewedReflexPilotSize,
} from "../server/duel/reflex/challenge-bank";
import {
  ReflexAuthority,
  chooseReflexBotCandidate,
} from "../server/duel/reflex/authority";

class RecordingCombatPort implements DuelModeCombatPort {
  readonly attacks: DuelModeAttack[] = [];
  scheduleModeAttack(attack: DuelModeAttack): void {
    this.attacks.push({ ...attack });
  }
}

function envelope(modeEpoch: number, clientSequence: number, payload: unknown) {
  return {
    gameMode: "reflex",
    modeEpoch,
    inputId: `input-${clientSequence}`,
    clientSequence,
    kind: "mode-input",
    payload,
  } as const;
}

function publicHasAnswerMarker(challenge: ReflexPublicChallenge): boolean {
  return JSON.stringify(challenge).includes("correctCandidateId");
}

describe("Reflex VN→EN vertical slice", () => {
  it("ships a small reviewed three-candidate prefix-free pilot without answer markers", () => {
    expect(reviewedReflexPilotSize()).toBeGreaterThanOrEqual(10);
    for (let index = 0; index < reviewedReflexPilotSize(); index += 1) {
      const challenge = createReviewedReflexChallenge({
        index,
        modeEpoch: 7,
        issuedAtMs: 1_000,
      });
      expect(challenge.publicChallenge.candidates).toHaveLength(3);
      expect(validateReflexCandidates(challenge.publicChallenge.candidates)).toEqual([]);
      expect(publicHasAnswerMarker(challenge.publicChallenge)).toBe(false);
      expect(
        challenge.publicChallenge.candidates.some(
          (candidate) => candidate.candidateId === challenge.correctCandidateId,
        ),
      ).toBe(true);
    }
  });

  it("rejects ambiguous candidate sets that violate whole-token prefix-free acquisition", () => {
    expect(
      validateReflexCandidates([
        { candidateId: "alpha", token: "run" },
        { candidateId: "bravo", token: "runner" },
        { candidateId: "charlie", token: "walk" },
      ]).some((error) => error.includes("prefix-free")),
    ).toBe(true);
  });

  it("separates physical typing errors from semantic errors, retries, then fires through the combat seam", () => {
    const combat = new RecordingCombatPort();
    const modeRuntime = new DuelModeRuntime(combat, "standard", 1);
    const authority = new ReflexAuthority(modeRuntime, "friend", 9, 600);
    const publicChallenge = authority.issueChallenge({
      index: 0,
      nowMs: 1_000,
      durationMs: 20_000,
    });
    expect(publicChallenge.modeEpoch).toBe(2);

    const privateTwin = createReviewedReflexChallenge({
      index: 0,
      modeEpoch: publicChallenge.modeEpoch,
      issuedAtMs: 1_000,
      durationMs: 20_000,
    });
    const wrongCandidate = publicChallenge.candidates.find(
      (candidate) => candidate.candidateId !== privateTwin.correctCandidateId,
    )!;

    const physical = authority.receive(
      "player-1",
      envelope(2, 1, { type: "TYPE_CHAR", char: "z" }),
      1_100,
    );
    expect(physical).toMatchObject({
      ok: true,
      feedback: "physical-typing-wrong",
      state: { physicalTypingMistakes: 1, semanticMistakes: 0, buffer: "" },
    });

    let sequence = 2;
    let semanticFeedback = "";
    for (const char of wrongCandidate.token) {
      const result = authority.receive(
        "player-1",
        envelope(2, sequence++, { type: "TYPE_CHAR", char }),
        1_200,
      );
      if (result.ok) semanticFeedback = result.feedback;
    }
    expect(semanticFeedback).toBe("semantic-wrong");
    expect(authority.reconnectSnapshot("player-1").player).toMatchObject({
      buffer: "",
      physicalTypingMistakes: 1,
      semanticMistakes: 1,
      retries: 1,
      completed: false,
    });
    expect(combat.attacks).toHaveLength(0);

    let correctFeedback = "";
    for (const char of correctReflexToken(privateTwin)) {
      const result = authority.receive(
        "player-1",
        envelope(2, sequence++, { type: "TYPE_CHAR", char }),
        1_300,
      );
      if (result.ok) correctFeedback = result.feedback;
    }
    expect(correctFeedback).toBe("correct");
    expect(combat.attacks).toHaveLength(1);
    expect(combat.attacks[0]).toMatchObject({
      modeEpoch: 2,
      sourcePlayerId: "player-1",
      damage: 9,
      travelMs: 600,
      presentation: "primary-cannon",
    });
  });

  it("uses server receipt time for timeout and restores only public reconnect state", () => {
    const combat = new RecordingCombatPort();
    const authority = new ReflexAuthority(
      new DuelModeRuntime(combat, "standard", 20),
      "practice",
    );
    const challenge = authority.issueChallenge({ index: 1, nowMs: 5_000, durationMs: 2_000 });
    const result = authority.receive(
      "player-2",
      envelope(challenge.modeEpoch, 1, { type: "TYPE_CHAR", char: "d" }),
      7_001,
    );
    expect(result).toMatchObject({ ok: true, feedback: "timeout" });
    const restored = authority.reconnectSnapshot("player-2");
    expect(restored.challenge?.challengeId).toBe(challenge.challengeId);
    expect(JSON.stringify(restored)).not.toContain("correctCandidateId");
    expect(combat.attacks).toHaveLength(0);
  });

  it("keeps Bot semantic skill separate from physical typing accuracy", () => {
    const challenge = createReviewedReflexChallenge({
      index: 2,
      modeEpoch: 4,
      issuedAtMs: 0,
    });
    expect(
      chooseReflexBotCandidate({
        challenge,
        semanticAccuracy: 0.9,
        semanticRoll: 0.2,
        wrongChoiceRoll: 0.8,
      }),
    ).toBe(challenge.correctCandidateId);
    expect(
      chooseReflexBotCandidate({
        challenge,
        semanticAccuracy: 0.2,
        semanticRoll: 0.9,
        wrongChoiceRoll: 0.8,
      }),
    ).not.toBe(challenge.correctCandidateId);
  });

  it("keeps Alternative Ranked disabled", () => {
    const runtime = new DuelModeRuntime(new RecordingCombatPort(), "standard", 1);
    expect(() => new ReflexAuthority(runtime, "ranked")).toThrow(/Ranked is gated off/);
  });
});
