import { describe, expect, it } from "vitest";
import {
  createCampaignStages,
  createStageConfig,
} from "../src/campaign/stage";

describe("long-stage total spawn budgets", () => {
  it("extends onboarding without forcing Stage 001 to 100+ enemies", () => {
    expect(createStageConfig(1).enemyBudget).toBe(45);
    expect(createStageConfig(9).enemyBudget).toBe(53);
    expect(createStageConfig(10).role).toBe("mini-boss");
    expect(createStageConfig(10).enemyBudget).toBe(74);
    expect(createStageConfig(11).enemyBudget).toBe(60);
  });

  it("ramps ordinary stages toward 100-140 total spawns", () => {
    expect(createStageConfig(51).enemyBudget).toBe(80);
    expect(createStageConfig(111).enemyBudget).toBe(100);
    expect(createStageConfig(231).enemyBudget).toBe(140);
    expect(createStageConfig(999).enemyBudget).toBe(140);
    expect(createStageConfig(1000).enemyBudget).toBe(175);
  });

  it("has more than 100 total enemies per average normal Campaign stage", () => {
    const ordinary = createCampaignStages()
      .filter((stage) => stage.role === "normal");
    const average = ordinary.reduce(
      (sum, stage) => sum + stage.enemyBudget, 0,
    ) / ordinary.length;

    expect(ordinary.length).toBeGreaterThan(600);
    expect(average).toBeGreaterThan(100);
    expect(Math.max(...ordinary.map((stage) => stage.enemyBudget)))
      .toBeLessThanOrEqual(140);
  });

  it("does not abruptly spike between consecutive normal stages", () => {
    const stages = createCampaignStages();
    for (let index = 1; index < stages.length; index += 1) {
      const previous = stages[index - 1]!;
      const current = stages[index]!;
      if (previous.role !== "normal" || current.role !== "normal") continue;
      expect(current.enemyBudget - previous.enemyBudget)
        .toBeGreaterThanOrEqual(0);
      expect(current.enemyBudget - previous.enemyBudget)
        .toBeLessThanOrEqual(1);
    }
  });

  it("retains boss milestones and a lower recovery budget afterward", () => {
    const stages = createCampaignStages();
    for (const stage of [5, 10, 15, 20, 30, 40, 50, 55, 95, 100, 1000]) {
      const point = stages[stage - 1]!;
      expect(point.role).not.toBe("normal");
      if (stage < 1000) {
        expect(stages[stage]!.enemyBudget)
          .toBeLessThan(point.enemyBudget);
      }
    }
  });
});
