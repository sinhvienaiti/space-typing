import { describe, expect, it } from "vitest";
import {
  canSelectCampaignStageWithTestingUnlock,
  isTestingStagePreview,
  testingStageUnlockEnabled,
} from "../src/campaign/stage-selection-access";
import {
  createCampaignExpansionState,
} from "../src/campaign/expansion-state";
import {
  createDefaultCampaignProgress,
} from "../src/campaign/progress";

describe("temporary all-stage testing access", () => {
  it("ignores a local unlock switch in production while keeping published Admin authority", () => {
    expect(testingStageUnlockEnabled(true,"bundled",{unlockAllStages:false,unlockAllShips:false},false)).toBe(false);
    expect(testingStageUnlockEnabled(true,"bundled",{unlockAllStages:false,unlockAllShips:false},true)).toBe(true);
    expect(testingStageUnlockEnabled(false,"published",{unlockAllStages:true,unlockAllShips:false},false)).toBe(true);
    expect(testingStageUnlockEnabled(true,"published",{unlockAllStages:false,unlockAllShips:false},true)).toBe(false);
  });
  it("keeps normal progression locks when disabled", () => {
    const campaign = createDefaultCampaignProgress();
    const expansion = createCampaignExpansionState(campaign);

    expect(
      canSelectCampaignStageWithTestingUnlock(
        campaign,
        expansion,
        1,
        false,
      ),
    ).toBe(true);
    expect(
      canSelectCampaignStageWithTestingUnlock(
        campaign,
        expansion,
        900,
        false,
      ),
    ).toBe(false);
  });

  it("allows any valid campaign stage when enabled", () => {
    const campaign = createDefaultCampaignProgress();
    const expansion = createCampaignExpansionState(campaign);

    for (const stage of [1, 21, 100, 500, 1000]) {
      expect(
        canSelectCampaignStageWithTestingUnlock(
          campaign,
          expansion,
          stage,
          true,
        ),
      ).toBe(true);
    }

    expect(
      canSelectCampaignStageWithTestingUnlock(
        campaign,
        expansion,
        0,
        true,
      ),
    ).toBe(false);
    expect(
      canSelectCampaignStageWithTestingUnlock(
        campaign,
        expansion,
        1001,
        true,
      ),
    ).toBe(false);
  });

  it("marks only normally locked selections as testing previews", () => {
    const campaign = createDefaultCampaignProgress();
    const expansion = createCampaignExpansionState(campaign);

    expect(
      isTestingStagePreview(campaign, expansion, 1, true),
    ).toBe(false);
    expect(
      isTestingStagePreview(campaign, expansion, 21, true),
    ).toBe(true);
    expect(
      isTestingStagePreview(campaign, expansion, 21, false),
    ).toBe(false);
  });

  it("does not mutate campaign progress or checkpoint state", () => {
    const campaign = createDefaultCampaignProgress();
    const expansion = createCampaignExpansionState(campaign);
    const campaignBefore = structuredClone(campaign);
    const expansionBefore = structuredClone(expansion);

    canSelectCampaignStageWithTestingUnlock(
      campaign,
      expansion,
      1000,
      true,
    );
    isTestingStagePreview(campaign, expansion, 1000, true);

    expect(campaign).toEqual(campaignBefore);
    expect(expansion).toEqual(expansionBefore);
  });
});
