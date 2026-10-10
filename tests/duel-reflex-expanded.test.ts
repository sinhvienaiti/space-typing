import { describe, expect, it } from "vitest";
import type { ReflexChallengeKind } from "../src/duel/reflex";
import { DuelModeRuntime, type DuelModeAttack, type DuelModeCombatPort } from "../server/duel/mode-runtime";
import {
  correctReflexToken,
  createReviewedReflexChallenge,
  reviewedReflexKinds,
} from "../server/duel/reflex/challenge-bank";
import { ReflexAuthority } from "../server/duel/reflex/authority";

class RecordingCombatPort implements DuelModeCombatPort {
  readonly attacks: DuelModeAttack[] = [];
  scheduleModeAttack(attack: DuelModeAttack): void {
    this.attacks.push({ ...attack });
  }
}

function envelope(modeEpoch: number, sequence: number, char: string) {
  return {
    gameMode: "reflex",
    modeEpoch,
    inputId: `expanded-${sequence}`,
    clientSequence: sequence,
    kind: "mode-input",
    payload: { type: "TYPE_CHAR", char },
  } as const;
}

const EXPECTED_KINDS: readonly ReflexChallengeKind[] = [
  "translation-vn-en",
  "definition",
  "synonym",
  "antonym",
  "cloze-one-token",
];

const REPRESENTATIVE_INDEX: Readonly<Record<ReflexChallengeKind, number>> = {
  "translation-vn-en": 0,
  definition: 12,
  synonym: 16,
  antonym: 20,
  "cloze-one-token": 24,
};

describe("Reflex expanded challenge families", () => {
  it("publishes all reviewed challenge kinds through one Reflex mode", () => {
    expect(new Set(reviewedReflexKinds())).toEqual(new Set(EXPECTED_KINDS));
    for (const kind of EXPECTED_KINDS) {
      const challenge = createReviewedReflexChallenge({
        index: REPRESENTATIVE_INDEX[kind],
        modeEpoch: 9,
        issuedAtMs: 1_000,
      });
      expect(challenge.publicChallenge.kind).toBe(kind);
      expect(challenge.publicChallenge.candidates).toHaveLength(3);
      expect(JSON.stringify(challenge.publicChallenge)).not.toContain("correctCandidateId");
    }
  });

  it("uses the same authority loop and combat seam for every challenge family", () => {
    for (const kind of EXPECTED_KINDS) {
      const combat = new RecordingCombatPort();
      const runtime = new DuelModeRuntime(combat, "standard", 30);
      const authority = new ReflexAuthority(runtime, "practice", 10, 600);
      const publicChallenge = authority.issueChallenge({
        index: REPRESENTATIVE_INDEX[kind],
        nowMs: 2_000,
        durationMs: 20_000,
      });
      expect(publicChallenge.kind).toBe(kind);

      const privateTwin = createReviewedReflexChallenge({
        index: REPRESENTATIVE_INDEX[kind],
        modeEpoch: publicChallenge.modeEpoch,
        issuedAtMs: 2_000,
        durationMs: 20_000,
      });
      let sequence = 1;
      let feedback = "";
      for (const char of correctReflexToken(privateTwin)) {
        const result = authority.receive(
          "player-1",
          envelope(publicChallenge.modeEpoch, sequence++, char),
          2_100,
        );
        if (result.ok) feedback = result.feedback;
      }
      expect(feedback).toBe("correct");
      expect(combat.attacks).toHaveLength(1);
      expect(combat.attacks[0]?.sourcePlayerId).toBe("player-1");
    }
  });
});
