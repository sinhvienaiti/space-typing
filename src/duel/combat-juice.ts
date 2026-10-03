import type { VisualQuality } from "../types";
import { drawGlow, drawRingGlow, glowSprite, parseRgb } from "../vfx/light-sprites";
import {
  drawDuelFlipbook,
  duelFlipbook,
  type DuelFlipbookId,
} from "./painted-flipbooks";
import { DUEL_KO_TIMELINE } from "./presentation-timing";
import {
  DUEL_MOMENTUM_TIERS,
  duelMomentumProgress,
} from "./momentum";

/**
 * Duel hit feel ("juice"): layered impacts, sparks, solid debris, smoke,
 * shield ripples, ship kick and flash, floating combat text, the momentum
 * read-out, the KO sequence, camera shake, hit-stop and screen flashes.
 *
 * Presentation only. It never changes HP and never waits on the engine.
 * Everything is pooled and capped per quality tier; light is drawn from
 * cached sprites (no shadowBlur, no filters). Coordinates are arena CSS px.
 */

export type JuiceSide = "self" | "opponent";

export type DuelHitKind =
  | "bolt"
  | "laser"
  | "missile"
  | "railgun"
  | "bomb"
  | "lance"
  | "heavy"
  | "combo"
  | "precision";

type Budget = {
  particles: number;
  debris: number;
  smoke: number;
  flipbooks: number;
  texts: number;
  /** Multiplies spark/ember counts. */
  density: number;
  /** Painted sequences (High/Ultra only). */
  painted: boolean;
  /** Cross-fade painted frames. */
  blend: boolean;
  /** Smoke, burning hull, shield hexes, light rays. */
  rich: boolean;
  /** Orbiting aura embers, debris glow trails, secondary blasts. */
  ultra: boolean;
};

const BUDGET: Readonly<Record<VisualQuality, Budget>> = {
  low: { particles: 90, debris: 8, smoke: 0, flipbooks: 0, texts: 8, density: 0.35, painted: false, blend: false, rich: false, ultra: false },
  medium: { particles: 200, debris: 20, smoke: 10, flipbooks: 0, texts: 12, density: 0.65, painted: false, blend: false, rich: false, ultra: false },
  high: { particles: 320, debris: 46, smoke: 26, flipbooks: 8, texts: 16, density: 1, painted: true, blend: false, rich: true, ultra: false },
  ultra: { particles: 520, debris: 84, smoke: 40, flipbooks: 14, texts: 20, density: 1.45, painted: true, blend: true, rich: true, ultra: true },
};

type HitProfile = {
  /** Visual scale of the blast (1 = a typing-cannon bolt). */
  size: number;
  sparks: number;
  debris: number;
  smoke: number;
  embers: number;
  flipbook: DuelFlipbookId | null;
  ring: boolean;
  /** Camera shake (px) when it lands on the rival; ×1.35 on you. */
  shake: number;
  /** Hit-stop (seconds of near-frozen effects). */
  stop: number;
  flash: number;
  kick: number;
};

const HIT: Readonly<Record<DuelHitKind, HitProfile>> = {
  bolt: { size: 1, sparks: 8, debris: 0, smoke: 0, embers: 2, flipbook: null, ring: false, shake: 0.35, stop: 0, flash: 0, kick: 2.2 },
  laser: { size: 1.3, sparks: 12, debris: 1, smoke: 0, embers: 3, flipbook: "spark-burst", ring: false, shake: 1.4, stop: 0, flash: 0, kick: 3.5 },
  precision: { size: 1.8, sparks: 16, debris: 2, smoke: 1, embers: 6, flipbook: "spark-burst", ring: true, shake: 2.6, stop: 0.03, flash: 0.04, kick: 5 },
  missile: { size: 2.15, sparks: 22, debris: 6, smoke: 3, embers: 8, flipbook: "explosion-core", ring: true, shake: 4.2, stop: 0.045, flash: 0.05, kick: 8 },
  railgun: { size: 2.3, sparks: 28, debris: 7, smoke: 2, embers: 6, flipbook: "explosion-wide", ring: true, shake: 5.6, stop: 0.06, flash: 0.08, kick: 11 },
  lance: { size: 2.3, sparks: 28, debris: 7, smoke: 2, embers: 6, flipbook: "explosion-wide", ring: true, shake: 5.6, stop: 0.06, flash: 0.08, kick: 11 },
  heavy: { size: 2.4, sparks: 28, debris: 8, smoke: 3, embers: 8, flipbook: "explosion-wide", ring: true, shake: 6, stop: 0.06, flash: 0.08, kick: 11 },
  combo: { size: 2.6, sparks: 30, debris: 9, smoke: 3, embers: 10, flipbook: "explosion-wide", ring: true, shake: 6.2, stop: 0.06, flash: 0.1, kick: 12 },
  bomb: { size: 3, sparks: 36, debris: 13, smoke: 6, embers: 12, flipbook: "bomb-impact", ring: true, shake: 7.6, stop: 0.085, flash: 0.15, kick: 15 },
};

const TAU = Math.PI * 2;
const WHITE = "#ffffff";
const HOT = "#ffe7a3";
const FIRE = "#ff8a3d";
const EMBER = "#ff5a2a";
const SHIELD = "#7fe6ff";
const MAX_POOL = 700;

const enum Kind {
  Spark,
  Ember,
  Glow,
  Debris,
  Smoke,
  Fire,
  Shard,
}

type Particle = {
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
  drag: number;
  gravity: number;
  shape: number;
  heat: number;
  /** Index into the colour table, for batching sparks per colour. */
  colorId: number;
};

type Ring = { x: number; y: number; radius: number; width: number; color: string; age: number; life: number };
type Book = { id: DuelFlipbookId; x: number; y: number; size: number; rotation: number; age: number; life: number; alpha: number };
type Beam = { x0: number; y0: number; x1: number; y1: number; color: string; width: number; age: number; life: number };
type ShieldPulse = { side: JuiceSide; angle: number; strength: number; age: number; life: number };

export type CombatTextStyle =
  | "hull"
  | "shield"
  | "crit"
  | "heal"
  | "energy"
  | "callout"
  | "danger"
  | "miss";

type FloatText = {
  text: string;
  value: number;
  style: CombatTextStyle;
  color: string;
  side: JuiceSide | null;
  x: number;
  y: number;
  vy: number;
  size: number;
  age: number;
  life: number;
  pop: number;
};

type ShipState = {
  x: number;
  y: number;
  scale: number;
  aim: number;
  primary: string;
  secondary: string;
  kickX: number;
  kickY: number;
  flash: number;
  hull: number;
  shield: number;
  destroyed: boolean;
  /** Seconds since respawn (warp-in glow), Infinity when settled. */
  spawn: number;
  /** KO meltdown 0…1 (swelling light before the final blast). */
  melt: number;
  smokeDebt: number;
  sparkDebt: number;
  fireDebt: number;
  popTimer: number;
};

type Knockout = { side: JuiceSide; startMs: number; fired: number; final: boolean; draw: boolean };

/** Ship-local points (nose up, ship px at scale 1) that smoke and burn. */
const DAMAGE_POINTS: readonly (readonly [number, number])[] = [
  [-15, 8],
  [12, -10],
  [3, 18],
  [-6, -16],
];

/** Debris silhouettes, unit radius. */
const DEBRIS_SHAPES: readonly (readonly number[])[] = [
  [1, 0, 0.3, 0.8, -0.8, 0.5, -0.6, -0.6, 0.4, -0.9],
  [0.9, 0.2, -0.2, 1, -1, -0.1, 0.1, -0.8],
  [1, -0.3, 0.6, 0.7, -0.7, 0.6, -0.9, -0.4, 0.1, -1],
  [0.7, 0.7, -0.9, 0.3, -0.3, -0.9, 0.8, -0.5],
  [1, 0.1, -0.1, 0.4, -1, 0.2, 0.1, -0.3],
  [0.6, 1, -0.6, 0.6, -0.8, -0.7, 0.9, -0.6],
];

const smokeSprites = new Map<string, HTMLCanvasElement | null>();
const hexSprites = new Map<string, HTMLCanvasElement | null>();
let vignetteSprite: HTMLCanvasElement | null | undefined;

function sprite(size: number, paint: (context: CanvasRenderingContext2D) => void): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context === null) return null;
  paint(context);
  return canvas;
}

function rgba(color: string, alpha: number): string {
  const [r, g, b] = parseRgb(color);
  return "rgba(" + r + "," + g + "," + b + "," + Math.max(0, Math.min(1, alpha)).toFixed(3) + ")";
}

