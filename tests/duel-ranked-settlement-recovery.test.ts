import {
  mkdtempSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
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
  JsonFileDuelRankedProfileStore,
  type DuelRankedProfileStore,
} from "../server/duel/ranked-service";
import {
  InMemoryDuelRankedHistoryStore,
} from "../server/duel/ranked-history-store";
import {
  InMemoryDuelRankedSettlementJournal,
  JsonFileDuelRankedSettlementJournal,
  type DuelRankedPendingSettlementV1,
} from "../server/duel/ranked-settlement-journal";

const roots: string[] = [];

afterEach(() => {
  while (roots.length > 0) {
    rmSync(roots.pop()!, { recursive: true, force: true });
  }
});

class ToggleHistoryStore extends InMemoryDuelRankedHistoryStore {
  fail = true;

  override appendPair(
    left: DuelRankedHistoricalEventV1,
    right: DuelRankedHistoricalEventV1,
  ): readonly [DuelRankedHistoryState, DuelRankedHistoryState] {
    if (this.fail) throw new Error("history disk unavailable");
    return super.appendPair(left, right);
  }
}

class FailOnceProfileStore implements DuelRankedProfileStore {
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
): {
  leftSessionId: string;
  rightSessionId: string;
  matchId: string;
  updates: readonly DuelClientMatchUpdate[];
} {
  const leftSessionId = open(authority, "left");
  const rightSessionId = open(authority, "right");
  expect(ranked.enqueue(leftSessionId, 0).ok).toBe(true);
  expect(ranked.enqueue(rightSessionId, 0).ok).toBe(true);
  const match = ranked.pump(0)[0];
  if (match === undefined) throw new Error("Missing Ranked match.");
  const finished = authority.finishRankedForfeit(
    match.matchId,
    "player-2",
  );
  if (!finished.ok) throw new Error(finished.message);
  return {
    leftSessionId,
    rightSessionId,
    matchId: match.matchId,
    updates: finished.value.updates,
  };
}

function profile(
  accountId: string,
  overrides: Partial<DuelRankedProfile> = {},
): DuelRankedProfile {
  return {
    accountId,
    typingRating: 1000,
    duelRating: 1000,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    ...overrides,
  };
}

function pendingSettlement(matchId = "recovery-match"): DuelRankedPendingSettlementV1 {
  const leftBefore = profile("left");
  const rightBefore = profile("right");
  const leftAfter = profile("left", {
    duelRating: 1020,
    matchesPlayed: 1,
    wins: 1,
  });
  const rightAfter = profile("right", {
    duelRating: 980,
    matchesPlayed: 1,
    losses: 1,
  });
  const occurredAtMs = 123_456;
  return {
    version: 1,
    matchId,
    left: {
      before: leftBefore,
      after: leftAfter,
      history: {
        version: 1,
        eventId: "ranked:" + matchId + ":left",
        occurredAtMs,
        kind: "duel-settled",
        matchId,
        accountId: "left",
        opponentAccountId: "right",
        result: "win",
        duelRatingBefore: leftBefore.duelRating,
        duelRatingAfter: leftAfter.duelRating,
      },
    },
    right: {
      before: rightBefore,
      after: rightAfter,
      history: {
        version: 1,
        eventId: "ranked:" + matchId + ":right",
        occurredAtMs,
        kind: "duel-settled",
        matchId,
        accountId: "right",
        opponentAccountId: "left",
        result: "loss",
        duelRatingBefore: rightBefore.duelRating,
        duelRatingAfter: rightAfter.duelRating,
      },
    },
  };
}

function profilePath(): string {
  const root = mkdtempSync(join(tmpdir(), "space-typing-ranked-recovery-"));
  roots.push(root);
  return join(root, "ranked-profiles.json");
}

