import { describe, expect, it } from "vitest";
import { hasUsableDeathProtection } from "../src/ui/game-over";

describe("Game Over automatic checkpoint eligibility", () => {
  it("automatically rolls back when every recovery item is empty", () => {
    expect(
      hasUsableDeathProtection({
        salvageAnchors: 0,
        stageRevivalCores: 0,
        phoenixCores: 0,
        hasValidStageEntry: true,
      }),
    ).toBe(false);
  });

  it("allows explicit item choice when an applicable recovery item exists", () => {
    expect(
      hasUsableDeathProtection({
        salvageAnchors: 1,
        stageRevivalCores: 0,
        phoenixCores: 0,
        hasValidStageEntry: false,
      }),
    ).toBe(true);
    expect(
      hasUsableDeathProtection({
        salvageAnchors: 0,
        stageRevivalCores: 1,
        phoenixCores: 0,
        hasValidStageEntry: true,
      }),
    ).toBe(true);
    expect(
      hasUsableDeathProtection({
        salvageAnchors: 0,
        stageRevivalCores: 0,
        phoenixCores: 1,
        hasValidStageEntry: true,
      }),
    ).toBe(true);
  });

  it("automatically rolls back if revival cores lack a valid stage entry", () => {
    expect(
      hasUsableDeathProtection({
        salvageAnchors: 0,
        stageRevivalCores: 2,
        phoenixCores: 1,
        hasValidStageEntry: false,
      }),
    ).toBe(false);
  });
});