/** Soft, slightly lumpy smoke puff (normal blending, drawn under light). */
function smokeSprite(tone: string): HTMLCanvasElement | null {
  const cached = smokeSprites.get(tone);
  if (cached !== undefined) return cached;
  const made = sprite(96, (context) => {
    const lumps: readonly (readonly [number, number, number])[] = [
      [48, 48, 40], [34, 40, 24], [62, 38, 22], [56, 60, 24], [36, 60, 20],
    ];
    for (const [x, y, r] of lumps) {
      const gradient = context.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, rgba(tone, 0.5));
      gradient.addColorStop(0.55, rgba(tone, 0.22));
      gradient.addColorStop(1, rgba(tone, 0));
      context.fillStyle = gradient;
      context.fillRect(0, 0, 96, 96);
    }
  });
  smokeSprites.set(tone, made);
  return made;
}

/** Hexagon energy-shield bubble, brightest at the rim (additive). */
function hexSprite(color: string): HTMLCanvasElement | null {
  const cached = hexSprites.get(color);
  if (cached !== undefined) return cached;
  const made = sprite(256, (context) => {
    const c = 128;
    const radius = 118;
    const cell = 13;
    context.lineWidth = 1.4;
    for (let row = -12; row <= 12; row += 1) {
      for (let col = -12; col <= 12; col += 1) {
        const x = c + col * cell * 1.5;
        const y = c + row * cell * 1.732 + (col % 2 === 0 ? 0 : cell * 0.866);
        const d = Math.hypot(x - c, y - c) / radius;
        if (d > 1) continue;
        context.strokeStyle = rgba(color, 0.06 + 0.62 * d * d * d);
        context.beginPath();
        for (let corner = 0; corner < 6; corner += 1) {
          const a = (corner / 6) * TAU;
          const px = x + Math.cos(a) * cell * 0.92;
          const py = y + Math.sin(a) * cell * 0.92;
          if (corner === 0) context.moveTo(px, py);
          else context.lineTo(px, py);
        }
        context.closePath();
        context.stroke();
      }
    }
    const rim = context.createRadialGradient(c, c, radius * 0.72, c, c, radius + 8);
    rim.addColorStop(0, rgba(color, 0));
    rim.addColorStop(0.82, rgba(color, 0.4));
    rim.addColorStop(0.92, rgba("#ffffff", 0.55));
    rim.addColorStop(1, rgba(color, 0));
    context.fillStyle = rim;
    context.fillRect(0, 0, 256, 256);
  });
  hexSprites.set(color, made);
  return made;
}

