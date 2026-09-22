import { describe, expect, it } from "vitest";
import {
  auditEarlyCampaign,
  normalStageSpikeRatio,
} from "../src/balance/early-game";

describe("Stage 001-100 balance audit", () => {
  const points = auditEarlyCampaign();

  it("covers the complete first Galaxy", () => {
    expect(points).toHaveLength(100);
    expect(points[0]?.stage).toBe(1);
    expect(points[99]?.stage).toBe(100);
  });

  it("keeps normal-stage pressure growth gradual", () => {
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1]!;
      const current = points[index]!;
      if (current.role !== "normal" || previous.role !== "normal") {
        continue;
      }

      expect(
        normalStageSpikeRatio(previous, current),
        "Stage " + String(current.stage),
      ).toBeLessThan(1.08);
    }
  });

  it("returns to a lower pressure band after role spikes", () => {
    for (const stage of [10, 20, 40, 50, 60, 70, 80, 90]) {
      const role = points[stage - 1]!;
      const recovery = points[stage]!;
      expect(recovery.role).toBe("normal");
      expect(
        recovery.pressureIndex,
        "Stage " + String(stage + 1),
      ).toBeLessThan(role.pressureIndex);
    }
  });

  it("keeps first-Galaxy reaction values inside intended safe bounds", () => {
    for (const point of points) {
      expect(point.enemySpeed).toBeGreaterThanOrEqual(0.82);
      expect(point.enemySpeed).toBeLessThan(1.3);
      expect(point.spawnInterval).toBeGreaterThan(1);
      expect(point.projectilePressure).toBeLessThan(1.5);
      expect(point.bossPressure).toBeLessThan(1.5);
    }
  });

  it("uses milestone roles at the designed cadence", () => {
    const roles = new Map(
      points
        .filter((point) => point.role !== "normal")
        .map((point) => [point.stage, point.role]),
    );

    expect(roles.get(10)).toBe("elite");
    expect(roles.get(20)).toBe("mini-boss");
    expect(roles.get(30)).toBe("special");
    expect(roles.get(50)).toBe("boss");
    expect(roles.get(60)).toBe("hazard");
    expect(roles.get(90)).toBe("gauntlet");
    expect(roles.get(100)).toBe("major-boss");
  });
});
