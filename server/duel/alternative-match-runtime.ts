import type {
  DuelEngine,
  DuelEngineEvent,
} from "../../src/duel/engine";
import type {
  DuelGameMode,
  DuelMatchChannel,
  DuelModeInputEnvelope,
} from "../../src/duel/game-mode";
import type { DuelPlayerId } from "../../src/duel/model";
import type {
  ReflexPlayerPublicState,
  ReflexPublicChallenge,
} from "../../src/duel/reflex";
import type {
  WordChainPlayerPublicState,
  WordChainPublicBeat,
} from "../../src/duel/word-chain";
import { DuelModeEngineCombatPort } from "./mode-engine-port";
import { DuelModeRuntime } from "./mode-runtime";
import {
  ReflexAuthority,
  type ReflexAuthorityFeedback,
} from "./reflex/authority";
import {
  correctReflexToken,
  createReviewedReflexChallenge,
} from "./reflex/challenge-bank";
import {
  WordChainAuthority,
  chooseWordChainBotWord,
  type WordChainFeedback,
} from "./word-chain/authority";

export type AlternativeDuelGameMode = Exclude<DuelGameMode, "standard">;

export type AlternativeMatchPlayerView =
  | Readonly<{
      gameMode: "reflex";
      modeEpoch: number;
      challenge: ReflexPublicChallenge | null;
      player: ReflexPlayerPublicState;
    }>
  | Readonly<{
      gameMode: "word-chain";
      modeEpoch: number;
      beat: WordChainPublicBeat | null;
      player: WordChainPlayerPublicState;
    }>;

export type AlternativeModeFeedback =
  | ReflexAuthorityFeedback
  | WordChainFeedback;

export type AlternativeModeReceiveResult =
  | Readonly<{
      ok: true;
      feedback: AlternativeModeFeedback;
      view: AlternativeMatchPlayerView;
      combatEvents: readonly DuelEngineEvent[];
    }>
  | Readonly<{
      ok: false;
      reason: string;
      combatEvents: readonly DuelEngineEvent[];
    }>;

export type AlternativeModeTickResult = Readonly<{
  stateChanged: boolean;
  combatEvents: readonly DuelEngineEvent[];
}>;

const PLAYER_IDS: readonly DuelPlayerId[] = ["player-1", "player-2"];

function deterministicUnit(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash / 4294967296;
}

/**
 * One server-owned runtime per live alternative Duel match/round.
 *
 * It deliberately owns no duplicate battlefield state: shield, hull, KO and
 * projectile presentation stay in DuelEngine. The mode authorities only own
 * challenge/input state and schedule attacks through DuelModeEngineCombatPort.
 */
export class AlternativeMatchRuntime {
  private readonly combat: DuelModeEngineCombatPort;
  private readonly modeRuntime: DuelModeRuntime;
  private readonly reflex: ReflexAuthority | null;
  private readonly wordChain: WordChainAuthority | null;
  private reflexChallengeIndex: number;
  private reflexBotToken: string | null = null;
  private readonly botSequence: Record<DuelPlayerId, number> = {
    "player-1": 0,
    "player-2": 0,
  };
  private readonly botAttemptSequence: Record<DuelPlayerId, number> = {
    "player-1": 0,
    "player-2": 0,
  };

  constructor(
    engine: DuelEngine,
    readonly gameMode: AlternativeDuelGameMode,
    readonly channel: DuelMatchChannel,
    input: Readonly<{
      nowMs: number;
      challengeIndex?: number;
      reflexDurationMs?: number;
      wordChainBeatDurationMs?: number;
      attackTravelMs?: number;
    }>,
  ) {
    this.combat = new DuelModeEngineCombatPort(engine);
    this.modeRuntime = new DuelModeRuntime(this.combat);
    this.reflexChallengeIndex =
      typeof input.challengeIndex === "number" && Number.isFinite(input.challengeIndex)
        ? Math.max(0, Math.trunc(input.challengeIndex))
        : 0;
    const travelMs = input.attackTravelMs ?? 600;

    if (gameMode === "reflex") {
      this.reflex = new ReflexAuthority(
        this.modeRuntime,
        channel,
        8,
        travelMs,
      );
      this.wordChain = null;
      this.issueReflexChallenge(
        input.nowMs,
        input.reflexDurationMs,
      );
    } else {
      this.reflex = null;
      this.wordChain = new WordChainAuthority(
        this.modeRuntime,
        channel,
        input.wordChainBeatDurationMs ?? 12_000,
        10,
        travelMs,
      );
      this.combat.setAuthorityClock(input.nowMs);
      this.wordChain.start(input.nowMs);
    }
  }

