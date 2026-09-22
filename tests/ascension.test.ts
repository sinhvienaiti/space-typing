import { describe, expect, it } from "vitest";
import { difficultyFor } from "../src/campaign/difficulty";
import {
  applyAscensionDifficulty,
  ascensionCompletionReward,
  ascensionProfile,
  bossMutationsForAscension,
  completeAscensionTier,
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
    });
    expect(selectAscensionTier(state, 4)).toEqual(state);
    expect(selectAscensionTier(state, 2).selectedTier).toBe(2);
  });

  it("completes a tier once and unlocks only the next bounded tier", () => {
    const start = {
      ...createAscensionState({ clearedStages: [1000] }),
      selectedTier: 1,
    };
    const first = completeAscensionTier(start, 1);
    const duplicate = completeAscensionTier(first.state, 1);

    expect(first.newlyCompleted).toBe(true);
    expect(first.unlockedTier).toBe(2);
    expect(first.state.completedTiers).toEqual([1]);
    expect(first.state.highestUnlockedTier).toBe(2);
    expect(duplicate.newlyCompleted).toBe(false);
    expect(duplicate.unlockedTier).toBeNull();
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
