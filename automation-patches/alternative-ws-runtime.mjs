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
`    engine: DuelEngine;
    bot: null | { playerId: DuelPlayerId; reactionMs: number };
  }> {`,
`    engine: DuelEngine;
    players: Readonly<Record<DuelPlayerId, string | null>>;
    bot: null | { playerId: DuelPlayerId; reactionMs: number };
  }> {`,
"alternative context players type"
],
[
`        channel: match.channel,
        engine: match.engine,
        bot: match.botPlayerId === null || botConfig == null`,
`        channel: match.channel,
        engine: match.engine,
        players: { ...match.players },
        bot: match.botPlayerId === null || botConfig == null`,
"alternative context players value"
]
]);

edit("server/duel/alternative-match-runtime.ts", [[
`  runBotTurn(
    playerId: DuelPlayerId,
    nowMs: number,
  ): readonly DuelEngineEvent[] {
    const token =`,
`  runBotTurn(
    playerId: DuelPlayerId,
    nowMs: number,
  ): readonly DuelEngineEvent[] {
    const current = this.reconnectSnapshot(playerId);
    if (
      (current.gameMode === "reflex" && current.player.completed) ||
      (current.gameMode === "word-chain" && current.player.accepted)
    ) {
      return [];
    }
    const token =`,
"bot duplicate guard"
]]);