describe("Ranked Duel settlement recovery", () => {
  it("retries a failed history write without blocking gameplay or double-applying rating", () => {
    const authority = new DuelAuthorityService(deps());
    const profiles = new InMemoryDuelRankedProfileStore();
    const history = new ToggleHistoryStore();
    const journal = new InMemoryDuelRankedSettlementJournal();
    let clock = 1000;
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

    const completed = ranked.completeIfFinished(
      finished.matchId,
      finished.updates,
    );
    expect(completed).not.toBeNull();
    expect(ranked.profile("left").matchesPlayed).toBe(1);
    expect(ranked.profile("right").matchesPlayed).toBe(1);
    expect(history.load("left").events).toEqual([]);
    expect(journal.list()).toHaveLength(1);
    expect(ranked.historyDiagnostic()).toContain("history disk unavailable");
    expect(authority.rankedParticipant(finished.leftSessionId).ok).toBe(true);
    expect(authority.rankedParticipant(finished.rightSessionId).ok).toBe(true);

    history.fail = false;
    clock += 5000;
    expect(ranked.pump(clock)).toEqual([]);
    expect(journal.list()).toEqual([]);
    expect(history.load("left").events).toHaveLength(1);
    expect(history.load("right").events).toHaveLength(1);
    expect(ranked.profile("left").matchesPlayed).toBe(1);
    expect(ranked.profile("right").matchesPlayed).toBe(1);
    expect(ranked.historyDiagnostic()).toBeNull();
  });

  it("does not let background recovery consume a pending settlement for a still-active match", () => {
    const authority = new DuelAuthorityService(deps());
    const profiles = new FailOnceProfileStore();
    const history = new InMemoryDuelRankedHistoryStore();
    const journal = new InMemoryDuelRankedSettlementJournal();
    let ticket = 0;
    const ranked = new DuelRankedService(
      authority,
      profiles,
      () => "ticket-" + String(++ticket),
      history,
      () => 1000,
      journal,
    );
    const finished = finishMatch(ranked, authority);

    expect(
      ranked.completeIfFinished(finished.matchId, finished.updates),
    ).toBeNull();
    expect(journal.list()).toHaveLength(1);
    expect(ranked.profile("left").matchesPlayed).toBe(0);
    expect(history.load("left").events).toEqual([]);

    profiles.failPair = false;
    expect(ranked.pump(10_000)).toEqual([]);
    expect(journal.list()).toHaveLength(1);
    expect(ranked.profile("left").matchesPlayed).toBe(0);
    expect(history.load("left").events).toEqual([]);

    const completed = ranked.completeIfFinished(
      finished.matchId,
      finished.updates,
    );
    expect(completed).not.toBeNull();
    expect(journal.list()).toEqual([]);
    expect(ranked.profile("left").matchesPlayed).toBe(1);
    expect(ranked.profile("right").matchesPlayed).toBe(1);
    expect(history.load("left").events).toHaveLength(1);
    expect(history.load("right").events).toHaveLength(1);
  });

  it("replays a crash journal on service startup before new Ranked work begins", () => {
    const path = profilePath();
    const pending = pendingSettlement();
    const journal = new JsonFileDuelRankedSettlementJournal(
      path + ".settlements.json",
    );
    journal.put(pending);

    const authority = new DuelAuthorityService(deps());
    const ranked = new DuelRankedService(
      authority,
      new JsonFileDuelRankedProfileStore(path),
      () => "ticket",
      undefined,
      () => 999_999,
    );

    expect(ranked.profile("left")).toEqual(pending.left.after);
    expect(ranked.profile("right")).toEqual(pending.right.after);
    expect(ranked.history("left").events[0]).toEqual(pending.left.history);
    expect(ranked.history("right").events[0]).toEqual(pending.right.history);
    expect(
      new JsonFileDuelRankedSettlementJournal(
        path + ".settlements.json",
      ).list(),
    ).toEqual([]);
    expect(ranked.historyDiagnostic()).toBeNull();
  });

  it("never rolls a newer profile backward while replaying an older pending history row", () => {
    const path = profilePath();
    const pending = pendingSettlement();
    const profiles = new JsonFileDuelRankedProfileStore(path);
    const newerLeft = profile("left", {
      duelRating: 1040,
      matchesPlayed: 2,
      wins: 2,
    });
    const newerRight = profile("right", {
      duelRating: 960,
      matchesPlayed: 2,
      losses: 2,
    });
    profiles.savePair(newerLeft, newerRight);
    const journal = new JsonFileDuelRankedSettlementJournal(
      path + ".settlements.json",
    );
    journal.put(pending);

    const authority = new DuelAuthorityService(deps());
    const ranked = new DuelRankedService(
      authority,
      new JsonFileDuelRankedProfileStore(path),
      () => "ticket",
      undefined,
      () => 999_999,
    );

    expect(ranked.profile("left")).toEqual(newerLeft);
    expect(ranked.profile("right")).toEqual(newerRight);
    expect(ranked.history("left").events[0]).toEqual(pending.left.history);
    expect(ranked.history("right").events[0]).toEqual(pending.right.history);
    expect(
      new JsonFileDuelRankedSettlementJournal(
        path + ".settlements.json",
      ).list(),
    ).toEqual([]);
  });
});
