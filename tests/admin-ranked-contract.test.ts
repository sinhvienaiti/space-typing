import { describe, expect, it } from "vitest";
import rankedContract from "../contracts/space-typing-admin-ranked.v1.json";
import {
  DUEL_RANKED_BASE_RATING,
  DUEL_RANKED_MAX_RATING,
  DUEL_RANKED_MIN_RATING,
  DUEL_RANKED_RECONNECT_GRACE_MS,
  DUEL_RANKED_RULESET,
} from "../src/duel/ranked";

describe("Space Typing Admin Ranked contract", () => {
  it("exposes the canonical Ranked ruleset as read-only", () => {
    expect(rankedContract.capability).toBe("ranked.read");
    expect(rankedContract.route).toEqual({
      id: "ranked",
      path: "/admin/space-typing/ranked",
      label: "Ranked",
    });
    expect(rankedContract.ranked.mode).toBe("runtime-derived-readonly");
    expect(rankedContract.ranked.authorableFields).toEqual([]);
    expect(rankedContract.ranked.ruleset).toEqual(DUEL_RANKED_RULESET);
    expect(rankedContract.ranked.writeCapability).toBe(false);
    expect(rankedContract.ranked.previewCapability).toBe(false);
  });

  it("keeps rating and reconnect constants aligned with runtime", () => {
    expect(rankedContract.ranked.rating).toMatchObject({
      base: DUEL_RANKED_BASE_RATING,
      min: DUEL_RANKED_MIN_RATING,
      max: DUEL_RANKED_MAX_RATING,
    });
    expect(rankedContract.ranked.matchmaking.reconnectGraceMs).toBe(
      DUEL_RANKED_RECONNECT_GRACE_MS,
    );
  });

  it("does not claim season/reward authoring services that do not exist", () => {
    expect(rankedContract.ranked.seasonService).toBe(false);
    expect(rankedContract.ranked.rewardTableService).toBe(false);
    expect(rankedContract.ranked.unsupportedAdminMockFields).toEqual(
      expect.arrayContaining([
        "seasonId",
        "seasonName",
        "seasonStartsAt",
        "seasonEndsAt",
        "placementMatches",
        "manualMatchmakingSpread",
        "rankedEnabled",
        "modeEnableToggles",
        "tierThresholds",
        "seasonRewards",
        "playerDistribution",
      ]),
    );
  });
});
