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
  fireInterval: number | null;
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
      : Math.min(0.24, 0.1 + (safeStage - 5) * 0.00014);

  const destroyer =
    safeStage < 8
      ? 0
      : Math.min(0.22, 0.09 + (safeStage - 8) * 0.00013);

  return {
    scout: Math.max(0.3, 1 - mine - tank - destroyer),
    mine,
    tank,
    destroyer,
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
  if (value < weights.mine + weights.tank + weights.destroyer) {
    return "destroyer";
  }
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
      fireInterval: null,
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
      fireInterval: null,
    };
  }

  if (kind === "destroyer") {
    return {
      radius: 29,
      driftMin: 30,
      driftMax: 56,
      baseSpeed: 29 + galaxyScale * 1.9,
      speedVariance: 9,
      layers: 1,
      fireInterval: Math.max(2.6, 4.4 - galaxyScale * 0.12),
    };
  }

  return {
    radius: 24,
    driftMin: 20,
    driftMax: 70,
    baseSpeed: 34 + galaxyScale * 2.2,
    speedVariance: 14,
    layers: 1,
    fireInterval: null,
  };
}
