import fs from "node:fs";

function edit(path, transforms) {
  let text = fs.readFileSync(path, "utf8");
  for (const [before, after, label] of transforms) {
    const count = text.split(before).length - 1;
    if (count !== 1) {
      throw new Error(`${path}: expected exactly one ${label}, found ${count}`);
    }
    text = text.replace(before, after);
  }
  fs.writeFileSync(path, text);
}

edit("src/duel/reflex.ts", [[
`export type ReflexPlayerPublicState = Readonly<{
  buffer: string;
  physicalTypingMistakes: number;
  semanticMistakes: number;
  retries: number;
  completed: boolean;
}>;`,
`export type ReflexPlayerPublicState = Readonly<{
  buffer: string;
  physicalTypingMistakes: number;
  semanticMistakes: number;
  retries: number;
  completed: boolean;
  /** Sequence floor a reconnecting client must continue above. */
  lastAcceptedSequence: number;
}>;`,
"Reflex public sequence field"
]]);

edit("server/duel/reflex/authority.ts", [[
`    retries: state.retries,
    completed: state.completed,
  };`,
`    retries: state.retries,
    completed: state.completed,
    lastAcceptedSequence: state.lastClientSequence,
  };`,
"Reflex public sequence projection"
]]);

edit("src/duel/word-chain.ts", [[
`export type WordChainPlayerPublicState = Readonly<{
  buffer: string;
  accepted: boolean;
  lastAcceptedWord: string | null;
  physicalTypingMistakes: number;
  semanticMistakes: number;
}>;`,
`export type WordChainPlayerPublicState = Readonly<{
  buffer: string;
  accepted: boolean;
  lastAcceptedWord: string | null;
  physicalTypingMistakes: number;
  semanticMistakes: number;
  /** Sequence floor a reconnecting client must continue above. */
  lastAcceptedSequence: number;
}>;`,
"Word Chain public sequence field"
]]);

edit("server/duel/word-chain/authority.ts", [[
`    physicalTypingMistakes: state.physicalTypingMistakes,
    semanticMistakes: state.semanticMistakes,
  };`,
`    physicalTypingMistakes: state.physicalTypingMistakes,
    semanticMistakes: state.semanticMistakes,
    lastAcceptedSequence: state.lastClientSequence,
  };`,
"Word Chain public sequence projection"
]]);

