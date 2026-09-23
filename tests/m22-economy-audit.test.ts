import { describe, expect, it } from "vitest";
import {
  M22_LOOT_SOURCES,
  runM22EconomyAudit,
} from "../src/balance/m22-economy-audit";

describe("M22 seeded economy and loot audit", () => {
  const report = runM22EconomyAudit();

  it("keeps production drop and grade simulations inside statistical tolerance", () => {
    expect(report.errors).toEqual([]);
    expect(report.loot).toHaveLength(M22_LOOT_SOURCES.length);

    for (const row of report.loot) {
      expect(
        Math.abs(row.observedDropRate - row.expectedDropRate),
      ).toBeLessThanOrEqual(0.012);
      expect(row.highSalvageDropRate).toBeGreaterThanOrEqual(
        row.observedDropRate,
      );
    }
  });

  it("keeps enemy reward pressure bounded across early-to-late samples", () => {
    expect(report.enemyRewards.map((row) => row.stage)).toEqual([
      30,
      250,
      500,
      750,
      1000,
    ]);

    for (const row of report.enemyRewards) {
      expect(row.rewardRate).toBeLessThanOrEqual(0.22);
      expect(row.highValueRewardRate).toBeLessThanOrEqual(0.14);
      expect(row.controlUptime).toBeLessThanOrEqual(0.22);
      expect(row.scoreX2Uptime).toBeLessThanOrEqual(0.18);
      expect(row.clearScreenRate).toBeLessThanOrEqual(0.02);
    }
  });

  it("earns all expansion currencies across a full Campaign clear", () => {
    expect(report.campaignCurrencyTotals.alloy).toBeGreaterThan(0);
    expect(report.campaignCurrencyTotals.starCrystal).toBeGreaterThan(0);
    expect(report.campaignCurrencyTotals.quantumCore).toBeGreaterThan(0);

    expect(report.sectorRewardTotals.credits).toBeGreaterThan(0);
    expect(report.sectorRewardTotals.alloy).toBeGreaterThan(0);
    expect(report.sectorRewardTotals.starCrystal).toBeGreaterThan(0);
    expect(report.sectorRewardTotals.quantumCore).toBeGreaterThan(0);
  });

  it("is deterministic for the same fixed production seeds", () => {
    expect(runM22EconomyAudit()).toEqual(report);
  });
});
