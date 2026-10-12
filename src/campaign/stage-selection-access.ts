import { ACTIVE_STAGE_RUNTIME_SESSION } from "../admin/stage-runtime-policy";
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
 * Keep the legacy local testing switch available only when the child is
 * running from bundled/standalone policy. Once a valid published platform
 * runtime is present, local storage or DevTools cannot grant campaign access.
 */
export function testingStageUnlockEnabled(
  unlockAllStages: boolean,
  runtimeSource: "bundled" | "published" = ACTIVE_STAGE_RUNTIME_SESSION.source,
): boolean {
  return runtimeSource === "bundled" && unlockAllStages;
}

/**
 * Optional local testing override for Stage Select.
 *
 * This grants temporary access only in standalone/bundled development. It
 * never mutates CampaignProgress, highestUnlockedStage, checkpoint state,
 * cleared stages, or rewards, and it is ignored under published Admin policy.
 */
export function canSelectCampaignStageWithTestingUnlock(
  progress: CampaignProgress,
  expansion: CampaignExpansionState,
  stage: number,
  unlockAllStages: boolean,
): boolean {
  if (!validCampaignStage(stage)) return false;
  return (
    testingStageUnlockEnabled(unlockAllStages) ||
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
    testingStageUnlockEnabled(unlockAllStages) &&
    validCampaignStage(stage) &&
    !canSelectCampaignStage(progress, expansion, stage)
  );
}
