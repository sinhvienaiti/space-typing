import { describe, expect, it } from "vitest";
import {
  EXPANSION_V2_FEATURE_KEY,
  expansionV2FeatureEnabled,
} from "../src/expansion-v2/feature-flags";
import {
  auditCampaignExpansion,
  campaignExpansionBand,
  campaignStageExpansionProfile,
} from "../src/expansion-v2/campaign-rollout";
import {
  validateExpansionCompatibility,
} from "../src/expansion-v2/contracts";

class MemoryStorage {
  value: string | null = null;
  getItem(key: string): string | null {
    return key === EXPANSION_V2_FEATURE_KEY ? this.value : null;
  }
}

describe("Expansion V2 P100 release contracts", () => {
  it("feature flag defaults on, supports rollback, and query override does not delete data", () => {
    const storage = new MemoryStorage();
    expect(expansionV2FeatureEnabled(storage, "")).toBe(true);
    storage.value = "false";
    expect(expansionV2FeatureEnabled(storage, "")).toBe(false);
    expect(expansionV2FeatureEnabled(storage, "?expansionV2=on")).toBe(true);
    storage.value = "true";
    expect(expansionV2FeatureEnabled(storage, "?expansionV2=off")).toBe(false);
  });

  it("audits all 1000 campaign stages without impossible/error profiles", () => {
    const stages = Array.from({ length: 1000 }, (_, index) => index + 1);
    const profiles = stages.map(campaignStageExpansionProfile);
    expect(profiles).toHaveLength(1000);
    expect(profiles[0]?.stage).toBe(1);
    expect(profiles.at(-1)?.stage).toBe(1000);

    const issues = auditCampaignExpansion(stages);
    expect(issues.filter((issue) => issue.severity === "error")).toEqual([]);

    expect(campaignExpansionBand(10)).toBe("core");
    expect(campaignExpansionBand(30)).toBe("foundation");
    expect(campaignExpansionBand(100)).toBe("choice");
    expect(campaignExpansionBand(250)).toBe("build-depth");
    expect(campaignExpansionBand(400)).toBe("synergy");
    expect(campaignExpansionBand(600)).toBe("boss-parts");
    expect(campaignExpansionBand(800)).toBe("learning-events");
    expect(campaignExpansionBand(950)).toBe("mastery");
    expect(campaignExpansionBand(1000)).toBe("endgame");
  });

  it("rejects representative three-way incompatible stacks explicitly", () => {
    const result = validateExpansionCompatibility({
      pattern: "recall-word",
      recipe: "recall-rupture",
      condition: "time-fracture",
      affixes: ["chrono", "guardian", "phase"],
      recallRequired: true,
    });
    expect(result.ok).toBe(false);
    expect(result.reasonCodes).toContain("recall-chrono-rejected");
    expect(result.reasonCodes).toContain("time-fracture-chrono-rejected");
    expect(result.reasonCodes).toContain("recall-time-fracture-rejected");
  });
});
