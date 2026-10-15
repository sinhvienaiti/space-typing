import {
  createCampaignExpansionState,
} from "../campaign/expansion-state";
import {
  createDefaultCampaignProgress,
} from "../campaign/progress";
import {
  createRouteState,
} from "../campaign/route";
import {
  createStarterCharacterState,
} from "../characters/state";
import {
  createCodexState,
} from "../codex/state";
import {
  createExpansionCurrencyState,
} from "../economy/currencies";
import {
  createStarterEquipmentState,
} from "../equipment/loadout";
import {
  createDefaultHotbarState,
} from "../hud/hotbar";
import {
  createEmptyInventory,
} from "../items/inventory";
import {
  createLuckPityState,
} from "../loot/pity";
import {
  createCheckpointSnapshot,
  type CheckpointSnapshot,
  type RunPersistentState,
} from "../persistence/checkpoint";
import {
  createAscensionState,
} from "../progression/ascension";
import {
  createProgressionState,
} from "../progression/missions";
import {
  createUpgradeState,
} from "../progression/upgrades";
import {
  createRelicState,
  equipRelic,
  grantRelic,
} from "../relics/state";
import {
  isRelicId,
} from "../relics/registry";
import {
  createShopState,
} from "../shops/state";
import {
  createStarterSupportSpellState,
} from "../skills/support-loadout";
import {
  createHiddenDiscoveryState,
} from "../discovery/hidden-content";
import type {
  ExpeditionRun,
} from "./core";

export type ExpeditionLoanerState = {
  state: RunPersistentState;
  hotbar: ReturnType<typeof createDefaultHotbarState>;
  codex: ReturnType<typeof createCodexState>;
  campaignExpansion: ReturnType<typeof createCampaignExpansionState>;
  checkpointSnapshot: CheckpointSnapshot;
};

export function createExpeditionLoanerState(
  run: ExpeditionRun,
): ExpeditionLoanerState {
  const campaign = createDefaultCampaignProgress();
  let relics = createRelicState();

  for (const rawId of run.relics.owned) {
    if (!isRelicId(rawId)) continue;
    relics = grantRelic(relics, rawId).state;
  }
  for (const rawId of run.relics.equipped) {
    if (!isRelicId(rawId)) continue;
    relics = equipRelic(relics, rawId).state;
  }

  const state: RunPersistentState = {
    campaign,
    inventory: createEmptyInventory(),
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
    relics,
    ascension: createAscensionState(campaign),
  };
  const campaignExpansion = createCampaignExpansionState(campaign);
  const checkpointSnapshot = createCheckpointSnapshot(
    state,
    campaignExpansion.checkpoint.stage,
  );

  return {
    state,
    hotbar: createDefaultHotbarState(),
    codex: createCodexState(),
    campaignExpansion,
    checkpointSnapshot,
  };
}
