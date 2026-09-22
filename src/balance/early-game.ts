import { difficultyFor } from "../campaign/difficulty";
import { createStageConfig } from "../campaign/stage";
import type { StageRole } from "../campaign/types";
import { galaxyStageModifiers } from "../events/galaxy-hazards";
import { combineStageEventEffects } from "../events/stage-scheduler";

export type EarlyStageBalancePoint = {
  stage: number;
  role: StageRole;
  enemyBudget: number;
  combatPressure: number;
  enemySpeed: number;
  spawnInterval: number;
  projectilePressure: number;
  bossPressure: number;
  pressureIndex: number;
};

export function earlyStageBalancePoint(
  stage: number,
): EarlyStageBalancePoint {
  const config = createStageConfig(stage);
  const difficulty = difficultyFor({
    stage,
    mode: "normal",
    vocabularyLevel: 1,
    recentWpm: 60,
    recentAccuracy: 96,
  });
  const roleModifiers = combineStageEventEffects(
    galaxyStageModifiers(config),
  );
  const enemySpeed =
    difficulty.enemySpeed * roleModifiers.enemySpeedMultiplier;
  const projectilePressure =
    difficulty.projectilePressure *
    roleModifiers.projectilePressureMultiplier;

  // Moment-to-moment reaction pressure excludes total enemyBudget because
  // budget controls encounter duration. It does include deterministic
  // StageRole modifiers so Hazard/Gauntlet pressure is represented.
  const pressureIndex =
    difficulty.combatPressure *
    enemySpeed *
    Math.sqrt(projectilePressure) /
    difficulty.spawnInterval;

  return {
    stage: config.stage,
    role: config.role,
    enemyBudget: config.enemyBudget,
    combatPressure: difficulty.combatPressure,
    enemySpeed,
    spawnInterval: difficulty.spawnInterval,
    projectilePressure,
    bossPressure: difficulty.bossPressure,
    pressureIndex,
  };
}

export function auditEarlyCampaign(): EarlyStageBalancePoint[] {
  return Array.from(
    { length: 100 },
    (_, index) => earlyStageBalancePoint(index + 1),
  );
}

export function normalStageSpikeRatio(
  previous: EarlyStageBalancePoint,
  current: EarlyStageBalancePoint,
): number {
  if (previous.pressureIndex <= 0) return 1;
  return current.pressureIndex / previous.pressureIndex;
}