edit("server/duel/ws-server.ts", [
[
`import { DuelRoomListWatchers } from "./room-list-watchers";`,
`import { DuelRoomListWatchers } from "./room-list-watchers";
import { AlternativeMatchRuntime } from "./alternative-match-runtime";
import type { DuelEngineEvent } from "../../src/duel/engine";
import type { DuelPlayerId } from "../../src/duel/model";`,
"alternative runtime imports"
],
[
`const socketsBySession = new Map<string, WebSocket>();
const states = new Map<WebSocket, ConnectionState>();
const activeMatches = new Set<string>();`,
`const socketsBySession = new Map<string, WebSocket>();
const states = new Map<WebSocket, ConnectionState>();
const activeMatches = new Set<string>();

type AlternativeRuntimeRecord = {
  roundId: string;
  runtime: AlternativeMatchRuntime;
  botTurnKey: string | null;
  botDueAtMs: number | null;
};

const alternativeMatches = new Map<string, AlternativeRuntimeRecord>();`,
"alternative runtime map"
],
[
`function sendUpdates(
  updates: readonly DuelClientMatchUpdate[],
): void {
  for (const update of updates) {
    sendMatchUpdate(update);
  }
}

function sendRankedCompletion(`,
`function sendUpdates(
  updates: readonly DuelClientMatchUpdate[],
): void {
  for (const update of updates) {
    sendMatchUpdate(update);
  }
}

function disposeAlternativeMatch(matchId: string): void {
  const record = alternativeMatches.get(matchId);
  if (record === undefined) return;
  record.runtime.dispose();
  alternativeMatches.delete(matchId);
}

function ensureAlternativeRuntime(
  matchId: string,
  nowMs: number,
): AlternativeRuntimeRecord | null {
  const context = authority.alternativeMatchContext(matchId);
  if (!context.ok) {
    disposeAlternativeMatch(matchId);
    return null;
  }

  const existing = alternativeMatches.get(matchId);
  if (existing?.roundId === context.value.roundId) return existing;
  if (existing !== undefined) existing.runtime.dispose();

  const runtime = new AlternativeMatchRuntime(
    context.value.engine,
    context.value.gameMode,
    context.value.channel,
    { nowMs },
  );
  const record: AlternativeRuntimeRecord = {
    roundId: context.value.roundId,
    runtime,
    botTurnKey: null,
    botDueAtMs:
      context.value.bot === null
        ? null
        : nowMs + context.value.bot.reactionMs,
  };
  alternativeMatches.set(matchId, record);
  return record;
}

function playerIdForAlternativeSession(
  players: Readonly<Record<DuelPlayerId, string | null>>,
  sessionId: string,
): DuelPlayerId | null {
  if (players["player-1"] === sessionId) return "player-1";
  if (players["player-2"] === sessionId) return "player-2";
  return null;
}

function sendAlternativeStateToSession(
  sessionId: string,
  matchId: string,
  record: AlternativeRuntimeRecord,
): void {
  const context = authority.alternativeMatchContext(matchId);
  if (!context.ok || context.value.roundId !== record.roundId) return;
  const playerId = playerIdForAlternativeSession(context.value.players, sessionId);
  if (playerId === null) return;
  const socket = socketForSession(sessionId);
  if (socket === null) return;
  send(socket, {
    type: "MODE_STATE",
    matchId,
    roundId: record.roundId,
    view: record.runtime.reconnectSnapshot(playerId),
  });
}

function sendAlternativeStates(
  matchId: string,
  record: AlternativeRuntimeRecord,
): void {
  const context = authority.alternativeMatchContext(matchId);
  if (!context.ok || context.value.roundId !== record.roundId) return;
  for (const sessionId of Object.values(context.value.players)) {
    if (sessionId !== null) {
      sendAlternativeStateToSession(sessionId, matchId, record);
    }
  }
}

function botTurnKey(
  runtime: AlternativeMatchRuntime,
  playerId: DuelPlayerId,
): string | null {
  const view = runtime.reconnectSnapshot(playerId);
  if (view.gameMode === "reflex") {
    if (view.challenge === null || view.player.completed) return null;
    return `reflex:${view.challenge.challengeId}`;
  }
  if (view.beat === null || view.player.accepted) return null;
  return `word-chain:${view.beat.beatId}`;
}

function runAlternativeBotIfDue(
  matchId: string,
  record: AlternativeRuntimeRecord,
  nowMs: number,
): readonly DuelEngineEvent[] {
  const context = authority.alternativeMatchContext(matchId);
  if (!context.ok || context.value.bot === null) return [];
  const key = botTurnKey(record.runtime, context.value.bot.playerId);
  if (key === null) {
    record.botDueAtMs = null;
    return [];
  }
  if (record.botTurnKey !== key) {
    record.botTurnKey = key;
    record.botDueAtMs = nowMs + context.value.bot.reactionMs;
  }
  if (record.botDueAtMs === null || nowMs < record.botDueAtMs) return [];
  record.botDueAtMs = null;
  return record.runtime.runBotTurn(context.value.bot.playerId, nowMs);
}

function sendRankedCompletion(`,
"alternative runtime helpers"
],
[
`      if (view.value.series.status === "active") {
        activeMatches.add(view.value.matchId);
      }
    }
  }
}`,
`      if (view.value.series.status === "active") {
        activeMatches.add(view.value.matchId);
        const alternative = ensureAlternativeRuntime(view.value.matchId, Date.now());
        if (alternative !== null) {
          sendAlternativeStateToSession(
            opened.value.sessionId,
            view.value.matchId,
            alternative,
          );
        }
      }
    }
  }
}`,
"reconnect mode state"
],
[
`  if (message.type !== "INTENT") {`,
`  if (message.type !== "INTENT" && message.type !== "MODE_INPUT") {`,
"mode input rate ownership"
],
[
`      const result = authority.startMatch(
        sessionId,
        message.roomId,
        now,
      );`,
`      const result = authority.startMatch(
        sessionId,
        message.roomId,
        now,
        message.gameMode ?? "standard",
      );`,
"start match gameMode"
],
[
`      activeMatches.add(result.value.matchId);
      sendUpdates(result.value.updates);
      roomList.notifyChanged();`,
`      activeMatches.add(result.value.matchId);
      sendUpdates(result.value.updates);
      const alternative = ensureAlternativeRuntime(result.value.matchId, now);
      if (alternative !== null) sendAlternativeStates(result.value.matchId, alternative);
      roomList.notifyChanged();`,
"start match mode state"
],
[
`    case "INTENT": {
      const result = authority.submitIntent(`,
`    case "MODE_INPUT": {
      const accepted = authority.submitModeInput(
        sessionId,
        {
          matchId: message.matchId,
          roundId: message.roundId,
          envelope: message.envelope,
          now,
        },
      );
      if (!accepted.ok) {
        sendError(socket, accepted);
        return;
      }
      const record = ensureAlternativeRuntime(message.matchId, now);
      if (record === null || record.roundId !== message.roundId) {
        send(socket, {
          type: "ERROR",
          code: "MODE_RUNTIME_UNAVAILABLE",
          message: "Alternative Duel runtime is unavailable for this round.",
        });
        return;
      }
      const received = record.runtime.receive(
        accepted.value.playerId,
        accepted.value.envelope,
        now,
      );
      if (!received.ok) {
        send(socket, {
          type: "ERROR",
          code: "MODE_INPUT_REJECTED",
          message: "Alternative Duel input was rejected.",
        });
        return;
      }
      if (received.combatEvents.length > 0) {
        const updated = authority.tick(
          message.matchId,
          0,
          now,
          received.combatEvents,
        );
        if (updated.ok) sendUpdates(updated.value.updates);
      }
      sendAlternativeStates(message.matchId, record);
      return;
    }

    case "INTENT": {
      const result = authority.submitIntent(`,
"MODE_INPUT handler"
],
[
`    for (const matchId of [...activeMatches]) {
      const result = authority.tick(
        matchId,
        TICK_MS / 1000,
        now,
      );`,
`    for (const matchId of [...activeMatches]) {
      const alternative = ensureAlternativeRuntime(matchId, now);
      const alternativeEvents: DuelEngineEvent[] = [];
      let alternativeStateChanged = false;
      if (alternative !== null) {
        alternativeEvents.push(
          ...runAlternativeBotIfDue(matchId, alternative, now),
        );
        const modeTick = alternative.runtime.tick(now);
        alternativeEvents.push(...modeTick.combatEvents);
        alternativeStateChanged = modeTick.stateChanged;
      }

      const result = authority.tick(
        matchId,
        TICK_MS / 1000,
        now,
        alternativeEvents,
      );`,
"tick alternative events"
],
[
`      sendUpdates(result.value.updates);
      const completed = ranked.completeIfFinished(`,
`      sendUpdates(result.value.updates);
      if (alternative !== null) {
        const nextRoundId = result.value.updates[0]?.view.roundId;
        if (nextRoundId !== undefined && nextRoundId !== alternative.roundId) {
          disposeAlternativeMatch(matchId);
          const nextAlternative = ensureAlternativeRuntime(matchId, now);
          if (nextAlternative !== null) sendAlternativeStates(matchId, nextAlternative);
        } else if (alternativeStateChanged || alternativeEvents.length > 0) {
          sendAlternativeStates(matchId, alternative);
        }
      }
      const completed = ranked.completeIfFinished(`,
"tick state updates"
],
[
`      if (!active) {
        activeMatches.delete(matchId);
        // A finished Friend match leaves the public room list.`,
`      if (!active) {
        activeMatches.delete(matchId);
        disposeAlternativeMatch(matchId);
        // A finished Friend match leaves the public room list.`,
"terminal runtime disposal"
],
[
`function shutdown(): void {
  clearInterval(tickTimer);`,
`function shutdown(): void {
  clearInterval(tickTimer);`,
"shutdown anchor"
],
[
`  roomList.dispose();
  for (const socket of states.keys()) {`,
`  roomList.dispose();
  for (const matchId of [...alternativeMatches.keys()]) {
    disposeAlternativeMatch(matchId);
  }
  for (const socket of states.keys()) {`,
"shutdown runtime disposal"
]
]);

console.log("Applied live WebSocket alternative Duel runtime wiring.");
