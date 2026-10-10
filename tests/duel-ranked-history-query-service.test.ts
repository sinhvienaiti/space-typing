import { describe, expect, it, vi } from "vitest";
import type { DuelAuthenticatedIdentity } from "../src/duel/authority";
import {
  appendDuelRankedHistoricalEvent,
  createDuelRankedHistoryState,
  type DuelRankedHistoryState,
} from "../src/duel/ranked-history";
import {
  DuelRankedHistoryQueryService,
  type DuelRankedHistoryReader,
} from "../server/duel/ranked-history-query-service";

const START = 1000;
const END = 2000;

function state(accountId: string): DuelRankedHistoryState {
  let value = createDuelRankedHistoryState(accountId);
  value = appendDuelRankedHistoricalEvent(value, {
    version: 1,
    eventId: "ranked:m1:" + accountId,
    occurredAtMs: 1400,
    kind: "duel-settled",
    matchId: "m1",
    accountId,
    opponentAccountId: accountId === "pilot-a" ? "pilot-b" : "pilot-a",
    result: "win",
    duelRatingBefore: 1000,
    duelRatingAfter: 1020,
  });
  return appendDuelRankedHistoricalEvent(value, {
    version: 1,
    eventId: "ranked:m2:" + accountId,
    occurredAtMs: 1500,
    kind: "duel-settled",
    matchId: "m2",
    accountId,
    opponentAccountId: accountId === "pilot-a" ? "pilot-b" : "pilot-a",
    result: "loss",
    duelRatingBefore: 1020,
    duelRatingAfter: 1005,
  });
}

function identity(accountId: string): DuelAuthenticatedIdentity {
  return {
    accountId,
    displayName: "Pilot " + accountId,
  };
}

function reader(states: Record<string, DuelRankedHistoryState>): {
  reader: DuelRankedHistoryReader;
  history: ReturnType<typeof vi.fn>;
} {
  const history = vi.fn((accountId: string) =>
    states[accountId] ?? createDuelRankedHistoryState(accountId),
  );
  return {
    reader: { history },
    history,
  };
}