edit("src/duel/protocol.ts", [
[
`import type { DuelMapId } from "./maps";`,
`import type { DuelMapId } from "./maps";
import {
  isDuelGameMode,
  parseDuelModeInputEnvelope,
  type DuelGameMode,
  type DuelModeInputEnvelope,
} from "./game-mode";
import type { DuelAlternativeModePlayerView } from "./alternative-mode-view";`,
"protocol mode imports"
],
[
`// V7: 5 s round break, slower cannon/attack flight. Restart the Duel server.
export const DUEL_PROTOCOL_VERSION = 7;`,
`// V8: authoritative alternative Duel mode input/state. Restart the Duel server.
export const DUEL_PROTOCOL_VERSION = 8;`,
"protocol version"
],
[
`  | {
      type: "START_MATCH";
      requestId: string;
      roomId: string;
    }
  | {
      type: "QUEUE_RANKED";`,
`  | {
      type: "START_MATCH";
      requestId: string;
      roomId: string;
      /** Omitted by V7-era callers; authority defaults to Standard. */
      gameMode?: DuelGameMode;
    }
  | {
      type: "QUEUE_RANKED";`,
"START_MATCH game mode"
],
[
`  | {
      type: "INTENT";
      matchId: string;
      roundId: string;
      sequence: number;
      intent: DuelWireIntent;
    }
  | {
      type: "PONG";`,
`  | {
      type: "INTENT";
      matchId: string;
      roundId: string;
      sequence: number;
      intent: DuelWireIntent;
    }
  | {
      type: "MODE_INPUT";
      matchId: string;
      roundId: string;
      envelope: DuelModeInputEnvelope;
    }
  | {
      type: "PONG";`,
"MODE_INPUT client message"
],
[
`  | {
      type: "MATCH_UPDATE";
      matchId: string;
      roundId: string;
      serverSequence: number;
      events: readonly unknown[];
      snapshot: unknown;
    }
  | {
      type: "ROOM_CLOSED";`,
`  | {
      type: "MATCH_UPDATE";
      matchId: string;
      roundId: string;
      serverSequence: number;
      events: readonly unknown[];
      snapshot: unknown;
    }
  | {
      /** Player-scoped; never broadcast a rival private buffer. */
      type: "MODE_STATE";
      matchId: string;
      roundId: string;
      view: DuelAlternativeModePlayerView;
    }
  | {
      type: "ROOM_CLOSED";`,
"MODE_STATE server message"
],
[
`    case "REMOVE_BOT":
    case "START_MATCH": {
      if (!exactKeys(value, ["type", "requestId", "roomId"])) {
        return null;
      }
      const requestId = stringField(value, "requestId", 64);
      const roomId = stringField(value, "roomId", 32);
      return requestId === null || roomId === null
        ? null
        : { type, requestId, roomId };
    }
    case "QUEUE_RANKED": {`,
`    case "REMOVE_BOT": {
      if (!exactKeys(value, ["type", "requestId", "roomId"])) {
        return null;
      }
      const requestId = stringField(value, "requestId", 64);
      const roomId = stringField(value, "roomId", 32);
      return requestId === null || roomId === null
        ? null
        : { type, requestId, roomId };
    }
    case "START_MATCH": {
      if (!exactKeys(value, ["type", "requestId", "roomId", "gameMode"])) {
        return null;
      }
      const requestId = stringField(value, "requestId", 64);
      const roomId = stringField(value, "roomId", 32);
      const gameMode = value.gameMode;
      if (
        requestId === null ||
        roomId === null ||
        (gameMode !== undefined && !isDuelGameMode(gameMode))
      ) {
        return null;
      }
      return {
        type,
        requestId,
        roomId,
        ...(gameMode === undefined ? {} : { gameMode }),
      };
    }
    case "QUEUE_RANKED": {`,
"START_MATCH parser"
],
[
`    case "PONG": {
      if (!exactKeys(value, ["type", "nonce"])) return null;
      const nonce = stringField(value, "nonce", 64);
      return nonce === null ? null : { type, nonce };
    }`,
`    case "MODE_INPUT": {
      if (!exactKeys(value, ["type", "matchId", "roundId", "envelope"])) {
        return null;
      }
      const matchId = stringField(value, "matchId", 64);
      const roundId = stringField(value, "roundId", 64);
      const envelope = parseDuelModeInputEnvelope(value.envelope);
      if (matchId === null || roundId === null || !envelope.ok) {
        return null;
      }
      return { type, matchId, roundId, envelope: envelope.value };
    }
    case "PONG": {
      if (!exactKeys(value, ["type", "nonce"])) return null;
      const nonce = stringField(value, "nonce", 64);
      return nonce === null ? null : { type, nonce };
    }`,
"MODE_INPUT parser"
]
]);

