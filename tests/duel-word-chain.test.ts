import { describe, expect, it } from "vitest";
import { DuelModeRuntime, type DuelModeAttack, type DuelModeCombatPort } from "../server/duel/mode-runtime";
import {
  WORD_CHAIN_LEXICON_VERSION,
  legalWordChainMoves,
  validateWordChainLexicon,
} from "../server/duel/word-chain/lexicon";
import {
  WordChainAuthority,
  chooseWordChainBotWord,
} from "../server/duel/word-chain/authority";

class RecordingCombatPort implements DuelModeCombatPort {
  readonly attacks: DuelModeAttack[] = [];
  scheduleModeAttack(attack: DuelModeAttack): void {
    this.attacks.push({ ...attack });
  }
}

function envelope(modeEpoch: number, sequence: number, payload: unknown) {
  return {
    gameMode: "word-chain",
    modeEpoch,
    inputId: `chain-${sequence}`,
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
      envelope(modeEpoch, sequence++, { type: "TYPE_CHAR", char }),
      nowMs,
    );
    expect(result.ok).toBe(true);
  }
  return sequence;
}

describe("Word Chain authoritative mode", () => {
  it("freezes a statically continuation-safe lexicon", () => {
    expect(WORD_CHAIN_LEXICON_VERSION).toBe("word-chain-pilot-v1");
    expect(validateWordChainLexicon()).toEqual([]);
    expect(legalWordChainMoves("m", new Set(["cloud"]))).toEqual([]);
  });

  it("cross-feeds simultaneous accepted words into the next beat", () => {
    const combat = new RecordingCombatPort();
    const authority = new WordChainAuthority(
      new DuelModeRuntime(combat, "standard", 4),
      "friend",
      12_000,
      10,
      600,
    );
    const first = authority.start(1_000);
    expect(first.requiredInitial).toEqual({ "player-1": "e", "player-2": "r" });
    expect(first.modeEpoch).toBe(5);

    let oneSeq = typeWord(authority, "player-1", 5, 1, "earth", 1_100);
    const acceptedOne = authority.receive(
      "player-1",
      envelope(5, oneSeq++, { type: "SUBMIT" }),
      1_100,
    );
    expect(acceptedOne).toMatchObject({ ok: true, feedback: "accepted" });
    const duplicate = authority.receive(
      "player-1",
      envelope(5, oneSeq++, { type: "TYPE_CHAR", char: "x" }),
      1_101,
    );
    expect(duplicate).toMatchObject({ ok: true, feedback: "already-accepted" });

    let twoSeq = typeWord(authority, "player-2", 5, 1, "river", 1_200);
    const acceptedTwo = authority.receive(
      "player-2",
      envelope(5, twoSeq++, { type: "SUBMIT" }),
      1_200,
    );
    expect(acceptedTwo).toMatchObject({ ok: true, feedback: "accepted" });

    const next = authority.publicBeat();
    expect(next.beatId).not.toBe(first.beatId);
    expect(next.requiredInitial).toEqual({
      "player-1": "r",
      "player-2": "h",
    });
    expect(combat.attacks).toHaveLength(2);
    expect(combat.attacks.every((attack) => attack.modeEpoch === 5)).toBe(true);
  });

  it("keeps Backspace/Clear as editing operations instead of typing mistakes", () => {
    const authority = new WordChainAuthority(
      new DuelModeRuntime(new RecordingCombatPort(), "standard", 1),
      "practice",
    );
    const beat = authority.start(10_000);
    authority.receive(
      "player-1",
      envelope(beat.modeEpoch, 1, { type: "TYPE_CHAR", char: "e" }),
      10_100,
    );
    authority.receive(
      "player-1",
      envelope(beat.modeEpoch, 2, { type: "TYPE_CHAR", char: "x" }),
      10_100,
    );
    const backspace = authority.receive(
      "player-1",
      envelope(beat.modeEpoch, 3, { type: "BACKSPACE" }),
      10_100,
    );
    expect(backspace).toMatchObject({ ok: true, feedback: "editing", player: { buffer: "e" } });
    const clear = authority.receive(
      "player-1",
      envelope(beat.modeEpoch, 4, { type: "CLEAR" }),
      10_100,
    );
    expect(clear).toMatchObject({ ok: true, feedback: "editing", player: { buffer: "" } });
  });

  it("performs deterministic CHAIN RESET on timeout", () => {
    const authority = new WordChainAuthority(
      new DuelModeRuntime(new RecordingCombatPort(), "standard", 9),
      "practice",
      2_000,
    );
    const first = authority.start(1_000);
    expect(first.resetCount).toBe(0);
    const reset = authority.tick(first.deadlineAtMs + 1);
    expect(reset).not.toBeNull();
    expect(reset?.resetCount).toBe(1);
    expect(reset?.requiredInitial).toEqual({ "player-1": "t", "player-2": "n" });
  });

  it("restores only public beat plus the reconnecting player's private buffer", () => {
    const authority = new WordChainAuthority(
      new DuelModeRuntime(new RecordingCombatPort(), "standard", 2),
      "friend",
    );
    const beat = authority.start(100);
    authority.receive(
      "player-1",
      envelope(beat.modeEpoch, 1, { type: "TYPE_CHAR", char: "e" }),
      200,
    );
    authority.receive(
      "player-1",
      envelope(beat.modeEpoch, 2, { type: "TYPE_CHAR", char: "a" }),
      200,
    );
    const rival = authority.reconnectSnapshot("player-2");
    expect(rival.player.buffer).toBe("");
    expect(JSON.stringify(rival.beat)).not.toContain("\"buffer\"");
    expect(JSON.stringify(rival)).not.toContain("\"ea\"");
  });

  it("lets the Bot choose from public chain requirements without rival buffer state", () => {
    const used = new Set<string>(["earth"]);
    const word = chooseWordChainBotWord({ requiredInitial: "r", usedWords: used });
    expect(word).not.toBeNull();
    expect(word?.startsWith("r")).toBe(true);
    expect(used.has(word ?? "")).toBe(false);
  });

  it("keeps Word Chain Ranked gated off", () => {
    expect(
      () =>
        new WordChainAuthority(
          new DuelModeRuntime(new RecordingCombatPort(), "standard", 1),
          "ranked",
        ),
    ).toThrow(/Ranked is gated off/);
  });
});
