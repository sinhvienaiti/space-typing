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
  | "oppressor";

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
  screenShake: boolean;
  visualQuality: VisualQuality;
  pronunciationEnabled: boolean;
  pronunciationRate: number;
  pronunciationVolume: number;
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
  lives: number;
  power: number;
};

export type Enemy = {
  id: number;
  kind: EnemyKind;
  entry: VocabularyEntry;
  typed: number;
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
  fireCooldown: number | null;
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
