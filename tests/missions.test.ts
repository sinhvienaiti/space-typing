import { describe, expect, it } from "vitest";
import { createDefaultCampaignProgress } from "../src/campaign/progress";
import { createHiddenDiscoveryState } from "../src/discovery/hidden-content";
import {
  claimMission,
  createProgressionState,
  missionClaimable,
  recordProgressionEvent,
  sanitizeProgressionState,
  syncAchievements,
} from "../src/progression/missions";

describe("missions and achievements", () => {
  it("tracks stage clears and high-accuracy clears separately", () => {
    let state = createProgressionState();
    state = recordProgressionEvent(state, {
      type: "stage-clear",
      accuracy: 99,
    });
    state = recordProgressionEvent(state, {
      type: "stage-clear",
      accuracy: 92,
    });

    expect(state.counters.stageClears).toBe(2);
    expect(state.counters.highAccuracyClears).toBe(1);
  });

  it("claims a completed mission only once", () => {
    let state = createProgressionState();
    for (let index = 0; index < 5; index += 1) {
      state = recordProgressionEvent(state, {
        type: "stage-clear",
        accuracy: 95,
      });
    }

    expect(missionClaimable(state, "clear-5")).toBe(true);
    const claimed = claimMission(state, "clear-5");
    expect(claimed.claimed).toBe(true);
    expect(claimed.rewardCredits).toBe(150);
    expect(claimMission(claimed.state, "clear-5").claimed).toBe(false);
  });

  it("unlocks achievements from Campaign and hidden discovery", () => {
    const campaign = createDefaultCampaignProgress();
    campaign.highestUnlockedStage = 500;
    campaign.clearedStages = [1, 100];
    campaign.bestByStage["1"] = {
      score: 100,
      accuracy: 99.5,
      wpm: 60,
      clearedAt: "2026-01-01T00:00:00.000Z",
    };
    const hidden = createHiddenDiscoveryState();
    hidden.discovered = ["ghost-contract"];

    const result = syncAchievements(
      createProgressionState(),
      campaign,
      hidden,
    );

    expect(result.state.unlockedAchievements).toEqual(
      expect.arrayContaining([
        "first-clear",
        "galaxy-one",
        "precision-pilot",
        "hidden-signal",
        "deep-space",
      ]),
    );
  });

  it("sanitizes unknown and duplicate ids", () => {
    const state = sanitizeProgressionState({
      counters: {
        stageClears: -4,
        highAccuracyClears: 2.8,
        shopPurchases: 4,
        equipmentDrops: 6,
      },
      claimedMissions: ["clear-5", "clear-5", "bad"],
      unlockedAchievements: ["first-clear", "bad"],
    });

    expect(state.counters.stageClears).toBe(0);
    expect(state.counters.highAccuracyClears).toBe(2);
    expect(state.claimedMissions).toEqual(["clear-5"]);
    expect(state.unlockedAchievements).toEqual(["first-clear"]);
  });
});
