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
  actionInterval: number | null;
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
      : Math.min(0.2, 0.08 + (safeStage - 8) * 0.00012);

  const oppressor =
    safeStage < 15
      ? 0
      : Math.min(0.16, 0.05 + (safeStage - 15) * 0.00011);

  const shield =
    safeStage < 20
      ? 0
      : Math.min(0.13, 0.045 + (safeStage - 20) * 0.00009);

  const carrier =
    safeStage < 25
      ? 0
      : Math.min(0.1, 0.035 + (safeStage - 25) * 0.00007);

  const jammer =
    safeStage < 30
      ? 0
      : Math.min(0.09, 0.03 + (safeStage - 30) * 0.00006);

  const cloaker =
    safeStage < 35
      ? 0
      : Math.min(0.08, 0.028 + (safeStage - 35) * 0.000055);

  const specialTotal =
    mine +
    tank +
    destroyer +
    oppressor +
    shield +
    carrier +
    jammer +
    cloaker;
  const scale = specialTotal > 0.7 ? 0.7 / specialTotal : 1;
  const resolvedMine = mine * scale;
  const resolvedTank = tank * scale;
  const resolvedDestroyer = destroyer * scale;
  const resolvedOppressor = oppressor * scale;
  const resolvedShield = shield * scale;
  const resolvedCarrier = carrier * scale;
  const resolvedJammer = jammer * scale;
  const resolvedCloaker = cloaker * scale;

  const scout = Math.max(
    0.3,
    1 -
      resolvedMine -
      resolvedTank -
      resolvedDestroyer -
      resolvedOppressor -
      resolvedShield -
      resolvedCarrier -
      resolvedJammer -
      resolvedCloaker,
  );

  return {
    scout,
    mine: resolvedMine,
    tank: resolvedTank,
    destroyer: resolvedDestroyer,
    oppressor: resolvedOppressor,
    shield: resolvedShield,
    carrier: resolvedCarrier,
    jammer: resolvedJammer,
    cloaker: resolvedCloaker,
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
  if (
    value <
    weights.mine + weights.tank + weights.destroyer + weights.oppressor
  ) {
    return "oppressor";
  }
  if (
    value <
    weights.mine +
      weights.tank +
      weights.destroyer +
      weights.oppressor +
      weights.shield
  ) {
    return "shield";
  }
  if (
    value <
    weights.mine +
      weights.tank +
      weights.destroyer +
      weights.oppressor +
      weights.shield +
      weights.carrier
  ) {
    return "carrier";
  }
  if (
    value <
    weights.mine +
      weights.tank +
      weights.destroyer +
      weights.oppressor +
      weights.shield +
      weights.carrier +
      weights.jammer
  ) {
    return "jammer";
  }
  if (
    value <
    weights.mine +
      weights.tank +
      weights.destroyer +
      weights.oppressor +
      weights.shield +
      weights.carrier +
      weights.jammer +
      weights.cloaker
  ) {
    return "cloaker";
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
      actionInterval: null,
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
      actionInterval: null,
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
      actionInterval: Math.max(2.6, 4.4 - galaxyScale * 0.12),
    };
  }

  if (kind === "oppressor") {
    return {
      radius: 40,
      driftMin: 20,
      driftMax: 42,
      baseSpeed: 23 + galaxyScale * 1.5,
      speedVariance: 7,
      layers: 1,
      actionInterval: Math.max(2.2, 4 - galaxyScale * 0.13),
    };
  }

  if (kind === "shield") {
    return {
      radius: 30,
      driftMin: 18,
      driftMax: 44,
      baseSpeed: 28 + galaxyScale * 1.8,
      speedVariance: 9,
      layers: 2,
      actionInterval: null,
    };
  }

  if (kind === "carrier") {
    return {
      radius: 42,
      driftMin: 16,
      driftMax: 34,
      baseSpeed: 20 + galaxyScale * 1.3,
      speedVariance: 6,
      layers: 1,
      actionInterval: Math.max(3.6, 6.2 - galaxyScale * 0.15),
    };
  }

  if (kind === "jammer") {
    return {
      radius: 31,
      driftMin: 22,
      driftMax: 50,
      baseSpeed: 27 + galaxyScale * 1.7,
      speedVariance: 8,
      layers: 1,
      actionInterval: Math.max(3.8, 6 - galaxyScale * 0.12),
    };
  }

  if (kind === "cloaker") {
    return {
      radius: 25,
      driftMin: 42,
      driftMax: 76,
      baseSpeed: 38 + galaxyScale * 2,
      speedVariance: 11,
      layers: 1,
      actionInterval: null,
    };
  }

  return {
    radius: 24,
    driftMin: 20,
    driftMax: 70,
    baseSpeed: 34 + galaxyScale * 2.2,
    speedVariance: 14,
    layers: 1,
    actionInterval: null,
  };
}
