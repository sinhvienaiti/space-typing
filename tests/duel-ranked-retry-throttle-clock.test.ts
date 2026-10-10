import { describe, expect, it } from "vitest";
import {
  DuelAuthorityService,
  type DuelAuthorityDependencies,
  type DuelClientMatchUpdate,
} from "../src/duel/authority";
import { DUEL_PROTOCOL_VERSION } from "../src/duel/protocol";
import type { DuelRankedProfile } from "../src/duel/ranked";
import type {
  DuelRankedHistoricalEventV1,
  DuelRankedHistoryState,
} from "../src/duel/ranked-history";
import {
  DuelRankedService,
  InMemoryDuelRankedProfileStore,
  type DuelRankedProfileStore,
} from "../server/duel/ranked-service";
import { InMemoryDuelRankedHistoryStore } from "../server/duel/ranked-history-store";
import { InMemoryDuelRankedSettlementJournal } from "../server/duel/ranked-settlement-journal";

class FailPairProfileStore implements DuelRankedProfileStore {
  private readonly inner = new InMemoryDuelRankedProfileStore();
  failPair = true;

  load(accountId: string): DuelRankedProfile | null {
    return this.inner.load(accountId);
  }

  save(profile: DuelRankedProfile): void {
    this.inner.save(profile);
  }

  savePair(left: DuelRankedProfile, right: DuelRankedProfile): void {
    if (this.failPair) throw new Error("profile disk unavailable");
    this.inner.savePair(left, right);
  }
}

class CountingHistoryStore extends InMemoryDuelRankedHistoryStore {
  fail = true;
  attempts = 0;

  override appendPair(
    left: DuelRankedHistoricalEventV1,
    right: DuelRankedHistoricalEventV1,
  ): readonly [DuelRankedHistoryState, DuelRankedHistoryState] {
    this.attempts += 1;
    if (this.fail) throw new Error("history disk unavailable");
    return super.appendPair(left, right);
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

function finishMatch(
  ranked: DuelRankedService,
  authority: DuelAuthorityService,
): { matchId: string; updates: readonly DuelClientMatchUpdate[] } {
  const left = open(authority, "left");
  const right = open(authority, "right");
  expect(ranked.enqueue(left, 0).ok).toBe(true);
  expect(ranked.enqueue(right, 0).ok).toBe(true);
  const match = ranked.pump(0)[0];
  if (match === undefined) throw new Error("Missing Ranked match.");
  const finished = authority.finishRankedForfeit(match.matchId, "player-2");
  if (!finished.ok) throw new Error(finished.message);
  return { matchId: match.matchId, updates: finished.value.updates };
}

describe("Ranked settlement retry clock", () => {
  it("throttles from the latest failed replay time instead of the historical match timestamp", () => {
    const authority = new DuelAuthorityService(deps());
    const profiles = new FailPairProfileStore();
    const history = new CountingHistoryStore();
    const journal = new InMemoryDuelRankedSettlementJournal();
    let clock = 1_000;
    let ticket = 0;
    const ranked = new DuelRankedService(
      authority,
      profiles,
      () => "ticket-" + String(++ticket),
      history,
      () => clock,
      journal,
    );
    const finished = finishMatch(ranked, authority);

    expect(ranked.completeIfFinished(finished.matchId, finished.updates)).toBeNull();
    expect(journal.list()).toHaveLength(1);
    expect(history.attempts).toBe(0);

    profiles.failPair = false;
    clock = 10_000;
    expect(ranked.completeIfFinished(finished.matchId, finished.updates)).not.toBeNull();
    expect(history.attempts).toBe(1);
    expect(journal.list()).toHaveLength(1);

    history.fail = false;
    expect(ranked.pump(clock)).toEqual([]);
    expect(history.attempts).toBe(1);
    expect(journal.list()).toHaveLength(1);

    expect(ranked.pump(clock + 4_999)).toEqual([]);
    expect(history.attempts).toBe(1);
    expect(journal.list()).toHaveLength(1);

    expect(ranked.pump(clock + 5_000)).toEqual([]);
    expect(history.attempts).toBe(2);
    expect(journal.list()).toEqual([]);
    expect(history.load("left").events).toHaveLength(1);
    expect(history.load("right").events).toHaveLength(1);
  });
});
