import { describe, expect, it } from "vitest";
import {
  createCampaignExpansionState,
  isValidCampaignExpansionState,
  sanitizeCampaignExpansionState,
  sectorForStage,
} from "../src/campaign/expansion-state";
import {
  createDefaultCampaignProgress,
  recordStageClear,
} from "../src/campaign/progress";
import {
  addExpansionCurrencyReward,
  createExpansionCurrencyState,
  isValidExpansionCurrencyState,
  sanitizeExpansionCurrencyState,
  stageClearExpansionCurrencyReward,
} from "../src/economy/currencies";
import {
  GRADE_IDS,
  gradeLabel,
  gradeStatMultiplier,
  isGradeId,
} from "../src/grades";
import { legacyRarityToGrade } from "../src/equipment/rarity";
import type { WorldProfile } from "../src/worlds/types";

describe("gameplay expansion M01 contracts", () => {
  it("maps Campaign stages to deterministic ten-stage sectors", () => {
    expect(sectorForStage(1)).toEqual({ startStage: 1, endStage: 10 });
    expect(sectorForStage(10)).toEqual({ startStage: 1, endStage: 10 });
    expect(sectorForStage(11)).toEqual({ startStage: 11, endStage: 20 });
    expect(sectorForStage(190)).toEqual({ startStage: 181, endStage: 190 });
    expect(sectorForStage(191)).toEqual({ startStage: 191, endStage: 200 });
    expect(sectorForStage(1000)).toEqual({
      startStage: 991,
      endStage: 1000,
    });
  });

  it("creates checkpoint and active-segment metadata from Campaign progress", () => {
    let progress = createDefaultCampaignProgress();
    for (let stage = 1; stage <= 189; stage += 1) {
      progress = recordStageClear(progress, stage, {
        score: stage * 10,
        accuracy: 98,
        wpm: 70,
        clearedAt: "2026-09-22T09:00:00.000Z",
      });
    }

    const state = createCampaignExpansionState(
      progress,
      "2026-09-22T09:01:00.000Z",
    );

    expect(state).toMatchObject({
      sector: { startStage: 181, endStage: 190 },
      checkpoint: {
        stage: 181,
        committedAt: "2026-09-22T09:01:00.000Z",
      },
      activeSegment: {
        checkpointStage: 181,
        currentStage: 190,
        highestReachedStage: 190,
        startedAt: "2026-09-22T09:01:00.000Z",
      },
      crashRecovery: null,
    });
    expect(isValidCampaignExpansionState(state)).toBe(true);
  });

  it("falls back safely when stored expansion metadata is inconsistent", () => {
    const progress = createDefaultCampaignProgress();
    const sanitized = sanitizeCampaignExpansionState(
      {
        sector: { startStage: 11, endStage: 20 },
        checkpoint: { stage: 11, committedAt: "bad" },
        activeSegment: {
          checkpointStage: 11,
          currentStage: 1,
          highestReachedStage: 1,
          startedAt: "bad",
        },
        crashRecovery: null,
      },
      progress,
      "2026-09-22T09:02:00.000Z",
    );

    expect(sanitized.sector).toEqual({ startStage: 1, endStage: 10 });
    expect(sanitized.checkpoint.stage).toBe(1);
    expect(sanitized.activeSegment.currentStage).toBe(1);
  });

  it("sanitizes new currencies without changing existing Credits", () => {
    expect(createExpansionCurrencyState()).toEqual({
      alloy: 0,
      starCrystal: 0,
      quantumCore: 0,
    });
    expect(
      sanitizeExpansionCurrencyState({
        alloy: 12.9,
        starCrystal: -3,
        quantumCore: Number.POSITIVE_INFINITY,
      }),
    ).toEqual({
      alloy: 12,
      starCrystal: 0,
      quantumCore: 0,
    });
    expect(
      isValidExpansionCurrencyState({
        alloy: 12,
        starCrystal: 3,
        quantumCore: 1,
      }),
    ).toBe(true);
  });

  it("activates the five approved grades and explicit legacy mapping", () => {
    expect(GRADE_IDS).toEqual([
      "aluminum",
      "copper",
      "silver",
      "gold",
      "diamond",
    ]);
    expect(isGradeId("diamond")).toBe(true);
    expect(isGradeId("legendary")).toBe(false);
    expect(legacyRarityToGrade("common")).toBe("aluminum");
    expect(legacyRarityToGrade("rare")).toBe("copper");
    expect(legacyRarityToGrade("epic")).toBe("silver");
    expect(legacyRarityToGrade("legendary")).toBe("gold");
    expect(gradeLabel("diamond")).toBe("Diamond");
    expect(gradeStatMultiplier("diamond")).toBeGreaterThan(
      gradeStatMultiplier("gold"),
    );
  });

  it("awards role-aware core currencies and accumulates them safely", () => {
    expect(stageClearExpansionCurrencyReward(1, "normal", 100)).toEqual({
      alloy: 1,
      starCrystal: 0,
      quantumCore: 0,
    });
    expect(stageClearExpansionCurrencyReward(50, "boss", 100)).toEqual({
      alloy: 6,
      starCrystal: 2,
      quantumCore: 0,
    });
    expect(
      stageClearExpansionCurrencyReward(100, "major-boss", 100),
    ).toEqual({
      alloy: 10,
      starCrystal: 4,
      quantumCore: 1,
    });
    expect(
      stageClearExpansionCurrencyReward(1000, "major-boss", 100),
    ).toEqual({
      alloy: 19,
      starCrystal: 4,
      quantumCore: 2,
    });

    expect(
      addExpansionCurrencyReward(
        { alloy: 10, starCrystal: 2, quantumCore: 0 },
        { alloy: 3, starCrystal: 1, quantumCore: 1 },
      ),
    ).toEqual({
      alloy: 13,
      starCrystal: 3,
      quantumCore: 1,
    });
  });

  it("provides the WorldProfile contract without creating a parallel registry", () => {
    const world = {
      id: "star-frontier",
      name: "Star Frontier",
      galaxy: 1,
      stageStart: 1,
      stageEnd: 20,
      visualTheme: "frontier",
      backgroundProfile: "frontier-stars",
      ambientProfile: "frontier-hum",
      enemyFamilies: ["rainbow", "angel", "prism"],
      enemyRoster: ["rainbow-scout"],
      rankDistribution: { I: 1 },
      elitePool: [],
      apexPool: [],
      miniBoss: "halo-seraph",
      worldBoss: "prism-archon",
      worldRules: [],
      environmentalHazards: [],
      wordAffinity: [],
      rewardPool: [],
      shopPool: [],
      hiddenEventPool: [],
      hiddenChallengePool: [],
      musicProfile: "star-frontier",
      transitionPresentation: "frontier-entry",
    } satisfies WorldProfile;

    expect(world.stageEnd - world.stageStart + 1).toBe(20);
  });
});
