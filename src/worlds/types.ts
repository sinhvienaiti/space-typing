import type { EnemyFamilyId } from "../enemies/families";

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
  enemyRoster: readonly string[];
  rankDistribution: Readonly<Record<string, number>>;
  elitePool: readonly string[];
  apexPool: readonly string[];
  miniBoss: string;
  worldBoss: string;
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
