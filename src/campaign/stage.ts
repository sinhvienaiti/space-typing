import type { StageConfig, StageRole } from "./types";

export const MAX_CAMPAIGN_STAGE = 1000;
export const STAGES_PER_GALAXY = 100;
export const GALAXY_COUNT = 10;

export function normalizeStage(stage: number): number {
  if (!Number.isFinite(stage)) return 1;
  return Math.min(MAX_CAMPAIGN_STAGE, Math.max(1, Math.floor(stage)));
}

export function galaxyForStage(stage: number): number {
  return Math.ceil(normalizeStage(stage) / STAGES_PER_GALAXY);
}

export function stageInGalaxy(stage: number): number {
  return ((normalizeStage(stage) - 1) % STAGES_PER_GALAXY) + 1;
}

export function stageRole(stage: number): StageRole {
  const safeStage = normalizeStage(stage);
  const local = stageInGalaxy(safeStage);
  const worldLocal = ((safeStage - 1) % 20) + 1;
  const worldSlot = Math.ceil(local / 20);

  // M09 intentionally migrates the old Galaxy-centric boss cadence to the
  // M07 World rhythm: every World has a Mini Boss at 10 and a World Boss at
  // 20, while the fifth World ends in the Galaxy Major Boss.
  if (local === 100) return "major-boss";
  if (worldLocal === 20) return "boss";
  if (worldLocal === 10) return "mini-boss";

  // Keep the existing non-boss encounter vocabulary active without mixing
  // the previous x20/x50/x80 boss assumptions back into the World rhythm.
  if (worldLocal === 5) return "elite";
  if (worldLocal === 15) {
    if (worldSlot === 1) return "special";
    if (worldSlot === 3) return "hazard";
    if (worldSlot === 5) return "gauntlet";
    return "elite";
  }

  return "normal";
}

export function stageSeed(stage: number): number {
  const value = normalizeStage(stage);
  return Math.imul(value, 0x9e3779b1) >>> 0;
}

export function createStageConfig(stage: number): StageConfig {
  const safeStage = normalizeStage(stage);
  const galaxy = galaxyForStage(safeStage);
  const local = stageInGalaxy(safeStage);
  const role = stageRole(safeStage);

  const roleBudget =
    role === "major-boss"
      ? 7
      : role === "boss"
        ? 5
        : role === "gauntlet"
          ? 8
          : role === "mini-boss"
            ? 4
            : role === "elite"
              ? 3
              : role === "hazard" || role === "special"
                ? 2
                : 0;

  // Total encounters, not simultaneous enemies: the pressure scheduler still
  // limits active targets, projectiles and reaction windows. Early stages
  // should provide sustained typing practice instead of ending after six kills.
  const stageInWorld = ((safeStage - 1) % 20) + 1;
  const enemyBudget =
    (safeStage <= 10
      ? 34 + (safeStage - 1)
      : safeStage <= 50
        ? 54 + Math.floor((safeStage - 11) / 2)
        : Math.min(145, 100 + Math.floor((safeStage - 51) / 17))) +
    (stageInWorld === 10 || stageInWorld === 20 ? 4 : 0) +
    roleBudget;

  const eliteChance = Math.min(
    0.42,
    0.02 + (safeStage - 1) * 0.00032 + (galaxy - 1) * 0.008,
  );

  const modifierSlots =
    safeStage < 30
      ? 0
      : safeStage < 100
        ? 1
        : safeStage < 500
          ? 2
          : 3;

  return {
    stage: safeStage,
    galaxy,
    stageInGalaxy: local,
    role,
    seed: stageSeed(safeStage),
    enemyBudget,
    eliteChance,
    modifierSlots,
  };
}

export function createCampaignStages(): StageConfig[] {
  return Array.from(
    { length: MAX_CAMPAIGN_STAGE },
    (_, index) => createStageConfig(index + 1),
  );
}
