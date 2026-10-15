import { describe, expect, it } from "vitest";
import {
  CONTEXTUAL_HOLO_HELP,
  contextualHoloHelpDefinition,
} from "../src/ui/holo-tooltip";

describe("contextual holo help", () => {
  it("covers the major Campaign currencies and combat resources", () => {
    expect(CONTEXTUAL_HOLO_HELP.map((entry) => entry.anchorId)).toEqual([
      "creditsHud",
      "warpBalance",
      "hull",
      "shield",
      "energyText",
      "powerHint",
      "titlePilotCredits",
      "titleWarpBalance",
    ]);
  });

  it("keeps every help target unique and its copy compact", () => {
    const ids = CONTEXTUAL_HOLO_HELP.map((entry) => entry.anchorId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of CONTEXTUAL_HOLO_HELP) {
      expect(entry.text.trim().length).toBeGreaterThan(20);
      expect(entry.text.length).toBeLessThanOrEqual(180);
    }
  });

  it("resolves definitions without inventing help for unknown elements", () => {
    expect(contextualHoloHelpDefinition("creditsHud")?.text).toContain(
      "Credits",
    );
    expect(contextualHoloHelpDefinition("warpBalance")?.text).toContain(
      "Warp Charge",
    );
    expect(contextualHoloHelpDefinition("missing-resource")).toBeNull();
  });
});
