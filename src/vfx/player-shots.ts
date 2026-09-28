import type { CharacterId } from "../characters/registry";
import {
  playerProjectileProfile,
  type PlayerShotArchetype,
} from "../characters/projectiles";
import type { VisualQuality } from "../types";
import {
  pickHeadSprite,
  preloadShotSprites,
  shotSpriteSet,
  type ShotSprite,
} from "./player-shot-sprites";

/**
 * Player shots: every correct key fires one travelling bolt with a comet
 * trail. A bolt flies a short curve from one of the ship's muzzles to its
 * target and narrows as it climbs the field, which the top-down camera reads
 * as depth.
 *
 * The system only simulates and draws. Game.ts decides what an arrival does
 * to the game (enemy flash, bursts, sounds) through the shot payload, so the
 * hit reaction lands exactly when the bolt does.
 *
 * Pilot: only Vanguard ("spear") has a bolt so far; the other ships keep the
 * instant laser tracer until their own designs are approved.
 */

export type ShotRecipe = {
  /** Travel speed in CSS px per second; flight time is clamped. */
  speed: number;
  /** Curve bulge as a share of the distance, away from the muzzle side. */
  bend: number;
  /** Trail length as a share of the path, capped by `trailMaxPx`. */
  trailShare: number;
  trailMaxPx: number;
  /** Head radius and trail half-width at the muzzle, CSS px. */
  width: number;
  /** Hot-core length over width along the flight direction. */
  stretch: number;
  /** Sparkles shed per second at High quality. */
  sparkleRate: number;
  /** Muzzle offsets from the ship centre for normal shots, used in turn. */
  muzzles: readonly (readonly [number, number])[];
  /** Muzzle of the word-finishing shot (power >= FINISHER_POWER). */
  finisherMuzzle: readonly [number, number];
  /**
   * Painted sprites folder in public/assets/space-typing/fx/ (null = code
   * drawn only). Sizes below are CSS px at the muzzle, before the depth cue.
   */
  fx: string | null;
  boltLength: number;
  finisherLength: number;
  impactSize: number;
  muzzleLength: number;
};

const RECIPES: Readonly<Partial<Record<PlayerShotArchetype, ShotRecipe>>> = {
  // Vanguard: plasma lances from the two wing pods that converge on the
  // target; the finishing shot is a heavier lance from the central nose.
  spear: {
    speed: 3300,
    bend: 0.07,
    trailShare: 0.55,
    trailMaxPx: 240,
    width: 6.5,
    stretch: 5,
    sparkleRate: 90,
    muzzles: [[-21, -12], [21, -12]],
    finisherMuzzle: [0, -36],
    fx: "vanguard",
    boltLength: 92,
    finisherLength: 150,
    impactSize: 84,
    muzzleLength: 46,
  },
};

/** Ships without a recipe keep the legacy laser tracer. */
export function shotRecipeFor(characterId: CharacterId): Readonly<ShotRecipe> | null {
  return RECIPES[playerProjectileProfile(characterId).archetype] ?? null;
}

/** Starts loading a ship's painted shot sprites (no-op without a browser). */
export function preloadShotArt(characterId: CharacterId): void {
  preloadShotSprites(shotRecipeFor(characterId)?.fx ?? null);
}

/** Flight time bounds: long enough to read as a bolt, short enough to feel instant. */
export const MIN_FLIGHT_SECONDS = 0.08;
export const MAX_FLIGHT_SECONDS = 0.26;
/** Word-finishing shots are fired with at least this power. */
export const FINISHER_POWER = 1.3;

const MAX_SHOTS = 64;
const MAX_SPARKLES = 320;
const MAX_IMPACTS = 24;
const MAX_MUZZLES = 12;
const MAX_SAMPLES = 16;
const IMPACT_LIFE = 0.22;
const MUZZLE_LIFE = 0.075;

type QualityTuning = {
  samples: number;
  sparkles: number;
  /** Wide outer glow ribbon; Low draws the core ribbon only. */
  outer: boolean;
  detail: number;
};

const QUALITY: Readonly<Record<VisualQuality, QualityTuning>> = {
  low: { samples: 6, sparkles: 0.25, outer: false, detail: 0.55 },
  medium: { samples: 9, sparkles: 0.6, outer: true, detail: 0.8 },
  high: { samples: 12, sparkles: 1, outer: true, detail: 1 },
  ultra: { samples: MAX_SAMPLES, sparkles: 1.35, outer: true, detail: 1.15 },
};

type Rgb = readonly [number, number, number];