  modeSnapshot(): Readonly<{
    gameMode: AlternativeDuelGameMode;
    modeEpoch: number;
  }> {
    const snapshot = this.modeRuntime.snapshot();
    return {
      gameMode: this.gameMode,
      modeEpoch: snapshot.modeEpoch,
    };
  }

  reconnectSnapshot(playerId: DuelPlayerId): AlternativeMatchPlayerView {
    if (this.reflex !== null) {
      const snapshot = this.reflex.reconnectSnapshot(playerId);
      return {
        gameMode: "reflex",
        modeEpoch: this.modeRuntime.snapshot().modeEpoch,
        challenge: snapshot.challenge,
        player: snapshot.player,
      };
    }
    const snapshot = this.wordChain!.reconnectSnapshot(playerId);
    return {
      gameMode: "word-chain",
      modeEpoch: this.modeRuntime.snapshot().modeEpoch,
      beat: snapshot.beat,
      player: snapshot.player,
    };
  }

  receive(
    playerId: DuelPlayerId,
    envelope: unknown,
    receivedAtMs: number,
  ): AlternativeModeReceiveResult {
    this.combat.setAuthorityClock(receivedAtMs);
    const result =
      this.reflex !== null
        ? this.reflex.receive(playerId, envelope, receivedAtMs)
        : this.wordChain!.receive(playerId, envelope, receivedAtMs);
    const combatEvents = this.combat.drainEvents();
    if (!result.ok) {
      return {
        ok: false,
        reason: result.reason,
        combatEvents,
      };
    }
    return {
      ok: true,
      feedback: result.feedback,
      view: this.reconnectSnapshot(playerId),
      combatEvents,
    };
  }

  tick(nowMs: number): AlternativeModeTickResult {
    let stateChanged = false;

    if (this.reflex !== null) {
      const challenge = this.reflex.publicChallenge();
      const bothCompleted = PLAYER_IDS.every(
        (playerId) =>
          this.reflex!.reconnectSnapshot(playerId).player.completed,
      );
      if (bothCompleted || nowMs > challenge.deadlineAtMs) {
        this.reflexChallengeIndex += 1;
        this.issueReflexChallenge(nowMs);
        stateChanged = true;
      }
    } else if (this.wordChain!.tick(nowMs) !== null) {
      stateChanged = true;
    }

    return {
      stateChanged,
      combatEvents: this.combat.advanceAuthorityClock(nowMs),
    };
  }

  /**
   * Completion delay for a server bot. The room's WPM now affects alternative
   * modes too: one word is estimated with the conventional 5 chars/word.
   * Reaction time stays additive and bounded by the normalized room config.
   */
  botTurnDelayMs(
    playerId: DuelPlayerId,
    wpm: number,
    reactionMs: number,
  ): number {
    const token = this.reflex !== null
      ? this.reflexBotToken
      : this.chooseWordChainBotToken(playerId);
    const chars = Math.max(1, token?.length ?? 1);
    const safeWpm = Math.max(10, Math.min(300, Number.isFinite(wpm) ? wpm : 60));
    const safeReaction = Math.max(
      0,
      Math.min(3000, Number.isFinite(reactionMs) ? reactionMs : 250),
    );
    return Math.round(safeReaction + (chars * 12_000) / safeWpm);
  }

