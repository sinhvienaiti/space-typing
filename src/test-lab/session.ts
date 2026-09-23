import { createDefaultCampaignProgress } from "../campaign/progress";
import {
  createCampaignExpansionState,
  sectorForStage,
  type CampaignExpansionState,
} from "../campaign/expansion-state";
import { createRouteState } from "../campaign/route";
import { createStarterEquipmentState } from "../equipment/loadout";
import { createStarterSupportSpellState } from "../skills/support-loadout";
import { createStarterCharacterState } from "../characters/state";
import { createLuckPityState } from "../loot/pity";
import { createHiddenDiscoveryState } from "../discovery/hidden-content";
import { createProgressionState } from "../progression/missions";
import { createExpansionCurrencyState } from "../economy/currencies";
import { createShopState } from "../shops/state";
import { createUpgradeState } from "../progression/upgrades";
import { createRelicState } from "../relics/state";
import { createAscensionState } from "../progression/ascension";
import {
  createCheckpointSnapshot,
  type CheckpointSnapshot,
  type RunPersistentState,
} from "../persistence/checkpoint";
import {
  createStageEntrySnapshot,
  type StageEntrySnapshot,
} from "../persistence/death-protection";
import {
  captureCrashRecoverySnapshot,
  type CrashRecoverySnapshot,
} from "../persistence/crash-recovery";

export type TestLabDeathMode = "immortal" | "real";

export type TestLabSession = {
  version: 1;
  stage: number;
  checkpointStage: number;
  deathMode: TestLabDeathMode;
  state: RunPersistentState;
  checkpointSnapshot: CheckpointSnapshot;
  campaignExpansion: CampaignExpansionState;
  stageEntrySnapshot: StageEntrySnapshot;
  crashRecoverySnapshot: CrashRecoverySnapshot;
  createdAt: string;
};

function sandboxCampaign(stage: number) {
  const safeStage = Math.max(1, Math.min(1000, Math.floor(stage)));
  return {
    ...createDefaultCampaignProgress(),
    highestUnlockedStage: safeStage,
    selectedStage: safeStage,
    clearedStages: Array.from(
      { length: Math.max(0, safeStage - 1) },
      (_, index) => index + 1,
    ),
  };
}

export function createTestLabSession(
  stage = 1,
  checkpointStage = 1,
  createdAt = "",
): TestLabSession {
  const campaign = sandboxCampaign(stage);
  const state: RunPersistentState = {
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
    upgrades: createUpgradeState(),
    relics: createRelicState(),
    ascension: createAscensionState(campaign),
  };
  const productionCheckpoint = sectorForStage(
    campaign.selectedStage,
  ).startStage;
  const requestedCheckpoint = Math.max(
    1,
    Math.min(stage, Math.min(1000, Math.floor(checkpointStage))),
  );
  const safeCheckpoint =
    requestedCheckpoint === productionCheckpoint
      ? requestedCheckpoint
      : productionCheckpoint;
  const checkpointSnapshot = createCheckpointSnapshot(
    state,
    safeCheckpoint,
  );
  const baseExpansion = createCampaignExpansionState(
    campaign,
    createdAt,
  );
  const stageEntrySnapshot = createStageEntrySnapshot(
    state,
    baseExpansion,
    checkpointSnapshot,
    createdAt,
  );
  const crash = captureCrashRecoverySnapshot(
    state,
    baseExpansion,
    checkpointSnapshot,
    "manual",
    createdAt,
  );

  return {
    version: 1,
    stage: campaign.selectedStage,
    checkpointStage: safeCheckpoint,
    deathMode: "immortal",
    state,
    checkpointSnapshot,
    campaignExpansion: crash.campaignExpansion,
    stageEntrySnapshot,
    crashRecoverySnapshot: crash.snapshot,
    createdAt,
  };
}

export function cloneTestLabSession(
  session: TestLabSession,
): TestLabSession {
  return structuredClone(session);
}

export function updateTestLabStage(
  session: TestLabSession,
  stage: number,
): TestLabSession {
  const next = createTestLabSession(
    stage,
    Math.min(session.checkpointStage, stage),
    session.createdAt,
  );
  return {
    ...next,
    deathMode: session.deathMode,
    state: {
      ...next.state,
      inventory: { ...session.state.inventory },
      equipment: structuredClone(session.state.equipment),
      supportSpells: structuredClone(session.state.supportSpells),
      characters: structuredClone(session.state.characters),
      credits: session.state.credits,
      progression: structuredClone(session.state.progression),
      expansionCurrencies: {
        ...session.state.expansionCurrencies,
      },
      shops: structuredClone(session.state.shops),
      upgrades: structuredClone(session.state.upgrades),
      relics: structuredClone(session.state.relics),
    },
  };
}

export function testLabCampaignExpansion(
  session: TestLabSession,
): CampaignExpansionState {
  return structuredClone(session.campaignExpansion);
}