type ShotPalette = {
  primary: Rgb;
  secondary: Rgb;
};

const WHITE: Rgb = [255, 255, 255];

function hexRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1, 7), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgba(color: Rgb, alpha: number): string {
  const a = alpha <= 0 ? 0 : alpha >= 1 ? 1 : alpha;
  return "rgba(" + color[0] + "," + color[1] + "," + color[2] + "," + a.toFixed(3) + ")";
}

const palettes = new Map<CharacterId, ShotPalette>();

function paletteFor(characterId: CharacterId): ShotPalette {
  let palette = palettes.get(characterId);
  if (palette === undefined) {
    const profile = playerProjectileProfile(characterId);
    palette = { primary: hexRgb(profile.primary), secondary: hexRgb(profile.secondary) };
    palettes.set(characterId, palette);
  }
  return palette;
}

// ---------------------------------------------------------------------------
// Cached glow sprites: one soft radial gradient per colour, drawn with
// drawImage under "lighter". No shadowBlur (its cost scales with pixels).
// ---------------------------------------------------------------------------

const glowSprites = new Map<string, CanvasImageSource | null>();

function glowSprite(color: Rgb): CanvasImageSource | null {
  const key = color.join(",");
  const cached = glowSprites.get(key);
  if (cached !== undefined) return cached;
  let sprite: CanvasImageSource | null = null;
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    if (context !== null) {
      const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, rgba(color, 1));
      gradient.addColorStop(0.22, rgba(color, 0.62));
      gradient.addColorStop(0.5, rgba(color, 0.2));
      gradient.addColorStop(1, rgba(color, 0));
      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 64);
      sprite = canvas;
    }
  }
  glowSprites.set(key, sprite);
  return sprite;
}

function glow(
  context: CanvasRenderingContext2D,
  sprite: CanvasImageSource | null,
  x: number,
  y: number,
  radius: number,
  alpha: number,
): void {
  if (sprite === null || radius <= 0.2 || alpha <= 0.004) return;
  context.globalAlpha = alpha > 1 ? 1 : alpha;
  context.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
}

/** A painted sprite with its anchor at (x, y), turned to `angle`, `length` wide. */
function drawAnchored(
  context: CanvasRenderingContext2D,
  sprite: ShotSprite,
  x: number,
  y: number,
  angle: number,
  length: number,
  alpha: number,
): void {
  if (length <= 0.5 || alpha <= 0.004) return;
  const height = (length * sprite.height) / sprite.width;
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.globalAlpha = alpha > 1 ? 1 : alpha;
  context.drawImage(sprite.image, -sprite.anchorX * length, -sprite.anchorY * height, length, height);
  context.restore();
}

/** A glow stretched along `angle`: rx along the flight, ry across it. */
function streak(
  context: CanvasRenderingContext2D,
  sprite: CanvasImageSource | null,
  x: number,
  y: number,
  angle: number,
  rx: number,
  ry: number,
  alpha: number,
): void {
  if (sprite === null || rx <= 0.2 || ry <= 0.1 || alpha <= 0.004) return;
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.globalAlpha = alpha > 1 ? 1 : alpha;
  context.drawImage(sprite, -rx, -ry, rx * 2, ry * 2);
  context.restore();
}

// ---------------------------------------------------------------------------
// Simulation state.
// ---------------------------------------------------------------------------

export type ShotFireOptions<P> = {
  characterId: CharacterId;
  /** Ship centre; the recipe's muzzle offsets are added to it. */
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  /** 0.75 light hit … 1.45 word-finishing shot. */
  power: number;
  /** Field height, for the depth (narrow with distance) cue. */
  viewHeight: number;
  payload: P;
};

export type ShotArrival<P> = {
  payload: P;
  x: number;
  y: number;
  power: number;
};

/** Written by the aim callback: the target's current position. */
export type ShotAimPoint = { x: number; y: number };

type Shot<P> = {
  live: boolean;
  arrived: boolean;
  recipe: ShotRecipe;
  palette: ShotPalette;
  x0: number;
  y0: number;
  tx: number;
  ty: number;
  side: number;
  age: number;
  duration: number;
  trailS: number;
  power: number;
  viewHeight: number;
  seed: number;
  sparkleDebt: number;
  payload: P | null;
};

type Impact = {
  live: boolean;
  recipe: ShotRecipe;
  palette: ShotPalette;
  x: number;
  y: number;
  angle: number;
  power: number;
  age: number;
  life: number;
  seed: number;
};

type Muzzle = {
  live: boolean;
  recipe: ShotRecipe;
  palette: ShotPalette;
  x: number;
  y: number;
  angle: number;
  power: number;
  age: number;
};

