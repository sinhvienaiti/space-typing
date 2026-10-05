import { describe, expect, it } from "vitest";
import {
  DuelModeRuntime,
  type DuelModeAttack,
  type DuelModeCombatPort,
} from "../server/duel/mode-runtime";
import { ReflexAuthority } from "../server/duel/reflex/authority";
import { WordChainAuthority } from "../server/duel/word-chain/authority";

class RecordingCombatPort implements DuelModeCombatPort {
  readonly attacks: DuelModeAttack[] = [];

  scheduleModeAttack(attack: DuelModeAttack): void {
    this.attacks.push({ ...attack });
  }
}

function reflexEnvelope(modeEpoch: number, sequence: number, char: string) {
  return {
    gameMode: "reflex",
    modeEpoch,
    inputId: `reflex-${modeEpoch}-${sequence}`,
    clientSequence: sequence,
    kind: "mode-input",
    payload: { type: "TYPE_CHAR", char },
  } as const;
}

function wordChainEnvelope(
  modeEpoch: number,
  sequence: number,
  payload: unknown,
) {
  return {
    gameMode: "word-chain",
    modeEpoch,
    inputId: `word-chain-${modeEpoch}-${sequence}`,
    clientSequence: sequence,
    kind: "mode-input",
    payload,
  } as const;
}

function typeWord(
  authority: WordChainAuthority,
  playerId: "player-1" | "player-2",
  modeEpoch: number,
  startSequence: number,
  word: string,
  nowMs: number,
): number {
  let sequence = startSequence;
  for (const char of word) {
    const result = authority.receive(
      playerId,
      wordChainEnvelope(modeEpoch, sequence++, {
        type: "TYPE_CHAR",
        char,
      }),
      nowMs,
    );
    expect(result.ok).toBe(true);
  }
  return sequence;
}

describe("alternative Duel epoch isolation", () => {
  it("rotates Reflex epoch per challenge and rejects a delayed packet from the previous challenge", () => {
    const authority = new ReflexAuthority(
      new DuelModeRuntime(new RecordingCombatPort(), "standard", 1),
      "friend",
    );
    const first = authority.issueChallenge({
      index: 0,
      nowMs: 1_000,
      durationMs: 20_000,
    });
    const second = authority.issueChallenge({
      index: 1,
      nowMs: 2_000,
      durationMs: 20_000,
    });

    expect(second.modeEpoch).toBe(first.modeEpoch + 1);
    expect(
      authority.receive(
        "player-1",
        reflexEnvelope(first.modeEpoch, 99, "c"),
        2_100,
      ),
    ).toEqual({ ok: false, reason: "stale-mode-epoch" });
    expect(authority.reconnectSnapshot("player-1").player).toMatchObject({
      buffer: "",
      physicalTypingMistakes: 0,
      semanticMistakes: 0,
      completed: false,
      lastAcceptedSequence: -1,
    });
  });

  it("rotates Word Chain epoch on timeout reset and rejects a delayed packet from the expired beat", () => {
    const authority = new WordChainAuthority(
      new DuelModeRuntime(new RecordingCombatPort(), "standard", 10),
      "practice",
      2_000,
    );
    const first = authority.start(1_000);
    const reset = authority.tick(first.deadlineAtMs + 1);

    expect(reset).not.toBeNull();
    expect(reset?.modeEpoch).toBe(first.modeEpoch + 1);
    expect(
      authority.receive(
        "player-1",
        wordChainEnvelope(first.modeEpoch, 50, {
          type: "TYPE_CHAR",
          char: "e",
        }),
        first.deadlineAtMs + 2,
      ),
    ).toEqual({ ok: false, reason: "stale-mode-epoch" });
    expect(authority.reconnectSnapshot("player-1").player).toMatchObject({
      buffer: "",
      accepted: false,
      lastAcceptedSequence: -1,
    });
  });

  it("rotates Word Chain epoch when both players advance a cross-fed beat", () => {
    const authority = new WordChainAuthority(
      new DuelModeRuntime(new RecordingCombatPort(), "standard", 20),
      "friend",
    );
    const first = authority.start(5_000);

    let oneSequence = typeWord(
      authority,
      "player-1",
      first.modeEpoch,
      1,
      "earth",
      5_100,
    );
    expect(
      authority.receive(
        "player-1",
        wordChainEnvelope(first.modeEpoch, oneSequence++, { type: "SUBMIT" }),
        5_100,
      ),
    ).toMatchObject({ ok: true, feedback: "accepted" });

    let twoSequence = typeWord(
      authority,
      "player-2",
      first.modeEpoch,
      1,
      "river",
      5_200,
    );
    expect(
      authority.receive(
        "player-2",
        wordChainEnvelope(first.modeEpoch, twoSequence++, { type: "SUBMIT" }),
        5_200,
      ),
    ).toMatchObject({ ok: true, feedback: "accepted" });

    const next = authority.publicBeat();
    expect(next.modeEpoch).toBe(first.modeEpoch + 1);
    expect(next.beatId).not.toBe(first.beatId);
    expect(
      authority.receive(
        "player-1",
        wordChainEnvelope(first.modeEpoch, 100, {
          type: "TYPE_CHAR",
          char: next.requiredInitial["player-1"],
        }),
        5_300,
      ),
    ).toEqual({ ok: false, reason: "stale-mode-epoch" });
  });
});
