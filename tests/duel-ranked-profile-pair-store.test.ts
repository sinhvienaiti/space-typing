import { describe, expect, it } from "vitest";
import {
  DuelAuthorityService,
  type DuelAuthorityDependencies,
  type DuelClientMatchUpdate,
} from "../src/duel/authority";
import { DUEL_PROTOCOL_VERSION } from "../src/duel/protocol";
import type { DuelRankedProfile } from "../src/duel/ranked";
import {
  createDuelRankedHistoryState,
  type DuelRankedHistoricalEventV1,
  type DuelRankedHistoryState,
} from "../src/duel/ranked-history";
import {
  DuelRankedService,
  type DuelRankedProfileStore,
} from "../server/duel/ranked-service";
import {
  InMemoryDuelRankedHistoryStore,
  type DuelRankedHistoryStore,
} from "../server/duel/ranked-history-store";

class PairSpyStore implements DuelRankedProfileStore {
  readonly profiles = new Map<string, DuelRankedProfile>();
  singleSaves = 0;
  pairSaves = 0;

  load(accountId: string): DuelRankedProfile | null {
    const profile = this.profiles.get(accountId);
    return profile === undefined ? null : { ...profile };
  }

  save(profile: DuelRankedProfile): void {
    this.singleSaves += 1;
    this.profiles.set(profile.accountId, { ...profile });
  }

  savePair(left: DuelRankedProfile, right: DuelRankedProfile): void {
    this.pairSaves += 1;
    this.profiles.set(left.accountId, { ...left });
    this.profiles.set(right.accountId, { ...right });
  }
}

class FailingHistoryStore implements DuelRankedHistoryStore {
  load(accountId: string): DuelRankedHistoryState {
    return createDuelRankedHistoryState(accountId);
  }

  append(_event: DuelRankedHistoricalEventV1): DuelRankedHistoryState {
    throw new Error("history disk unavailable");
  }

  appendPair(
    _left: DuelRankedHistoricalEventV1,
    _right: DuelRankedHistoricalEventV1,
  ): readonly [DuelRankedHistoryState, DuelRankedHistoryState] {
    throw new Error("history disk unavailable");
  }
}

function deps(): DuelAuthorityDependencies {
  let token = 0;
  let match = 0;
  return {
    authenticate(sessionToken) {
      if (!sessionToken.startsWith("auth:")) return null;
      const accountId = sessionToken.slice(5);
      return { accountId, displayName: accountId };
    },
    token() {
      token += 1;
      return "token-" + String(token);
    },
    roomId() {
      return "ROOM-" + String(token + 1);
    },
    matchId() {
      match += 1;
      return "RANKED-" + String(match);
    },
    seed() {
      return 123;
    },
  };
}

function open(authority: DuelAuthorityService, accountId: string): string {
  const result = authority.openSession({
    protocolVersion: DUEL_PROTOCOL_VERSION,
    sessionToken: "auth:" + accountId,
    now: 0,
  });
  if (!result.ok) throw new Error(result.message);
  return result.value.sessionId;
}

function startAndFinish(
  ranked: DuelRankedService,
  authority: DuelAuthorityService,
): {
  left: string;
  right: string;
  matchId: string;
  updates: readonly DuelClientMatchUpdate[];
} {
  const left = open(authority, "left");
  const right = open(authority, "right");
  ranked.enqueue(left, 0);
  ranked.enqueue(right, 0);
  const match = ranked.pump(0)[0];
  if (match === undefined) throw new Error("Missing Ranked match.");
  const finished = authority.finishRankedForfeit(
    match.matchId,
    "player-2",
  );
  if (!finished.ok) throw new Error(finished.message);
  return {
    left,
    right,
    matchId: match.matchId,
    updates: finished.value.updates,
  };
}

describe("Ranked profile settlement persistence", () => {
  it("commits both profiles once and records authority-derived history for both accounts", () => {
    const authority = new DuelAuthorityService(deps());
    const store = new PairSpyStore();
    const history = new InMemoryDuelRankedHistoryStore();
    let ticket = 0;
    const ranked = new DuelRankedService(
      authority,
      store,
      () => "ticket-" + String(++ticket),
      history,
      () => 123_456,
    );
    const finished = startAndFinish(ranked, authority);
    const completed = ranked.completeIfFinished(
      finished.matchId,
      finished.updates,
    );

    expect(completed).not.toBeNull();
    expect(store.singleSaves).toBe(0);
    expect(store.pairSaves).toBe(1);
    expect(store.load("left")?.wins).toBe(1);
    expect(store.load("right")?.losses).toBe(1);

    const leftHistory = ranked.history("left");
    const rightHistory = ranked.history("right");
    expect(leftHistory.events).toHaveLength(1);
    expect(rightHistory.events).toHaveLength(1);
    expect(leftHistory.events[0]).toMatchObject({
      occurredAtMs: 123_456,
      matchId: finished.matchId,
      accountId: "left",
      opponentAccountId: "right",
      result: "win",
      duelRatingBefore: 1000,
      duelRatingAfter: completed?.left.profile.duelRating,
    });
    expect(rightHistory.events[0]).toMatchObject({
      occurredAtMs: 123_456,
      matchId: finished.matchId,
      accountId: "right",
      opponentAccountId: "left",
      result: "loss",
      duelRatingBefore: 1000,
      duelRatingAfter: completed?.right.profile.duelRating,
    });
    expect(ranked.historyDiagnostic()).toBeNull();
  });

  it("fails soft on analytics storage errors without double-applying Ranked rating", () => {
    const authority = new DuelAuthorityService(deps());
    const store = new PairSpyStore();
    let ticket = 0;
    const ranked = new DuelRankedService(
      authority,
      store,
      () => "ticket-" + String(++ticket),
      new FailingHistoryStore(),
      () => 123_456,
    );
    const finished = startAndFinish(ranked, authority);
    const completed = ranked.completeIfFinished(
      finished.matchId,
      finished.updates,
    );

    expect(completed).not.toBeNull();
    expect(store.pairSaves).toBe(1);
    expect(ranked.profile("left").matchesPlayed).toBe(1);
    expect(ranked.profile("right").matchesPlayed).toBe(1);
    expect(ranked.historyDiagnostic()).toContain("history disk unavailable");
    expect(authority.rankedParticipant(finished.left).ok).toBe(true);
    expect(authority.rankedParticipant(finished.right).ok).toBe(true);

    expect(ranked.completeIfFinished(
      finished.matchId,
      finished.updates,
    )).toBeNull();
    expect(store.pairSaves).toBe(1);
    expect(ranked.profile("left").matchesPlayed).toBe(1);
    expect(ranked.profile("right").matchesPlayed).toBe(1);
  });
});