// Sparkle pool layout (Float32Array): x, y, vx, vy, life, maxLife, size, kind.
const SPARKLE_STRIDE = 8;
const SPARK_DOT = 0;
const SPARK_DOT_SECONDARY = 1;
const SPARK_STREAK = 2;

const SCRATCH: ShotAimPoint = { x: 0, y: 0 };
const SCRATCH_B: ShotAimPoint = { x: 0, y: 0 };

/** Point on the quadratic curve muzzle → target at parameter t. */
function curvePoint(shot: Shot<unknown>, t: number, out: ShotAimPoint): void {
  const dx = shot.tx - shot.x0;
  const dy = shot.ty - shot.y0;
  const distance = Math.hypot(dx, dy) || 1;
  const bulge = shot.recipe.bend * distance * shot.side;
  const cx = shot.x0 + dx * 0.5 + (dy / distance) * bulge;
  const cy = shot.y0 + dy * 0.5 - (dx / distance) * bulge;
  const u = 1 - t;
  out.x = u * u * shot.x0 + 2 * u * t * cx + t * t * shot.tx;
  out.y = u * u * shot.y0 + 2 * u * t * cy + t * t * shot.ty;
}

/**
 * Depth cue: a bolt climbing the field is flying away from the camera, so it
 * narrows toward the top (down to 60% after a full field height of travel).
 */
export function shotDepthScale(originY: number, y: number, viewHeight: number): number {
  const scale = 1 - (originY - y) / (Math.max(1, viewHeight) * 1.3);
  return scale < 0.6 ? 0.6 : scale > 1 ? 1 : scale;
}

export class PlayerShotSystem<P> {
  private readonly shots: Shot<P>[] = [];
  private readonly impacts: Impact[] = [];
  private readonly muzzleFlashes: Muzzle[] = [];
  private readonly sparkles = new Float32Array(MAX_SPARKLES * SPARKLE_STRIDE);
  private readonly sparklePalettes: (ShotPalette | null)[] = new Array<ShotPalette | null>(
    MAX_SPARKLES,
  ).fill(null);
  private sparkleCount = 0;
  private readonly arrivals: ShotArrival<P>[] = [];
  /** Trail samples: x, y, half-width, normal x, normal y. */
  private readonly points = new Float32Array(MAX_SAMPLES * 5);
  private muzzleCursor = 0;
  private seedCursor = 1;

  get activeShots(): number {
    let count = 0;
    for (const shot of this.shots) if (shot.live) count += 1;
    return count;
  }

  get idle(): boolean {
    if (this.sparkleCount > 0) return false;
    for (const shot of this.shots) if (shot.live) return false;
    for (const impact of this.impacts) if (impact.live) return false;
    for (const muzzle of this.muzzleFlashes) if (muzzle.live) return false;
    return true;
  }

  /** Fires one bolt; returns false when the ship has no bolt recipe. */
  fire(options: ShotFireOptions<P>): boolean {
    const recipe = shotRecipeFor(options.characterId);
    if (recipe === null) return false;
    const palette = paletteFor(options.characterId);
    const power = Math.max(0.5, options.power);
    let muzzle = recipe.finisherMuzzle;
    if (power < FINISHER_POWER) {
      muzzle = recipe.muzzles[this.muzzleCursor % recipe.muzzles.length]!;
      this.muzzleCursor += 1;
    }
    const x0 = options.originX + muzzle[0];
    const y0 = options.originY + muzzle[1];
    const distance = Math.max(1, Math.hypot(options.targetX - x0, options.targetY - y0));

    const shot = this.claimShot();
    shot.live = true;
    shot.arrived = false;
    shot.recipe = recipe;
    shot.palette = palette;
    shot.x0 = x0;
    shot.y0 = y0;
    shot.tx = options.targetX;
    shot.ty = options.targetY;
    // Bulge outward on the muzzle's side so twin streams converge on the target.
    shot.side = muzzle[0] < 0 ? -1 : muzzle[0] > 0 ? 1 : 0;
    shot.age = 0;
    shot.duration = Math.min(
      MAX_FLIGHT_SECONDS,
      Math.max(MIN_FLIGHT_SECONDS, distance / recipe.speed),
    );
    shot.trailS = Math.min(recipe.trailShare, recipe.trailMaxPx / distance);
    shot.power = power;
    shot.viewHeight = options.viewHeight;
    shot.seed = this.seedCursor;
    this.seedCursor = (this.seedCursor * 48271) % 2147483647;
    shot.sparkleDebt = 0;
    shot.payload = options.payload;

    const flash = this.claimMuzzle();
    flash.live = true;
    flash.recipe = recipe;
    flash.palette = palette;
    flash.x = x0;
    flash.y = y0;
    flash.angle = Math.atan2(options.targetY - y0, options.targetX - x0);
    flash.power = power;
    flash.age = 0;
    return true;
  }

