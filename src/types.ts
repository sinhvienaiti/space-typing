import type { KillTranslationSettings } from "./feedback/kill-translation";
import type { MusicPlaybackMode } from "./audio/music-library";
import type { EnemyDefinitionId } from "./enemies/registry";
import type { EnemyRank } from "./enemies/rank";
import type { EnemyLayerId } from "./enemies/layers";
import type { EnemySkillId } from "./enemies/skills";
import type { ThreatBudget } from "./enemies/threat";
import type { EnemyFamilyId } from "./enemies/families";

export type GamePhase =
  | "title"
  | "playing"
  | "paused"
  | "stageclear"
  | "gameover";

export type VisualQuality = "low" | "medium" | "high" | "ultra";
export type EnemyProjectileMode = "auto" | "off" | "on";

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
  enemyProjectileMode?: EnemyProjectileMode;
  unlockAllStages?: boolean;
  pronunciationEnabled: boolean;
  pronunciationRate: number;
  pronunciationVolume: number;
  killTranslation?: KillTranslationSettings;
  /** World music: each map's playlist, or shuffle every song. */
  musicMode?: MusicPlaybackMode;
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
  /**
   * Explicit farm-control override for the FINAL V3 Combat Credit economy.
   * Undefined means normal eligible combat target; carrier summons set false.
   */
  combatCreditEligible?: boolean;
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
  /** Seconds a landed player bolt holds the enemy still (stagger). */
  hitStun?: number;
  /** Seconds of the body's sideways hit shake (the word label stays still). */
  hitShake?: number;
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
  /** Shooter's family: gives the shot its look (fireball, ice shard…). */
  family?: EnemyFamilyId;
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
