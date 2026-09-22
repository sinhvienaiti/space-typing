import { describe, expect, it } from "vitest";
import {
  GALAXY_MILESTONE_OFFSETS,
  laterGalaxyMilestones,
  milestoneStagesForManualPlaytest,
} from "../src/balance/later-galaxies";

describe("later Galaxy milestone tuning audit", () => {
  const points = laterGalaxyMilestones();

  it("samples four high-value milestones per Galaxy", () => {
    expect(points).toHaveLength(40);
    expect(GALAXY_MILESTONE_OFFSETS).toEqual([50, 60, 90, 100]);
    expect(milestoneStagesForManualPlaytest()).toContain(1000);
  });

  it("keeps same-role pressure progression gradual between Galaxies", () => {
    for (const offset of GALAXY_MILESTONE_OFFSETS) {
      const rolePoints = points.filter(
        (point) => point.stage % 100 === offset % 100,
      );

      for (let index = 1; index < rolePoints.length; index += 1) {
        const previous = rolePoints[index - 1]!;
        const current = rolePoints[index]!;

        expect(current.combatPressure).toBeGreaterThan(
          previous.combatPressure,
        );
        expect(
          current.combatPressure / previous.combatPressure,
          "Stage " + String(current.stage),
        ).toBeLessThan(1.16);
      }
    }
  });

  it("keeps later-Galaxy reaction values within global design caps", () => {
    for (const point of points) {
      expect(point.enemySpeed).toBeLessThanOrEqual(2.1);
      expect(point.spawnInterval).toBeGreaterThanOrEqual(0.34);
      expect(point.projectilePressure).toBeLessThanOrEqual(2.8);
      expect(point.bossPressure).toBeLessThanOrEqual(2.7);
    }
  });

  it("keeps major-boss pressure above same-Galaxy boss pressure", () => {
    for (let galaxy = 1; galaxy <= 10; galaxy += 1) {
      const boss = points.find(
        (point) => point.galaxy === galaxy && point.stage % 100 === 50,
      )!;
      const majorBoss = points.find(
        (point) => point.galaxy === galaxy && point.stage % 100 === 0,
      )!;

      expect(majorBoss.bossPressure).toBeGreaterThan(boss.bossPressure);
      expect(majorBoss.combatPressure).toBeGreaterThan(boss.combatPressure);
    }
  });
});