  /**
   * Advances every bolt. `aim` refreshes a live target's position (return
   * false to keep flying at the last known point); `quality` scales the
   * sparkles shed. Returns the bolts that landed this step; the array is
   * reused by the next call.
   */
  update(
    dt: number,
    aim: (payload: P, out: ShotAimPoint) => boolean,
    quality: VisualQuality = "high",
  ): readonly ShotArrival<P>[] {
    this.arrivals.length = 0;
    const step = Number.isFinite(dt) && dt > 0 ? dt : 0;

    for (const shot of this.shots) {
      if (!shot.live) continue;
      if (!shot.arrived && shot.payload !== null && aim(shot.payload, SCRATCH)) {
        shot.tx = SCRATCH.x;
        shot.ty = SCRATCH.y;
      }
      shot.age += step;
      const s = shot.age / shot.duration;
      if (!shot.arrived) {
        this.shedSparkles(shot, step * QUALITY[quality].sparkles);
        if (s >= 1) {
          shot.arrived = true;
          this.arrivals.push({
            payload: shot.payload as P,
            x: shot.tx,
            y: shot.ty,
            power: shot.power,
          });
          this.spawnImpact(shot);
        }
      }
      // The tail keeps travelling after impact and disappears into the target.
      if (shot.arrived && s - shot.trailS >= 1) {
        shot.live = false;
        shot.payload = null;
      }
    }

    this.updateSparkles(step);
    for (const impact of this.impacts) {
      if (!impact.live) continue;
      impact.age += step;
      if (impact.age >= impact.life) impact.live = false;
    }
    for (const muzzle of this.muzzleFlashes) {
      if (!muzzle.live) continue;
      muzzle.age += step;
      if (muzzle.age >= MUZZLE_LIFE) muzzle.live = false;
    }
    return this.arrivals;
  }

  clear(): void {
    for (const shot of this.shots) {
      shot.live = false;
      shot.payload = null;
    }
    for (const impact of this.impacts) impact.live = false;
    for (const muzzle of this.muzzleFlashes) muzzle.live = false;
    this.sparkleCount = 0;
    this.sparklePalettes.fill(null);
    this.arrivals.length = 0;
  }

  // -------------------------------------------------------------------------
  // Drawing
  // -------------------------------------------------------------------------

  /** Bolts, trails and sparkles; draw under enemies so word labels stay on top. */
  drawShots(context: CanvasRenderingContext2D, quality: VisualQuality): void {
    if (this.idle) return;
    const tuning = QUALITY[quality];
    context.save();
    context.globalCompositeOperation = "lighter";
    for (const shot of this.shots) {
      if (shot.live) this.drawShot(context, shot, tuning);
    }
    this.drawSparkles(context);
    context.restore();
  }

  /** Impact flashes; draw above enemies. */
  drawImpacts(context: CanvasRenderingContext2D, quality: VisualQuality): void {
    let any = false;
    for (const impact of this.impacts) if (impact.live) any = true;
    if (!any) return;
    const tuning = QUALITY[quality];
    context.save();
    context.globalCompositeOperation = "lighter";
    for (const impact of this.impacts) {
      if (impact.live) this.drawImpact(context, impact, tuning);
    }
    context.restore();
  }

