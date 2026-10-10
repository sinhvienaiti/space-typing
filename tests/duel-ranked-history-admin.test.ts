import { describe, expect, it } from "vitest";
import {
  appendDuelRankedHistoricalEvent,
  createDuelRankedHistoryState,
} from "../src/duel/ranked-history";
import { buildDuelRankedHistoryAdminSurface } from "../src/duel/ranked-history-admin";

const START = Date.parse("2026-10-10T00:00:00.000Z");
const END = Date.parse("2026-10-11T00:00:00.000Z");

describe("Ranked Duel historical admin surface", () => {
  it("shows explicit no-data state without substituting live profile values", () => {
    const surface = buildDuelRankedHistoryAdminSurface(
      createDuelRankedHistoryState("pilot-a"),
      { startMs: START, endMs: END },
    );

    expect(surface.source).toBe("no-historical-records");
    expect(surface.canMutate).toBe(false);
    expect(surface.crossPlayerSupported).toBe(false);
    expect(surface.rows.find((row) => row.id === "rating")?.value)
      .toBe("No historical data");
    expect(surface.diagnostics.join(" ")).toContain("live rating/profile values are not substituted");
  });

  it("renders only persisted authoritative settlements inside the requested period", () => {
    let state = createDuelRankedHistoryState("pilot-a");
    state = appendDuelRankedHistoricalEvent(state, {
      version: 1,
      eventId: "ranked:m1:pilot-a",
      occurredAtMs: START + 1,
      kind: "duel-settled",
      matchId: "m1",
      accountId: "pilot-a",
      opponentAccountId: "pilot-b",
      result: "win",
      duelRatingBefore: 1000,
      duelRatingAfter: 1020,
    });
    state = appendDuelRankedHistoricalEvent(state, {
      version: 1,
      eventId: "ranked:m2:pilot-a",
      occurredAtMs: END,
      kind: "duel-settled",
      matchId: "m2",
      accountId: "pilot-a",
      opponentAccountId: "pilot-c",
      result: "loss",
      duelRatingBefore: 1020,
      duelRatingAfter: 1005,
    });

    const surface = buildDuelRankedHistoryAdminSurface(
      state,
      { startMs: START, endMs: END },
    );

    expect(surface.source).toBe("historical-persisted");
    expect(surface.accountId).toBe("pilot-a");
    expect(surface.rows.find((row) => row.id === "matches")?.value).toBe("1");
    expect(surface.rows.find((row) => row.id === "record")?.value).toBe("1 / 0 / 0");
    expect(surface.rows.find((row) => row.id === "rating")?.value).toBe("1000 → 1020");
    expect(surface.rows.find((row) => row.id === "rating-delta")?.value).toBe("+20");
    expect(surface.diagnostics.join(" ")).toContain("authoritative Ranked settlements");
  });
});
