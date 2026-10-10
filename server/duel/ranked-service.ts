import {
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import type {
  DuelAuthorityResult,
  DuelAuthorityService,
  DuelClientMatchUpdate,
} from "../../src/duel/authority";
import {
  DuelRankedPresence,
  DuelRankedQueue,
  createDefaultDuelRankedProfile,
  duelMatchmakingRating,
  sanitizeDuelRankedProfile,
  updateDuelRankedResultOnly,
  type DuelRankedProfile,
  type DuelRankedResult,
} from "../../src/duel/ranked";
import type { DuelRankedHistoryState } from "../../src/duel/ranked-history";
import {
  InMemoryDuelRankedHistoryStore,
  JsonFileDuelRankedHistoryStore,
  type DuelRankedHistoryStore,
} from "./ranked-history-store";

export interface DuelRankedProfileStore {
  load(accountId: string): DuelRankedProfile | null;
  save(profile: DuelRankedProfile): void;
  savePair(left: DuelRankedProfile, right: DuelRankedProfile): void;
}

function assertDistinctRankedProfiles(
  left: DuelRankedProfile,
  right: DuelRankedProfile,
): void {
  if (
    left.accountId === "" ||
    right.accountId === "" ||
    left.accountId === right.accountId
  ) {
    throw new Error("Ranked profile pair requires two distinct accounts.");
  }
}

export class InMemoryDuelRankedProfileStore
  implements DuelRankedProfileStore
{
  private readonly profiles = new Map<
    string,
    DuelRankedProfile
  >();

  load(accountId: string): DuelRankedProfile | null {
    const profile = this.profiles.get(accountId);
    return profile === undefined ? null : { ...profile };
  }

  save(profile: DuelRankedProfile): void {
    const safe = sanitizeDuelRankedProfile(profile);
    this.profiles.set(safe.accountId, safe);
  }

  savePair(
    leftInput: DuelRankedProfile,
    rightInput: DuelRankedProfile,
  ): void {
    const left = sanitizeDuelRankedProfile(leftInput);
    const right = sanitizeDuelRankedProfile(rightInput);
    assertDistinctRankedProfiles(left, right);
    this.profiles.set(left.accountId, left);
    this.profiles.set(right.accountId, right);
  }
}

export class JsonFileDuelRankedProfileStore
  implements DuelRankedProfileStore
{
  private readonly profiles = new Map<
    string,
    DuelRankedProfile
  >();

  constructor(private readonly filePath: string) {
    this.loadFile();
  }

  load(accountId: string): DuelRankedProfile | null {
    const profile = this.profiles.get(accountId);
    return profile === undefined ? null : { ...profile };
  }

  save(profile: DuelRankedProfile): void {
    const safe = sanitizeDuelRankedProfile(profile);
    const previous = new Map(this.profiles);
    this.profiles.set(safe.accountId, safe);
    try {
      this.flush();
    } catch (error) {
      this.restore(previous);
      throw error;
    }
  }

  savePair(
    leftInput: DuelRankedProfile,
    rightInput: DuelRankedProfile,
  ): void {
    const left = sanitizeDuelRankedProfile(leftInput);
    const right = sanitizeDuelRankedProfile(rightInput);
    assertDistinctRankedProfiles(left, right);
    const previous = new Map(this.profiles);
    this.profiles.set(left.accountId, left);
    this.profiles.set(right.accountId, right);
    try {
      this.flush();
    } catch (error) {
      this.restore(previous);
      throw error;
    }
  }

  historyFilePath(): string {
    return this.filePath + ".history.json";
  }

  private restore(
    previous: Map<string, DuelRankedProfile>,
  ): void {
    this.profiles.clear();
    for (const [accountId, profile] of previous) {
      this.profiles.set(accountId, profile);
    }
  }

  private loadFile(): void {
    let raw: string;
    try {
      raw = readFileSync(this.filePath, "utf8");
    } catch {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return;
    }

    for (const [accountId, value] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(value)
      ) {
        continue;
      }
      const profile = value as Partial<DuelRankedProfile>;
      if (
        typeof profile.typingRating !== "number" ||
        typeof profile.duelRating !== "number" ||
        typeof profile.matchesPlayed !== "number" ||
        typeof profile.wins !== "number" ||
        typeof profile.losses !== "number" ||
        typeof profile.draws !== "number"
      ) {
        continue;
      }
      this.profiles.set(
        accountId,
        sanitizeDuelRankedProfile({
          accountId,
          typingRating: profile.typingRating,
          duelRating: profile.duelRating,
          matchesPlayed: profile.matchesPlayed,
          wins: profile.wins,
          losses: profile.losses,
          draws: profile.draws,
        }),
      );
    }
  }

  private flush(): void {
    mkdirSync(dirname(this.filePath), {
      recursive: true,
    });
    const object: Record<string, DuelRankedProfile> = {};
    for (const [accountId, profile] of this.profiles) {
      object[accountId] = { ...profile };
    }
    const tempPath = this.filePath + ".tmp";
    writeFileSync(
      tempPath,
      JSON.stringify(object, null, 2) + "\n",
      "utf8",
    );
    renameSync(tempPath, this.filePath);
  }
}

