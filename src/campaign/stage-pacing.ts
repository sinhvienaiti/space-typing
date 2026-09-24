import type { StageConfig, StageRole } from "./types";

export const STAGE_PHASE_KINDS = [
  "opening",
  "pressure",
  "mixed",
  "recovery",
  "finale",
] as const;

export type StagePhaseKind = (typeof STAGE_PHASE_KINDS)[number];

export type StagePacingPhase = {
  index: number;
  count: number;
  kind: StagePhaseKind;
  label: string;
  budget: number;
  spawnIntervalMultiplier: number;
  eliteChanceMultiplier: number;
  recoverySeconds: number;
  drainThreshold: number;
};

export type StagePacingPlan = {
  totalBudget: number;
  phases: StagePacingPhase[];
};

const PHASE_PROFILE: Record<
  StagePhaseKind,
  Omit<StagePacingPhase, "index" | "count" | "kind" | "budget">
> = {
  opening: {
    label: "Opening",
    spawnIntervalMultiplier: 1.12,
    eliteChanceMultiplier: 0.7,
    recoverySeconds: 1.1,
    drainThreshold: 1,
  },
  pressure: {
    label: "Pressure Ramp",
    spawnIntervalMultiplier: 1,
    eliteChanceMultiplier: 0.95,
    recoverySeconds: 1.15,
    drainThreshold: 1,
  },
  mixed: {
    label: "Mixed Threats",
    spawnIntervalMultiplier: 0.92,
    eliteChanceMultiplier: 1.2,
    recoverySeconds: 1.25,
    drainThreshold: 1,
  },
  recovery: {
    label: "Recovery Beat",
    spawnIntervalMultiplier: 1.18,
    eliteChanceMultiplier: 0.8,
    recoverySeconds: 1,
    drainThreshold: 0,
  },
  finale: {
    label: "Finale",
    spawnIntervalMultiplier: 0.86,
    eliteChanceMultiplier: 1.35,
    recoverySeconds: 0,
    drainThreshold: 0,
  },
};

function phaseKindsFor(stage: StageConfig): StagePhaseKind[] {
  const role = stage.role;

  if (
    role === "boss" ||
    role === "major-boss" ||
    role === "gauntlet"
  ) {
    return ["opening", "pressure", "mixed", "recovery", "finale"];
  }

  if (
    role === "mini-boss" ||
    role === "elite" ||
    role === "special" ||
    role === "hazard" ||
    stage.stage <= 50
  ) {
    return stage.stage <= 10 && role === "normal"
      ? ["opening", "pressure", "finale"]
      : ["opening", "pressure", "mixed", "finale"];
  }

  return ["opening", "pressure", "mixed", "recovery", "finale"];
}

function weightsFor(
  kinds: readonly StagePhaseKind[],
  role: StageRole,
): number[] {
  const count = kinds.length;
  const weights =
    count === 3
      ? [0.28, 0.34, 0.38]
      : count === 4
        ? [0.22, 0.25, 0.25, 0.28]
        : [0.17, 0.2, 0.22, 0.17, 0.24];

  if (
    role === "boss" ||
    role === "major-boss" ||
    role === "gauntlet"
  ) {
    weights[0] = Math.max(0.1, weights[0]! - 0.03);
    weights[weights.length - 1] =
      weights[weights.length - 1]! + 0.03;
  }

  return weights;
}

function distributeBudget(
  totalBudget: number,
  weights: readonly number[],
): number[] {
  const total = Math.max(weights.length, Math.floor(totalBudget));
  const budgets = weights.map((weight) =>
    Math.max(1, Math.floor(total * weight)),
  );
  let assigned = budgets.reduce((sum, value) => sum + value, 0);

  while (assigned < total) {
    const index = (assigned - weights.length) % budgets.length;
    budgets[index] = budgets[index]! + 1;
    assigned += 1;
  }

  while (assigned > total) {
    const index = budgets.length - 1 - ((assigned - total - 1) % budgets.length);
    if (budgets[index]! <= 1) break;
    budgets[index] = budgets[index]! - 1;
    assigned -= 1;
  }

  return budgets;
}

export function createStagePacingPlan(
  stage: StageConfig,
  totalBudget = stage.enemyBudget,
): StagePacingPlan {
  const kinds = phaseKindsFor(stage);
  const budget = Math.max(kinds.length, Math.floor(totalBudget));
  const budgets = distributeBudget(
    budget,
    weightsFor(kinds, stage.role),
  );

  return {
    totalBudget: budget,
    phases: kinds.map((kind, index) => ({
      index,
      count: kinds.length,
      kind,
      budget: budgets[index]!,
      ...PHASE_PROFILE[kind],
    })),
  };
}

export function stagePacingBudgetSum(plan: StagePacingPlan): number {
  return plan.phases.reduce((sum, phase) => sum + phase.budget, 0);
}
