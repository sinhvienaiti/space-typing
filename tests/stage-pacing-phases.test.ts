import { describe, expect, it } from "vitest";
import {
  createStagePacingPlan,
  stagePacingBudgetSum,
} from "../src/campaign/stage-pacing";
import {
  createCampaignStages,
  createStageConfig,
} from "../src/campaign/stage";

describe("explicit stage pacing phases", () => {
  it("uses 3 phases for onboarding normal stages, 4 for mid campaign and 5 for late stages", () => {
    expect(createStageConfig(1).role).toBe("normal");
    expect(createStagePacingPlan(createStageConfig(1)).phases)
      .toHaveLength(3);

    expect(createStageConfig(11).role).toBe("normal");
    expect(createStagePacingPlan(createStageConfig(11)).phases)
      .toHaveLength(4);

    expect(createStageConfig(51).role).toBe("normal");
    expect(createStagePacingPlan(createStageConfig(51)).phases)
      .toHaveLength(5);
  });

  it("gives milestone pressure roles authored 4-5 phase pacing", () => {
    expect(createStagePacingPlan(createStageConfig(10)).phases)
      .toHaveLength(4);
    expect(createStagePacingPlan(createStageConfig(20)).phases)
      .toHaveLength(5);
    expect(createStagePacingPlan(createStageConfig(95)).phases)
      .toHaveLength(5);
    expect(createStagePacingPlan(createStageConfig(100)).phases)
      .toHaveLength(5);
  });

  it("preserves the exact total enemy budget for all 1000 Campaign stages", () => {
    for (const stage of createCampaignStages()) {
      const plan = createStagePacingPlan(stage);
      expect(plan.totalBudget, String(stage.stage)).toBe(stage.enemyBudget);
      expect(stagePacingBudgetSum(plan), String(stage.stage))
        .toBe(stage.enemyBudget);
      expect(plan.phases.length).toBeGreaterThanOrEqual(3);
      expect(plan.phases.length).toBeLessThanOrEqual(5);
      expect(plan.phases.every((phase) => phase.budget > 0)).toBe(true);
    }
  });

  it("preserves hidden/challenge runtime budget overrides exactly", () => {
    const stage = createStageConfig(51);
    for (const runtimeBudget of [1, 5, 37, 123, 211]) {
      const plan = createStagePacingPlan(stage, runtimeBudget);
      const expected = Math.max(plan.phases.length, runtimeBudget);
      expect(plan.totalBudget).toBe(expected);
      expect(stagePacingBudgetSum(plan)).toBe(expected);
    }
  });

  it("creates a readable ramp with a slower opening/recovery and faster finale", () => {
    const plan = createStagePacingPlan(createStageConfig(251));
    const opening = plan.phases[0]!;
    const recovery = plan.phases.find((phase) => phase.kind === "recovery");
    const finale = plan.phases.at(-1)!;

    expect(opening.kind).toBe("opening");
    expect(finale.kind).toBe("finale");
    expect(recovery).toBeDefined();
    expect(opening.spawnIntervalMultiplier)
      .toBeGreaterThan(finale.spawnIntervalMultiplier);
    expect(recovery!.spawnIntervalMultiplier)
      .toBeGreaterThan(finale.spawnIntervalMultiplier);
    expect(finale.eliteChanceMultiplier)
      .toBeGreaterThan(opening.eliteChanceMultiplier);
    expect(finale.recoverySeconds).toBe(0);
  });

  it("keeps every runtime multiplier finite and bounded", () => {
    for (const stage of createCampaignStages()) {
      for (const phase of createStagePacingPlan(stage).phases) {
        expect(Number.isFinite(phase.spawnIntervalMultiplier)).toBe(true);
        expect(Number.isFinite(phase.eliteChanceMultiplier)).toBe(true);
        expect(Number.isFinite(phase.recoverySeconds)).toBe(true);
        expect(phase.spawnIntervalMultiplier).toBeGreaterThanOrEqual(0.8);
        expect(phase.spawnIntervalMultiplier).toBeLessThanOrEqual(1.3);
        expect(phase.eliteChanceMultiplier).toBeGreaterThanOrEqual(0.6);
        expect(phase.eliteChanceMultiplier).toBeLessThanOrEqual(1.5);
        expect(phase.recoverySeconds).toBeGreaterThanOrEqual(0);
        expect(phase.recoverySeconds).toBeLessThanOrEqual(1.5);
      }
    }
  });

  it("keeps current ordinary Campaign budgets above the approved average target", () => {
    const ordinary = createCampaignStages()
      .filter((stage) => stage.role === "normal");
    const average = ordinary.reduce(
      (sum, stage) => sum + stage.enemyBudget,
      0,
    ) / ordinary.length;

    expect(ordinary.length).toBe(800);
    expect(average).toBeGreaterThan(100);
    expect(createStageConfig(1).enemyBudget).toBe(34);
    expect(createStageConfig(51).enemyBudget).toBe(100);
  });
});
