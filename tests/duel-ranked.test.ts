import { describe, expect, it } from "vitest";
import {
  DUEL_RANKED_RECONNECT_GRACE_MS,
  DUEL_RANKED_RULESET,
  DuelRankedPresence,
  DuelRankedQueue,
  duelMatchmakingRating,
  updateDuelRankedProfiles,
  type DuelRankedProfile,
} from "../src/duel/ranked";

function profile(
  accountId: string,
  typingRating: number,
  duelRating: number,
): DuelRankedProfile {
  return {
    accountId,
    typingRating,
    duelRating,
    matchesPlayed: 30,
    wins: 15,
    losses: 12,
    draws: 3,
  };
}

const typing = {
  wpm: 75,
  accuracy: 0.96,
  consistency: 0.82,
  wordDifficulty: 0.7,
};

describe("Duel M-DUEL-12 ranked core", () => {
  it("uses a normalized competitive ruleset with no PvE power or economy minting", () => {
    expect(DUEL_RANKED_RULESET.combatProfile).toBe(
      "normalized",
    );
    expect(DUEL_RANKED_RULESET.allowPveStatScaling).toBe(
      false,
    );
    expect(DUEL_RANKED_RULESET.allowPveLuckPity).toBe(
      false,
    );
    expect(
      DUEL_RANKED_RULESET.allowCampaignCreditMinting,
    ).toBe(false);
    expect(DUEL_RANKED_RULESET.mapPool).toHaveLength(6);
  });

  it("combines typing and Duel ratings for matchmaking only", () => {
    expect(
      duelMatchmakingRating(profile("a", 1200, 1000)),
    ).toBe(1080);
    expect(
      duelMatchmakingRating(profile("a", 1000, 1200)),
    ).toBe(1120);
  });

  it("pairs nearest compatible ratings and widens the window with wait time", () => {
    const queue = new DuelRankedQueue();
    queue.enqueue({
      ticketId: "a",
      sessionId: "sa",
      accountId: "a",
      enqueuedAt: 0,
      profile: profile("a", 1000, 1000),
    });
    queue.enqueue({
      ticketId: "b",
      sessionId: "sb",
      accountId: "b",
      enqueuedAt: 0,
      profile: profile("b", 1020, 1040),
    });
    queue.enqueue({
      ticketId: "c",
      sessionId: "sc",
      accountId: "c",
      enqueuedAt: 0,
      profile: profile("c", 1500, 1500),
    });

    const pair = queue.matchNext(1000);
    expect(pair?.left.accountId).toBe("a");
    expect(pair?.right.accountId).toBe("b");
    expect(pair?.ratingGap).toBeLessThan(90);
  });

  it("does not allow duplicate account or session queue entries", () => {
    const queue = new DuelRankedQueue();
    expect(
      queue.enqueue({
        ticketId: "a",
        sessionId: "sa",
        accountId: "a",
        enqueuedAt: 0,
        profile: profile("a", 1000, 1000),
      }),
    ).toBe(true);
    expect(
      queue.enqueue({
        ticketId: "b",
        sessionId: "sb",
        accountId: "a",
        enqueuedAt: 1,
        profile: profile("a", 1000, 1000),
      }),
    ).toBe(false);
    expect(
      queue.enqueue({
        ticketId: "c",
        sessionId: "sa",
        accountId: "c",
        enqueuedAt: 1,
        profile: profile("c", 1000, 1000),
      }),
    ).toBe(false);
  });

  it("updates Duel result rating and typing signal without using WPM as damage", () => {
    const result = updateDuelRankedProfiles({
      left: profile("left", 1000, 1000),
      right: profile("right", 1000, 1000),
      leftResult: "win",
      leftTyping: typing,
      rightTyping: {
        ...typing,
        wpm: 55,
        accuracy: 0.9,
      },
    });

    expect(result.left.duelRating).toBeGreaterThan(1000);
    expect(result.right.duelRating).toBeLessThan(1000);
    expect(result.left.typingRating).toBeGreaterThan(
      result.right.typingRating,
    );
    expect(
      "damage" in (result.left as unknown as Record<string, unknown>),
    ).toBe(false);
  });

  it("defines reconnect grace before ranked forfeit", () => {
    const presence = new DuelRankedPresence();
    presence.disconnect("player-1", 1000);

    expect(
      presence.resolve(
        1000 + DUEL_RANKED_RECONNECT_GRACE_MS - 1,
      ),
    ).toEqual({
      status: "active",
      forfeitingPlayerId: null,
    });
    expect(
      presence.resolve(
        1000 + DUEL_RANKED_RECONNECT_GRACE_MS,
      ),
    ).toEqual({
      status: "forfeit",
      forfeitingPlayerId: "player-1",
    });
  });

  it("does not grant a slot-order win when both ranked players expire", () => {
    const presence = new DuelRankedPresence();
    presence.disconnect("player-1", 0);
    presence.disconnect("player-2", 0);

    expect(
      presence.resolve(
        DUEL_RANKED_RECONNECT_GRACE_MS,
      ),
    ).toEqual({
      status: "double-forfeit",
      forfeitingPlayerId: null,
    });
  });
});
