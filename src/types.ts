import type { KillTranslationSettings } from "./feedback/kill-translation";
import type { EnemyDefinitionId } from "./enemies/registry";
import type { EnemyRank } from "./enemies/rank";
import type { EnemyLayerId } from "./enemies/layers";
import type { EnemySkillId } from "./enemies/skills";
import type { ThreatBudget } from "./enemies/threat";

export type GamePhase =
  | "title"
  | "playing"
  | "paused"
  | "stageclear"
  | "gameover";

export type VisualQuality = "low" | "medium" | "high" | "ultra";

export type EnemyKind =
  | "scout"
  | "mine"
  | "tank"
  | "destroyer"
  | "oppressor"
  | "shield"
  | "carrier"
  | "jammer"
  | "cloaker"
  | "healer"
  | "splitter"
  | "sniper"
  | "leech"
  | "commander";

export type EliteModifier = "swift" | "armored" | "frenzy" | "volatile";

export type VocabularyEntry = {
  id: string;
  en: string;
  vi: string;
  ipa: string;
};

export type VocabularyLevel = {
  level: number;
  label: string;
  file: string;
  count: number;
};

export type VocabularyIndex = {
  version: number;
  plannedLevels: number;
  availableLevels: number;
  totalEntries: number;
  levels: VocabularyLevel[];
};

export type GameSettings = {
  sfxVolume: number;
  musicVolume: number;
  ambientVolume: number;
  screenShake: boolean;
  visualQuality: VisualQuality;
  unlockAllStages?: boolean;
  pronunciationEnabled: boolean;
  pronunciationRate: number;
  pronunciationVolume: number;
  killTranslation?: KillTranslationSettings;
};

export type GameStats = {
  score: number;
  streak: number;
  maxStreak: number;
  multiplier: number;
  hits: number;
  misses: number;
  kills: number;
  stage: number;
  hull: number;
  maxHull: number;
  shield: number;
  maxShield: number;
  energy: number;
  maxEnergy: number;
  power: number;
};

export type Enemy = {
  id: number;
  kind: EnemyKind;
  definitionId?: EnemyDefinitionId;
  elite: boolean;
  golden?: boolean;
  eliteModifiers: EliteModifier[];
  rank?: EnemyRank;
  wordDifficultyScore?: number;
  layerPlan?: EnemyLayerId[];
  skillIds?: EnemySkillId[];
  nextSkillIndex?: number;
  pendingSkillId?: EnemySkillId | null;
  skillTelegraphRemaining?: number;
  threatBudget?: ThreatBudget;
  entry: VocabularyEntry;
  typed: number;
  wordMissed: boolean;
  layersRemaining: number;
  x: number;
  y: number;
  baseX: number;
  speed: number;
  age: number;
  drift: number;
  radius: number;
  flash: number;
  kick: number;
  actionCooldown: number | null;
  rewardControlTimer?: number;
  rewardControlFactor?: number;
};

export type EnemyProjectile = {
  id: number;
  ownerId: number;
  char: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
};

export type Laser = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  maxLife: number;
  power: number;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
};