  /** Muzzle flashes; draw above the player ship. */
  drawMuzzleFlashes(context: CanvasRenderingContext2D): void {
    let any = false;
    for (const muzzle of this.muzzleFlashes) if (muzzle.live) any = true;
    if (!any) return;
    context.save();
    context.globalCompositeOperation = "lighter";
    const core = glowSprite(WHITE);
    for (const muzzle of this.muzzleFlashes) {
      if (!muzzle.live) continue;
      const k = muzzle.age / MUZZLE_LIFE;
      const fade = 1 - k;
      const art = shotSpriteSet(muzzle.recipe.fx)?.muzzle;
      if (art !== undefined) {
        const length =
          muzzle.recipe.muzzleLength * (muzzle.power >= FINISHER_POWER ? 1.4 : 1) * (1.1 - 0.3 * k);
        drawAnchored(context, art, muzzle.x, muzzle.y, muzzle.angle, length, fade);
        continue;
      }
      const sprite = glowSprite(muzzle.palette.primary);
      const size = (4 + 4 * muzzle.power) * (1 - k * 0.4);
      glow(context, sprite, muzzle.x, muzzle.y, size * 2.4, 0.55 * fade);
      streak(
        context,
        sprite,
        muzzle.x + Math.cos(muzzle.angle) * size * 0.9,
        muzzle.y + Math.sin(muzzle.angle) * size * 0.9,
        muzzle.angle,
        size * 1.9,
        size * 0.55,
        0.8 * fade,
      );
      glow(context, core, muzzle.x, muzzle.y, size, 0.95 * fade);
    }
    context.restore();
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private claimShot(): Shot<P> {
    for (const shot of this.shots) if (!shot.live) return shot;
    if (this.shots.length < MAX_SHOTS) {
      const shot: Shot<P> = {
        live: false, arrived: false, recipe: RECIPES.spear!, palette: paletteFor("vanguard"),
        x0: 0, y0: 0, tx: 0, ty: 0, side: 0, age: 0, duration: 1, trailS: 0, power: 1,
        viewHeight: 1, seed: 0, sparkleDebt: 0, payload: null,
      };
      this.shots.push(shot);
      return shot;
    }
    // Pool full (only under extreme key spam): reuse the bolt furthest along.
    let oldest = this.shots[0]!;
    for (const shot of this.shots) {
      if (shot.age / shot.duration > oldest.age / oldest.duration) oldest = shot;
    }
    return oldest;
  }

  private claimImpact(): Impact {
    for (const impact of this.impacts) if (!impact.live) return impact;
    if (this.impacts.length < MAX_IMPACTS) {
      const impact: Impact = {
        live: false, recipe: RECIPES.spear!, palette: paletteFor("vanguard"), x: 0, y: 0,
        angle: 0, power: 1, age: 0, life: IMPACT_LIFE, seed: 0,
      };
      this.impacts.push(impact);
      return impact;
    }
    let oldest = this.impacts[0]!;
    for (const impact of this.impacts) if (impact.age > oldest.age) oldest = impact;
    return oldest;
  }

  private claimMuzzle(): Muzzle {
    for (const muzzle of this.muzzleFlashes) if (!muzzle.live) return muzzle;
    if (this.muzzleFlashes.length < MAX_MUZZLES) {
      const muzzle: Muzzle = {
        live: false, recipe: RECIPES.spear!, palette: paletteFor("vanguard"), x: 0, y: 0,
        angle: 0, power: 1, age: 0,
      };
      this.muzzleFlashes.push(muzzle);
      return muzzle;
    }
    let oldest = this.muzzleFlashes[0]!;
    for (const muzzle of this.muzzleFlashes) if (muzzle.age > oldest.age) oldest = muzzle;
    return oldest;
  }

  /** Head position into `out`; returns the flight direction in radians. */
  private headPoint(shot: Shot<P>, out: ShotAimPoint): number {
    const t = Math.min(1, shot.age / shot.duration);
    curvePoint(shot, t, out);
    curvePoint(shot, Math.max(0, t - 0.03), SCRATCH_B);
    const dx = out.x - SCRATCH_B.x;
    const dy = out.y - SCRATCH_B.y;
    return dx === 0 && dy === 0
      ? Math.atan2(shot.ty - shot.y0, shot.tx - shot.x0)
      : Math.atan2(dy, dx);
  }

  /** `dt` is pre-scaled by the quality's sparkle share. */
  private shedSparkles(shot: Shot<P>, dt: number): void {
    shot.sparkleDebt += shot.recipe.sparkleRate * dt;
    if (shot.sparkleDebt < 1) return;
    const angle = this.headPoint(shot, SCRATCH);
    const back = angle + Math.PI;
    while (shot.sparkleDebt >= 1) {
      shot.sparkleDebt -= 1;
      const spread = (Math.random() - 0.5) * 1.6;
      const speed = 30 + Math.random() * 90;
      this.pushSparkle(
        SCRATCH.x + (Math.random() - 0.5) * shot.recipe.width,
        SCRATCH.y + (Math.random() - 0.5) * shot.recipe.width,
        Math.cos(back + spread) * speed,
        Math.sin(back + spread) * speed,
        0.3 + Math.random() * 0.35,
        1.6 + Math.random() * 1.8,
        Math.random() < 0.6 ? SPARK_DOT : SPARK_DOT_SECONDARY,
        shot.palette,
      );
    }
  }

  private pushSparkle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    size: number,
    kind: number,
    palette: ShotPalette,
  ): void {
    let index = this.sparkleCount;
    if (index >= MAX_SPARKLES) {
      // Replace a random live sparkle; old ones are nearly invisible anyway.
      index = Math.floor(Math.random() * MAX_SPARKLES);
    } else {
      this.sparkleCount += 1;
    }
    const o = index * SPARKLE_STRIDE;
    const data = this.sparkles;
    data[o] = x;
    data[o + 1] = y;
    data[o + 2] = vx;
    data[o + 3] = vy;
    data[o + 4] = life;
    data[o + 5] = life;
    data[o + 6] = size;
    data[o + 7] = kind;
    this.sparklePalettes[index] = palette;
  }

