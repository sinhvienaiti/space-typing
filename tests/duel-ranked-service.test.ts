import { describe, expect, it } from "vitest";
import {
  DuelAuthorityService,
  type DuelAuthorityDependencies,
} from "../src/duel/authority";
import { DUEL_PROTOCOL_VERSION } from "../src/duel/protocol";
import { DUEL_RANKED_RECONNECT_GRACE_MS } from "../src/duel/ranked";
import {
  DuelRankedService,
  InMemoryDuelRankedProfileStore,
} from "../server/duel/ranked-service";

function deps(): DuelAuthorityDependencies {
  let token = 0;
  let match = 0;
  let seed = 50;
  return {
    authenticate(sessionToken) {
      if (!sessionToken.startsWith("auth:")) return null;
      const accountId = sessionToken.slice(5);
      return {
        accountId,
        displayName: "Pilot-" + accountId,
      };
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
      seed += 1;
      return seed;
    },
  };
}

function open(
  authority: DuelAuthorityService,
  accountId: string,
) {
  const result = authority.openSession({
    protocolVersion: DUEL_PROTOCOL_VERSION,
    sessionToken: "auth:" + accountId,
    now: 0,
  });
  if (!result.ok) throw new Error(result.message);
  return result.value.sessionId;
}

describe("Duel ranked server service", () => {
  it("queues eligible sessions and starts a normalized authoritative match", () => {
    const authority = new DuelAuthorityService(deps());
    const store = new InMemoryDuelRankedProfileStore();
    let ticket = 0;
    const ranked = new DuelRankedService(
      authority,
      store,
      () => "ticket-" + String(++ticket),
    );
    const left = open(authority, "left");
    const right = open(authority, "right");

    expect(ranked.enqueue(left, 0)).toEqual(
      expect.objectContaining({
        ok: true,
        value: expect.objectContaining({
          status: "queued",
          matchmakingRating: 1000,
        }),
      }),
    );
    expect(ranked.enqueue(right, 0).ok).toBe(true);

    const matches = ranked.pump(1000);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.updates).toHaveLength(2);
    expect(
      matches[0]?.updates.every(
        (update) =>
          update.view.mode === "ranked" &&
          update.view.combatProfile === "normalized",
      ),
    ).toBe(true);
  });

  it("does not queue the same session twice", () => {
    const authority = new DuelAuthorityService(deps());
    const ranked = new DuelRankedService(
      authority,
      new InMemoryDuelRankedProfileStore(),
      () => "ticket",
    );
    const session = open(authority, "solo");
    expect(ranked.enqueue(session, 0).ok).toBe(true);
    expect(ranked.enqueue(session, 1)).toEqual(
      expect.objectContaining({
        ok: false,
        code: "RANKED_INELIGIBLE",
      }),
    );
  });

  it("restores a disconnected Ranked player inside grace and does not forfeit", () => {
    const authority = new DuelAuthorityService(deps());
    const ranked = new DuelRankedService(
      authority,
      new InMemoryDuelRankedProfileStore(),
      () => "ticket-reconnect",
    );
    const left = open(authority, "left-reconnect");
    const right = open(authority, "right-reconnect");
    ranked.enqueue(left, 0);
    ranked.enqueue(right, 0);
    const match = ranked.pump(0)[0];
    if (match === undefined) throw new Error("Missing ranked match.");

    ranked.disconnect(left, 1000);
    expect(
      ranked.resolveDisconnects(
        1000 + DUEL_RANKED_RECONNECT_GRACE_MS - 1,
      ),
    ).toEqual([]);

    expect(ranked.reconnect(left)).toBe(true);
    expect(
      ranked.resolveDisconnects(
        1000 + DUEL_RANKED_RECONNECT_GRACE_MS + 5000,
      ),
    ).toEqual([]);
    expect(
      authority.clientMatchView(left, match.matchId).ok,
    ).toBe(true);
  });

  it("forfeits one Ranked player after grace, saves rating, and releases both sessions", () => {
    const authority = new DuelAuthorityService(deps());
    const ranked = new DuelRankedService(
      authority,
      new InMemoryDuelRankedProfileStore(),
      () => "ticket-forfeit",
    );
    const left = open(authority, "left-forfeit");
    const right = open(authority, "right-forfeit");
    ranked.enqueue(left, 0);
    ranked.enqueue(right, 0);
    const match = ranked.pump(0)[0];
    if (match === undefined) throw new Error("Missing ranked match.");

    ranked.disconnect(left, 1000);
    const settlements = ranked.resolveDisconnects(
      1000 + DUEL_RANKED_RECONNECT_GRACE_MS,
    );

    expect(settlements).toHaveLength(1);
    expect(
      settlements[0]?.updates[0]?.view.series,
    ).toEqual(
      expect.objectContaining({
        status: "won",
        winnerId: "player-2",
      }),
    );
    expect(ranked.profile("left-forfeit").losses).toBe(1);
    expect(ranked.profile("right-forfeit").wins).toBe(1);
    expect(authority.rankedParticipant(left).ok).toBe(true);
    expect(authority.rankedParticipant(right).ok).toBe(true);
  });

  it("resolves simultaneous Ranked disconnect as a draw", () => {
    const authority = new DuelAuthorityService(deps());
    const ranked = new DuelRankedService(
      authority,
      new InMemoryDuelRankedProfileStore(),
      () => "ticket-double",
    );
    const left = open(authority, "left-double");
    const right = open(authority, "right-double");
    ranked.enqueue(left, 0);
    ranked.enqueue(right, 0);
    ranked.pump(0);

    ranked.disconnect(left, 1000);
    ranked.disconnect(right, 1000);
    const settlements = ranked.resolveDisconnects(
      1000 + DUEL_RANKED_RECONNECT_GRACE_MS,
    );

    expect(settlements).toHaveLength(1);
    expect(
      settlements[0]?.updates[0]?.view.series,
    ).toEqual(
      expect.objectContaining({
        status: "draw",
        winnerId: null,
      }),
    );
    expect(ranked.profile("left-double").draws).toBe(1);
    expect(ranked.profile("right-double").draws).toBe(1);
  });

  it("persists Duel rating after an authoritative series finishes", () => {
    const authority = new DuelAuthorityService(deps());
    const store = new InMemoryDuelRankedProfileStore();
    let ticket = 0;
    const ranked = new DuelRankedService(
      authority,
      store,
      () => "ticket-" + String(++ticket),
    );
    const left = open(authority, "left");
    const right = open(authority, "right");
    ranked.enqueue(left, 0);
    ranked.enqueue(right, 0);
    const match = ranked.pump(0)[0];
    if (match === undefined) throw new Error("Missing ranked match.");

    const settled = authority.finishRankedForfeit(
      match.matchId,
      "player-2",
    );
    if (!settled.ok) throw new Error(settled.message);
    const updated = ranked.completeIfFinished(
      match.matchId,
      settled.value.updates,
    );

    expect(updated?.left.profile.duelRating).toBeGreaterThan(1000);
    expect(updated?.right.profile.duelRating).toBeLessThan(1000);
    expect(ranked.profile("left").matchesPlayed).toBe(1);
    expect(ranked.profile("right").matchesPlayed).toBe(1);
    expect(authority.rankedParticipant(left).ok).toBe(true);
    expect(authority.rankedParticipant(right).ok).toBe(true);
  });
});
