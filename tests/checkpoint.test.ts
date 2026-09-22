import { describe, expect, it } from "vitest";
import {
  advanceCampaignExpansionOnStageClear,
  canSelectCampaignStage,
  createCampaignExpansionState,
  rollbackCampaignExpansion,
} from "../src/campaign/expansion-state";
import {
  recordStageClear,
  selectCampaignStage,
} from "../src/campaign/progress";
import type { CampaignProgress } from "../src/campaign/types";
import {
  createCheckpointSnapshot,
  restoreCheckpointSnapshot,
  type RunPersistentState,
} from "../src/persistence/checkpoint";
import { createStarterEquipmentState } from "../src/equipment/loadout";
import { createStarterSupportSpellState } from "../src/skills/support-loadout";
import { createStarterCharacterState } from "../src/characters/state";
import { createLuckPityState } from "../src/loot/pity";
import { createHiddenDiscoveryState } from "../src/discovery/hidden-content";
import { createProgressionState } from "../src/progression/missions";
import { createExpansionCurrencyState } from "../src/economy/currencies";
import { createShopState } from "../src/shops/state";
import { createRouteState } from "../src/campaign/route";

function progressAt(stage: number): CampaignProgress {
  return {
    version: 1,
    highestUnlockedStage: stage,
    selectedStage: stage,
    clearedStages: Array.from(
      { length: Math.max(0, stage - 1) },
      (_, index) => index + 1,
    ),
    bestByStage: {},
  };
}

function runState(campaign: CampaignProgress): RunPersistentState {
  return {
    campaign,
    inventory: {},
    equipment: createStarterEquipmentState(),
    supportSpells: createStarterSupportSpellState(),
    characters: createStarterCharacterState(),
    luckPity: createLuckPityState(),
    hiddenDiscovery: createHiddenDiscoveryState(),
    credits: 0,
    progression: createProgressionState(),
    expansionCurrencies: createExpansionCurrencyState(),
    shops: createShopState(),
    route: createRouteState(campaign.highestUnlockedStage),
  };
}

describe("M02 checkpoint and rollback", () => {
  it("captures committed gameplay state at the ten-stage checkpoint", () => {
    const active = runState(progressAt(190));
    active.credits = 900;
    active.inventory = { "repair-kit": 4 };

    const snapshot = createCheckpointSnapshot(active, 181);

    expect(snapshot.campaign.highestUnlockedStage).toBe(181);
    expect(snapshot.campaign.selectedStage).toBe(181);
    expect(snapshot.campaign.clearedStages.at(-1)).toBe(180);
    expect(snapshot.credits).toBe(900);
    expect(snapshot.inventory["repair-kit"]).toBe(4);
  });

  it("moves the active frontier and commits only on the sector-end frontier stage", () => {
    let campaign = progressAt(181);
    let expansion = createCampaignExpansionState(
      campaign,
      "2026-09-22T10:00:00.000Z",
    );

    for (let stage = 181; stage <= 190; stage += 1) {
      campaign = recordStageClear(campaign, stage, {
        score: stage,
        accuracy: 99,
        wpm: 70,
        clearedAt: "2026-09-22T10:01:00.000Z",
      });
      const result = advanceCampaignExpansionOnStageClear(
        expansion,
        campaign,
        stage,
        "2026-09-22T10:01:00.000Z",
      );
      expansion = result.state;

      expect(result.checkpointCommitted).toBe(stage === 190);
    }

    expect(expansion.checkpoint.stage).toBe(191);
    expect(expansion.activeSegment.currentStage).toBe(191);
    expect(expansion.activeSegment.highestReachedStage).toBe(191);
  });

  it("does not move or commit the frontier when replaying an old stage", () => {
    const campaign = progressAt(190);
    const expansion = createCampaignExpansionState(campaign);
    const replayCampaign = recordStageClear(
      { ...campaign, selectedStage: 50 },
      50,
      {
        score: 100,
        accuracy: 100,
        wpm: 80,
        clearedAt: "2026-09-22T10:02:00.000Z",
      },
    );

    const result = advanceCampaignExpansionOnStageClear(
      expansion,
      replayCampaign,
      50,
      "2026-09-22T10:02:00.000Z",
    );

    expect(result.checkpointCommitted).toBe(false);
    expect(result.state.checkpoint.stage).toBe(181);
    expect(result.state.activeSegment.currentStage).toBe(190);
  });

  it("rolls economic/build state back but preserves discovered knowledge", () => {
    const committedActive = runState(progressAt(181));
    committedActive.credits = 100;
    committedActive.inventory = { "repair-kit": 1 };
    committedActive.expansionCurrencies = {
      alloy: 4,
      starCrystal: 1,
      quantumCore: 0,
    };
    committedActive.hiddenDiscovery.discovered = ["echo-rift"];
    committedActive.progression.unlockedAchievements = ["first-clear"];

    const committed = createCheckpointSnapshot(
      committedActive,
      181,
    );

    const active = runState(progressAt(190));
    active.credits = 999;
    active.inventory = {
      "repair-kit": 5,
      "nova-bomb": 2,
    };
    active.expansionCurrencies = {
      alloy: 55,
      starCrystal: 7,
      quantumCore: 2,
    };
    active.campaign.bestByStage["189"] = {
      score: 9000,
      accuracy: 100,
      wpm: 90,
      clearedAt: "2026-09-22T10:03:00.000Z",
    };
    active.hiddenDiscovery.discovered = [
      "echo-rift",
      "void-warden",
    ];
    active.progression.unlockedAchievements = [
      "first-clear",
      "precision-pilot",
    ];

    const restored = restoreCheckpointSnapshot(committed, active);

    expect(restored.campaign.highestUnlockedStage).toBe(181);
    expect(restored.campaign.selectedStage).toBe(181);
    expect(restored.credits).toBe(100);
    expect(restored.inventory).toEqual({ "repair-kit": 1 });
    expect(restored.expansionCurrencies).toEqual({
      alloy: 4,
      starCrystal: 1,
      quantumCore: 0,
    });
    expect(restored.campaign.bestByStage["189"]?.score).toBe(9000);
    expect(restored.hiddenDiscovery.discovered).toEqual([
      "echo-rift",
      "void-warden",
    ]);
    expect(restored.progression.unlockedAchievements).toEqual([
      "first-clear",
      "precision-pilot",
    ]);
  });

  it("keeps highest reached as a record without reopening rolled-back stages", () => {
    const activeCampaign = progressAt(190);
    const expansion = createCampaignExpansionState(activeCampaign);
    const rolledExpansion = rollbackCampaignExpansion(
      {
        ...expansion,
        activeSegment: {
          ...expansion.activeSegment,
          highestReachedStage: 190,
        },
      },
      "2026-09-22T10:04:00.000Z",
    );
    const rolledCampaign = {
      ...activeCampaign,
      highestUnlockedStage: 181,
      selectedStage: 181,
      clearedStages: activeCampaign.clearedStages.filter(
        (stage) => stage < 181,
      ),
    };

    expect(rolledExpansion.activeSegment.highestReachedStage).toBe(190);
    expect(
      canSelectCampaignStage(rolledCampaign, rolledExpansion, 190),
    ).toBe(false);
    expect(
      selectCampaignStage(rolledCampaign, 190).selectedStage,
    ).toBe(181);
    expect(
      canSelectCampaignStage(rolledCampaign, rolledExpansion, 181),
    ).toBe(true);
  });
});