  private updateSparkles(dt: number): void {
    const data = this.sparkles;
    const damping = Math.pow(0.18, dt);
    let write = 0;
    for (let read = 0; read < this.sparkleCount; read += 1) {
      const o = read * SPARKLE_STRIDE;
      const life = data[o + 4]! - dt;
      if (life <= 0) continue;
      const w = write * SPARKLE_STRIDE;
      data[w] = data[o]! + data[o + 2]! * dt;
      data[w + 1] = data[o + 1]! + data[o + 3]! * dt;
      data[w + 2] = data[o + 2]! * damping;
      data[w + 3] = data[o + 3]! * damping;
      data[w + 4] = life;
      data[w + 5] = data[o + 5]!;
      data[w + 6] = data[o + 6]!;
      data[w + 7] = data[o + 7]!;
      this.sparklePalettes[write] = this.sparklePalettes[read]!;
      write += 1;
    }
    for (let index = write; index < this.sparkleCount; index += 1) {
      this.sparklePalettes[index] = null;
    }
    this.sparkleCount = write;
  }

  private drawSparkles(context: CanvasRenderingContext2D): void {
    const data = this.sparkles;
    for (let index = 0; index < this.sparkleCount; index += 1) {
      const palette = this.sparklePalettes[index];
      if (palette === null || palette === undefined) continue;
      const o = index * SPARKLE_STRIDE;
      const k = data[o + 4]! / data[o + 5]!;
      const x = data[o]!;
      const y = data[o + 1]!;
      const kind = data[o + 7]!;
      if (kind === SPARK_STREAK) {
        // Motion-streaked spark: a short line along its own velocity.
        context.globalAlpha = k;
        context.strokeStyle = rgba(palette.secondary, 1);
        context.lineWidth = 1.1;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x - data[o + 2]! * 0.035, y - data[o + 3]! * 0.035);
        context.stroke();
      } else {
        const color = kind === SPARK_DOT_SECONDARY ? palette.secondary : palette.primary;
        glow(context, glowSprite(color), x, y, data[o + 6]! * 3, 0.85 * k);
      }
    }
  }

  private spawnImpact(shot: Shot<P>): void {
    const impact = this.claimImpact();
    impact.live = true;
    impact.recipe = shot.recipe;
    impact.seed = shot.seed;
    impact.palette = shot.palette;
    impact.x = shot.tx;
    impact.y = shot.ty;
    impact.angle = this.headPoint(shot, SCRATCH_B);
    impact.power = shot.power;
    impact.age = 0;
    impact.life = IMPACT_LIFE * (shot.power >= FINISHER_POWER ? 1.3 : 1);

    // Radiating sparks sell the hit; finishing shots throw more.
    const count = shot.power >= FINISHER_POWER ? 14 : 7;
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 140 + Math.random() * 260 * shot.power;
      this.pushSparkle(
        shot.tx,
        shot.ty,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.16 + Math.random() * 0.2,
        1.2,
        SPARK_STREAK,
        shot.palette,
      );
    }
  }

  private drawShot(context: CanvasRenderingContext2D, shot: Shot<P>, tuning: QualityTuning): void {
    const s = shot.age / shot.duration;
    const head = Math.min(1, s);
    const tail = Math.min(1, Math.max(0, s - shot.trailS));
    let trailHead = head;
    // A painted lance carries its own glowing body: the code-drawn trail
    // becomes a slim wake that starts behind it (overlapping its tail flare)
    // instead of a wide sheath washing it out.
    const sprite = pickHeadSprite(shotSpriteSet(shot.recipe.fx), shot.power >= FINISHER_POWER);
    if (sprite !== null && !shot.arrived) {
      curvePoint(shot, head, SCRATCH);
      const length =
        (shot.power >= FINISHER_POWER ? shot.recipe.finisherLength : shot.recipe.boltLength) *
        shotDepthScale(shot.y0, SCRATCH.y, shot.viewHeight);
      const distance = Math.hypot(shot.tx - shot.x0, shot.ty - shot.y0) || 1;
      trailHead = Math.max(tail, head - (length * sprite.anchorX * 0.7) / distance);
    }
    if (trailHead - tail > 0.002) {
      this.drawTrail(context, shot, tail, trailHead, tuning, sprite === null ? 1 : 0.45);
    }
    if (!shot.arrived) this.drawHead(context, shot, tuning);
  }

  /** Fills `points` with x, y, half-width, normal x, normal y per sample. */
  private sampleTrail(
    shot: Shot<P>,
    tail: number,
    head: number,
    samples: number,
    widthScale: number,
  ): void {
    const points = this.points;
    for (let index = 0; index < samples; index += 1) {
      const u = index / (samples - 1);
      curvePoint(shot, tail + (head - tail) * u, SCRATCH);
      const o = index * 5;
      points[o] = SCRATCH.x;
      points[o + 1] = SCRATCH.y;
      // Comet taper: fine at the tail, a full body toward the head.
      points[o + 2] =
        shot.recipe.width *
        widthScale *
        Math.min(1.35, shot.power) *
        shotDepthScale(shot.y0, SCRATCH.y, shot.viewHeight) *
        (0.1 + 0.9 * Math.pow(u, 1.3));
    }
    for (let index = 0; index < samples; index += 1) {
      const a = Math.max(0, index - 1) * 5;
      const b = Math.min(samples - 1, index + 1) * 5;
      const dx = points[b]! - points[a]!;
      const dy = points[b + 1]! - points[a + 1]!;
      const length = Math.hypot(dx, dy) || 1;
      points[index * 5 + 3] = -dy / length;
      points[index * 5 + 4] = dx / length;
    }
  }

  private fillRibbon(
    context: CanvasRenderingContext2D,
    samples: number,
    widthScale: number,
    fill: CanvasGradient,
  ): void {
    const points = this.points;
    context.beginPath();
    for (let index = 0; index < samples; index += 1) {
      const o = index * 5;
      const w = points[o + 2]! * widthScale;
      const x = points[o]! + points[o + 3]! * w;
      const y = points[o + 1]! + points[o + 4]! * w;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    // Rounded nose so the ribbon melts into the head glow.
    const last = (samples - 1) * 5;
    const headW = points[last + 2]! * widthScale;
    context.quadraticCurveTo(
      points[last]! + points[last + 4]! * headW * 1.4,
      points[last + 1]! - points[last + 3]! * headW * 1.4,
      points[last]! - points[last + 3]! * headW,
      points[last + 1]! - points[last + 4]! * headW,
    );
    for (let index = samples - 2; index >= 0; index -= 1) {
      const o = index * 5;
      const w = points[o + 2]! * widthScale;
      context.lineTo(points[o]! - points[o + 3]! * w, points[o + 1]! - points[o + 4]! * w);
    }
    context.closePath();
    context.fillStyle = fill;
    context.globalAlpha = 1;
    context.fill();
  }

  private drawTrail(
    context: CanvasRenderingContext2D,
    shot: Shot<P>,
    tail: number,
    head: number,
    tuning: QualityTuning,
    widthScale: number,
  ): void {
    const samples = tuning.samples;
    this.sampleTrail(shot, tail, head, samples, widthScale);
    const points = this.points;
    const last = (samples - 1) * 5;
    const tx = points[0]!;
    const ty = points[1]!;
    const hx = points[last]!;
    const hy = points[last + 1]!;
    const { primary, secondary } = shot.palette;

    // Layers read as a lit volume, not a flat line: nested halos whose
    // brightness steps down toward the edge (one flat halo showed a hard
    // blade edge), a saturated body and a white-hot core, all fading toward
    // the tail.
    if (tuning.outer) {
      for (const [scale, alpha] of [
        [2.9, 0.13],
        [1.95, 0.2],
      ] as const) {
        const halo = context.createLinearGradient(tx, ty, hx, hy);
        halo.addColorStop(0, rgba(primary, 0));
        halo.addColorStop(0.5, rgba(primary, alpha * 0.5));
        halo.addColorStop(1, rgba(primary, alpha));
        this.fillRibbon(context, samples, scale, halo);
      }
    }
    const body = context.createLinearGradient(tx, ty, hx, hy);
    body.addColorStop(0, rgba(primary, 0));
    body.addColorStop(0.45, rgba(primary, 0.4));
    body.addColorStop(1, rgba(primary, 0.75));
    this.fillRibbon(context, samples, 1.15, body);
    const core = context.createLinearGradient(tx, ty, hx, hy);
    core.addColorStop(0, rgba(secondary, 0));
    core.addColorStop(0.55, rgba(secondary, 0.65));
    core.addColorStop(0.9, rgba(WHITE, 0.95));
    core.addColorStop(1, rgba(WHITE, 1));
    this.fillRibbon(context, samples, 0.5, core);
  }

  /** Plasma lance: bloom, a cyan sheath, a long white-hot needle and a bright tip. */
  private drawHead(context: CanvasRenderingContext2D, shot: Shot<P>, tuning: QualityTuning): void {
    const angle = this.headPoint(shot, SCRATCH);
    const x = SCRATCH.x;
    const y = SCRATCH.y;
    const depth = shotDepthScale(shot.y0, y, shot.viewHeight);
    const r = shot.recipe.width * Math.min(1.4, shot.power) * depth;
    const glowPrimary = glowSprite(shot.palette.primary);
    const core = glowSprite(WHITE);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // A fast shimmer keeps the plasma alive without reading as flicker.
    const shimmer = 0.9 + 0.1 * Math.sin(shot.age * 90 + shot.seed);

    const finisher = shot.power >= FINISHER_POWER;
    const sprite = pickHeadSprite(shotSpriteSet(shot.recipe.fx), finisher);
    if (sprite !== null) {
      // Painted lance pinned at its tip; the bloom is the light it spills.
      glow(context, glowPrimary, x, y, r * 4.6 * shimmer, 0.3 * tuning.detail);
      const length = (finisher ? shot.recipe.finisherLength : shot.recipe.boltLength) * depth;
      drawAnchored(context, sprite, x, y, angle, length * (0.97 + 0.03 * shimmer), 1);
      return;
    }

    glow(context, glowPrimary, x, y, r * 6 * shimmer, 0.45 * tuning.detail);
    glow(context, glowPrimary, x, y, r * 2.8, 0.8);
    streak(context, glowPrimary, x - cos * r, y - sin * r, angle, r * 4.6, r * 2 * shimmer, 0.85);
    streak(context, core, x, y, angle, r * shot.recipe.stretch * 0.75, r * 0.85, 1);
    glow(context, core, x + cos * r * 0.8, y + sin * r * 0.8, r * 1.3, 1);
    streak(context, core, x + cos * r * 1.8, y + sin * r * 1.8, angle, r * 2.6, r * 0.3, 0.9);
  }

  /** Pierce: a white pop, cyan light, streaks punching through and a thin ring. */
  private drawImpact(context: CanvasRenderingContext2D, impact: Impact, tuning: QualityTuning): void {
    const k = impact.age / impact.life;
    const fade = 1 - k;
    const R = 9 * Math.min(1.6, impact.power) * (0.85 + 0.15 * tuning.detail);
    const { x, y, angle } = impact;
    const core = glowSprite(WHITE);

    const art = shotSpriteSet(impact.recipe.fx)?.impact;
    if (art !== undefined) {
      // Painted burst: a white pop, then the art blooms out and fades. Each
      // hit gets its own turn so rapid hits never look stamped.
      if (k < 0.3) glow(context, core, x, y, R * (1.2 + 3 * k), 1 - k / 0.3);
      const grow = 1 - (1 - k) * (1 - k);
      const size =
        impact.recipe.impactSize * (impact.power >= FINISHER_POWER ? 1.35 : 1) * (0.55 + 0.7 * grow);
      drawAnchored(context, art, x, y, impact.seed * 2.39, size, Math.pow(1 - k, 1.4));
      return;
    }

    if (k < 0.35) glow(context, core, x, y, R * (1.4 + 3.5 * k), 1 - k / 0.35);
    glow(context, glowSprite(impact.palette.primary), x, y, R * (2.2 + 4.5 * k), 0.6 * fade);
    for (const offset of [0, -0.35, 0.35]) {
      const a = angle + offset;
      const reach = R * (1.2 + 4 * k) * (offset === 0 ? 1.4 : 0.8);
      streak(context, core, x + Math.cos(a) * reach, y + Math.sin(a) * reach, a, R * 2, R * 0.2, fade);
    }
    context.globalAlpha = 0.55 * fade;
    context.strokeStyle = rgba(impact.palette.secondary, 1);
    context.lineWidth = 1.4 * fade + 0.4;
    context.beginPath();
    context.arc(x, y, R * (1.1 + 3.2 * k), 0, Math.PI * 2);
    context.stroke();
  }
}
