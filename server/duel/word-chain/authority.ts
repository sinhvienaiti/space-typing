import type { DuelPlayerId } from "../../../src/duel/model";
import {
  duelGameModeAllowedInChannel,
  type DuelMatchChannel,
} from "../../../src/duel/game-mode";
import {
  WORD_CHAIN_MAX_WORD_LENGTH,
  lastWordChainLetter,
  normalizeWordChainWord,
  parseWordChainModeInput,
  type WordChainPlayerPublicState,
  type WordChainPublicBeat,
} from "../../../src/duel/word-chain";
import { DuelModeRuntime } from "../mode-runtime";
import {
  isFrozenWordChainWord,
  legalWordChainMoves,
  wordChainContinuationCount,
} from "./lexicon";

const PLAYER_IDS: readonly DuelPlayerId[] = ["player-1", "player-2"];
const RESET_SEEDS: readonly (readonly [string, string])[] = [
  ["e", "r"],
  ["t", "n"],
  ["d", "g"],
  ["y", "w"],
];

type MutablePlayerBeatState = {
  buffer: string;
  acceptedWord: string | null;
  lastClientSequence: number;
};

type ActiveBeat = {
  publicBeat: WordChainPublicBeat;
  player: Record<DuelPlayerId, MutablePlayerBeatState>;
};

export type WordChainFeedback =
  | "editing"
  | "accepted"
  | "already-accepted"
  | "invalid-word"
  | "wrong-initial"
  | "already-used"
  | "unsafe-continuation"
  | "chain-reset";

export type WordChainAuthorityResult =
  | {
      ok: true;
      feedback: WordChainFeedback;
      beat: WordChainPublicBeat;
      player: WordChainPlayerPublicState;
    }
  | {
      ok: false;
      reason:
        | "no-beat"
        | "invalid-input"
        | "mode-mismatch"
        | "stale-mode-epoch"
        | "stale-sequence";
    };

function playerState(): MutablePlayerBeatState {
  return { buffer: "", acceptedWord: null, lastClientSequence: -1 };
}

function publicPlayerState(state: MutablePlayerBeatState): WordChainPlayerPublicState {
  return { buffer: state.buffer, accepted: state.acceptedWord !== null };
}

function cloneBeat(beat: WordChainPublicBeat): WordChainPublicBeat {
  return {
    ...beat,
    requiredInitial: { ...beat.requiredInitial },
    acceptedWord: { ...beat.acceptedWord },
    legalMoveCount: { ...beat.legalMoveCount },
  };
}

export class WordChainAuthority {
  private active: ActiveBeat | null = null;
  private readonly usedWords = new Set<string>();
  private beatSequence = 0;
  private resetCount = 0;

  constructor(
    private readonly modeRuntime: DuelModeRuntime,
    private readonly channel: DuelMatchChannel,
    private readonly beatDurationMs = 12_000,
    private readonly attackDamage = 10,
    private readonly attackTravelMs = 600,
  ) {
    if (!duelGameModeAllowedInChannel("word-chain", channel)) {
      throw new Error("Word Chain Ranked is gated off until Alternative Ranked requirements pass.");
    }
  }

  start(nowMs: number): WordChainPublicBeat {
    const mode = this.modeRuntime.switchMode("word-chain");
    this.usedWords.clear();
    this.resetCount = 0;
    this.beatSequence = 0;
    const seeds = RESET_SEEDS[0]!;
    this.active = this.createBeat(mode.modeEpoch, seeds, nowMs);
    return this.publicBeat();
  }

  publicBeat(): WordChainPublicBeat {
    if (this.active === null) throw new Error("No active Word Chain beat.");
    return cloneBeat(this.active.publicBeat);
  }

  reconnectSnapshot(playerId: DuelPlayerId): Readonly<{
    beat: WordChainPublicBeat | null;
    player: WordChainPlayerPublicState;
  }> {
    return {
      beat: this.active === null ? null : this.publicBeat(),
      player:
        this.active === null
          ? { buffer: "", accepted: false }
          : publicPlayerState(this.active.player[playerId]),
    };
  }

  acceptedHistory(): readonly string[] {
    return [...this.usedWords];
  }

