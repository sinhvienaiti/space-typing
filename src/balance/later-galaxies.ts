import { difficultyFor } from "../campaign/difficulty";
import { createStageConfig } from "../campaign/stage";
import type { StageRole } from "../campaign/types";

export const GALAXY_MILESTONE_OFFSETS = [
  10,
  20,
  95,
  100,
] as const;

export type GalaxyMilestonePoint = {
  galaxy: number;
  stage: number;
  role: StageRole;
  combatPressure: number;
  enemySpeed: number;
  spawnInterval: number;
  projectilePressure: number;
  bossPressure: number;
};

export function laterGalaxyMilestones(): GalaxyMilestonePoint[] {
  const points: GalaxyMilestonePoint[] = [];

  for (let galaxy = 1; galaxy <= 10; galaxy += 1) {
    const base = (galaxy - 1) * 100;
    for (const offset of GALAXY_MILESTONE_OFFSETS) {
      const stage = base + offset;
      const config = createStageConfig(stage);
      const profile = difficultyFor({
        stage,
        mode: "balanced",
        vocabularyLevel: Math.min(100, galaxy * 10),
        recentWpm: 60,
        recentAccuracy: 96,
      });

      points.push({
        galaxy,
        stage,
        role: config.role,
        combatPressure: profile.combatPressure,
        enemySpeed: profile.enemySpeed,
        spawnInterval: profile.spawnInterval,
        projectilePressure: profile.projectilePressure,
        bossPressure: profile.bossPressure,
      });
    }
  }

  return points;
}

export function milestoneStagesForManualPlaytest(): number[] {
  return laterGalaxyMilestones().map((point) => point.stage);
}
