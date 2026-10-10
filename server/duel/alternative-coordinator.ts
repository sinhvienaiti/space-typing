import type {
  DuelAuthorityResult,
  DuelClientRoomSnapshot,
} from "../../src/duel/authority";
import {
  DUEL_TYPING_LEXICON,
} from "../../src/duel/word-lexicon";
import type { AlternativeMatchSnapshotV1 } from "../../src/duel/alternative-match-runtime";
import { projectAlternativeMatchView } from "../../src/duel/alternative-presentation";
import type { AlternativePlayerId } from "../../src/duel/alternative-match-runtime";
import {
  parseAlternativeTransportClientMessage,
  type AlternativeTransportClientMessage,
  type AlternativeTransportServerMessage,
} from "../../src/duel/alternative-wire";
import { AlternativeMatchService } from "./alternative-service";

export type AlternativeRoomAuthority = {
  roomSnapshot(
    sessionId: string,
    roomId: string,
  ): DuelAuthorityResult<DuelClientRoomSnapshot>;
  roomSessionIds(roomId: string): readonly string[];
};

export type AlternativeTransportDelivery = {
  sessionId: string;
  message: AlternativeTransportServerMessage;
};

export type AlternativeCoordinatorError = {
  ok: false;
  code:
    | "BAD_ALTERNATIVE_MESSAGE"
    | "ROOM_NOT_FOUND"
    | "ROOM_FORBIDDEN"
    | "ROOM_NOT_READY"
    | "ALTERNATIVE_MATCH_ACTIVE"
    | "ALTERNATIVE_MATCH_NOT_FOUND"
    | "ALTERNATIVE_MATCH_FORBIDDEN";
  message: string;
  requestId?: string;
};

export type AlternativeCoordinatorResult =
  | { ok: true; deliveries: readonly AlternativeTransportDelivery[] }
  | AlternativeCoordinatorError;

type ActiveAlternativeMatch = {
  matchId: string;
  roomId: string;
  sessions: readonly [string, string];
  serverSequence: number;
  semanticRevision: string;
};

const CANONICAL_WORDS = Object.freeze(
  DUEL_TYPING_LEXICON.map((entry) => entry.token),
);
const CANONICAL_WORD_SET = new Set(CANONICAL_WORDS);
const REFLEX_PROMPTS = Object.freeze(
  CANONICAL_WORDS.filter((word) => word.length >= 4 && word.length <= 7),
);

function semanticRevision(snapshot: AlternativeMatchSnapshotV1): string {
  return JSON.stringify({
    hullByPlayer: snapshot.hullByPlayer,
    scoreByPlayer: snapshot.scoreByPlayer,
    pendingImpacts: snapshot.pendingImpacts.map((impact) => ({
      id: impact.id,
      applied: impact.applied,
      impactAtMs: impact.impactAtMs,
    })),
    result: snapshot.result,
    reflex: snapshot.reflex === null
      ? null
      : {
          round: snapshot.reflex.round,
          prompt: snapshot.reflex.prompt,
          deadline: snapshot.reflex.roundDeadlineAtMs,
          claimedBy: snapshot.reflex.claimedBy,
        },
    wordChain: snapshot.wordChain,
  });
}

function playerIdForSession(
  sessions: readonly [string, string],
  sessionId: string,
): AlternativePlayerId | null {
  if (sessions[0] === sessionId) return "player-1";
  if (sessions[1] === sessionId) return "player-2";
  return null;
}

export class AlternativeDuelCoordinator {
  private readonly service = new AlternativeMatchService();
  private readonly matches = new Map<string, ActiveAlternativeMatch>();
  private readonly matchBySession = new Map<string, string>();
  private readonly matchByRoom = new Map<string, string>();

  constructor(
    private readonly authority: AlternativeRoomAuthority,
    private readonly allocateMatchId: () => string,
    private readonly allocateSeed: () => number,
  ) {}

  handle(
    sessionId: string,
    raw: unknown,
    nowMs: number,
  ): AlternativeCoordinatorResult | null {
    const message = parseAlternativeTransportClientMessage(raw);
    if (message === null) return null;
    if (message.type === "START_ALTERNATIVE_MATCH") {
      return this.startFriend(sessionId, message, nowMs);
    }
    return this.submit(sessionId, message, nowMs);
  }

  reconnect(sessionId: string): readonly AlternativeTransportDelivery[] {
    const matchId = this.matchBySession.get(sessionId);
    if (matchId === undefined) return [];
    const record = this.matches.get(matchId);
    if (record === undefined) return [];
    return this.updatesFor(record, [sessionId]);
  }

  advance(nowMs: number): readonly AlternativeTransportDelivery[] {
    const deliveries: AlternativeTransportDelivery[] = [];
    for (const record of this.matches.values()) {
      const snapshot = this.service.advance(record.matchId, nowMs);
      if (snapshot === null) continue;
      const nextRevision = semanticRevision(snapshot);
      if (nextRevision === record.semanticRevision) continue;
      record.semanticRevision = nextRevision;
      record.serverSequence += 1;
      deliveries.push(...this.updatesFor(record, record.sessions));
    }
    return deliveries;
  }

  matchIdForSession(sessionId: string): string | null {
    return this.matchBySession.get(sessionId) ?? null;
  }

  private releaseTerminalMatch(matchId: string): boolean {
    const record = this.matches.get(matchId);
    const saved = this.service.export(matchId);
    if (
      record === undefined ||
      saved === null ||
      saved.snapshot.result.status === "active"
    ) {
      return false;
    }
    if (this.matchByRoom.get(record.roomId) === matchId) {
      this.matchByRoom.delete(record.roomId);
    }
    for (const sessionId of record.sessions) {
      if (this.matchBySession.get(sessionId) === matchId) {
        this.matchBySession.delete(sessionId);
      }
    }
    this.matches.delete(matchId);
    this.service.delete(matchId);
    return true;
  }

