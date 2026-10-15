import { describe, expect, it } from "vitest";
import {
  AUDIT_INPUTS,
  auditCampaign,
  auditStageReward,
  auditFailureBounds,
  auditPacing,
  type RewardScenario,
} from "../src/balance/warp-economy-audit";
const scenario = (
  mode: string,
  performance = false,
  voice = false,
): RewardScenario => ({
  input: AUDIT_INPUTS.find((item) => item.id === mode)!.input,
  tier: 0,
  performance,
  voice,
  objective: false,
  maxBossCache: false,
});
describe("Warp production-formula audit", () => {
  it.each([
    ["balanced", false, 350],
    ["impossible", false, 479],
    ["balanced", true, 1251],
    ["impossible", true, 2281],
  ] as const)(
    "%s performance=%s reproduces the corrected V3 baseline %s",
    (mode, performance, total) => {
      expect(auditCampaign(scenario(mode, performance)).total).toBe(total);
    },
  );
  it("never lets Voice manufacture typing performance, and excludes one-time milestones on replay", () => {
    expect(
      auditCampaign(scenario("impossible", true, true)).performanceSC,
    ).toBe(0);
    const replay = auditStageReward(
      1000,
      { ...scenario("impossible", true), tier: 10 },
      false,
    );
    expect(replay.sectorSC).toBe(0);
    expect(replay.ascensionSC).toBe(0);
  });
  it("keeps honest positive-net replay counterexamples with 8/12/18 rather than silently altering prices", () => {
    const balanced = auditStageReward(100, scenario("balanced", true), false);
    const impossible = auditStageReward(
      100,
      scenario("impossible", true),
      false,
    );
    expect(
      auditFailureBounds(balanced, 0, 0).netPerRefill.map((p) => p.lower),
    ).toEqual([2, -2, -8]);
    expect(
      auditFailureBounds(impossible, 0, 0).netPerRefill.map((p) => p.lower),
    ).toEqual([10, 6, 0]);
    expect(auditFailureBounds(impossible, 0.2, 0).warpPerClear).toBe(12.5);
    expect(auditFailureBounds(impossible, 0.2, 1).warpPerClear).toBe(10);
  });
  it("models cap waste, a single daily session, split sessions and long breaks using actual regen", () => {
    const pacing = auditPacing();
    expect(pacing.idle.map((row) => row.immediateAttempts)).toEqual([
      17, 40, 40,
    ]);
    expect(pacing.schedules.map((row) => row.attempts)).toEqual([17, 24, 24]);
    expect(pacing.fullStockAttempts).toBe(40);
    expect(pacing.idle[2]!.hoursAtBothCaps).toBe(98);
  });
});
