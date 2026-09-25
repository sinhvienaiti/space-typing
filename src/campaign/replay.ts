import { selectCampaignStage } from "./progress";
import type { CampaignExpansionState } from "./expansion-state";
import type { CampaignProgress } from "./types";

/** Replay targets a stage that has already been cleared. Persistent campaign
 * progression is authoritative; legacy checkpoint ceilings must not hide or
 * roll back cleared stages. */
export function selectCompletedStageForReplay(
  campaign: CampaignProgress,
  _expansion: CampaignExpansionState,
  justCompletedStage: number,
): CampaignProgress {
  if (!campaign.clearedStages.includes(justCompletedStage)) {
    return campaign;
  }
  return selectCampaignStage(campaign, justCompletedStage);
}
