import { describe, expect, it } from "vitest";
import {
  DUEL_RANKED_HISTORY_MAX_EVENTS,
  aggregateDuelRankedHistory,
  appendDuelRankedHistoricalEvent,
  createDuelRankedHistoryState,
  sanitizeDuelRankedHistoryState,
  type DuelRankedHistoricalEventV1,
} from "../src/duel/ranked-history";

function event(
  matchId: string,
  occurredAtMs: number,
  overrides: Partial<DuelRankedHistoricalEventV1> = {},
): DuelRankedHistoricalEventV1 {
  return {
    version: 1,
    eventId: "ranked:" + matchId + ":left",
    occurredAtMs,
    kind: "duel-settled",
    matchId,
    accountId: "left",
    opponentAccountId: "right",
    result: "win",
    duelRatingBefore: 1000,
    duelRatingAfter: 1020,
    ...overrides,
  };
}

describe("Ranked Duel historical analytics", () => {
  it("keeps history strictly account scoped and idempotent by match", () => {
    let state = createDuelRankedHistoryState("left");
    state = appendDuelRankedHistoricalEvent(state, event("m1", 100));
    const duplicate = appendDuelRankedHistoricalEvent(
      state,
      event("m1", 200, { duelRatingAfter: 2000 }),
    );
    const wrongAccount = appendDuelRankedHistoricalEvent(
      state,
      event("m2", 300, { accountId: "other" }),
    );

    expect(state.events).toHaveLength(1);
    expect(duplicate).toEqual(state);
    expect(wrongAccount).toEqual(state);
    expect(state.events[0]?.duelRatingAfter).toBe(1020);
  });

  it("sanitizes malformed rows and rejects cross-account rows", () => {
    const state = sanitizeDuelRankedHistoryState({
      version: 1,
      accountId: "left",
      events: [
        event("valid", 1),
        event("wrong-account", 2, { accountId: "right" }),
        event("same-opponent", 3, { opponentAccountId: "left" }),
        { ...event("future", 4), version: 9 },
      ],
    }, "left");

    expect(state.events.map((row) => row.matchId)).toEqual(["valid"]);
    expect(sanitizeDuelRankedHistoryState({
      version: 9,
      accountId: "left",
      events: [event("x", 1)],
    }, "left")).toEqual(createDuelRankedHistoryState("left"));
  });

  it("retains a deterministic bounded tail", () => {
    let state = createDuelRankedHistoryState("left");
    for (let index = 0; index < DUEL_RANKED_HISTORY_MAX_EVENTS + 5; index += 1) {
      state = appendDuelRankedHistoricalEvent(
        state,
        event("m" + String(index), index),
      );
    }

    expect(state.events).toHaveLength(DUEL_RANKED_HISTORY_MAX_EVENTS);
    expect(state.events[0]?.matchId).toBe("m5");
    expect(state.events.at(-1)?.matchId).toBe(
      "m" + String(DUEL_RANKED_HISTORY_MAX_EVENTS + 4),
    );
  });

  it("aggregates end-exclusive Ranked results and exact rating deltas", () => {
    let state = createDuelRankedHistoryState("left");
    state = appendDuelRankedHistoricalEvent(
      state,
      event("win", 100, {
        result: "win",
        duelRatingBefore: 1000,
        duelRatingAfter: 1020,
      }),
    );
    state = appendDuelRankedHistoricalEvent(
      state,
      event("loss", 200, {
        result: "loss",
        duelRatingBefore: 1020,
        duelRatingAfter: 1005,
      }),
    );
    state = appendDuelRankedHistoricalEvent(
      state,
      event("draw", 300, {
        result: "draw",
        duelRatingBefore: 1005,
        duelRatingAfter: 1005,
      }),
    );
    state = appendDuelRankedHistoricalEvent(
      state,
      event("outside", 400, {
        result: "win",
        duelRatingBefore: 1005,
        duelRatingAfter: 1025,
      }),
    );

    expect(aggregateDuelRankedHistory(state, {
      startMs: 100,
      endMs: 400,
    })).toEqual({
      accountId: "left",
      period: { startMs: 100, endMs: 400 },
      matchCount: 3,
      wins: 1,
      losses: 1,
      draws: 1,
      ratingDelta: 5,
      ratingStart: 1000,
      ratingEnd: 1005,
    });
  });

  it("returns explicit no-data aggregates", () => {
    expect(aggregateDuelRankedHistory(
      createDuelRankedHistoryState("left"),
      { startMs: 0, endMs: 100 },
    )).toEqual({
      accountId: "left",
      period: { startMs: 0, endMs: 100 },
      matchCount: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      ratingDelta: 0,
      ratingStart: null,
      ratingEnd: null,
    });
  });
});