edit("src/duel/authority.ts", [
[
`import {
  DuelEngine,
  type DuelEngineEvent,
  type DuelEngineSnapshot,
} from "./engine";`,
`import {
  DuelEngine,
  type DuelEngineEvent,
  type DuelEngineSnapshot,
} from "./engine";
import {
  duelGameModeAllowedInChannel,
  duelGameModePolicy,
  isAlternativeDuelGameMode,
  parseDuelModeInputEnvelope,
  type DuelGameMode,
  type DuelMatchChannel,
  type DuelModeInputEnvelope,
} from "./game-mode";`,
"authority mode imports"
],
[
`export type DuelClientMatchView = {
  matchId: string;
  roundId: string;
  mode: "friend" | "ranked" | "practice";`,
`export type DuelClientMatchView = {
  matchId: string;
  roundId: string;
  mode: "friend" | "ranked" | "practice";
  /** Gameplay ruleset, independent from Friend/Practice/Ranked channel. */
  gameMode: DuelGameMode;`,
"client match gameMode"
],
[
`type MatchRecord = {
  matchId: string;
  roomId: string | null;
  mode: "friend" | "ranked";`,
`type MatchRecord = {
  matchId: string;
  roomId: string | null;
  mode: "friend" | "ranked" | "practice";
  gameMode: DuelGameMode;`,
"match record gameMode"
],
[
`  startMatch(
    requesterSessionId: string,
    roomId: string,
    now: number,
  ): DuelAuthorityResult<{`,
`  startMatch(
    requesterSessionId: string,
    roomId: string,
    now: number,
    gameMode: DuelGameMode = "standard",
  ): DuelAuthorityResult<{`,
"startMatch signature"
],
[
`    const botPlayerId: DuelPlayerId | null =
      roomSnapshot.slots[1].kind === "bot"
        ? "player-2"
        : null;

    const match: MatchRecord = {`,
`    const botPlayerId: DuelPlayerId | null =
      roomSnapshot.slots[1].kind === "bot"
        ? "player-2"
        : null;
    const channel: DuelMatchChannel = botPlayerId === null ? "friend" : "practice";
    if (!duelGameModeAllowedInChannel(gameMode, channel)) {
      return this.error(
        "MATCH_FORBIDDEN",
        "This gameplay mode is not enabled for the requested Duel channel.",
      );
    }

    const match: MatchRecord = {`,
"startMatch channel gate"
],
[
`      roomId,
      mode: "friend",
      roundId: matchId + ":round:1",`,
`      roomId,
      mode: channel,
      gameMode,
      roundId: matchId + ":round:1",`,
"friend match mode fields"
],
[
`      roomId: null,
      mode: "ranked",
      roundId: matchId + ":round:1",`,
`      roomId: null,
      mode: "ranked",
      gameMode: "standard",
      roundId: matchId + ":round:1",`,
"ranked standard mode"
],
[
`    if (
      input.roundId !== match.roundId ||
      match.needsRoundReset
    ) {`,
`    if (match.gameMode !== "standard") {
      return this.error(
        "MATCH_FORBIDDEN",
        "Standard Duel intents are disabled for this gameplay mode.",
      );
    }
    if (
      input.roundId !== match.roundId ||
      match.needsRoundReset
    ) {`,
"standard intent mode gate"
],
[
`    match.engine.enqueueIntent(
      toEngineIntent({
        playerId,
        sequence: input.sequence,
        intent: input.intent,
      }),
    );
    return { ok: true, value: true };
  }

  tick(`,
`    match.engine.enqueueIntent(
      toEngineIntent({
        playerId,
        sequence: input.sequence,
        intent: input.intent,
      }),
    );
    return { ok: true, value: true };
  }

  submitModeInput(
    sessionId: string,
    input: {
      matchId: string;
      roundId: string;
      envelope: DuelModeInputEnvelope;
      now: number;
    },
  ): DuelAuthorityResult<{
    playerId: DuelPlayerId;
    envelope: DuelModeInputEnvelope;
  }> {
    const session = this.sessions.get(sessionId);
    const match = this.matches.get(input.matchId);
    if (session === undefined) {
      return this.error("SESSION_NOT_FOUND", "Duel session does not exist.");
    }
    if (match === undefined) {
      return this.error("MATCH_NOT_FOUND", "Duel match does not exist.");
    }
    const playerId = this.playerIdForSession(match, sessionId);
    if (playerId === null) {
      return this.error(
        "MATCH_FORBIDDEN",
        "Session does not own a player in this match.",
      );
    }
    if (!isAlternativeDuelGameMode(match.gameMode)) {
      return this.error(
        "MATCH_FORBIDDEN",
        "Mode input is disabled for Standard Duel.",
      );
    }
    if (input.roundId !== match.roundId || match.needsRoundReset) {
      return this.error(
        "ROUND_MISMATCH",
        "Mode input targets a stale or transitioning Duel round.",
      );
    }
    const parsed = parseDuelModeInputEnvelope(input.envelope);
    if (!parsed.ok || parsed.value.gameMode !== match.gameMode) {
      return this.error(
        "MATCH_FORBIDDEN",
        "Mode input does not match the authoritative gameplay mode.",
      );
    }
    const rate = this.acceptMessage(sessionId, input.now);
    if (!rate.ok) return rate;
    const payload = parsed.value.payload;
    if (
      typeof payload === "object" &&
      payload !== null &&
      "type" in payload &&
      (payload as { type?: unknown }).type === "TYPE_CHAR"
    ) {
      const typingRate = this.acceptTypeChar(sessionId, input.now);
      if (!typingRate.ok) return typingRate;
    }
    return { ok: true, value: { playerId, envelope: parsed.value } };
  }

  alternativeMatchContext(matchId: string): DuelAuthorityResult<{
    matchId: string;
    roundId: string;
    gameMode: Exclude<DuelGameMode, "standard">;
    channel: Exclude<DuelMatchChannel, "ranked">;
    engine: DuelEngine;
    bot: null | { playerId: DuelPlayerId; reactionMs: number };
  }> {
    const match = this.matches.get(matchId);
    if (match === undefined) {
      return this.error("MATCH_NOT_FOUND", "Duel match does not exist.");
    }
    if (!isAlternativeDuelGameMode(match.gameMode) || match.mode === "ranked") {
      return this.error(
        "MATCH_FORBIDDEN",
        "Match does not have an enabled alternative gameplay runtime.",
      );
    }
    const room = match.roomId === null ? undefined : this.rooms.get(match.roomId);
    const botConfig = match.botPlayerId === "player-2"
      ? room?.room.snapshot().slots[1].bot
      : null;
    return {
      ok: true,
      value: {
        matchId: match.matchId,
        roundId: match.roundId,
        gameMode: match.gameMode,
        channel: match.mode,
        engine: match.engine,
        bot: match.botPlayerId === null || botConfig == null
          ? null
          : { playerId: match.botPlayerId, reactionMs: botConfig.reactionMs },
      },
    };
  }

  tick(`,
"mode authority methods"
],
[
`  tick(
    matchId: string,
    dtSeconds: number,
    now: number,
  ): DuelAuthorityResult<{`,
`  tick(
    matchId: string,
    dtSeconds: number,
    now: number,
    externalEvents: readonly DuelEngineEvent[] = [],
  ): DuelAuthorityResult<{`,
"tick external events signature"
],
[
`    this.enqueueBotIntents(match, dtSeconds);
    const events = match.engine.step(dtSeconds);
    this.refillCompletedOffers(match, events);`,
`    if (match.gameMode === "standard") {
      this.enqueueBotIntents(match, dtSeconds);
    }
    const events = [...externalEvents, ...match.engine.step(dtSeconds)];
    if (duelGameModePolicy(match.gameMode).standardActionOffers) {
      this.refillCompletedOffers(match, events);
    }`,
"tick alternative event merge"
],
[
`  private dealRoundOffers(match: MatchRecord): void {
    const phase = match.engine.phase();`,
`  private dealRoundOffers(match: MatchRecord): void {
    if (!duelGameModePolicy(match.gameMode).standardActionOffers) return;
    const phase = match.engine.phase();`,
"offer policy gate"
],
[
`      roundId: match.roundId,
      mode: match.mode,
      combatProfile: "normalized",`,
`      roundId: match.roundId,
      mode: match.mode,
      gameMode: match.gameMode,
      combatProfile: "normalized",`,
"view gameMode projection"
]
]);

console.log("Applied alternative live authority transform batch 1.");