describe("Ranked Duel historical query authorization", () => {
  it("rejects invalid credentials before touching persisted history", () => {
    const source = reader({ "pilot-a": state("pilot-a") });
    const service = new DuelRankedHistoryQueryService(
      source.reader,
      () => null,
    );

    expect(service.read({
      credential: "bad-token",
      period: { startMs: START, endMs: END },
    })).toEqual({
      ok: false,
      code: "UNAUTHENTICATED",
      message: "A valid authenticated identity is required.",
    });
    expect(source.history).not.toHaveBeenCalled();
  });

  it("allows authenticated self history and returns bounded newest-first events", () => {
    const source = reader({ "pilot-a": state("pilot-a") });
    const service = new DuelRankedHistoryQueryService(
      source.reader,
      (credential) => credential === "token-a" ? identity("pilot-a") : null,
    );

    const result = service.read({
      credential: "token-a",
      period: { startMs: START, endMs: END },
      events: { result: "win", limit: 1 },
    });
    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        scope: "self",
        requesterAccountId: "pilot-a",
        targetAccountId: "pilot-a",
      }),
    );
    if (!result.ok) throw new Error(result.message);
    expect(result.surface.crossPlayerSupported).toBe(false);
    expect(result.surface.accountId).toBe("pilot-a");
    expect(result.surface.rows.find((row) => row.id === "matches")?.value)
      .toBe("2");
    expect(result.events.map((event) => event.matchId)).toEqual(["m1"]);
  });

  it("uses the requested period for both aggregate and event rows", () => {
    const source = reader({ "pilot-a": state("pilot-a") });
    const service = new DuelRankedHistoryQueryService(
      source.reader,
      () => identity("pilot-a"),
    );

    const result = service.read({
      credential: "token-a",
      period: { startMs: 1450, endMs: END },
    });
    if (!result.ok) throw new Error(result.message);
    expect(result.surface.rows.find((row) => row.id === "matches")?.value)
      .toBe("1");
    expect(result.events.map((event) => event.matchId)).toEqual(["m2"]);
  });

  it("denies cross-player lookup by default without loading the target account", () => {
    const source = reader({
      "pilot-a": state("pilot-a"),
      "pilot-b": state("pilot-b"),
    });
    const service = new DuelRankedHistoryQueryService(
      source.reader,
      () => identity("pilot-a"),
    );

    expect(service.read({
      credential: "token-a",
      targetAccountId: "pilot-b",
      period: { startMs: START, endMs: END },
    })).toEqual({
      ok: false,
      code: "FORBIDDEN",
      message: "Cross-player Ranked history access is not configured.",
    });
    expect(source.history).not.toHaveBeenCalled();
  });

  it("requires an explicit server authorizer for cross-player history", () => {
    const source = reader({ "pilot-b": state("pilot-b") });
    const authorize = vi.fn(() => true);
    const service = new DuelRankedHistoryQueryService(
      source.reader,
      (credential) => credential === "admin-token"
        ? identity("admin-account")
        : null,
      authorize,
    );

    const result = service.read({
      credential: "admin-token",
      targetAccountId: "pilot-b",
      period: { startMs: START, endMs: END },
      events: { limit: 1 },
    });
    expect(authorize).toHaveBeenCalledWith({
      requester: identity("admin-account"),
      targetAccountId: "pilot-b",
    });
    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        scope: "authorized-cross-player",
        requesterAccountId: "admin-account",
        targetAccountId: "pilot-b",
      }),
    );
    if (!result.ok) throw new Error(result.message);
    expect(result.surface.crossPlayerSupported).toBe(true);
    expect(result.surface.accountId).toBe("pilot-b");
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.matchId).toBe("m2");
    expect(result.surface.diagnostics.join(" "))
      .toContain("authenticated server authorization boundary");
  });

  it("fails closed when the cross-player authorizer denies or throws", () => {
    const source = reader({ "pilot-b": state("pilot-b") });
    for (const authorize of [
      () => false,
      () => {
        throw new Error("policy unavailable");
      },
    ]) {
      const service = new DuelRankedHistoryQueryService(
        source.reader,
        () => identity("admin-account"),
        authorize,
      );
      const result = service.read({
        credential: "admin-token",
        targetAccountId: "pilot-b",
        period: { startMs: START, endMs: END },
      });
      expect(result).toEqual(
        expect.objectContaining({
          ok: false,
          code: "FORBIDDEN",
        }),
      );
    }
    expect(source.history).not.toHaveBeenCalled();
  });

  it("validates target, period, and event query before querying storage", () => {
    const source = reader({});
    const service = new DuelRankedHistoryQueryService(
      source.reader,
      () => identity("pilot-a"),
    );

    expect(service.read({
      credential: "token-a",
      targetAccountId: " pilot-a ",
      period: { startMs: START, endMs: END },
    })).toEqual(
      expect.objectContaining({ ok: false, code: "INVALID_TARGET" }),
    );
    expect(service.read({
      credential: "token-a",
      period: { startMs: END, endMs: START },
    })).toEqual(
      expect.objectContaining({ ok: false, code: "INVALID_PERIOD" }),
    );
    expect(service.read({
      credential: "token-a",
      period: { startMs: START, endMs: END },
      events: { limit: -1 },
    })).toEqual(
      expect.objectContaining({ ok: false, code: "INVALID_QUERY" }),
    );
    expect(service.read({
      credential: "token-a",
      period: { startMs: START, endMs: END },
      events: { result: "victory" as "win" },
    })).toEqual(
      expect.objectContaining({ ok: false, code: "INVALID_QUERY" }),
    );
    expect(source.history).not.toHaveBeenCalled();
  });

  it("fails closed when authorized history storage is unavailable", () => {
    const history = vi.fn((): DuelRankedHistoryState => {
      throw new Error("/private/data/ranked-history.json permission denied");
    });
    const service = new DuelRankedHistoryQueryService(
      { history },
      () => identity("pilot-a"),
    );

    expect(service.read({
      credential: "token-a",
      period: { startMs: START, endMs: END },
    })).toEqual({
      ok: false,
      code: "UNAVAILABLE",
      message: "Ranked history storage is temporarily unavailable.",
    });
    expect(history).toHaveBeenCalledWith("pilot-a");
  });

  it("hard-caps oversized event limits while keeping the query authorized", () => {
    let historyState = createDuelRankedHistoryState("pilot-a");
    for (let index = 0; index < 80; index += 1) {
      historyState = appendDuelRankedHistoricalEvent(historyState, {
        version: 1,
        eventId: "ranked:m" + String(index) + ":pilot-a",
        occurredAtMs: START + index,
        kind: "duel-settled",
        matchId: "m" + String(index),
        accountId: "pilot-a",
        opponentAccountId: "pilot-b",
        result: "win",
        duelRatingBefore: 1000,
        duelRatingAfter: 1001,
      });
    }
    const source = reader({ "pilot-a": historyState });
    const service = new DuelRankedHistoryQueryService(
      source.reader,
      () => identity("pilot-a"),
    );
    const result = service.read({
      credential: "token-a",
      period: { startMs: START, endMs: END },
      events: { limit: 99999 },
    });
    if (!result.ok) throw new Error(result.message);
    expect(result.events).toHaveLength(80);
  });
});
