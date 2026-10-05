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
    this.reflexChallengeIndex = Math.max(
      0,
      Math.trunc(input.challengeIndex ?? 0),
    );
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
   * Server bot helper. It intentionally feeds the same public mode envelope
   * accepted from a human client. It never calls the combat port or engine.
   */
  runBotTurn(
    playerId: DuelPlayerId,
    nowMs: number,
  ): readonly DuelEngineEvent[] {
    const token =
      this.reflex !== null
        ? this.reflexBotToken
        : this.chooseWordChainBotToken(playerId);
    if (token === null || token.length === 0) return [];

    const events: DuelEngineEvent[] = [];
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
