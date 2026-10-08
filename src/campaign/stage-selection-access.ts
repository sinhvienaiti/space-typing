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
 * Optional local testing override for Stage Select.
 *
 * This grants temporary access only. It never mutates CampaignProgress,
 * highestUnlockedStage, checkpoint state, cleared stages, or rewards.
 */
export function canSelectCampaignStageWithTestingUnlock(
  progress: CampaignProgress,
  expansion: CampaignExpansionState,
  stage: number,
  unlockAllStages: boolean,
): boolean {
  if (!validCampaignStage(stage)) return false;
  return (
    unlockAllStages ||
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
    unlockAllStages &&
    validCampaignStage(stage) &&
    !canSelectCampaignStage(progress, expansion, stage)
  );
}
