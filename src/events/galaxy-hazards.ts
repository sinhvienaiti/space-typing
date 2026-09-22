import type { StageConfig } from "../campaign/types";
import type { StageEventDefinition } from "./stage-scheduler";

export type GalaxyStageModifierId =
  | "supply-run"
  | "training-window"
  | "ion-storm"
  | "debris-field"
  | "solar-flare"
  | "gravity-tide"
  | "gauntlet-pressure";

export type GalaxyStageModifier = StageEventDefinition & {
  id: GalaxyStageModifierId;
};

const SUPPLY_RUN: GalaxyStageModifier = {
  id: "supply-run",
  name: "Supply Run",
  description: "Special stage: slower hostiles and doubled Supply Pod opportunities.",
  tone: "benefit",
  minStage: 30,
  weight: 0,
  effect: {
    enemySpeedMultiplier: 0.9,
    supplyMultiplier: 2,
  },
};

const TRAINING_WINDOW: GalaxyStageModifier = {
  id: "training-window",
  name: "Training Window",
  description: "Special stage: hostile projectile pressure is reduced.",
  tone: "benefit",
  minStage: 30,
  weight: 0,
  effect: {
    projectilePressureMultiplier: 0.78,
  },
};

const HAZARDS: readonly GalaxyStageModifier[] = [
  {
    id: "ion-storm",
    name: "Ion Storm",
    description: "Galaxy hazard: reduced starting Shield and heavier projectile pressure.",
    tone: "hazard",
    minStage: 60,
    weight: 0,
    effect: {
      startingShieldMultiplier: 0.78,
      projectilePressureMultiplier: 1.18,
    },
  },
  {
    id: "debris-field",
    name: "Debris Field",
    description: "Galaxy hazard: hostile ships move faster through unstable lanes.",
    tone: "hazard",
    minStage: 60,
    weight: 0,
    effect: {
      enemySpeedMultiplier: 1.16,
    },
  },
  {
    id: "solar-flare",
    name: "Solar Flare",
    description: "Galaxy hazard: Shield starts lower but emergency supplies are more common.",
    tone: "mixed",
    minStage: 60,
    weight: 0,
    effect: {
      startingShieldMultiplier: 0.66,
      supplyMultiplier: 2,
    },
  },
  {
    id: "gravity-tide",
    name: "Gravity Tide",
    description: "Galaxy hazard: movement and hostile projectile pressure both rise.",
    tone: "hazard",
    minStage: 60,
    weight: 0,
    effect: {
      enemySpeedMultiplier: 1.1,
      projectilePressureMultiplier: 1.12,
    },
  },
];

const GAUNTLET: GalaxyStageModifier = {
  id: "gauntlet-pressure",
  name: "Gauntlet Pressure",
  description: "Gauntlet stage: standard enemies gain an extra layer and move faster.",
  tone: "hazard",
  minStage: 90,
  weight: 0,
  effect: {
    enemySpeedMultiplier: 1.08,
    extraEnemyLayers: 1,
    supplyMultiplier: 2,
  },
};

export function galaxyStageModifiers(
  stage: StageConfig,
): GalaxyStageModifier[] {
  if (stage.role === "special") {
    return [stage.galaxy % 2 === 0 ? TRAINING_WINDOW : SUPPLY_RUN];
  }

  if (stage.role === "hazard") {
    return [HAZARDS[(stage.galaxy - 1) % HAZARDS.length] ?? HAZARDS[0]!];
  }

  if (stage.role === "gauntlet") {
    return [GAUNTLET];
  }

  return [];
}
