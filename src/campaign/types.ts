export type StageRole =
  | "normal"
  | "elite"
  | "mini-boss"
  | "special"
  | "boss"
  | "hazard"
  | "gauntlet"
  | "major-boss";

export type DifficultyMode =
  | "relax"
  | "balanced"
  | "hard"
  | "extreme"
  | "nightmare"
  | "impossible"
  | "adaptive"
  | "custom";

export type StageConfig = {
  stage: number;
  galaxy: number;
  stageInGalaxy: number;
  role: StageRole;
  seed: number;
  enemyBudget: number;
  eliteChance: number;
  modifierSlots: number;
};

export type DifficultyInput = {
  stage: number;
  mode: DifficultyMode;
  vocabularyLevel: number;
  recentWpm: number;
  recentAccuracy: number;
  customTargetWpm?: number;
  customPressure?: number;
};

export type DifficultyProfile = {
  stageFactor: number;
  modeFactor: number;
  wpmFactor: number;
  accuracyFactor: number;
  vocabularyComplexity: number;
  vocabularyReactionFactor: number;
  combatPressure: number;
  enemySpeed: number;
  spawnInterval: number;
  maxEnemies: number;
  projectilePressure: number;
  bossPressure: number;
  targetWpm: number;
  pressureBudget: number;
  urgentThreatCap: number;
  attackIntervalFactor: number;
  wordScoreOffset: number;
  controllerSupportCap: number;
  hardCcDurationFactor: number;
  ccImmunityFactor: number;
  hiddenChallengeMultiplier: number;
  rewardMultiplier: number;
  reactionWindow: number;
  formationComplexity: number;
  ascensionTier?: number;
  enemyRankBonus?: number;
  bossHpMultiplier?: number;
  bossActionRateMultiplier?: number;
  bossProjectileBonus?: number;
  ascensionRewardMultiplier?: number;
  bossMutationLabel?: string;
};

export type StageBest = {
  score: number;
  accuracy: number;
  wpm: number;
  clearedAt: string;
};

export type CampaignProgress = {
  version: 1;
  highestUnlockedStage: number;
  selectedStage: number;
  clearedStages: number[];
  bestByStage: Record<string, StageBest>;
};
