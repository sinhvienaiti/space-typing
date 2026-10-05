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
"public sequence"
]]);

edit("server/duel/reflex/authority.ts", [[
`    retries: state.retries,
    completed: state.completed,
  };`,
`    retries: state.retries,
    completed: state.completed,
    lastAcceptedSequence: state.lastClientSequence,
  };`,
"public sequence projection"
]]);

edit("src/duel/word-chain.ts", [[
`export type WordChainPlayerPublicState = Readonly<{
  buffer: string;
  accepted: boolean;
}>;`,
`export type WordChainPlayerPublicState = Readonly<{
  buffer: string;
  accepted: boolean;
  /** Sequence floor a reconnecting client must continue above. */
  lastAcceptedSequence: number;
}>;`,
"public sequence"
]]);

edit("server/duel/word-chain/authority.ts", [
[
`function publicPlayerState(state: MutablePlayerBeatState): WordChainPlayerPublicState {
  return { buffer: state.buffer, accepted: state.acceptedWord !== null };
}`,
`function publicPlayerState(state: MutablePlayerBeatState): WordChainPlayerPublicState {
  return {
    buffer: state.buffer,
    accepted: state.acceptedWord !== null,
    lastAcceptedSequence: state.lastClientSequence,
  };
}`,
"public sequence projection"
],
[
`          ? { buffer: "", accepted: false }
          : publicPlayerState(this.active.player[playerId]),`,
`          ? { buffer: "", accepted: false, lastAcceptedSequence: -1 }
          : publicPlayerState(this.active.player[playerId]),`,
"empty reconnect sequence"
]
]);

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
"mode imports"
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
      /** Omitted by older callers; authority defaults to Standard. */
      gameMode?: DuelGameMode;
    }
  | {
      type: "QUEUE_RANKED";`,
"START_MATCH mode"
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
"MODE_INPUT type"
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
"MODE_STATE type"
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
      if (matchId === null || roundId === null || !envelope.ok) return null;
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

console.log("Applied browser-safe alternative Duel wire contracts.");
