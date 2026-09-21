import { clamp } from "../logic";
import type { EnemyKind } from "../types";

export type EnemyWeights = Record<EnemyKind, number>;

export type EnemyProfile = {
  radius: number;
  driftMin: number;
  driftMax: number;
  baseSpeed: number;
  speedVariance: number;
  layers: number;
};

export function enemyWeightsForStage(stage: number): EnemyWeights {
  const safeStage = clamp(Math.floor(stage), 1, 1000);

  const mine =
    safeStage < 3
      ? 0
      : Math.min(0.34, 0.16 + (safeStage - 3) * 0.0002);

  const tank =
    safeStage < 5
      ? 0
      : Math.min(0.3, 0.11 + (safeStage - 5) * 0.00019);

  return {
    scout: Math.max(0.36, 1 - mine - tank),
    mine,
    tank,
  };
}

export function chooseEnemyKind(
  stage: number,
  random = Math.random(),
): EnemyKind {
  const weights = enemyWeightsForStage(stage);
  const value = clamp(random, 0, 0.999999);

  if (value < weights.mine) return "mine";
  if (value < weights.mine + weights.tank) return "tank";
  return "scout";
}

export function enemyProfile(kind: EnemyKind, galaxy: number): EnemyProfile {
  const galaxyScale = Math.max(0, galaxy - 1);

  if (kind === "mine") {
    return {
      radius: 18,
      driftMin: 54,
      driftMax: 96,
      baseSpeed: 55 + galaxyScale * 2.8,
      speedVariance: 15,
      layers: 1,
    };
  }

  if (kind === "tank") {
    return {
      radius: 34,
      driftMin: 10,
      driftMax: 30,
      baseSpeed: 22 + galaxyScale * 1.6,
      speedVariance: 8,
      layers: 2,
    };
  }

  return {
    radius: 24,
    driftMin: 20,
    driftMax: 70,
    baseSpeed: 34 + galaxyScale * 2.2,
    speedVariance: 14,
    layers: 1,
  };
}
