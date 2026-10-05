import type { DuelPlayerId } from "../../../src/duel/model";
import {
  duelGameModeAllowedInChannel,
  type DuelMatchChannel,
} from "../../../src/duel/game-mode";
import {
  matchingReflexCandidates,
  normalizeReflexToken,
  parseReflexModeInput,
  type ReflexPlayerPublicState,
  type ReflexPublicChallenge,
} from "../../../src/duel/reflex";
import { DuelModeRuntime } from "../mode-runtime";
import {
  correctReflexToken,
  createReviewedReflexChallenge,
  type ReflexPrivateChallenge,
} from "./challenge-bank";

export type ReflexAuthorityFeedback =
  | "accepted-char"
  | "edited"
  | "physical-typing-wrong"
  | "semantic-wrong"
  | "correct"
  | "timeout"
  | "already-completed";

export type ReflexAuthorityResult =
  | {
      ok: true;
      feedback: ReflexAuthorityFeedback;
      state: ReflexPlayerPublicState;
    }
  | {
      ok: false;
      reason:
        | "no-challenge"
        | "invalid-input"
        | "mode-mismatch"
        | "stale-mode-epoch"
        | "stale-sequence";
    };

type MutablePlayerState = {
  buffer: string;
  physicalTypingMistakes: number;
  semanticMistakes: number;
  retries: number;
  completed: boolean;
  lastClientSequence: number;
};

function freshPlayerState(): MutablePlayerState {
  return {
    buffer: "",
    physicalTypingMistakes: 0,
    semanticMistakes: 0,
    retries: 0,
    completed: false,
    lastClientSequence: -1,
  };
}

function publicState(state: MutablePlayerState): ReflexPlayerPublicState {
  return {
    buffer: state.buffer,
    physicalTypingMistakes: state.physicalTypingMistakes,
    semanticMistakes: state.semanticMistakes,
    retries: state.retries,
    completed: state.completed,
    lastAcceptedSequence: state.lastClientSequence,
  };
}

export class ReflexAuthority {
  private challenge: ReflexPrivateChallenge | null = null;
  private challengeSequence = 0;
  private readonly players: Record<DuelPlayerId, MutablePlayerState> = {
    "player-1": freshPlayerState(),
    "player-2": freshPlayerState(),
  };

  constructor(
    private readonly modeRuntime: DuelModeRuntime,
    private readonly channel: DuelMatchChannel,
    private readonly attackDamage = 8,
    private readonly attackTravelMs = 600,
  ) {
    if (!duelGameModeAllowedInChannel("reflex", channel)) {
      throw new Error("Reflex Ranked is gated off until Alternative Ranked requirements pass.");
    }
  }

  issueChallenge(input: {
    index: number;
    nowMs: number;
    durationMs?: number;
  }): ReflexPublicChallenge {
    const mode = this.modeRuntime.switchMode("reflex");
    const source = createReviewedReflexChallenge({
      index: input.index,
      modeEpoch: mode.modeEpoch,
      issuedAtMs: input.nowMs,
      durationMs: input.durationMs,
    });
    this.challengeSequence += 1;
    const challengeId = `${source.publicChallenge.challengeId}:e${mode.modeEpoch}:q${this.challengeSequence}`;
    this.challenge = {
      ...source,
      publicChallenge: {
        ...source.publicChallenge,
        challengeId,
      },
    };
    this.players["player-1"] = freshPlayerState();
    this.players["player-2"] = freshPlayerState();
    return this.publicChallenge();
  }

  publicChallenge(): ReflexPublicChallenge {
    if (this.challenge === null) throw new Error("No active Reflex challenge.");
    return {
      ...this.challenge.publicChallenge,
      candidates: this.challenge.publicChallenge.candidates.map((candidate) => ({
        ...candidate,
      })),
    };
  }

  reconnectSnapshot(playerId: DuelPlayerId): Readonly<{
    challenge: ReflexPublicChallenge | null;
    player: ReflexPlayerPublicState;
  }> {
    return {
      challenge: this.challenge === null ? null : this.publicChallenge(),
      player: publicState(this.players[playerId]),
    };
  }

