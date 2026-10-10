import {
  AlternativeMatchRuntime,
  type AlternativeInputDecision,
  type AlternativeMatchRuntimeOptions,
  type AlternativeMatchSnapshotV1,
  type AlternativePlayerId,
} from "../../src/duel/alternative-match-runtime";
import {
  parseAlternativeModeWireMessage,
  toAlternativeModeInput,
  type AlternativeModeWireMessage,
} from "../../src/duel/alternative-protocol";

type ParticipantBinding = Readonly<{
  "player-1": string;
  "player-2": string;
}>;

export type AlternativeMatchRecord = {
  snapshot: AlternativeMatchSnapshotV1;
  participants: ParticipantBinding;
};

export type AlternativeServiceResult =
  | { ok: true; decision: AlternativeInputDecision }
  | {
      ok: false;
      code:
        | "BAD_MODE_INPUT"
        | "MATCH_NOT_FOUND"
        | "SESSION_NOT_IN_MATCH"
        | "MATCH_ID_MISMATCH";
    };

export class AlternativeMatchService {
  private readonly matches = new Map<
    string,
    {
      runtime: AlternativeMatchRuntime;
      participants: ParticipantBinding;
    }
  >();

  createMatch(input: {
    leftSessionId: string;
    rightSessionId: string;
    runtime: AlternativeMatchRuntimeOptions;
  }): AlternativeMatchSnapshotV1 {
    const left = input.leftSessionId.trim();
    const right = input.rightSessionId.trim();
    if (left.length === 0 || right.length === 0 || left === right) {
      throw new Error("Alternative match requires two distinct sessions.");
    }
    const runtime = new AlternativeMatchRuntime(input.runtime);
    const matchId = runtime.snapshot().matchId;
    if (this.matches.has(matchId)) {
      throw new Error("Alternative match id already exists.");
    }
    this.matches.set(matchId, {
      runtime,
      participants: {
        "player-1": left,
        "player-2": right,
      },
    });
    return runtime.snapshot();
  }

  restore(record: AlternativeMatchRecord, runtimeOptions: Omit<
    AlternativeMatchRuntimeOptions,
    "mode" | "matchType" | "matchId" | "seed" | "startedAtMs"
  > = {}): AlternativeMatchSnapshotV1 {
    const runtime = AlternativeMatchRuntime.restore(record.snapshot, runtimeOptions);
    this.matches.set(record.snapshot.matchId, {
      runtime,
      participants: { ...record.participants },
    });
    return runtime.snapshot();
  }

  export(matchId: string): AlternativeMatchRecord | null {
    const entry = this.matches.get(matchId);
    if (entry === undefined) return null;
    return {
      snapshot: entry.runtime.snapshot(),
      participants: { ...entry.participants },
    };
  }

  delete(matchId: string): boolean {
    return this.matches.delete(matchId);
  }

  snapshotForSession(
    sessionId: string,
    matchId: string,
  ): AlternativeMatchSnapshotV1 | null {
    const entry = this.matches.get(matchId);
    if (entry === undefined || this.playerIdForSession(entry.participants, sessionId) === null) {
      return null;
    }
    return entry.runtime.snapshot();
  }

  submit(
    sessionId: string,
    value: unknown,
    receivedAtMs: number,
  ): AlternativeServiceResult {
    const message = parseAlternativeModeWireMessage(value);
    if (message === null) return { ok: false, code: "BAD_MODE_INPUT" };
    return this.submitParsed(sessionId, message, receivedAtMs);
  }

  submitParsed(
    sessionId: string,
    message: AlternativeModeWireMessage,
    receivedAtMs: number,
  ): AlternativeServiceResult {
    const entry = this.matches.get(message.matchId);
    if (entry === undefined) return { ok: false, code: "MATCH_NOT_FOUND" };
    const playerId = this.playerIdForSession(entry.participants, sessionId);
    if (playerId === null) return { ok: false, code: "SESSION_NOT_IN_MATCH" };
    if (entry.runtime.snapshot().matchId !== message.matchId) {
      return { ok: false, code: "MATCH_ID_MISMATCH" };
    }
    const decision = entry.runtime.submit(
      toAlternativeModeInput({ message, playerId, receivedAtMs }),
    );
    return { ok: true, decision };
  }

  advance(matchId: string, nowMs: number): AlternativeMatchSnapshotV1 | null {
    const entry = this.matches.get(matchId);
    return entry?.runtime.advance(nowMs) ?? null;
  }

  private playerIdForSession(
    participants: ParticipantBinding,
    sessionId: string,
  ): AlternativePlayerId | null {
    if (participants["player-1"] === sessionId) return "player-1";
    if (participants["player-2"] === sessionId) return "player-2";
    return null;
  }
}