  receive(
    playerId: DuelPlayerId,
    rawEnvelope: unknown,
    receivedAtMs: number,
  ): WordChainAuthorityResult {
    if (this.active === null) return { ok: false, reason: "no-beat" };
    if (receivedAtMs > this.active.publicBeat.deadlineAtMs) {
      this.resetChain(receivedAtMs);
      return this.success(playerId, "chain-reset");
    }

    const accepted = this.modeRuntime.acceptClientInput(rawEnvelope);
    if (!accepted.ok) return { ok: false, reason: accepted.reason };
    const state = this.active.player[playerId];
    if (accepted.input.clientSequence <= state.lastClientSequence) {
      return { ok: false, reason: "stale-sequence" };
    }
    state.lastClientSequence = accepted.input.clientSequence;

    const input = parseWordChainModeInput(accepted.input.payload);
    if (!input.ok) return { ok: false, reason: "invalid-input" };
    if (state.acceptedWord !== null) {
      return this.success(playerId, "already-accepted");
    }

    if (input.value.type === "TYPE_CHAR") {
      if (state.buffer.length < WORD_CHAIN_MAX_WORD_LENGTH) {
        state.buffer += input.value.char;
      }
      return this.success(playerId, "editing");
    }
    if (input.value.type === "BACKSPACE") {
      state.buffer = state.buffer.slice(0, -1);
      return this.success(playerId, "editing");
    }
    if (input.value.type === "CLEAR") {
      state.buffer = "";
      return this.success(playerId, "editing");
    }

    const word = normalizeWordChainWord(state.buffer);
    const required = this.active.publicBeat.requiredInitial[playerId];
    if (!isFrozenWordChainWord(word)) return this.success(playerId, "invalid-word");
    if (!word.startsWith(required)) return this.success(playerId, "wrong-initial");
    if (this.usedWords.has(word)) return this.success(playerId, "already-used");
    const legal = legalWordChainMoves(required, this.usedWords);
    if (!legal.includes(word)) return this.success(playerId, "unsafe-continuation");

    state.acceptedWord = word;
    state.buffer = word;
    this.usedWords.add(word);
    this.active.publicBeat = {
      ...this.active.publicBeat,
      acceptedWord: {
        ...this.active.publicBeat.acceptedWord,
        [playerId]: word,
      },
    };
    this.modeRuntime.scheduleServerAttack({
      modeEpoch: this.active.publicBeat.modeEpoch,
      attackId: `word-chain:${this.active.publicBeat.beatId}:${playerId}`,
      sourcePlayerId: playerId,
      damage: this.attackDamage,
      travelMs: this.attackTravelMs,
      presentation: "primary-cannon",
    });

    if (PLAYER_IDS.every((id) => this.active?.player[id].acceptedWord !== null)) {
      this.advanceCrossFedBeat(receivedAtMs);
    }
    return this.success(playerId, "accepted");
  }

  tick(nowMs: number): WordChainPublicBeat | null {
    if (this.active === null || nowMs <= this.active.publicBeat.deadlineAtMs) return null;
    this.resetChain(nowMs);
    return this.publicBeat();
  }

  private success(playerId: DuelPlayerId, feedback: WordChainFeedback): WordChainAuthorityResult {
    if (this.active === null) return { ok: false, reason: "no-beat" };
    return {
      ok: true,
      feedback,
      beat: this.publicBeat(),
      player: publicPlayerState(this.active.player[playerId]),
    };
  }

  private createBeat(
    modeEpoch: number,
    required: readonly [string, string],
    nowMs: number,
  ): ActiveBeat {
    this.beatSequence += 1;
    const issuedAtMs = Number.isFinite(nowMs) ? Math.max(0, Math.trunc(nowMs)) : 0;
    const duration = Math.max(2_000, Math.min(60_000, this.beatDurationMs));
    const requiredInitial = {
      "player-1": required[0],
      "player-2": required[1],
    } as const;
    return {
      publicBeat: {
        beatId: `chain:e${modeEpoch}:b${this.beatSequence}`,
        modeEpoch,
        requiredInitial,
        acceptedWord: { "player-1": null, "player-2": null },
        legalMoveCount: {
          "player-1": legalWordChainMoves(required[0], this.usedWords).length,
          "player-2": legalWordChainMoves(required[1], this.usedWords).length,
        },
        resetCount: this.resetCount,
        issuedAtMs,
        deadlineAtMs: issuedAtMs + duration,
      },
      player: {
        "player-1": playerState(),
        "player-2": playerState(),
      },
    };
  }

  private advanceCrossFedBeat(nowMs: number): void {
    if (this.active === null) return;
    const one = this.active.player["player-1"].acceptedWord;
    const two = this.active.player["player-2"].acceptedWord;
    if (one === null || two === null) return;

    const next: readonly [string, string] = [
      lastWordChainLetter(two),
      lastWordChainLetter(one),
    ];
    const exhausted =
      legalWordChainMoves(next[0], this.usedWords).length === 0 ||
      legalWordChainMoves(next[1], this.usedWords).length === 0;
    if (exhausted) {
      this.resetChain(nowMs);
      return;
    }
    this.active = this.createBeat(this.active.publicBeat.modeEpoch, next, nowMs);
  }

  private resetChain(nowMs: number): void {
    const epoch = this.active?.publicBeat.modeEpoch ?? this.modeRuntime.snapshot().modeEpoch;
    this.resetCount += 1;
    this.usedWords.clear();
    const seeds = RESET_SEEDS[this.resetCount % RESET_SEEDS.length]!;
    this.active = this.createBeat(epoch, seeds, nowMs);
  }
}

export function chooseWordChainBotWord(input: {
  requiredInitial: string;
  usedWords: ReadonlySet<string>;
}): string | null {
  const legal = legalWordChainMoves(input.requiredInitial, input.usedWords);
  if (legal.length === 0) return null;
  return [...legal].sort((left, right) => {
    const continuationDelta =
      wordChainContinuationCount(right, input.usedWords) -
      wordChainContinuationCount(left, input.usedWords);
    return continuationDelta || left.length - right.length || left.localeCompare(right);
  })[0] ?? null;
}
