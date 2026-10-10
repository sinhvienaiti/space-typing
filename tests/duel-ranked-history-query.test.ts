import { describe, expect, it } from "vitest";
import {
  DUEL_RANKED_HISTORY_MAX_EVENTS,
  appendDuelRankedHistoricalEvent,
  createDuelRankedHistoryState,
  queryDuelRankedHistory,
  type DuelRankedHistoryState,
  type DuelRankedHistoricalResult,
} from "../src/duel/ranked-history";

function append(
  state: DuelRankedHistoryState,
  input: {
    matchId: string;
    occurredAtMs: number;
    result?: DuelRankedHistoricalResult;
  },
): DuelRankedHistoryState {
  return appendDuelRankedHistoricalEvent(state, {
    version: 1,
    eventId: "ranked:" + input.matchId + ":pilot-a",
    occurredAtMs: input.occurredAtMs,
    kind: "duel-settled",
    matchId: input.matchId,
    accountId: "pilot-a",
    opponentAccountId: "pilot-b",
    result: input.result ?? "win",
    duelRatingBefore: 1000,
    duelRatingAfter: 1010,
  });
}

function sample(): DuelRankedHistoryState {
  let state = createDuelRankedHistoryState("pilot-a");
  state = append(state, {
    matchId: "m1",
    occurredAtMs: 100,
    result: "win",
  });
  state = append(state, {
    matchId: "m2",
    occurredAtMs: 200,
    result: "loss",
  });
  state = append(state, {
    matchId: "m3",
    occurredAtMs: 300,
    result: "win",
  });
  return state;
}

describe("Ranked Duel bounded historical query", () => {
  it("returns newest-first persisted events by default", () => {
    expect(
      queryDuelRankedHistory(sample()).map((event) => event.matchId),
    ).toEqual(["m3", "m2", "m1"]);
  });

  it("applies an inclusive start, exclusive end, result filter, and limit", () => {
    expect(
      queryDuelRankedHistory(sample(), {
        startMs: 100,
        endMs: 301,
        result: "win",
        limit: 1,
      }).map((event) => event.matchId),
    ).toEqual(["m3"]);

    expect(
      queryDuelRankedHistory(sample(), {
        startMs: 100,
        endMs: 300,
      }).map((event) => event.matchId),
    ).toEqual(["m2", "m1"]);
  });

  it("treats a zero or negative limit as an empty bounded query", () => {
    expect(queryDuelRankedHistory(sample(), { limit: 0 })).toEqual([]);
    expect(queryDuelRankedHistory(sample(), { limit: -10 })).toEqual([]);
  });

  it("caps oversized limits at the persisted history bound", () => {
    let state = createDuelRankedHistoryState("pilot-a");
    for (let index = 0; index < DUEL_RANKED_HISTORY_MAX_EVENTS; index += 1) {
      state = append(state, {
        matchId: "m-" + String(index).padStart(4, "0"),
        occurredAtMs: index,
      });
    }

    const rows = queryDuelRankedHistory(state, {
      limit: DUEL_RANKED_HISTORY_MAX_EVENTS * 10,
    });
    expect(rows).toHaveLength(DUEL_RANKED_HISTORY_MAX_EVENTS);
    expect(rows[0]?.occurredAtMs).toBe(DUEL_RANKED_HISTORY_MAX_EVENTS - 1);
    expect(rows.at(-1)?.occurredAtMs).toBe(0);
  });

  it("normalizes non-finite numeric query fields without exposing unbounded invalid state", () => {
    expect(
      queryDuelRankedHistory(sample(), {
        startMs: Number.NaN,
        endMs: Number.POSITIVE_INFINITY,
        limit: Number.NaN,
      }).map((event) => event.matchId),
    ).toEqual(["m3", "m2", "m1"]);

    expect(
      queryDuelRankedHistory(sample(), {
        startMs: -500,
        endMs: 201,
      }).map((event) => event.matchId),
    ).toEqual(["m2", "m1"]);
  });

  it("uses deterministic ordering for equal timestamps", () => {
    let state = createDuelRankedHistoryState("pilot-a");
    state = append(state, { matchId: "a", occurredAtMs: 100 });
    state = append(state, { matchId: "b", occurredAtMs: 100 });

    expect(
      queryDuelRankedHistory(state).map((event) => event.matchId),
    ).toEqual(["b", "a"]);
  });
});