/** Red danger frame for hits on your own ship. */
function vignette(): HTMLCanvasElement | null {
  if (vignetteSprite !== undefined) return vignetteSprite;
  vignetteSprite = sprite(256, (context) => {
    const gradient = context.createRadialGradient(128, 128, 70, 128, 128, 182);
    gradient.addColorStop(0, "rgba(255,30,50,0)");
    gradient.addColorStop(0.6, "rgba(255,30,50,0.18)");
    gradient.addColorStop(1, "rgba(255,40,40,0.75)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
  });
  return vignetteSprite;
}

function fontFor(size: number, italic: boolean): string {
  return (italic ? "italic " : "") + "900 " + Math.round(size) + 'px "Inter", "SF Pro Display", system-ui, -apple-system, sans-serif';
}

function easeOutBack(t: number): number {
  const c = 1.9;
  const u = t - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
}

export class DuelCombatJuice {
  private readonly pool: Particle[] = [];
  private readonly live: Particle[] = [];
  private readonly rings: Ring[] = [];
  private readonly books: Book[] = [];
  private readonly beams: Beam[] = [];
  private readonly pulses: ShieldPulse[] = [];
  private readonly texts: FloatText[] = [];
  private readonly knockouts: Knockout[] = [];
  private readonly ships: Record<JuiceSide, ShipState>;
  private quality: VisualQuality = "high";
  private debrisLive = 0;
  private smokeLive = 0;
  private seed = 7;
  private time = 0;
  private flashAlpha = 0;
  private flashColor = WHITE;
  private dangerAlpha = 0;
  private bars = 0;
  private barsTarget = 0;
  private stopUntil = 0;
  private stopScale = 1;
  private slowUntil = 0;
  private slowScale = 1;
  private rays = 0;
  private raysSide: JuiceSide = "opponent";
  private lastNow: number | null = null;
  private readonly colorIds = new Map<string, number>();
  private readonly colorList: string[] = [];
  /** Spark batches: colour × 4 alpha steps × 2 widths, reused every frame. */
  private readonly sparkBuckets: Particle[][] = [];
  private camZoom = 1;
  private camTarget = 1;
  private camPunch = 0;
  private camX = 0;
  private camY = 0;
  private camFocusX: number | null = null;
  private camFocusY = 0;
  private viewWidth = 1;
  private viewHeight = 1;
  private momentumStreak = 0;
  private momentumTier = 0;
  private momentumPop = 0;
  private reduced = false;

  constructor(private readonly onShake: (amount: number) => void = () => {}) {
    const ship = (primary: string): ShipState => ({
      x: 0, y: 0, scale: 1, aim: 0, primary, secondary: WHITE,
      kickX: 0, kickY: 0, flash: 0, hull: 1, shield: 0, destroyed: false, spawn: Infinity, melt: 0,
      smokeDebt: 0, sparkDebt: 0, fireDebt: 0, popTimer: 0,
    });
    this.ships = { self: ship("#5fe2ff"), opponent: ship("#ff7a52") };
  }

  // --- State from the adapter ------------------------------------------------

  setQuality(quality: VisualQuality, reducedMotion = false): void {
    this.quality = quality;
    this.reduced = reducedMotion;
  }

  setShip(side: JuiceSide, x: number, y: number, scale: number, aim: number): void {
    const ship = this.ships[side];
    ship.x = x;
    ship.y = y;
    ship.scale = scale;
    ship.aim = aim;
  }

  setColors(side: JuiceSide, primary: string, secondary: string): void {
    this.ships[side].primary = primary;
    this.ships[side].secondary = secondary;
  }

  setHealth(side: JuiceSide, hullRatio: number, shieldRatio: number): void {
    this.ships[side].hull = Math.max(0, Math.min(1, hullRatio));
    this.ships[side].shield = Math.max(0, Math.min(1, shieldRatio));
  }

  setMomentum(streak: number, tier: number): void {
    if (streak > this.momentumStreak) this.momentumPop = 1;
    this.momentumStreak = streak;
    this.momentumTier = tier;
  }

  setViewport(width: number, height: number): void {
    this.viewWidth = Math.max(1, width);
    this.viewHeight = Math.max(1, height);
  }

  /**
   * Camera for the whole Game canvas (background included): zoom around a
   * focus given as a share of the view (0…1). K.O. pushes in on the wreck;
   * heavy hits punch in slightly.
   */
  camera(): { zoom: number; fx: number; fy: number } {
    if (this.reduced) return { zoom: 1, fx: 0.5, fy: 0.5 };
    return {
      zoom: this.camZoom + this.camPunch,
      fx: this.camX / this.viewWidth,
      fy: this.camY / this.viewHeight,
    };
  }

  /**
   * How near a ship is, from its drawn scale (Depth View: ~0.6 for the far
   * rival, ~1.8 for you). Softened so far blasts stay readable.
   */
  private depth(side: JuiceSide): number {
    return Math.pow(Math.max(0.4, Math.min(1.6, this.ships[side].scale / 1.3)), 0.7);
  }

  /** Smoke and embers shed along a missile or bomb in flight. */
  trail(x: number, y: number, angle: number, scale: number, dt: number, heavy: boolean): void {
    const budget = BUDGET[this.quality];
    if (dt <= 0 || this.random() > dt * (heavy ? 60 : 42)) return;
    const back = angle + Math.PI;
    const s = Math.max(0.35, Math.min(2, scale));
    if (budget.smoke > 0) {
      this.spawn(Kind.Smoke, x + Math.cos(back) * 6 * s, y + Math.sin(back) * 6 * s,
        (this.random() - 0.5) * 16, (this.random() - 0.5) * 16, 0.55 + this.random() * 0.45,
        (heavy ? 9 : 6.5) * s, this.random() < 0.5 ? "#565c68" : "#3e3a38", 0.95, -4, 0);
    }
    this.spawn(Kind.Ember, x, y, Math.cos(back) * 60 * s + (this.random() - 0.5) * 40, Math.sin(back) * 60 * s + (this.random() - 0.5) * 40,
      0.22 + this.random() * 0.2, (1.6 + this.random()) * s, this.random() < 0.5 ? HOT : FIRE, 0.9, 0, 0);
  }

  /** Where the hull is drawn this frame: base position plus hit kick. */
  shipOffset(side: JuiceSide): { x: number; y: number; flash: number; hidden: boolean; alpha: number } {
    const ship = this.ships[side];
    const jitter = ship.melt > 0 && !this.reduced ? (this.random() - 0.5) * 5 * ship.melt : 0;
    const spawnAlpha = ship.spawn < 0.45 ? ship.spawn / 0.45 : 1;
    return {
      x: ship.kickX + jitter,
      y: ship.kickY + jitter * 0.6,
      flash: Math.max(ship.flash, ship.melt * 0.55),
      hidden: ship.destroyed,
      alpha: spawnAlpha,
    };
  }

  /** Effects clock multiplier: hit-stop and KO slow motion. */
  get timeScale(): number {
    if (this.reduced) return 1;
    const now = this.lastNow ?? 0;
    if (now < this.stopUntil) return this.stopScale;
    if (now < this.slowUntil) return this.slowScale;
    return 1;
  }

  get busy(): boolean {
    return this.live.length > 0 || this.rings.length > 0 || this.books.length > 0 || this.texts.length > 0 || this.knockouts.length > 0;
  }

  get counts(): { particles: number; texts: number; books: number } {
    return { particles: this.live.length, texts: this.texts.length, books: this.books.length };
  }

  // --- Events -----------------------------------------------------------------

  /**
   * A shot lands on `target`. `angle` is the shot heading; `shielded` picks
   * a shield ripple instead of hull damage; `heat` (0…1) is the shooter's
   * typing momentum, which scales a cannon bolt up to a small blast.
   */
  hit(target: JuiceSide, kind: DuelHitKind, x: number, y: number, angle: number, shielded: boolean, heat = 0, primary?: string): void {
    const budget = BUDGET[this.quality];
    const profile = HIT[kind];
    const ship = this.ships[target];
    const shooter = this.ships[target === "self" ? "opponent" : "self"];
    const color = primary ?? shooter.primary;
    const boost = kind === "bolt" ? 1 + heat * 0.9 : 1;
    const size = profile.size * boost * this.depth(target);
    const back = angle + Math.PI;

    if (shielded) {
      this.pulses.push({ side: target, angle: back, strength: Math.min(1.6, 0.55 + size * 0.35), age: 0, life: 0.42 });
      if (this.pulses.length > 8) this.pulses.shift();
      const r = 52 * ship.scale;
      const cx = ship.x + Math.cos(back) * r;
      const cy = ship.y + Math.sin(back) * r;
      this.glowParticle(cx, cy, 18 * size, WHITE, 0.16);
      this.glowParticle(cx, cy, 34 * size, SHIELD, 0.3);
      this.spray(cx, cy, back, 1.1, Math.round((5 + 5 * size) * budget.density), 260 + 120 * size, [SHIELD, WHITE, "#b9f6ff"], 0.32);
      if (kind !== "bolt") this.ring(cx, cy, 30 * size, 2, SHIELD, 0.32);
    } else {
      // Hot core, coloured bloom, sparks thrown back out of the hull.
      this.glowParticle(x, y, 16 * size, WHITE, 0.12 + 0.03 * size);
      this.glowParticle(x, y, 30 * size, HOT, 0.2 + 0.03 * size);
      this.glowParticle(x, y, 46 * size, color, 0.32);
      this.spray(x, y, back, 1.25, Math.round(profile.sparks * boost * budget.density), 300 + 140 * size, [WHITE, HOT, FIRE, color], 0.3 + 0.05 * size);
      this.embers(x, y, Math.round(profile.embers * boost * budget.density), 110 * size);
      if (budget.rich || kind !== "bolt") {
        this.debris(x, y, back, Math.round(profile.debris * (kind === "bolt" && heat > 0.5 ? 1 : 1) * (budget.ultra ? 1.4 : 1)), 180 + 70 * size, ship.secondary);
      }
      if (budget.smoke > 0) this.smoke(x, y, profile.smoke, 22 * size);
      if (profile.flipbook !== null && budget.painted) {
        this.book(profile.flipbook, x, y, 92 * size, 0.62 + 0.06 * size);
        if (budget.ultra && size >= 2.2) {
          this.book("explosion-core", x + Math.cos(back + 1.2) * 26, y + Math.sin(back + 1.2) * 26, 70 * size, 0.7, 0.08);
        }
      }
      if (profile.ring) this.ring(x, y, 42 * size, 3, kind === "bomb" ? HOT : color, 0.42);
      if (profile.ring && budget.painted && size >= 2.2) this.book("shockwave-ring", x, y, 150 * size, 0.6);
    }

    // Weight: kick the hull along the shot, flash it, shake, freeze.
    const kick = profile.kick * (shielded ? 0.45 : 1) * (kind === "bolt" ? 1 + heat : 1) * this.depth(target);
    if (kind !== "bolt" && kind !== "laser") this.camPunch = Math.min(0.05, this.camPunch + profile.shake * (target === "self" ? 0.004 : 0.0025));
    ship.kickX += Math.cos(angle) * kick;
    ship.kickY += Math.sin(angle) * kick;
    ship.flash = Math.max(ship.flash, shielded ? 0.3 : kind === "bolt" ? 0.42 : 0.85);
    const shake = profile.shake * (target === "self" ? 1.35 : 1) * (kind === "bolt" ? (target === "self" ? 2.2 : heat) : 1);
    if (shake > 0.25) this.onShake(shake);
    if (profile.stop > 0) this.hitStop(profile.stop * (target === "self" ? 1.2 : 1));
    if (profile.flash > 0) this.screenFlash(target === "self" ? "#ff6a5a" : HOT, profile.flash);
    if (target === "self" && !shielded) this.dangerAlpha = Math.min(0.85, this.dangerAlpha + (kind === "bolt" ? 0.12 : 0.45));
  }

  shieldBreak(side: JuiceSide): void {
    const ship = this.ships[side];
    const budget = BUDGET[this.quality];
    const r = 54 * ship.scale;
    this.ring(ship.x, ship.y, r * 1.9, 4, SHIELD, 0.55);
    this.ring(ship.x, ship.y, r * 1.2, 2, WHITE, 0.35);
    this.glowParticle(ship.x, ship.y, r * 1.6, SHIELD, 0.35);
    const count = Math.round(26 * budget.density);
    for (let index = 0; index < count; index += 1) {
      const a = this.random() * TAU;
      const speed = 160 + this.random() * 280;
      this.spawn(Kind.Shard, ship.x + Math.cos(a) * r, ship.y + Math.sin(a) * r, Math.cos(a) * speed, Math.sin(a) * speed,
        0.5 + this.random() * 0.4, 4 + this.random() * 6, this.random() < 0.3 ? WHITE : SHIELD, 0.9, 0, this.random() * 6);
    }
    this.pulses.push({ side, angle: 0, strength: 2, age: 0, life: 0.5 });
    this.text(side, "SHIELD BREAK!", "callout", SHIELD, 0);
    this.onShake(side === "self" ? 4.5 : 3.2);
  }

  /** Launch flare for heavy shots; railgun and lance also draw a beam. */
  launch(side: JuiceSide, kind: DuelHitKind, x: number, y: number, tx: number, ty: number): void {
    const ship = this.ships[side];
    const angle = Math.atan2(ty - y, tx - x);
    const budget = BUDGET[this.quality];
    const heavy = kind !== "bolt" && kind !== "laser";
    this.glowParticle(x, y, heavy ? 54 : 26, ship.primary, 0.18);
    this.glowParticle(x, y, heavy ? 26 : 12, WHITE, 0.1);
    if (heavy) {
      this.spray(x, y, angle, 0.5, Math.round(12 * budget.density), 420, [WHITE, ship.primary, HOT], 0.22);
      this.ring(x, y, 34, 2, ship.primary, 0.3);
      ship.kickX -= Math.cos(angle) * 7;
      ship.kickY -= Math.sin(angle) * 7;
      if (side === "self") this.onShake(1.6);
    }
    if (kind === "railgun" || kind === "lance") {
      this.beams.push({ x0: x, y0: y, x1: tx, y1: ty, color: ship.primary, width: kind === "lance" ? 9 : 6, age: 0, life: 0.26 });
      if (this.beams.length > 6) this.beams.shift();
    }
  }

  /** Floating combat text above a ship (or the arena centre when side is null). */
  text(side: JuiceSide | null, label: string, style: CombatTextStyle, color: string, value: number): void {
    const budget = BUDGET[this.quality];
    // Damage on one ship within a beat rolls up into one growing number.
    if ((style === "hull" || style === "shield" || style === "heal") && side !== null) {
      for (const existing of this.texts) {
        // Keeps ageing: a steady stream starts a fresh number every ~0.4 s
        // instead of one label counting up forever.
        if (existing.side === side && existing.style === style && existing.age < 0.4) {
          existing.value += value;
          existing.text = (style === "heal" ? "+" : "−") + formatAmount(existing.value);
          existing.pop = 1;
          existing.size = textSize(style, existing.value);
          return;
        }
      }
    }
    while (this.texts.length >= budget.texts) this.texts.shift();
    const ship = side === null ? null : this.ships[side];
    // Three lanes per ship so labels never stack on each other or on the
    // momentum counter: call-outs high above the hull, damage beside it on
    // the side the fire comes from, gains below it.
    const callout = style === "callout" || style === "danger";
    const gain = style === "heal" || style === "energy";
    const lane = this.texts.filter((item) => item.side === side && item.age < 0.75 &&
      (item.style === "callout" || item.style === "danger") === callout &&
      (item.style === "heal" || item.style === "energy") === gain).length;
    let x = 0;
    let y = 0;
    if (ship !== null) {
      const other = this.ships[side === "self" ? "opponent" : "self"];
      const facing = Math.abs(other.x - ship.x) > Math.abs(other.y - ship.y) ? Math.sign(other.x - ship.x) : 1;
      // Depth View stacks the ships vertically and fires along the middle:
      // damage goes right of a ship, call-outs and gains left, never on the
      // firing lane or the momentum counter (left of your ship, below).
      const stacked = Math.abs(other.y - ship.y) > Math.abs(other.x - ship.x);
      const reach = Math.max(0.8, ship.scale);
      if (stacked) {
        if (callout) {
          x = side === "self" ? ship.x + 128 * reach : ship.x - 130 * reach;
          y = side === "self" ? ship.y - 70 * reach - lane * 30 : ship.y - 6 + lane * 30;
        } else if (gain) {
          x = ship.x - 104 * reach;
          y = side === "self" ? ship.y - 44 * reach - lane * 22 : ship.y + 44 + lane * 22;
        } else {
          x = ship.x + (70 + (lane % 2) * 22) * reach + (this.random() - 0.5) * 10;
          y = ship.y - 8 * reach - lane * 30;
        }
      } else if (callout) {
        x = ship.x;
        y = ship.y - 132 * ship.scale - lane * 30;
      } else if (gain) {
        x = ship.x;
        y = ship.y + 86 * ship.scale + lane * 22;
      } else {
        x = ship.x + facing * (74 + (lane % 2) * 18) * ship.scale + (this.random() - 0.5) * 14;
        y = ship.y - 26 * ship.scale - lane * 24;
      }
    }
    this.texts.push({
      text: label, value, style, color, side, x, y,
      vy: style === "callout" || style === "danger" ? -22 : -46,
      size: textSize(style, value),
      age: 0,
      life: style === "callout" || style === "danger" ? 1.25 : style === "crit" ? 1.1 : 0.9,
      pop: 1,
    });
  }

  damage(side: JuiceSide, hullLoss: number, shieldLoss: number): void {
    if (shieldLoss > 0.05) this.text(side, "−" + formatAmount(shieldLoss), "shield", SHIELD, shieldLoss);
    if (hullLoss > 0.05) {
      if (hullLoss >= 9) {
        this.text(side, "−" + formatAmount(hullLoss), "crit", "#ffe066", hullLoss);
        this.text(side, hullLoss >= 16 ? "DEVASTATING!" : "CRITICAL!", "callout", "#ffd166", 0);
      } else {
        this.text(side, "−" + formatAmount(hullLoss), "hull", "#ffae6b", hullLoss);
      }
    }
  }

  heal(side: JuiceSide, amount: number, kind: "repair" | "shield" | "energy"): void {
    const color = kind === "repair" ? "#7dffa8" : kind === "shield" ? SHIELD : "#ffd56a";
    const ship = this.ships[side];
    this.ring(ship.x, ship.y, 60 * ship.scale, 2, color, 0.5);
    this.embers(ship.x, ship.y, Math.round(8 * BUDGET[this.quality].density), 70, color, -60);
    if (kind === "energy") {
      this.text(side, "+" + formatAmount(amount) + " EN", "energy", color, amount);
    } else {
      this.text(side, "+" + formatAmount(amount) + (kind === "shield" ? " SHIELD" : " HULL"), "heal", color, amount);
    }
  }

  /** Tier-up: a burst around your ship plus the tier name. */
  momentumBurst(tier: number): void {
    const ship = this.ships.self;
    const info = DUEL_MOMENTUM_TIERS[tier];
    if (info === undefined) return;
    this.ring(ship.x, ship.y, 70 * ship.scale, 4, info.color, 0.55);
    this.ring(ship.x, ship.y, 110 * ship.scale, 2, WHITE, 0.45);
    this.glowParticle(ship.x, ship.y, 90 * ship.scale, info.color, 0.4);
    this.embers(ship.x, ship.y, Math.round(18 * BUDGET[this.quality].density), 220, info.color);
    this.text("self", info.label + "!", "callout", info.color, 0);
    this.screenFlash(info.color, 0.05 + tier * 0.015);
    this.onShake(1.5 + tier * 0.5);
  }

  momentumLost(lost: number): void {
    if (lost < 10) return;
    const ship = this.ships.self;
    this.spray(ship.x, ship.y, -Math.PI / 2, Math.PI, Math.round(10 * BUDGET[this.quality].density), 160, ["#ff6a6a", "#8a93a6"], 0.4);
    this.text("self", "STREAK LOST", "danger", "#ff7a7a", 0);
  }

  /** The KO: a chain of blasts across the hull, a meltdown, one huge blast. */
  knockout(side: JuiceSide, nowMs: number): void {
    if (this.knockouts.some((item) => item.side === side)) return;
    this.knockouts.push({ side, startMs: nowMs, fired: 0, final: false, draw: false });
    this.barsTarget = 1;
    this.camTarget = 1.07;
    this.camFocusX = this.ships[side].x;
    this.camFocusY = this.ships[side].y;
    this.slowUntil = nowMs + DUEL_KO_TIMELINE.finalMs + 900;
    this.slowScale = 0.55;
    this.text(side, "CRITICAL DAMAGE", "danger", "#ff6b6b", 0);
  }

  /** New round: ships warp back in, bars and slow motion clear. */
  respawn(): void {
    this.knockouts.length = 0;
    for (const side of ["self", "opponent"] as const) {
      const ship = this.ships[side];
      ship.destroyed = false;
      ship.melt = 0;
      // Positions may not be measured yet: the warp-in is drawn from the
      // live hull position in drawUnder().
      ship.spawn = 0;
      ship.flash = 1;
    }
    this.barsTarget = 0;
    this.slowUntil = 0;
    this.rays = 0;
    this.dangerAlpha = 0;
    this.camTarget = 1;
    this.camFocusX = null;
  }

  celebrate(side: JuiceSide): void {
    const ship = this.ships[side];
    this.ring(ship.x, ship.y, 120 * ship.scale, 3, "#ffd166", 0.9);
    this.ring(ship.x, ship.y, 70 * ship.scale, 2, WHITE, 0.6);
    this.embers(ship.x, ship.y, Math.round(30 * BUDGET[this.quality].density), 260, "#ffd166", -40);
  }

  screenFlash(color: string, alpha: number): void {
    if (this.reduced) return;
    if (alpha >= this.flashAlpha) this.flashColor = color;
    this.flashAlpha = Math.min(0.9, Math.max(this.flashAlpha, alpha));
  }

  hitStop(seconds: number): void {
    if (this.reduced || this.lastNow === null) return;
    this.stopUntil = Math.max(this.stopUntil, this.lastNow + seconds * 1000);
    this.stopScale = 0.08;
  }

  clear(): void {
    for (const particle of this.live) this.pool.push(particle);
    this.live.length = 0;
    this.rings.length = 0;
    this.books.length = 0;
    this.beams.length = 0;
    this.pulses.length = 0;
    this.texts.length = 0;
    this.knockouts.length = 0;
    this.debrisLive = 0;
    this.smokeLive = 0;
    this.flashAlpha = 0;
    this.dangerAlpha = 0;
    this.bars = 0;
    this.barsTarget = 0;
    this.stopUntil = 0;
    this.slowUntil = 0;
    this.rays = 0;
    this.momentumStreak = 0;
    this.momentumTier = 0;
    this.camZoom = 1;
    this.camTarget = 1;
    this.camPunch = 0;
    this.camFocusX = null;
    for (const ship of Object.values(this.ships)) {
      ship.kickX = 0;
      ship.kickY = 0;
      ship.flash = 0;
      ship.destroyed = false;
      ship.melt = 0;
      ship.spawn = Infinity;
    }
  }

  // --- Simulation -----------------------------------------------------------------

  /** Advances on real time; returns the scaled step used for effects. */
  update(nowMs: number): number {
    const raw = this.lastNow === null ? 0 : Math.max(0, Math.min(0.1, (nowMs - this.lastNow) / 1000));
    this.lastNow = nowMs;
    const dt = raw * this.timeScale;
    this.time += dt;

    this.stepKnockouts(nowMs);

    this.camZoom += (this.camTarget - this.camZoom) * Math.min(1, raw * 2.6);
    this.camPunch *= Math.exp(-raw * 7);
    const focusX = this.camFocusX ?? this.viewWidth / 2;
    const focusY = this.camFocusX === null ? this.viewHeight / 2 : this.camFocusY;
    if (this.camX === 0 && this.camY === 0) {
      this.camX = focusX;
      this.camY = focusY;
    }
    this.camX += (focusX - this.camX) * Math.min(1, raw * 4);
    this.camY += (focusY - this.camY) * Math.min(1, raw * 4);

    for (const side of ["self", "opponent"] as const) {
      const ship = this.ships[side];
      // Spring the kick back; flash decays fast so rapid hits stay distinct.
      const spring = Math.exp(-raw * 14);
      ship.kickX *= spring;
      ship.kickY *= spring;
      ship.flash = Math.max(0, ship.flash - raw * 5.5);
      if (ship.spawn !== Infinity) {
        ship.spawn += raw;
        if (ship.spawn > 1.2) ship.spawn = Infinity;
      }
      if (!ship.destroyed) this.emitDamage(ship, dt);
    }

    let alive = 0;
    for (const particle of this.live) {
      particle.age += dt;
      if (particle.age >= particle.life) {
        if (particle.kind === Kind.Debris) this.debrisLive -= 1;
        if (particle.kind === Kind.Smoke) this.smokeLive -= 1;
        this.pool.push(particle);
        continue;
      }
      const drag = Math.pow(particle.drag, dt * 60);
      particle.vx *= drag;
      particle.vy = particle.vy * drag + particle.gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.rotation += particle.spin * dt;
      particle.heat = Math.max(0, particle.heat - dt * 1.4);
      this.live[alive++] = particle;
    }
    this.live.length = alive;

    filterAge(this.rings, dt);
    filterAge(this.books, dt);
    filterAge(this.beams, raw);
    filterAge(this.pulses, dt);
    filterAge(this.texts, raw);
    for (const text of this.texts) {
      text.y += text.vy * raw * (text.age < 0.18 ? 0.2 : 1);
      text.pop = Math.max(0, text.pop - raw * 6);
    }
    this.momentumPop = Math.max(0, this.momentumPop - raw * 5);
    this.flashAlpha = Math.max(0, this.flashAlpha - raw * 3.2);
    this.dangerAlpha = Math.max(0, this.dangerAlpha - raw * 1.3);
    this.bars += (this.barsTarget - this.bars) * Math.min(1, raw * 6);
    this.rays = Math.max(0, this.rays - raw * 0.9);
    return dt;
  }

  private stepKnockouts(nowMs: number): void {
    const budget = BUDGET[this.quality];
    for (const ko of this.knockouts) {
      const ship = this.ships[ko.side];
      const elapsed = nowMs - ko.startMs;
      const chain = DUEL_KO_TIMELINE.chainMs;
      if (!ko.final) ship.melt = Math.min(1, Math.max(0, elapsed / DUEL_KO_TIMELINE.finalMs));
      while (ko.fired < chain.length && elapsed >= chain[ko.fired]!) {
        const index = ko.fired;
        ko.fired += 1;
        const a = this.random() * TAU;
        const d = (10 + this.random() * 26) * ship.scale;
        const x = ship.x + Math.cos(a) * d;
        const y = ship.y + Math.sin(a) * d;
        const size = (1.3 + index * 0.12) * this.depth(ko.side);
        this.glowParticle(x, y, 40 * size, HOT, 0.25);
        this.glowParticle(x, y, 64 * size, FIRE, 0.4);
        this.spray(x, y, a, Math.PI, Math.round(16 * budget.density), 380, [WHITE, HOT, FIRE], 0.4);
        this.debris(x, y, a, budget.ultra ? 5 : budget.rich ? 3 : 1, 220, ship.secondary);
        if (budget.smoke > 0) this.smoke(x, y, 2, 28);
        if (budget.painted) this.book(index % 2 === 0 ? "explosion-core" : "explosion-wide", x, y, 120 * size, 0.62);
        else this.ring(x, y, 40 * size, 2, FIRE, 0.4);
        ship.flash = 1;
        ship.kickX += Math.cos(a) * 6;
        ship.kickY += Math.sin(a) * 6;
        this.onShake(3 + index * 0.45);
      }
      if (!ko.final && elapsed >= DUEL_KO_TIMELINE.finalMs) {
        ko.final = true;
        this.finalBlast(ko.side);
      }
    }
  }

  private finalBlast(side: JuiceSide): void {
    const ship = this.ships[side];
    const budget = BUDGET[this.quality];
    const { x, y } = ship;
    // Far wrecks blast smaller, but never below 60%: the camera pushes in.
    const f = Math.max(0.6, this.depth(side));
    ship.destroyed = true;
    ship.melt = 0;
    this.glowParticle(x, y, 140 * f, WHITE, 0.32);
    this.glowParticle(x, y, 230 * f, HOT, 0.6);
    this.glowParticle(x, y, 320 * f, ship.primary, 0.9);
    this.ring(x, y, 260 * f, 7, WHITE, 0.9);
    this.ring(x, y, 180 * f, 4, HOT, 0.7);
    this.ring(x, y, 360 * f, 3, ship.primary, 1.15);
    this.spray(x, y, 0, Math.PI, Math.round(90 * budget.density), 720 * f, [WHITE, HOT, FIRE, ship.primary], 0.7);
    this.embers(x, y, Math.round(40 * budget.density), 360 * f);
    this.debris(x, y, 0, budget.ultra ? 34 : budget.rich ? 22 : 10, 420 * f, ship.secondary, Math.PI);
    if (budget.smoke > 0) this.smoke(x, y, budget.ultra ? 10 : 6, 46 * f);
    if (budget.painted) {
      this.book("explosion-wide", x, y, 420 * f, 0.95);
      this.book("bomb-impact", x, y, 300 * f, 0.85, 0.06);
      this.book("shockwave-ring", x, y, 640 * f, 0.9);
      if (budget.ultra) {
        for (let index = 0; index < 3; index += 1) {
          const a = this.random() * TAU;
          this.book("explosion-core", x + Math.cos(a) * 70 * f, y + Math.sin(a) * 70 * f, 170 * f, 0.8, 0.12 + index * 0.1);
        }
      }
    }
    this.camPunch = 0.045;
    if (budget.rich) {
      this.rays = 1;
      this.raysSide = side;
    }
    this.screenFlash(WHITE, 0.85);
    this.onShake(18);
    const now = this.lastNow ?? 0;
    this.stopUntil = now + 90;
    this.stopScale = 0.05;
    this.slowUntil = Math.max(this.slowUntil, now + 900);
    this.slowScale = 0.3;
  }

  /** A damaged hull smokes, sparks and finally burns. */
  private emitDamage(ship: ShipState, dt: number): void {
    const budget = BUDGET[this.quality];
    if (dt <= 0 || ship.hull >= 0.62) return;
    const severity = 1 - ship.hull / 0.62;
    if (budget.smoke > 0) {
      ship.smokeDebt += dt * (1.2 + severity * 4.5);
      while (ship.smokeDebt >= 1) {
        ship.smokeDebt -= 1;
        const point = this.damagePoint(ship);
        this.spawn(Kind.Smoke, point.x, point.y, (this.random() - 0.5) * 20, -18 - this.random() * 20,
          1.3 + this.random() * 0.8, (14 + severity * 10) * ship.scale, severity > 0.6 ? "#3c2c24" : "#2b2f38", 0.97, -6, 0);
      }
    }
    if (ship.hull < 0.42) {
      ship.sparkDebt += dt * (3 + severity * 10) * budget.density;
      while (ship.sparkDebt >= 1) {
        ship.sparkDebt -= 1;
        const point = this.damagePoint(ship);
        const a = this.random() * TAU;
        const speed = 90 + this.random() * 200;
        this.spawn(Kind.Spark, point.x, point.y, Math.cos(a) * speed, Math.sin(a) * speed, 0.18 + this.random() * 0.2,
          1.4, this.random() < 0.5 ? HOT : WHITE, 0.9, 260, 0);
      }
    }
    if (ship.hull < 0.3 && budget.rich) {
      ship.fireDebt += dt * (6 + severity * 10);
      while (ship.fireDebt >= 1) {
        ship.fireDebt -= 1;
        const point = this.damagePoint(ship);
        this.spawn(Kind.Fire, point.x, point.y, (this.random() - 0.5) * 18, -30 - this.random() * 40,
          0.32 + this.random() * 0.24, (7 + severity * 8) * ship.scale, this.random() < 0.4 ? HOT : FIRE, 0.95, -40, 0);
      }
      ship.popTimer -= dt;
      if (ship.hull < 0.16 && ship.popTimer <= 0) {
        ship.popTimer = 0.9 + this.random() * 1.2;
        const point = this.damagePoint(ship);
        this.glowParticle(point.x, point.y, 30, FIRE, 0.3);
        this.spray(point.x, point.y, 0, Math.PI, Math.round(8 * budget.density), 220, [HOT, FIRE], 0.3);
      }
    }
  }

  private damagePoint(ship: ShipState): { x: number; y: number } {
    const [lx, ly] = DAMAGE_POINTS[Math.floor(this.random() * DAMAGE_POINTS.length)]!;
    const cos = Math.cos(ship.aim);
    const sin = Math.sin(ship.aim);
    const s = ship.scale;
    return {
      x: ship.x + ship.kickX + (lx * cos - ly * sin) * s,
      y: ship.y + ship.kickY + (lx * sin + ly * cos) * s,
    };
  }

  // --- Spawning helpers -----------------------------------------------------------

  private random(): number {
    // Park–Miller: deterministic per session, cheap, no Math.random churn.
    this.seed = (this.seed * 48271) % 2147483647;
    return this.seed / 2147483647;
  }

  private spawn(kind: Kind, x: number, y: number, vx: number, vy: number, life: number, size: number, color: string, drag: number, gravity: number, spin: number): void {
    const budget = BUDGET[this.quality];
    if (this.live.length >= Math.min(budget.particles, MAX_POOL)) return;
    if (kind === Kind.Debris) {
      if (this.debrisLive >= budget.debris) return;
      this.debrisLive += 1;
    }
    if (kind === Kind.Smoke) {
      if (this.smokeLive >= budget.smoke) return;
      this.smokeLive += 1;
    }
    const particle = this.pool.pop() ?? ({} as Particle);
    particle.kind = kind;
    particle.x = x;
    particle.y = y;
    particle.vx = vx;
    particle.vy = vy;
    particle.age = 0;
    particle.life = life;
    particle.size = size;
    particle.rotation = this.random() * TAU;
    particle.spin = spin;
    particle.color = color;
    particle.drag = drag;
    particle.gravity = gravity;
    particle.shape = Math.floor(this.random() * DEBRIS_SHAPES.length);
    particle.heat = 1;
    let colorId = this.colorIds.get(color);
    if (colorId === undefined) {
      colorId = this.colorList.length;
      this.colorIds.set(color, colorId);
      this.colorList.push(color);
    }
    particle.colorId = colorId;
    this.live.push(particle);
  }

  private glowParticle(x: number, y: number, radius: number, color: string, life: number): void {
    this.spawn(Kind.Glow, x, y, 0, 0, life, radius, color, 1, 0, 0);
  }

  private spray(x: number, y: number, heading: number, spread: number, count: number, speed: number, colors: readonly string[], life: number): void {
    for (let index = 0; index < count; index += 1) {
      const a = heading + (this.random() - 0.5) * 2 * spread;
      const v = speed * (0.35 + this.random() * 0.85);
      this.spawn(Kind.Spark, x, y, Math.cos(a) * v, Math.sin(a) * v, life * (0.6 + this.random() * 0.7),
        1 + this.random() * 1.2, colors[index % colors.length]!, 0.9, 120, 0);
    }
  }

  private embers(x: number, y: number, count: number, speed: number, color = FIRE, gravity = -30): void {
    for (let index = 0; index < count; index += 1) {
      const a = this.random() * TAU;
      const v = speed * (0.2 + this.random() * 0.8);
      this.spawn(Kind.Ember, x, y, Math.cos(a) * v, Math.sin(a) * v, 0.5 + this.random() * 0.7,
        2 + this.random() * 2.6, this.random() < 0.3 ? HOT : color, 0.93, gravity, 0);
    }
  }

  private debris(x: number, y: number, heading: number, count: number, speed: number, tint: string, spread = 1.3): void {
    for (let index = 0; index < count; index += 1) {
      const a = heading + (this.random() - 0.5) * 2 * spread;
      const v = speed * (0.4 + this.random() * 0.9);
      this.spawn(Kind.Debris, x, y, Math.cos(a) * v, Math.sin(a) * v, 0.9 + this.random() * 0.9,
        2.4 + this.random() * 4.2, this.random() < 0.35 ? tint : "#2a303c", 0.965, 40, (this.random() - 0.5) * 14);
    }
  }

  private smoke(x: number, y: number, count: number, size: number): void {
    for (let index = 0; index < count; index += 1) {
      const a = this.random() * TAU;
      const v = 30 + this.random() * 60;
      this.spawn(Kind.Smoke, x + Math.cos(a) * 8, y + Math.sin(a) * 8, Math.cos(a) * v, Math.sin(a) * v - 10,
        0.9 + this.random() * 0.8, size * (0.7 + this.random() * 0.6), this.random() < 0.5 ? "#2b2f38" : "#3a3029", 0.95, -8, 0);
    }
  }

  private ring(x: number, y: number, radius: number, width: number, color: string, life: number): void {
    this.rings.push({ x, y, radius, width, color, age: 0, life });
    if (this.rings.length > 30) this.rings.shift();
  }

  private book(id: DuelFlipbookId, x: number, y: number, size: number, life: number, delay = 0): void {
    const budget = BUDGET[this.quality];
    if (!budget.painted || duelFlipbook(id) === null) return;
    while (this.books.length >= budget.flipbooks) this.books.shift();
    this.books.push({ id, x, y, size, rotation: this.random() * TAU, age: -delay, life, alpha: 1 });
  }

  // --- Drawing ------------------------------------------------------------------------

  /** Under the hulls: smoke, momentum aura, shield bubbles behind the ship. */
  drawUnder(context: CanvasRenderingContext2D): void {
    const budget = BUDGET[this.quality];
    context.save();
    if (this.smokeLive > 0) {
      context.globalCompositeOperation = "source-over";
      for (const particle of this.live) {
        if (particle.kind !== Kind.Smoke) continue;
        const k = particle.age / particle.life;
        const image = smokeSprite(particle.color);
        if (image === null) continue;
        const size = particle.size * (1 + k * 1.6);
        context.globalAlpha = (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85) * 0.8;
        context.drawImage(image, particle.x - size, particle.y - size, size * 2, size * 2);
      }
    }
    context.globalCompositeOperation = "lighter";
    context.globalAlpha = 1;
    // Momentum aura on your ship: brighter and wider with each tier.
    const self = this.ships.self;
    if (this.momentumTier > 0 && !self.destroyed) {
      const info = DUEL_MOMENTUM_TIERS[this.momentumTier]!;
      const breathe = 1 + Math.sin(this.time * 7) * 0.06;
      const radius = (62 + this.momentumTier * 9) * self.scale * breathe;
      drawGlow(context, info.color, self.x + self.kickX, self.y + self.kickY, radius, 0.14 + this.momentumTier * 0.05);
      if (budget.ultra) {
        for (let index = 0; index < 4 + this.momentumTier; index += 1) {
          const a = this.time * (2.2 + index * 0.13) + index * 1.7;
          const r = (46 + (index % 3) * 9) * self.scale;
          drawGlow(context, info.color, self.x + Math.cos(a) * r, self.y + Math.sin(a) * r * 0.8, 6, 0.75);
        }
      }
    }
    for (const side of ["self", "opponent"] as const) {
      const ship = this.ships[side];
      if (ship.spawn !== Infinity) {
        const k = Math.min(1, ship.spawn / 1.2);
        drawGlow(context, ship.primary, ship.x, ship.y, 120 * ship.scale * (1 + k), (1 - k) * 0.8);
        drawRingGlow(context, ship.primary, ship.x, ship.y, (30 + 140 * Math.sqrt(k)) * ship.scale, (1 - k) * 0.9);
      }
      if (ship.melt > 0) {
        drawGlow(context, FIRE, ship.x, ship.y, (60 + 90 * ship.melt) * ship.scale, 0.25 + ship.melt * 0.55);
      }
    }
    context.restore();
  }

  /** Over the hulls: light, sparks, debris, painted blasts, shields, beams. */
  draw(context: CanvasRenderingContext2D): void {
    const budget = BUDGET[this.quality];
    context.save();
    // Solid debris first (normal blending, opaque like the owner wants).
    if (this.debrisLive > 0) {
      context.globalCompositeOperation = "source-over";
      for (const particle of this.live) {
        if (particle.kind !== Kind.Debris) continue;
        const k = particle.age / particle.life;
        context.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
        const shape = DEBRIS_SHAPES[particle.shape]!;
        const s = particle.size;
        context.save();
        context.translate(particle.x, particle.y);
        context.rotate(particle.rotation);
        context.beginPath();
        context.moveTo(shape[0]! * s, shape[1]! * s);
        for (let index = 2; index < shape.length; index += 2) context.lineTo(shape[index]! * s, shape[index + 1]! * s);
        context.closePath();
        context.fillStyle = particle.color;
        context.fill();
        if (particle.heat > 0.05) {
          context.strokeStyle = rgba(FIRE, particle.heat);
          context.lineWidth = 1.2;
          context.stroke();
        }
        context.restore();
      }
    }

    context.globalCompositeOperation = "lighter";
    context.globalAlpha = 1;

    for (const book of this.books) {
      if (book.age < 0) continue;
      context.globalAlpha = 1;
      const art = duelFlipbook(book.id);
      if (art === null) continue;
      const k = book.age / book.life;
      drawDuelFlipbook(context, art, k, book.x, book.y, book.size * (0.85 + 0.25 * k), book.rotation, book.alpha * (k > 0.8 ? (1 - k) / 0.2 : 1), budget.blend);
    }

    for (const beam of this.beams) {
      const k = beam.age / beam.life;
      const fade = 1 - k;
      context.globalAlpha = 0.35 * fade;
      context.strokeStyle = beam.color;
      context.lineCap = "round";
      context.lineWidth = beam.width * (1.6 + k * 2);
      context.beginPath();
      context.moveTo(beam.x0, beam.y0);
      context.lineTo(beam.x1, beam.y1);
      context.stroke();
      context.globalAlpha = 0.9 * fade;
      context.strokeStyle = WHITE;
      context.lineWidth = Math.max(1, beam.width * 0.35 * fade);
      context.stroke();
    }

    for (const ring of this.rings) {
      context.globalAlpha = 1;
      const k = ring.age / ring.life;
      const eased = 1 - (1 - k) * (1 - k);
      const radius = 4 + eased * ring.radius;
      drawRingGlow(context, ring.color, ring.x, ring.y, radius, (1 - k) * 0.8);
      context.globalAlpha = (1 - k) * 0.85;
      context.strokeStyle = ring.color;
      context.lineWidth = Math.max(0.6, ring.width * (1 - k));
      context.beginPath();
      context.arc(ring.x, ring.y, radius, 0, TAU);
      context.stroke();
    }

    for (const pulse of this.pulses) {
      const ship = this.ships[pulse.side];
      if (ship.destroyed) continue;
      const k = pulse.age / pulse.life;
      const radius = 58 * ship.scale * (1 + k * 0.08);
      const alpha = (1 - k) * Math.min(1, pulse.strength) * 0.85;
      context.globalAlpha = 1;
      if (budget.rich) {
        const hex = hexSprite(SHIELD);
        if (hex !== null) {
          context.globalAlpha = alpha;
          context.drawImage(hex, ship.x - radius, ship.y - radius, radius * 2, radius * 2);
        }
      } else {
        drawRingGlow(context, SHIELD, ship.x, ship.y, radius, alpha);
      }
      if (pulse.strength < 2) {
        const cx = ship.x + Math.cos(pulse.angle) * radius * 0.9;
        const cy = ship.y + Math.sin(pulse.angle) * radius * 0.9;
        context.globalAlpha = 1;
        drawGlow(context, WHITE, cx, cy, 22 * pulse.strength * (1 - k * 0.5), alpha);
        context.globalAlpha = alpha;
        context.strokeStyle = WHITE;
        context.lineWidth = 2.2 * (1 - k);
        context.beginPath();
        context.arc(ship.x, ship.y, radius * 0.96, pulse.angle - 0.55, pulse.angle + 0.55);
        context.stroke();
      }
    }

    for (const particle of this.live) {
      const k = particle.age / particle.life;
      context.globalAlpha = 1;
      switch (particle.kind) {
        case Kind.Glow: {
          const grow = particle.size * (0.7 + 0.5 * Math.sqrt(k));
          drawGlow(context, particle.color, particle.x, particle.y, grow, (1 - k) * (1 - k));
          break;
        }
        case Kind.Spark: {
          // Batched below: one stroke per colour/alpha/width bucket instead
          // of one per spark (hundreds of state changes in a big blast).
          const alphaStep = Math.min(3, Math.floor(Math.min(1, (1 - k) * 1.6) * 4));
          const wide = particle.size * (1 - k * 0.5) >= 1.6 ? 1 : 0;
          const index = particle.colorId * 8 + alphaStep * 2 + wide;
          (this.sparkBuckets[index] ??= []).push(particle);
          break;
        }
        case Kind.Ember: {
          const flicker = 0.75 + 0.25 * Math.sin((particle.age + particle.rotation) * 31);
          drawGlow(context, particle.color, particle.x, particle.y, particle.size * 2.6, (1 - k) * flicker);
          break;
        }
        case Kind.Fire: {
          const size = particle.size * (1 - k * 0.45);
          drawGlow(context, particle.color, particle.x, particle.y, size * 2.2, (1 - k) * 0.8);
          if (k < 0.4) drawGlow(context, HOT, particle.x, particle.y, size, 0.8 - k * 2);
          break;
        }
        case Kind.Shard: {
          context.globalAlpha = 1 - k;
          context.fillStyle = particle.color;
          context.save();
          context.translate(particle.x, particle.y);
          context.rotate(particle.rotation);
          context.beginPath();
          context.moveTo(0, -particle.size);
          context.lineTo(particle.size * 0.45, particle.size * 0.5);
          context.lineTo(-particle.size * 0.45, particle.size * 0.5);
          context.closePath();
          context.fill();
          context.restore();
          context.globalAlpha = 1;
          if (budget.rich) drawGlow(context, particle.color, particle.x, particle.y, particle.size * 2, (1 - k) * 0.5);
          break;
        }
        case Kind.Debris:
          if (budget.ultra && particle.heat > 0.1) drawGlow(context, FIRE, particle.x, particle.y, particle.size * 2.4, particle.heat * 0.55);
          break;
        default:
          break;
      }
    }

    context.lineCap = "round";
    for (let index = 0; index < this.sparkBuckets.length; index += 1) {
      const bucket = this.sparkBuckets[index];
      if (bucket === undefined || bucket.length === 0) continue;
      context.globalAlpha = ((index >> 1) % 4 + 1) / 4;
      context.strokeStyle = this.colorList[index >> 3]!;
      context.lineWidth = index % 2 === 1 ? 2.1 : 1.3;
      context.beginPath();
      for (const particle of bucket) {
        const speed = Math.hypot(particle.vx, particle.vy) || 1;
        const length = Math.min(26, 3 + speed * 0.035);
        context.moveTo(particle.x, particle.y);
        context.lineTo(particle.x - (particle.vx / speed) * length, particle.y - (particle.vy / speed) * length);
      }
      context.stroke();
      bucket.length = 0;
    }

    if (this.rays > 0.01) {
      // Light shafts from the final blast (High/Ultra): stretched glow
      // sprites, soft at both ends, slowly turning.
      const ship = this.ships[this.raysSide];
      const count = budget.ultra ? 12 : 8;
      const hot = glowSprite(HOT);
      const white = glowSprite(WHITE);
      for (let index = 0; index < count; index += 1) {
        const image = index % 2 === 0 ? hot : white;
        if (image === null) continue;
        const a = (index / count) * Math.PI + this.time * 0.3 + (index % 3) * 0.07;
        const length = (300 + (index % 3) * 150) * (0.7 + 0.3 * this.rays);
        const width = 16 + (index % 2) * 12;
        context.save();
        context.translate(ship.x, ship.y);
        context.rotate(a);
        context.globalAlpha = this.rays * (index % 2 === 0 ? 0.5 : 0.35);
        context.drawImage(image, -length, -width / 2, length * 2, width);
        context.restore();
      }
    }
    context.restore();
  }

  /**
   * Depth View: red lock brackets around the far rival so a small ship is
   * always easy to find. Drawn only when the rival is much smaller than you.
   */
  drawLock(context: CanvasRenderingContext2D): void {
    const rival = this.ships.opponent;
    const self = this.ships.self;
    if (rival.destroyed || rival.scale > self.scale * 0.6) return;
    const r = 46 * Math.max(0.7, rival.scale) + Math.sin(this.time * 4) * 2;
    const arm = r * 0.42;
    const x = rival.x + rival.kickX;
    const y = rival.y + rival.kickY;
    context.save();
    context.globalCompositeOperation = "lighter";
    context.globalAlpha = 0.75;
    context.strokeStyle = "#ff5a6e";
    context.lineWidth = 1.6;
    context.lineCap = "round";
    context.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
      context.moveTo(x + sx * r, y + sy * (r - arm));
      context.lineTo(x + sx * r, y + sy * r);
      context.lineTo(x + sx * (r - arm), y + sy * r);
    }
    context.stroke();
    context.restore();
  }

  /**
   * Text over everything except the screen layers. Each label is rendered
   * once into a small cached bitmap (outline and fill at 2×) and then only
   * drawn: setting `context.font` per label per frame re-parsed a CSS font
   * string and cost ~300 ms of a 12 s profile.
   */
  drawText(context: CanvasRenderingContext2D): void {
    const budget = BUDGET[this.quality];
    if (this.texts.length === 0 && this.momentumStreak < 3) return;
    context.save();
    for (const item of this.texts) {
      const k = item.age / item.life;
      const appear = Math.min(1, item.age / 0.14);
      const scale = item.age < 0.14 ? 0.4 + 0.6 * easeOutBack(appear) : 1 + item.pop * 0.28;
      const alpha = k > 0.72 ? Math.max(0, (1 - k) / 0.28) : 1;
      const italic = item.style === "callout" || item.style === "danger" || item.style === "crit";
      if (budget.rich && italic) {
        context.globalCompositeOperation = "lighter";
        context.globalAlpha = 1;
        drawGlow(context, item.color, item.x, item.y, item.size * scale * 2.1, alpha * 0.5);
      }
      context.globalCompositeOperation = "source-over";
      context.globalAlpha = alpha;
      const base = fontBucket(item.size);
      this.drawLabel(context, item.text, base, italic, item.age < 0.08 ? WHITE : item.color, item.x, item.y, (item.size / base) * scale);
    }
    this.drawMomentum(context);
    context.restore();
  }

  private readonly labels = new Map<string, { canvas: HTMLCanvasElement; width: number; height: number } | null>();
  private measure: CanvasRenderingContext2D | null | undefined;

  private label(text: string, size: number, italic: boolean, color: string): { canvas: HTMLCanvasElement; width: number; height: number } | null {
    const key = text + "|" + size + "|" + (italic ? 1 : 0) + "|" + color;
    const cached = this.labels.get(key);
    if (cached !== undefined) {
      // Refresh recency (Map keeps insertion order).
      this.labels.delete(key);
      this.labels.set(key, cached);
      return cached;
    }
    if (this.measure === undefined) {
      this.measure = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
    }
    let made: { canvas: HTMLCanvasElement; width: number; height: number } | null = null;
    if (this.measure !== null) {
      const font = fontFor(size, italic);
      this.measure.font = font;
      const pad = Math.ceil(size * 0.3);
      const width = Math.ceil(this.measure.measureText(text).width) + pad * 2;
      const height = Math.ceil(size * 1.3) + pad;
      const canvas = document.createElement("canvas");
      canvas.width = width * 2;
      canvas.height = height * 2;
      const context = canvas.getContext("2d");
      if (context !== null) {
        context.scale(2, 2);
        context.font = font;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.lineJoin = "round";
        context.lineWidth = Math.max(3, size * 0.2);
        context.strokeStyle = "rgba(3,6,14,0.88)";
        context.strokeText(text, width / 2, height / 2);
        context.fillStyle = color;
        context.fillText(text, width / 2, height / 2);
        made = { canvas, width, height };
      }
    }
    this.labels.set(key, made);
    while (this.labels.size > 96) this.labels.delete(this.labels.keys().next().value!);
    return made;
  }

  private drawLabel(context: CanvasRenderingContext2D, text: string, size: number, italic: boolean, color: string, x: number, y: number, scale: number): void {
    const sprite = this.label(text, size, italic, color);
    if (sprite === null) return;
    const w = sprite.width * scale;
    const h = sprite.height * scale;
    // Keep labels on screen (narrow portrait views).
    const cx = Math.max(w / 2 + 6, Math.min(this.viewWidth - w / 2 - 6, x));
    const cy = Math.max(h / 2 + 6, Math.min(this.viewHeight - h / 2 - 6, y));
    context.drawImage(sprite.canvas, cx - w / 2, cy - h / 2, w, h);
  }

  private drawMomentum(context: CanvasRenderingContext2D): void {
    const ship = this.ships.self;
    if (this.momentumStreak < 3 || ship.destroyed) return;
    const info = DUEL_MOMENTUM_TIERS[this.momentumTier]!;
    const progress = duelMomentumProgress(this.momentumStreak);
    const other = this.ships.opponent;
    // Depth View fires straight up from your ship: the counter moves aside.
    const stacked = Math.abs(other.y - ship.y) > Math.abs(other.x - ship.x);
    // Phones have no side room: the counter sits under the hull instead.
    const narrow = stacked && this.viewWidth < 700;
    const x = stacked && !narrow ? ship.x - 118 * ship.scale * 0.8 : ship.x;
    const y = narrow ? ship.y + 70 * ship.scale : stacked ? ship.y + 22 * ship.scale : ship.y - 78 * ship.scale;
    const ringRadius = 64 * ship.scale * (stacked ? 0.8 : 1);
    // Progress to the next tier, as an arc around the hull.
    context.globalCompositeOperation = "lighter";
    context.globalAlpha = 0.55;
    context.strokeStyle = info.color;
    context.lineWidth = 2.5;
    context.lineCap = "round";
    context.beginPath();
    context.arc(ship.x, ship.y, ringRadius, -Math.PI / 2, -Math.PI / 2 + TAU * progress);
    context.stroke();
    context.globalCompositeOperation = "source-over";
    context.globalAlpha = 1;
    const size = 22 + this.momentumTier * 3;
    this.drawLabel(context, "×" + String(this.momentumStreak), size, true, this.momentumPop > 0.6 ? WHITE : info.color, x, y, 1 + this.momentumPop * 0.3);
    if (info.label !== "") this.drawLabel(context, info.label, 11, false, info.color, x, y + size * 0.62, 1);
  }

  /** Screen space: danger frame, flash, cinematic bars. */
  drawScreen(context: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.dangerAlpha <= 0.01 && this.flashAlpha <= 0.01 && this.bars <= 0.01) return;
    context.save();
    if (this.dangerAlpha > 0.01) {
      const image = vignette();
      if (image !== null) {
        context.globalCompositeOperation = "source-over";
        context.globalAlpha = this.dangerAlpha * 0.75;
        context.drawImage(image, 0, 0, width, height);
      }
    }
    if (this.flashAlpha > 0.01) {
      context.globalCompositeOperation = "lighter";
      context.globalAlpha = this.flashAlpha * 0.55;
      context.fillStyle = this.flashColor;
      context.fillRect(0, 0, width, height);
    }
    if (this.bars > 0.01) {
      context.globalCompositeOperation = "source-over";
      context.globalAlpha = 0.92;
      context.fillStyle = "#000";
      const bar = Math.round(height * 0.075 * this.bars);
      context.fillRect(0, 0, width, bar);
      context.fillRect(0, height - bar, width, bar);
    }
    context.restore();
  }
}

function filterAge<T extends { age: number; life: number }>(items: T[], dt: number): void {
  let alive = 0;
  for (const item of items) {
    item.age += dt;
    if (item.age < item.life) items[alive++] = item;
  }
  items.length = alive;
}

function formatAmount(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Few distinct font strings: labels snap to 6 px steps and scale the rest. */
function fontBucket(size: number): number {
  return Math.max(12, Math.round(size / 6) * 6);
}

function textSize(style: CombatTextStyle, value: number): number {
  switch (style) {
    case "crit":
      return 34 + Math.min(14, value * 0.6);
    case "hull":
      return 19 + Math.min(15, value * 1.3);
    case "shield":
      return 16 + Math.min(10, value);
    case "heal":
    case "energy":
      return 17;
    case "callout":
      return 22;
    case "danger":
      return 18;
    case "miss":
      return 15;
  }
}
