import fs from "node:fs";

function edit(path, transforms) {
  let text = fs.readFileSync(path, "utf8");
  for (const [before, after, label] of transforms) {
    const count = text.split(before).length - 1;
    if (count !== 1) throw new Error(`${path}: ${label}: expected 1, found ${count}`);
    text = text.replace(before, after);
  }
  fs.writeFileSync(path, text);
}

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
"mode imports"
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
  /** Gameplay ruleset, independent from Friend/Practice/Ranked admission. */
  gameMode: DuelGameMode;`,
"view gameMode"
],
[
`type MatchRecord = {
  matchId: string;
  roomId: string | null;
  mode: "friend" | "ranked";
  roundId: string;`,
`type MatchRecord = {
  matchId: string;
  roomId: string | null;
  mode: "friend" | "ranked";
  channel: DuelMatchChannel;
  gameMode: DuelGameMode;
  roundId: string;`,
"record mode fields"
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
"channel gate"
],
[
`      roomId,
      mode: "friend",
      roundId: matchId + ":round:1",`,
`      roomId,
      mode: "friend",
      channel,
      gameMode,
      roundId: matchId + ":round:1",`,
"friend mode fields"
],
[
`      roomId: null,
      mode: "ranked",
      roundId: matchId + ":round:1",`,
`      roomId: null,
      mode: "ranked",
      channel: "ranked",
      gameMode: "standard",
      roundId: matchId + ":round:1",`,
"ranked mode fields"
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
"standard intent gate"
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
    if (!isAlternativeDuelGameMode(match.gameMode) || match.channel === "ranked") {
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
        channel: match.channel,
        engine: match.engine,
        bot: match.botPlayerId === null || botConfig == null
          ? null
          : { playerId: match.botPlayerId, reactionMs: botConfig.reactionMs },
      },
    };
  }

  tick(`,
"alternative input/context"
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
"tick signature"
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
"tick event merge"
],
[
`  private dealRoundOffers(match: MatchRecord): void {
    const phase = match.engine.phase();`,
`  private dealRoundOffers(match: MatchRecord): void {
    if (!duelGameModePolicy(match.gameMode).standardActionOffers) return;
    const phase = match.engine.phase();`,
"offer gate"
],
[
`      roundId: match.roundId,
      mode: match.mode,
      combatProfile: "normalized",`,
`      roundId: match.roundId,
      mode: match.mode,
      gameMode: match.gameMode,
      combatProfile: "normalized",`,
"view projection"
]
]);

console.log("Applied alternative Duel authority core.");
