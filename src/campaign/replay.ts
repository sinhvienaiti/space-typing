import { canSelectCampaignStage, type CampaignExpansionState } from "./expansion-state";
import { selectCampaignStage } from "./progress";
import type { CampaignProgress } from "./types";

/** Stage clear advances the selected frontier. Replay explicitly targets
 * the just-completed stage, subject to the existing checkpoint ceiling. */
export function selectCompletedStageForReplay(
  campaign: CampaignProgress,
  expansion: CampaignExpansionState,
  justCompletedStage: number,
): CampaignProgress {
  return canSelectCampaignStage(campaign, expansion, justCompletedStage)
    ? selectCampaignStage(campaign, justCompletedStage)
    : campaign;
}
