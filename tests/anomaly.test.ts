import { describe, expect, it } from "vitest";
import {
  anomalyCrateChance,
  anomalyRewardSource,
  anomalyRiskHullRatio,
  createAnomalyReward,
  shouldScheduleAnomalyCrate,
} from "../src/events/anomaly";

describe("Anomaly crate", () => {
  it("does not appear before its mid-Campaign introduction", () => {
    expect(anomalyCrateChance(49)).toBe(0);
    expect(shouldScheduleAnomalyCrate(49, 0)).toBe(false);
  });

  it("keeps risk and event chance bounded", () => {
    expect(anomalyCrateChance(1000)).toBeLessThanOrEqual(0.075);
    expect(anomalyRiskHullRatio(1000)).toBeLessThanOrEqual(0.2);
  });

  it("uses a stronger loot source for Overload", () => {
    expect(anomalyRewardSource("stabilize")).toBe("golden");
    expect(anomalyRewardSource("overload")).toBe("anomaly");

    const reward = createAnomalyReward("overload", 0, () => 0.5);
    expect(reward.source).toBe("anomaly");
  });
});
