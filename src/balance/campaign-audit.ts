import { difficultyFor } from "../campaign/difficulty";
import { createStageConfig } from "../campaign/stage";
import type {
  DifficultyMode,
  DifficultyProfile,
  StageRole,
} from "../campaign/types";

export type CampaignDifficultyPoint = {
  stage: number;
  galaxy: number;
  role: StageRole;
  profile: DifficultyProfile;
};

export type GalaxyDifficultySummary = {
  galaxy: number;
  stages: number;
  averageCombatPressure: number;
  averageEnemySpeed: number;
  averageProjectilePressure: number;
  averageBossPressure: number;
  averageSpawnInterval: number;
  maxCombatPressure: number;
};

export type CampaignDifficultyScenario = {
  mode: DifficultyMode;
  vocabularyLevel: number;
  recentWpm: number;
  recentAccuracy: number;
  customTargetWpm?: number;
  customPressure?: number;
};

export function campaignDifficultyPoints(
  scenario: CampaignDifficultyScenario,
): CampaignDifficultyPoint[] {
  return Array.from({ length: 1000 }, (_, index) => {
    const stage = index + 1;
    const config = createStageConfig(stage);
    return {
      stage,
      galaxy: config.galaxy,
      role: config.role,
      profile: difficultyFor({
        stage,
        mode: scenario.mode,
        vocabularyLevel: scenario.vocabularyLevel,
        recentWpm: scenario.recentWpm,
        recentAccuracy: scenario.recentAccuracy,
        customTargetWpm: scenario.customTargetWpm,
        customPressure: scenario.customPressure,
      }),
    };
  });
}

function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function summarizeDifficultyByGalaxy(
  points: readonly CampaignDifficultyPoint[],
): GalaxyDifficultySummary[] {
  const groups = new Map<number, CampaignDifficultyPoint[]>();

  for (const point of points) {
    const group = groups.get(point.galaxy) ?? [];
    group.push(point);
    groups.set(point.galaxy, group);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left - right)
    .map(([galaxy, group]) => ({
      galaxy,
      stages: group.length,
      averageCombatPressure: average(
        group.map((point) => point.profile.combatPressure),
      ),
      averageEnemySpeed: average(
        group.map((point) => point.profile.enemySpeed),
      ),
      averageProjectilePressure: average(
        group.map((point) => point.profile.projectilePressure),
      ),
      averageBossPressure: average(
        group.map((point) => point.profile.bossPressure),
      ),
      averageSpawnInterval: average(
        group.map((point) => point.profile.spawnInterval),
      ),
      maxCombatPressure: Math.max(
        ...group.map((point) => point.profile.combatPressure),
      ),
    }));
}