  receive(
    playerId: DuelPlayerId,
    rawEnvelope: unknown,
    receivedAtMs: number,
  ): ReflexAuthorityResult {
    if (this.challenge === null) return { ok: false, reason: "no-challenge" };
    const accepted = this.modeRuntime.acceptClientInput(rawEnvelope);
    if (!accepted.ok) return { ok: false, reason: accepted.reason };
    const envelope = accepted.input;
    const state = this.players[playerId];
    if (envelope.clientSequence <= state.lastClientSequence) {
      return { ok: false, reason: "stale-sequence" };
    }
    state.lastClientSequence = envelope.clientSequence;

    const input = parseReflexModeInput(envelope.payload);
    if (!input.ok) return { ok: false, reason: "invalid-input" };
    if (state.completed) {
      return { ok: true, feedback: "already-completed", state: publicState(state) };
    }
    if (receivedAtMs > this.challenge.publicChallenge.deadlineAtMs) {
      state.buffer = "";
      return { ok: true, feedback: "timeout", state: publicState(state) };
    }

    if (input.value.type === "BACKSPACE") {
      state.buffer = state.buffer.slice(0, -1);
      return { ok: true, feedback: "edited", state: publicState(state) };
    }
    if (input.value.type === "CLEAR") {
      state.buffer = "";
      return { ok: true, feedback: "edited", state: publicState(state) };
    }

    const nextBuffer = state.buffer + input.value.char;
    const candidates = matchingReflexCandidates(
      nextBuffer,
      this.challenge.publicChallenge.candidates,
    );
    if (candidates.length === 0) {
      state.physicalTypingMistakes += 1;
      return {
        ok: true,
        feedback: "physical-typing-wrong",
        state: publicState(state),
      };
    }

    state.buffer = nextBuffer;
    const completedCandidate = candidates.find(
      (candidate) => normalizeReflexToken(candidate.token) === nextBuffer,
    );
    if (completedCandidate === undefined) {
      return { ok: true, feedback: "accepted-char", state: publicState(state) };
    }

    if (completedCandidate.candidateId !== this.challenge.correctCandidateId) {
      state.semanticMistakes += 1;
      state.retries += 1;
      state.buffer = "";
      return { ok: true, feedback: "semantic-wrong", state: publicState(state) };
    }

    state.completed = true;
    state.buffer = correctReflexToken(this.challenge);
    const scheduled = this.modeRuntime.scheduleServerAttack({
      modeEpoch: this.challenge.publicChallenge.modeEpoch,
      attackId: `reflex:${this.challenge.publicChallenge.challengeId}:${playerId}`,
      sourcePlayerId: playerId,
      damage: this.attackDamage,
      travelMs: this.attackTravelMs,
      presentation: "primary-cannon",
    });
    if (!scheduled.ok) {
      state.completed = false;
      return { ok: false, reason: "stale-mode-epoch" };
    }
    return { ok: true, feedback: "correct", state: publicState(state) };
  }
}

export function chooseReflexBotCandidate(input: {
  challenge: ReflexPrivateChallenge;
  semanticAccuracy: number;
  semanticRoll: number;
  wrongChoiceRoll: number;
}): string {
  const semanticAccuracy = Number.isFinite(input.semanticAccuracy)
    ? Math.max(0, Math.min(1, input.semanticAccuracy))
    : 0.5;
  const semanticRoll = Number.isFinite(input.semanticRoll)
    ? Math.max(0, Math.min(0.999999, input.semanticRoll))
    : 0.5;
  if (semanticRoll < semanticAccuracy) return input.challenge.correctCandidateId;

  const wrong = input.challenge.publicChallenge.candidates.filter(
    (candidate) => candidate.candidateId !== input.challenge.correctCandidateId,
  );
  const roll = Number.isFinite(input.wrongChoiceRoll)
    ? Math.max(0, Math.min(0.999999, input.wrongChoiceRoll))
    : 0;
  return wrong[Math.floor(roll * wrong.length)]?.candidateId ?? input.challenge.correctCandidateId;
}
