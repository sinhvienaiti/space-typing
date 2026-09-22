import { describe, expect, it } from "vitest";
import { difficultyFor } from "../src/campaign/difficulty";
import {
  advanceAscensionOnStageClear,
  applyAscensionDifficulty,
  ascensionCompletionReward,
  ascensionProfile,
  bossMutationsForAscension,
  createAscensionState,
  sanitizeAscensionState,
  selectAscensionTier,
} from "../src/progression/ascension";

describe("M20 Ascension", () => {
  it("stays locked before Campaign completion and unlocks tier 1 after Stage 1000", () => {
    const locked = createAscensionState({ clearedStages: [1, 999] });
    const unlocked = createAscensionState({ clearedStages: [1, 1000] });

    expect(locked.highestUnlockedTier).toBe(0);
    expect(unlocked.highestUnlockedTier).toBe(1);
  });

  it("sanitizes tier selection and completion without allowing locked tiers", () => {
    const state = sanitizeAscensionState({
      version: 99,
      highestUnlockedTier: 3,
      selectedTier: 9,
      completedTiers: [2, 1, 2, 99, -1],
    });

    expect(state).toEqual({
      version: 1,
      highestUnlockedTier: 3,
      selectedTier: 3,
      completedTiers: [1, 2],
      frontierByTier: {
        "1": 1000,
        "2": 1000,
        "3": 1,
      },
    });
    expect(selectAscensionTier(state, 4)).toEqual(state);
    expect(selectAscensionTier(state, 2)).toEqual(state);
  });

  it("sanitizes a completed tier out of active selection", () => {
    const state = sanitizeAscensionState({
      version: 1,
      highestUnlockedTier: 2,
      selectedTier: 1,
      completedTiers: [1],
      frontierByTier: {
        "1": 1000,
        "2": 1,
      },
    });

    expect(state.selectedTier).toBe(0);
    expect(state.completedTiers).toEqual([1]);
    expect(state.frontierByTier["1"]).toBe(1000);
  });

  it("does not reactivate a completed Ascension tier", () => {
    const state = sanitizeAscensionState({
      version: 1,
      highestUnlockedTier: 2,
      selectedTier: 0,
      completedTiers: [1],
      frontierByTier: {
        "1": 1000,
        "2": 1,
      },
    });

    expect(selectAscensionTier(state, 1)).toEqual(state);
    expect(selectAscensionTier(state, 2).selectedTier).toBe(2);
  });

  it("advances only the active Ascension frontier and commits every ten stages", () => {
    const start = {
      ...createAscensionState({ clearedStages: [1000] }),
      selectedTier: 1,
    };
    const first = advanceAscensionOnStageClear(start, 1);
    const skipped = advanceAscensionOnStageClear(first.state, 1000);

    expect(first.advanced).toBe(true);
    expect(first.checkpointCommitted).toBe(false);
    expect(first.state.frontierByTier["1"]).toBe(2);
    expect(skipped.advanced).toBe(false);
    expect(skipped.state.frontierByTier["1"]).toBe(2);

    let state = first.state;
    for (let stage = 2; stage <= 10; stage += 1) {
      const result = advanceAscensionOnStageClear(state, stage);
      state = result.state;
      if (stage < 10) {
        expect(result.checkpointCommitted).toBe(false);
      } else {
        expect(result.checkpointCommitted).toBe(true);
      }
    }
    expect(state.frontierByTier["1"]).toBe(11);
  });

  it("completes Stage 1000 once, unlocks and selects the next Ascension tier", () => {
    const start = {
      ...createAscensionState({ clearedStages: [1000] }),
      selectedTier: 1,
      frontierByTier: { "1": 1000 },
    };
    const first = advanceAscensionOnStageClear(start, 1000);

    expect(first.newlyCompleted).toBe(true);
    expect(first.checkpointCommitted).toBe(true);
    expect(first.unlockedTier).toBe(2);
    expect(first.state.completedTiers).toEqual([1]);
    expect(first.state.highestUnlockedTier).toBe(2);
    expect(first.state.selectedTier).toBe(2);
    expect(first.state.frontierByTier).toEqual({
      "1": 1000,
      "2": 1,
    });
  });

  it("resolves deterministic boss mutation tables for the same tier and stage", () => {
    expect(bossMutationsForAscension(7, 1000)).toEqual(
      bossMutationsForAscension(7, 1000),
    );
    expect(bossMutationsForAscension(0, 1000)).toEqual([]);
    expect(bossMutationsForAscension(9, 1000)).toHaveLength(3);
  });

  it("raises Rank/formation/boss/reward pressure while preserving hard safety caps", () => {
    const base = difficultyFor({
      stage: 1000,
      mode: "balanced",
      vocabularyLevel: 100,
      recentWpm: 90,
      recentAccuracy: 99,
    });
    const ascended = applyAscensionDifficulty(base, 10, 1000);
    const profile = ascensionProfile(10, 1000);

    expect(ascended.enemyRankBonus).toBe(profile.enemyRankBonus);
    expect(ascended.formationComplexity).toBeLessThanOrEqual(5);
    expect(ascended.combatPressure).toBeLessThanOrEqual(3.6);
    expect(ascended.projectilePressure).toBeLessThanOrEqual(3.15);
    expect(ascended.bossPressure).toBeLessThanOrEqual(3.15);
    expect(ascended.rewardMultiplier).toBeGreaterThan(base.rewardMultiplier);
    expect(ascended.maxEnemies).toBe(base.maxEnemies);
    expect(ascended.urgentThreatCap).toBe(base.urgentThreatCap);
    expect(ascended.controllerSupportCap).toBe(base.controllerSupportCap);
  });

  it("grants a bounded rare endgame completion cache", () => {
    const early = ascensionCompletionReward(1);
    const late = ascensionCompletionReward(10);

    expect(early.currencies.quantumCore).toBeGreaterThan(0);
    expect(late.credits).toBeGreaterThan(early.credits);
    expect(late.currencies.quantumCore).toBeGreaterThan(early.currencies.quantumCore);
  });
});
