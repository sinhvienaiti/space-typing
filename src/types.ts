export type GamePhase = "title" | "playing" | "paused" | "gameover";

export type VisualQuality = "low" | "medium" | "high" | "ultra";

export type GameSettings = {
  sfxVolume: number;
  screenShake: boolean;
  visualQuality: VisualQuality;
};

export type GameStats = {
  score: number;
  streak: number;
  maxStreak: number;
  multiplier: number;
  hits: number;
  misses: number;
  kills: number;
  wave: number;
  lives: number;
  power: number;
};

export type Enemy = {
  id: number;
  word: string;
  typed: number;
  x: number;
  y: number;
  baseX: number;
  speed: number;
  age: number;
  drift: number;
  radius: number;
  flash: number;
  kick: number;
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
