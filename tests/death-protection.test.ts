import { describe, expect, it } from "vitest";
import type { CampaignProgress } from "../src/campaign/types";
import { createCampaignExpansionState } from "../src/campaign/expansion-state";
import { createStarterEquipmentState } from "../src/equipment/loadout";
import { createStarterSupportSpellState } from "../src/skills/support-loadout";
import { createStarterCharacterState } from "../src/characters/state";
import { createLuckPityState } from "../src/loot/pity";
import { createHiddenDiscoveryState } from "../src/discovery/hidden-content";
import { createProgressionState } from "../src/progression/missions";
import { createExpansionCurrencyState } from "../src/economy/currencies";
import { createShopState } from "../src/shops/state";
import { createRouteState } from "../src/campaign/route";
import { createUpgradeState } from "../src/progression/upgrades";
import { createRelicState, grantRelic } from "../src/relics/state";
import {
  createCheckpointSnapshot,
  type RunPersistentState,
} from "../src/persistence/checkpoint";
import {
  consumePhoenixCore,
  createStageEntrySnapshot,
  isValidStageEntrySnapshot,
  resolveSalvageAnchor,
  resolveStageRevivalCore,
} from "../src/persistence/death-protection";

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

function stateAt(stage: number): RunPersistentState {
  return {
    campaign: progressAt(stage),
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
    route: createRouteState(stage),
    upgrades: createUpgradeState(),
    relics: createRelicState(),
  };
}

describe("M04 death protection", () => {
  it("Salvage Anchor rolls Campaign back but preserves active economic/build gains", () => {
    const checkpointState = stateAt(181);
    checkpointState.credits = 100;
    checkpointState.inventory = { "repair-kit": 1 };
    const checkpoint = createCheckpointSnapshot(
      checkpointState,
      181,
    );

    const active = stateAt(190);
    active.credits = 900;
    active.inventory = {
      "repair-kit": 5,
      "nova-bomb": 2,
      "salvage-anchor": 2,
    };
    active.expansionCurrencies = {
      alloy: 30,
      starCrystal: 4,
      quantumCore: 1,
    };
    active.characters.progress.vanguard.level = 4;
    active.campaign.bestByStage["189"] = {
      score: 5000,
      accuracy: 99,
      wpm: 80,
      clearedAt: "2026-09-22T10:10:00.000Z",
    };

    const expansion = createCampaignExpansionState(active.campaign);
    const result = resolveSalvageAnchor(
      active,
      expansion,
      checkpoint,
      "2026-09-22T10:11:00.000Z",
    );

    expect(result.applied).toBe(true);
    expect(result.state.campaign.highestUnlockedStage).toBe(181);
    expect(result.state.campaign.selectedStage).toBe(181);
    expect(result.state.campaign.bestByStage["189"]?.score).toBe(5000);
    expect(result.state.credits).toBe(900);
    expect(result.state.inventory).toMatchObject({
      "repair-kit": 5,
      "nova-bomb": 2,
      "salvage-anchor": 1,
    });
    expect(result.state.expansionCurrencies).toEqual({
      alloy: 30,
      starCrystal: 4,
      quantumCore: 1,
    });
    expect(result.state.characters.progress.vanguard.level).toBe(4);
  });

  it("Stage Revival Core restores deterministic stage-entry economy and consumes itself", () => {
    const entryState = stateAt(190);
    entryState.credits = 500;
    entryState.inventory = {
      "repair-kit": 2,
      "stage-revival-core": 2,
    };
    const expansion = createCampaignExpansionState(entryState.campaign);
    const checkpointState = stateAt(181);
    const checkpoint = createCheckpointSnapshot(
      checkpointState,
      181,
    );
    const stageEntry = createStageEntrySnapshot(
      entryState,
      expansion,
      checkpoint,
      "2026-09-22T10:12:00.000Z",
    );

    const active = stateAt(190);
    active.credits = 850;
    active.inventory = {
      "repair-kit": 6,
      "nova-bomb": 3,
      "stage-revival-core": 2,
    };
    active.campaign.bestByStage["189"] = {
      score: 6100,
      accuracy: 100,
      wpm: 91,
      clearedAt: "2026-09-22T10:13:00.000Z",
    };
    active.hiddenDiscovery.discovered = ["echo-rift"];

    const result = resolveStageRevivalCore(active, stageEntry);

    expect(result?.applied).toBe(true);
    expect(result?.state.campaign.selectedStage).toBe(190);
    expect(result?.state.campaign.highestUnlockedStage).toBe(190);
    expect(result?.state.credits).toBe(500);
    expect(result?.state.inventory).toEqual({
      "repair-kit": 2,
      "stage-revival-core": 1,
    });
    expect(result?.state.campaign.bestByStage["189"]?.score).toBe(6100);
    expect(result?.state.hiddenDiscovery.discovered).toContain("echo-rift");
    expect(result?.stageEntrySnapshot?.state.inventory).toEqual({
      "repair-kit": 2,
      "stage-revival-core": 1,
    });
  });

  it("Phoenix Core only consumes the item and leaves persistent encounter gains intact", () => {
    const active = stateAt(190);
    active.credits = 777;
    active.inventory = {
      "repair-kit": 4,
      "phoenix-core": 2,
    };

    const result = consumePhoenixCore(active);

    expect(result.applied).toBe(true);
    expect(result.state.credits).toBe(777);
    expect(result.state.campaign).toEqual(active.campaign);
    expect(result.state.inventory).toEqual({
      "repair-kit": 4,
      "phoenix-core": 1,
    });
  });

  it("requires a valid deterministic stage-entry snapshot", () => {
    const state = stateAt(50);
    const expansion = createCampaignExpansionState(state.campaign);
    const checkpoint = createCheckpointSnapshot(state, 41);
    const snapshot = createStageEntrySnapshot(
      state,
      expansion,
      checkpoint,
      "2026-09-22T10:14:00.000Z",
    );

    expect(isValidStageEntrySnapshot(snapshot)).toBe(true);
    expect(
      isValidStageEntrySnapshot({
        ...snapshot,
        stage: 51,
      }),
    ).toBe(false);
  });
});
