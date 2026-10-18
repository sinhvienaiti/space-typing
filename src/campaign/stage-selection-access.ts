import { ACTIVE_STAGE_RUNTIME_SESSION } from "../admin/stage-runtime-policy";
import { runtimeTestingPolicy, type RuntimeTestingPolicy } from "../admin/game-testing-policy";
import { canSelectCampaignStage, type CampaignExpansionState } from "./expansion-state";
import { MAX_CAMPAIGN_STAGE } from "./stage";
import type { CampaignProgress } from "./types";

export function validCampaignStage(stage: number): boolean {
  return (
    Number.isInteger(stage) &&
    stage >= 1 &&
    stage <= MAX_CAMPAIGN_STAGE
  );
}

/**
 * Published Admin testing policy grants preview access. A legacy local switch
 * is honored only in standalone/bundled development, never over published OFF.
 */
export function testingStageUnlockEnabled(
  unlockAllStages: boolean,
  runtimeSource: "bundled" | "published" = ACTIVE_STAGE_RUNTIME_SESSION.source,
  policy: RuntimeTestingPolicy = runtimeTestingPolicy(),
  dev = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV === true,
): boolean {
  return policy.unlockAllStages || (dev && runtimeSource === "bundled" && unlockAllStages);
}

/**
 * Temporary testing access for Stage Select.
 *
 * It never mutates CampaignProgress, highestUnlockedStage, checkpoint state,
 * cleared stages, or rewards. Published sessions follow the Admin switch.
 */
export function canSelectCampaignStageWithTestingUnlock(
  progress: CampaignProgress,
  expansion: CampaignExpansionState,
  stage: number,
  unlockAllStages: boolean,
): boolean {
  if (!validCampaignStage(stage)) return false;
  return (
    (unlockAllStages && testingStageUnlockEnabled(unlockAllStages)) ||
    canSelectCampaignStage(progress, expansion, stage)
  );
}

export function isTestingStagePreview(
  progress: CampaignProgress,
  expansion: CampaignExpansionState,
  stage: number,
  unlockAllStages: boolean,
): boolean {
  return (
    unlockAllStages && testingStageUnlockEnabled(unlockAllStages) &&
    validCampaignStage(stage) &&
    !canSelectCampaignStage(progress, expansion, stage)
  );
}
