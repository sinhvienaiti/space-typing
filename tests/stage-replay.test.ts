import { describe, expect, it } from "vitest";
import {
  createDefaultCampaignProgress,
  recordStageClear,
} from "../src/campaign/progress";
import {
  createCampaignExpansionState,
  rollbackCampaignExpansion,
} from "../src/campaign/expansion-state";
import { selectCompletedStageForReplay } from "../src/campaign/replay";

describe("Stage Clear replay targets the completed stage", () => {
  it("replays Stage 002 after progression has already advanced to 003", () => {
    const before = { ...createDefaultCampaignProgress(), highestUnlockedStage: 2, selectedStage: 2, clearedStages: [1] };
    const cleared = recordStageClear(before, 2, {
      score: 1411, accuracy: 91.7, wpm: 23, clearedAt: "2026-01-01",
    });
    expect(cleared.selectedStage).toBe(3);
    const replay = selectCompletedStageForReplay(
      cleared,
      createCampaignExpansionState(cleared),
      2,
    );
    expect(replay.selectedStage).toBe(2);
    expect(replay.highestUnlockedStage).toBe(3);
    expect(replay.clearedStages).toEqual(cleared.clearedStages);
  });

  it("cannot use replay to skip a future stage or bypass rollback ceiling", () => {
    const progress = { ...createDefaultCampaignProgress(), highestUnlockedStage: 5, selectedStage: 5 };
    const segment = createCampaignExpansionState(progress);
    expect(selectCompletedStageForReplay(progress, segment, 6)).toEqual(progress);
    const restored = rollbackCampaignExpansion(segment, "2026-01-01");
    expect(selectCompletedStageForReplay(progress, restored, 5)).toEqual(progress);
  });
});