  /**
   * Server bot helper. It intentionally feeds the same public mode envelope
   * accepted from a human client. It never calls the combat port or engine.
   * Accuracy is modeled as a failed typing/submission attempt followed by a
   * later retry, instead of silently scaling damage.
   */
  runBotTurn(
    playerId: DuelPlayerId,
    nowMs: number,
    accuracy = 1,
  ): readonly DuelEngineEvent[] {
    const current = this.reconnectSnapshot(playerId);
    if (
      (current.gameMode === "reflex" && current.player.completed) ||
      (current.gameMode === "word-chain" && current.player.accepted)
    ) {
      return [];
    }
    const token =
      this.reflex !== null
        ? this.reflexBotToken
        : this.chooseWordChainBotToken(playerId);
    if (token === null || token.length === 0) return [];

    const safeAccuracy = Math.max(
      0,
      Math.min(1, Number.isFinite(accuracy) ? accuracy : 0.95),
    );
    const attempt = ++this.botAttemptSequence[playerId];
    const roll = deterministicUnit(
      this.gameMode + ":" + this.modeRuntime.snapshot().modeEpoch + ":" + playerId + ":" + attempt,
    );
    const events: DuelEngineEvent[] = [];

    if (roll >= safeAccuracy) {
      if (this.reflex !== null) {
        const challenge = current.gameMode === "reflex" ? current.challenge : null;
        const starts = new Set(
          challenge?.candidates.map((candidate) => candidate.token.slice(0, 1)) ?? [],
        );
        const wrongChar = "abcdefghijklmnopqrstuvwxyz"
          .split("")
          .find((char) => !starts.has(char)) ?? "z";
        const result = this.receive(
          playerId,
          this.botEnvelope(playerId, { type: "TYPE_CHAR", char: wrongChar }),
          nowMs,
        );
        events.push(...result.combatEvents);
        return events;
      }

      const beat = current.gameMode === "word-chain" ? current.beat : null;
      const required = beat?.requiredInitial[playerId] ?? "a";
      const wrongChar = required === "z" ? "a" : "z";
      for (const payload of [
        { type: "CLEAR" },
        { type: "TYPE_CHAR", char: wrongChar },
        { type: "SUBMIT" },
      ]) {
        const result = this.receive(
          playerId,
          this.botEnvelope(playerId, payload),
          nowMs,
        );
        events.push(...result.combatEvents);
        if (!result.ok) return events;
      }
      return events;
    }

    if (this.wordChain !== null) {
      const cleared = this.receive(
        playerId,
        this.botEnvelope(playerId, { type: "CLEAR" }),
        nowMs,
      );
      events.push(...cleared.combatEvents);
      if (!cleared.ok) return events;
    }

    for (const char of token) {
      const result = this.receive(
        playerId,
        this.botEnvelope(playerId, { type: "TYPE_CHAR", char }),
        nowMs,
      );
      events.push(...result.combatEvents);
      if (!result.ok) return events;
    }

    if (this.wordChain !== null) {
      const result = this.receive(
        playerId,
        this.botEnvelope(playerId, { type: "SUBMIT" }),
        nowMs,
      );
      events.push(...result.combatEvents);
    }
    return events;
  }

  dispose(): void {
    this.combat.clear();
  }

  private issueReflexChallenge(
    nowMs: number,
    durationMs?: number,
  ): void {
    if (this.reflex === null) return;
    this.combat.setAuthorityClock(nowMs);
    const challenge = this.reflex.issueChallenge({
      index: this.reflexChallengeIndex,
      nowMs,
      ...(durationMs === undefined ? {} : { durationMs }),
    });

    // Bot-only answer material is recreated inside the server module and never
    // becomes part of reconnect/public snapshots.
    const privateChallenge = createReviewedReflexChallenge({
      index: this.reflexChallengeIndex,
      modeEpoch: challenge.modeEpoch,
      issuedAtMs: nowMs,
      ...(durationMs === undefined ? {} : { durationMs }),
    });
    this.reflexBotToken = correctReflexToken(privateChallenge);
  }

  private chooseWordChainBotToken(
    playerId: DuelPlayerId,
  ): string | null {
    if (this.wordChain === null) return null;
    const beat = this.wordChain.publicBeat();
    return chooseWordChainBotWord({
      requiredInitial: beat.requiredInitial[playerId],
      usedWords: new Set(this.wordChain.acceptedHistory()),
    });
  }

  private botEnvelope(
    playerId: DuelPlayerId,
    payload: unknown,
  ): DuelModeInputEnvelope {
    const sequence = ++this.botSequence[playerId];
    const mode = this.modeRuntime.snapshot();
    return {
      gameMode: this.gameMode,
      modeEpoch: mode.modeEpoch,
      inputId: `bot:${playerId}:${sequence}`,
      clientSequence: sequence,
      kind: "mode-input",
      payload,
    };
  }
}
