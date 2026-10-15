import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { DuelRankedProfile } from "../src/duel/ranked";
import type {
  DuelRankedHistoricalEventV1,
  DuelRankedHistoricalResult,
} from "../src/duel/ranked-history";
import {
  CorruptDuelRankedSettlementJournalError,
  InMemoryDuelRankedSettlementJournal,
  JsonFileDuelRankedSettlementJournal,
  UnsupportedDuelRankedSettlementJournalVersionError,
  sanitizeDuelRankedPendingSettlement,
  type DuelRankedPendingSettlementV1,
} from "../server/duel/ranked-settlement-journal";

const roots: string[] = [];

afterEach(() => {
  while (roots.length > 0) {
    rmSync(roots.pop()!, { recursive: true, force: true });
  }
});

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

function afterProfile(
  before: DuelRankedProfile,
  result: DuelRankedHistoricalResult,
  duelRating: number,
): DuelRankedProfile {
  return {
    ...before,
    duelRating,
    matchesPlayed: before.matchesPlayed + 1,
    wins: before.wins + (result === "win" ? 1 : 0),
    losses: before.losses + (result === "loss" ? 1 : 0),
    draws: before.draws + (result === "draw" ? 1 : 0),
  };
}

function history(
  matchId: string,
  before: DuelRankedProfile,
  after: DuelRankedProfile,
  opponentAccountId: string,
  result: DuelRankedHistoricalResult,
): DuelRankedHistoricalEventV1 {
  return {
    version: 1,
    eventId: "ranked:" + matchId + ":" + before.accountId,
    occurredAtMs: 123_456,
    kind: "duel-settled",
    matchId,
    accountId: before.accountId,
    opponentAccountId,
    result,
    duelRatingBefore: before.duelRating,
    duelRatingAfter: after.duelRating,
  };
}

function settlement(matchId = "m1"): DuelRankedPendingSettlementV1 {
  const leftBefore = profile("left");
  const rightBefore = profile("right");
  const leftAfter = afterProfile(leftBefore, "win", 1020);
  const rightAfter = afterProfile(rightBefore, "loss", 980);
  return {
    version: 1,
    matchId,
    left: {
      before: leftBefore,
      after: leftAfter,
      history: history(matchId, leftBefore, leftAfter, "right", "win"),
    },
    right: {
      before: rightBefore,
      after: rightAfter,
      history: history(matchId, rightBefore, rightAfter, "left", "loss"),
    },
  };
}

function journalPath(): { root: string; file: string } {
  const root = mkdtempSync(join(tmpdir(), "space-typing-ranked-journal-"));
  roots.push(root);
  return { root, file: join(root, "ranked.settlements.json") };
}

describe("Ranked Duel settlement journal", () => {
  it("validates a complete authority-derived settlement transition", () => {
    const pending = settlement();
    expect(sanitizeDuelRankedPendingSettlement(pending)).toEqual(pending);
    expect(
      sanitizeDuelRankedPendingSettlement({
        ...pending,
        left: {
          ...pending.left,
          after: {
            ...pending.left.after,
            matchesPlayed: 4,
          },
        },
      }),
    ).toBeNull();
    expect(
      sanitizeDuelRankedPendingSettlement({
        ...pending,
        right: {
          ...pending.right,
          history: {
            ...pending.right.history,
            result: "win",
          },
        },
      }),
    ).toBeNull();
  });

  it("keeps in-memory writes idempotent and rejects conflicting reuse of a match id", () => {
    const journal = new InMemoryDuelRankedSettlementJournal();
    const pending = settlement();

    journal.put(pending);
    journal.put(pending);
    expect(journal.list()).toEqual([pending]);
    expect(journal.get("m1")).toEqual(pending);

    expect(() => journal.put({
      ...pending,
      left: {
        ...pending.left,
        history: {
          ...pending.left.history,
          occurredAtMs: 123_457,
        },
      },
      right: {
        ...pending.right,
        history: {
          ...pending.right.history,
          occurredAtMs: 123_457,
        },
      },
    })).toThrow("Conflicting Ranked Duel pending settlement");
    expect(journal.list()).toEqual([pending]);

    journal.remove("m1");
    expect(journal.list()).toEqual([]);
  });

  it("persists pending settlements for crash recovery and removes them atomically", () => {
    const { file } = journalPath();
    const pending = settlement();
    const journal = new JsonFileDuelRankedSettlementJournal(file);

    journal.put(pending);
    expect(new JsonFileDuelRankedSettlementJournal(file).list()).toEqual([pending]);

    journal.remove(pending.matchId);
    expect(new JsonFileDuelRankedSettlementJournal(file).list()).toEqual([]);
  });

  it("fails closed on corrupt storage without overwriting the original bytes", () => {
    const { file } = journalPath();
    writeFileSync(file, "{broken", "utf8");
    const original = readFileSync(file, "utf8");

    expect(() => new JsonFileDuelRankedSettlementJournal(file))
      .toThrow(CorruptDuelRankedSettlementJournalError);
    expect(readFileSync(file, "utf8")).toBe(original);
  });

  it("fails closed on a future journal version", () => {
    const { file } = journalPath();
    const original = JSON.stringify({ version: 9, settlements: {} });
    writeFileSync(file, original, "utf8");

    expect(() => new JsonFileDuelRankedSettlementJournal(file))
      .toThrow(UnsupportedDuelRankedSettlementJournalVersionError);
    expect(readFileSync(file, "utf8")).toBe(original);
  });

  it("rejects corrupt settlement rows instead of silently dropping them", () => {
    const { file } = journalPath();
    const pending = settlement();
    writeFileSync(
      file,
      JSON.stringify({
        version: 1,
        settlements: {
          m1: {
            ...pending,
            left: {
              ...pending.left,
              history: {
                ...pending.left.history,
                opponentAccountId: "someone-else",
              },
            },
          },
        },
      }),
      "utf8",
    );

    expect(() => new JsonFileDuelRankedSettlementJournal(file))
      .toThrow(CorruptDuelRankedSettlementJournalError);
  });
});