  private startFriend(
    sessionId: string,
    message: Extract<AlternativeTransportClientMessage, { type: "START_ALTERNATIVE_MATCH" }>,
    nowMs: number,
  ): AlternativeCoordinatorResult {
    const room = this.authority.roomSnapshot(sessionId, message.roomId);
    if (!room.ok) {
      return {
        ok: false,
        code: room.code === "ROOM_NOT_FOUND" ? "ROOM_NOT_FOUND" : "ROOM_FORBIDDEN",
        message: room.message,
        requestId: message.requestId,
      };
    }
    if (!room.value.isOwner) {
      return {
        ok: false,
        code: "ROOM_FORBIDDEN",
        message: "Only the room owner can start an alternative match.",
        requestId: message.requestId,
      };
    }
    if (!room.value.canStart) {
      return {
        ok: false,
        code: "ROOM_NOT_READY",
        message: "Alternative friend mode requires a ready room.",
        requestId: message.requestId,
      };
    }

    const roomMatch = this.matchByRoom.get(message.roomId);
    if (roomMatch !== undefined && !this.releaseTerminalMatch(roomMatch)) {
      return {
        ok: false,
        code: "ALTERNATIVE_MATCH_ACTIVE",
        message: "This room already owns an active alternative match.",
        requestId: message.requestId,
      };
    }

    const participants = this.authority.roomSessionIds(message.roomId);
    if (participants.length !== 2) {
      return {
        ok: false,
        code: "ROOM_NOT_READY",
        message: "Alternative friend mode currently requires two human participants.",
        requestId: message.requestId,
      };
    }
    const left = participants[0]!;
    const right = participants[1]!;
    for (const participant of [left, right]) {
      const bound = this.matchBySession.get(participant);
      if (bound !== undefined) this.releaseTerminalMatch(bound);
    }
    if (this.matchBySession.has(left) || this.matchBySession.has(right)) {
      return {
        ok: false,
        code: "ALTERNATIVE_MATCH_ACTIVE",
        message: "A participant is already bound to an active alternative match.",
        requestId: message.requestId,
      };
    }

    const matchId = this.allocateMatchId();
    const snapshot = this.service.createMatch({
      leftSessionId: left,
      rightSessionId: right,
      runtime: {
        mode: message.mode,
        matchType: "friend",
        matchId,
        seed: this.allocateSeed(),
        startedAtMs: nowMs,
        ...(message.mode === "reflex"
          ? { reflexPrompts: REFLEX_PROMPTS }
          : { wordChainLexicon: CANONICAL_WORD_SET }),
      },
    });
    const record: ActiveAlternativeMatch = {
      matchId,
      roomId: message.roomId,
      sessions: [left, right],
      serverSequence: 0,
      semanticRevision: semanticRevision(snapshot),
    };
    this.matches.set(matchId, record);
    this.matchByRoom.set(message.roomId, matchId);
    this.matchBySession.set(left, matchId);
    this.matchBySession.set(right, matchId);
    return { ok: true, deliveries: this.updatesFor(record, record.sessions) };
  }

  private submit(
    sessionId: string,
    message: Exclude<AlternativeTransportClientMessage, { type: "START_ALTERNATIVE_MATCH" }>,
    nowMs: number,
  ): AlternativeCoordinatorResult {
    const bound = this.matchBySession.get(sessionId);
    if (bound === undefined || bound !== message.matchId) {
      return {
        ok: false,
        code: bound === undefined
          ? "ALTERNATIVE_MATCH_NOT_FOUND"
          : "ALTERNATIVE_MATCH_FORBIDDEN",
        message: "Session is not bound to this alternative match.",
      };
    }
    const record = this.matches.get(bound);
    if (record === undefined) {
      return {
        ok: false,
        code: "ALTERNATIVE_MATCH_NOT_FOUND",
        message: "Alternative match does not exist.",
      };
    }
    const result = this.service.submitParsed(sessionId, message, nowMs);
    if (!result.ok) {
      return {
        ok: false,
        code: result.code === "MATCH_NOT_FOUND"
          ? "ALTERNATIVE_MATCH_NOT_FOUND"
          : "ALTERNATIVE_MATCH_FORBIDDEN",
        message: result.code,
      };
    }

    const inputResult: AlternativeTransportDelivery = {
      sessionId,
      message: {
        type: "ALTERNATIVE_INPUT_RESULT",
        matchId: message.matchId,
        sequence: message.sequence,
        accepted: result.decision.accepted,
        reason: result.decision.reason,
      },
    };
    if (!result.decision.accepted) {
      return { ok: true, deliveries: [inputResult] };
    }
    record.serverSequence += 1;
    record.semanticRevision = semanticRevision(result.decision.snapshot);
    return {
      ok: true,
      deliveries: [
        inputResult,
        ...this.updatesFor(record, record.sessions),
      ],
    };
  }

  private updatesFor(
    record: ActiveAlternativeMatch,
    sessions: readonly string[],
  ): AlternativeTransportDelivery[] {
    const saved = this.service.export(record.matchId);
    if (saved === null) return [];
    const deliveries: AlternativeTransportDelivery[] = [];
    for (const sessionId of sessions) {
      const playerId = playerIdForSession(record.sessions, sessionId);
      if (playerId === null) continue;
      deliveries.push({
        sessionId,
        message: {
          type: "ALTERNATIVE_MATCH_UPDATE",
          matchId: record.matchId,
          serverSequence: record.serverSequence,
          view: projectAlternativeMatchView(saved.snapshot, playerId),
        },
      });
    }
    return deliveries;
  }
}
