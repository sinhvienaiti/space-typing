import { describe, expect, it } from "vitest";
import { testingStageUnlockEnabled } from "../src/campaign/stage-selection-access";

describe("published campaign access authority", () => {
  it("ignores the local unlock-all switch when platform policy is published", () => {
    expect(testingStageUnlockEnabled(true, "published")).toBe(false);
  });

  it("preserves the legacy QA switch for bundled standalone development", () => {
    expect(testingStageUnlockEnabled(true, "bundled")).toBe(true);
    expect(testingStageUnlockEnabled(false, "bundled")).toBe(false);
  });
});
