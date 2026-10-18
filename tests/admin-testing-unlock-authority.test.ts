import { describe, expect, it } from "vitest";
import { testingStageUnlockEnabled } from "../src/campaign/stage-selection-access";

describe("published campaign access authority", () => {
  it("ignores local settings when the published Admin switch is off", () => {
    expect(testingStageUnlockEnabled(true, "published", { unlockAllStages: false, unlockAllShips: true })).toBe(false);
  });

  it("honors the published Admin switch independently of player settings", () => {
    expect(testingStageUnlockEnabled(false, "published", { unlockAllStages: true, unlockAllShips: true })).toBe(true);
    expect(testingStageUnlockEnabled(true, "published", { unlockAllStages: true, unlockAllShips: true })).toBe(true);
  });

  it("preserves the legacy QA switch for bundled standalone development", () => {
    expect(testingStageUnlockEnabled(true, "bundled")).toBe(true);
    expect(testingStageUnlockEnabled(false, "bundled")).toBe(false);
  });
});
