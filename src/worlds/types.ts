import type { EnemyFamilyId } from "../enemies/families";
import type { EnemyDefinitionId } from "../enemies/registry";

export type WorldProfile = {
  id: string;
  name: string;
  galaxy: number;
  stageStart: number;
  stageEnd: number;
  visualTheme: string;
  backgroundProfile: string;
  ambientProfile: string;
  enemyFamilies: readonly EnemyFamilyId[];
  enemyRoster: readonly EnemyDefinitionId[];
  rankDistribution: Readonly<Record<string, number>>;
  elitePool: readonly EnemyDefinitionId[];
  apexPool: readonly string[];
  miniBoss: EnemyDefinitionId;
  worldBoss: EnemyDefinitionId;
  worldRules: readonly string[];
  environmentalHazards: readonly string[];
  wordAffinity: readonly string[];
  rewardPool: readonly string[];
  shopPool: readonly string[];
  hiddenEventPool: readonly string[];
  hiddenChallengePool: readonly string[];
  musicProfile: string;
  transitionPresentation: string;
};