export type DuelRankedQueueStatus = {
  status: "queued";
  ticketId: string;
  matchmakingRating: number;
};

export type DuelRankedMatchStart = {
  matchId: string;
  updates: readonly DuelClientMatchUpdate[];
};

export type DuelRankedCompletedProfiles = {
  left: {
    sessionId: string;
    profile: DuelRankedProfile;
  };
  right: {
    sessionId: string;
    profile: DuelRankedProfile;
  };
};

export type DuelRankedDisconnectSettlement = {
  matchId: string;
  updates: readonly DuelClientMatchUpdate[];
  completed: DuelRankedCompletedProfiles | null;
};

type ActiveRankedMatch = {
  leftAccountId: string;
  rightAccountId: string;
  leftSessionId: string;
  rightSessionId: string;
  presence: DuelRankedPresence;
};

function oppositeRankedResult(
  result: DuelRankedResult,
): DuelRankedResult {
  if (result === "win") return "loss";
  if (result === "loss") return "win";
  return "draw";
}

function defaultRankedHistoryStore(
  store: DuelRankedProfileStore,
): DuelRankedHistoryStore {
  return store instanceof JsonFileDuelRankedProfileStore
    ? new JsonFileDuelRankedHistoryStore(store.historyFilePath())
    : new InMemoryDuelRankedHistoryStore();
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class DuelRankedService {
  private readonly queue = new DuelRankedQueue();
  private readonly active = new Map<
    string,
    ActiveRankedMatch
  >();
  private readonly historyStore: DuelRankedHistoryStore;
  private readonly now: () => number;
  private historyWriteError: string | null = null;

  constructor(
    private readonly authority: DuelAuthorityService,
    private readonly store: DuelRankedProfileStore,
    private readonly nextTicketId: () => string,
    historyStore?: DuelRankedHistoryStore,
    now: () => number = Date.now,
  ) {
    this.historyStore = historyStore ?? defaultRankedHistoryStore(store);
    this.now = now;
  }

  enqueue(
    sessionId: string,
    now: number,
  ): DuelAuthorityResult<DuelRankedQueueStatus> {
    const participant =
      this.authority.rankedParticipant(sessionId);
    if (!participant.ok) return participant;

    const profile =
      this.store.load(participant.value.accountId) ??
      createDefaultDuelRankedProfile(
        participant.value.accountId,
      );
    const ticketId = this.nextTicketId();
    const added = this.queue.enqueue({
      ticketId,
      sessionId,
      accountId: participant.value.accountId,
      enqueuedAt: now,
      profile,
    });
    if (!added) {
      return {
        ok: false,
        code: "RANKED_INELIGIBLE",
        message: "Session is already queued for Ranked.",
      };
    }

    return {
      ok: true,
      value: {
        status: "queued",
        ticketId,
        matchmakingRating:
          duelMatchmakingRating(profile),
      },
    };
  }

  leave(sessionId: string): boolean {
    return this.queue.leave(sessionId);
  }

  disconnect(
    sessionId: string,
    now: number,
  ): boolean {
    let changed = this.queue.leave(sessionId);
    for (const active of this.active.values()) {
      if (active.leftSessionId === sessionId) {
        active.presence.disconnect("player-1", now);
        changed = true;
      }
      if (active.rightSessionId === sessionId) {
        active.presence.disconnect("player-2", now);
        changed = true;
      }
    }
    return changed;
  }

  reconnect(sessionId: string): boolean {
    let changed = false;
    for (const active of this.active.values()) {
      if (active.leftSessionId === sessionId) {
        active.presence.reconnect("player-1");
        changed = true;
      }
      if (active.rightSessionId === sessionId) {
        active.presence.reconnect("player-2");
        changed = true;
      }
    }
    return changed;
  }

  resolveDisconnects(
    now: number,
  ): DuelRankedDisconnectSettlement[] {
    const settlements: DuelRankedDisconnectSettlement[] =
      [];

    for (const [matchId, active] of [
      ...this.active.entries(),
    ]) {
      const presence = active.presence.resolve(now);
      if (presence.status === "active") continue;

      const result =
        this.authority.finishRankedForfeit(
          matchId,
          presence.status === "forfeit"
            ? presence.forfeitingPlayerId
            : null,
        );
      if (!result.ok) continue;

      const completed = this.completeIfFinished(
        matchId,
        result.value.updates,
      );
      settlements.push({
        matchId,
        updates: result.value.updates,
        completed,
      });
    }

    return settlements;
  }

  pump(now: number): DuelRankedMatchStart[] {
    const started: DuelRankedMatchStart[] = [];
    let guard = 0;

    while (guard < 16) {
      guard += 1;
      const pair = this.queue.matchNext(now);
      if (pair === null) break;

      const result =
        this.authority.startRankedMatch(
          pair.left.sessionId,
          pair.right.sessionId,
          now,
        );
      if (!result.ok) continue;

      this.active.set(result.value.matchId, {
        leftAccountId: pair.left.accountId,
        rightAccountId: pair.right.accountId,
        leftSessionId: pair.left.sessionId,
        rightSessionId: pair.right.sessionId,
        presence: new DuelRankedPresence(),
      });
      started.push(result.value);
    }
    return started;
  }

  completeIfFinished(
    matchId: string,
    updates: readonly DuelClientMatchUpdate[],
  ): DuelRankedCompletedProfiles | null {
    const active = this.active.get(matchId);
    if (active === undefined || updates.length === 0) {
      return null;
    }

    const view = updates[0]!.view;
    if (view.series.status === "active") return null;

    const left =
      this.store.load(active.leftAccountId) ??
      createDefaultDuelRankedProfile(
        active.leftAccountId,
      );
    const right =
      this.store.load(active.rightAccountId) ??
      createDefaultDuelRankedProfile(
        active.rightAccountId,
      );

    let leftResult: DuelRankedResult = "draw";
    if (view.series.status === "won") {
      leftResult =
        view.series.winnerId === "player-1"
          ? "win"
          : "loss";
    }
    const rightResult = oppositeRankedResult(leftResult);

    const updated = updateDuelRankedResultOnly({
      left,
      right,
      leftResult,
    });
    this.store.savePair(updated.left, updated.right);

    const occurredAtMs = Math.max(0, Math.floor(this.now()));
    try {
      this.historyStore.appendPair(
        {
          version: 1,
          eventId: "ranked:" + matchId + ":" + left.accountId,
          occurredAtMs,
          kind: "duel-settled",
          matchId,
          accountId: left.accountId,
          opponentAccountId: right.accountId,
          result: leftResult,
          duelRatingBefore: left.duelRating,
          duelRatingAfter: updated.left.duelRating,
        },
        {
          version: 1,
          eventId: "ranked:" + matchId + ":" + right.accountId,
          occurredAtMs,
          kind: "duel-settled",
          matchId,
          accountId: right.accountId,
          opponentAccountId: left.accountId,
          result: rightResult,
          duelRatingBefore: right.duelRating,
          duelRatingAfter: updated.right.duelRating,
        },
      );
      this.historyWriteError = null;
    } catch (error) {
      this.historyWriteError = errorText(error);
    }

    this.active.delete(matchId);
    this.authority.releaseFinishedRankedMatch(matchId);
    return {
      left: {
        sessionId: active.leftSessionId,
        profile: updated.left,
      },
      right: {
        sessionId: active.rightSessionId,
        profile: updated.right,
      },
    };
  }

  profile(accountId: string): DuelRankedProfile {
    return (
      this.store.load(accountId) ??
      createDefaultDuelRankedProfile(accountId)
    );
  }

  history(accountId: string): DuelRankedHistoryState {
    return this.historyStore.load(accountId);
  }

  historyDiagnostic(): string | null {
    return this.historyWriteError;
  }

  queuedSessionIds(): readonly string[] {
    return this.queue
      .snapshot()
      .map((ticket) => ticket.sessionId);
  }
}
