import { describe, expect, it } from "vitest";
import {
  runFullExpansionAudit,
} from "../src/balance/full-expansion-audit";

describe("M22 full deterministic expansion audit", () => {
  const report = runFullExpansionAudit();

  it("covers the complete Campaign and reports no cross-system errors", () => {
    expect(report.errors).toEqual([]);
    expect(report.metrics.stages).toBe(1000);
    expect(report.metrics.worlds).toBe(50);
    expect(report.metrics.sectors).toBe(100);
    expect(report.metrics.difficultyEvaluations).toBe(6000);
    expect(report.metrics.ascensionEvaluations).toBe(40);
    expect(report.metrics.routeGraphs).toBe(100);
    expect(report.metrics.shopInstances).toBe(350);
  });

  it("keeps the full audit deterministic for a fixed seeded simulation", () => {
    const repeated = runFullExpansionAudit();

    expect(repeated.errors).toEqual([]);
    expect(repeated.metrics).toEqual(report.metrics);
    expect(repeated.deterministicSignature).toBe(
      report.deterministicSignature,
    );
  });

  it("exercises formation admission and all six fixed pressure bands", () => {
    expect(report.metrics.formationCandidates).toBeGreaterThan(0);
    expect(report.metrics.formationAdmissions).toBeGreaterThan(0);

    for (const mode of [
      "relax",
      "balanced",
      "hard",
      "extreme",
      "nightmare",
      "impossible",
    ]) {
      const metric = report.metrics.modePressure[mode];
      expect(metric).toBeDefined();
      expect(metric!.min).toBeGreaterThan(0);
      expect(metric!.max).toBeGreaterThanOrEqual(metric!.min);
      expect(metric!.average).toBeGreaterThanOrEqual(metric!.min);
      expect(metric!.average).toBeLessThanOrEqual(metric!.max);
      expect(metric!.minSpawnInterval).toBeGreaterThanOrEqual(0.34);
      expect(metric!.maxEnemies).toBeGreaterThan(0);
    }
  });

  it("keeps higher fixed modes above lower modes on aggregate pressure", () => {
    const order = [
      "relax",
      "balanced",
      "hard",
      "extreme",
      "nightmare",
      "impossible",
    ];
    const averages = order.map(
      (mode) => report.metrics.modePressure[mode]!.average,
    );

    for (let index = 1; index < averages.length; index += 1) {
      expect(averages[index]).toBeGreaterThanOrEqual(
        averages[index - 1]!,
      );
    }
    expect(averages.at(-1)).toBeGreaterThan(averages[0]!);
  });
});
