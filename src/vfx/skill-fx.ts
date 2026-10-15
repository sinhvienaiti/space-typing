import type { VisualQuality } from "../types";

/**
 * Skill VFX: the big, readable signatures of ship systems (EMP shockwaves,
 * arc lightning, orbital lances, railgun shots, missile swarms, tractor
 * beams, nanite swarms, singularities, hex shields, drones, ultimates).
 *
 * Game.ts triggers transient effects when a skill fires and asks for the
 * persistent ones (shields, fields, drones) every frame from its own timers.
 * Everything is additive light from cached gradient sprites and plain
 * strokes: no shadowBlur, bounded counts, and Low quality trims detail.
 */

export type FxPoint = { x: number; y: number };

/** Distance from (x, y) to the segment a–b, in px. */
export function distanceToSegment(x: number, y: number, a: FxPoint, b: FxPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length > 0 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / length)) : 0;
  return Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t));
}

/** The point closest to (x, y), or null for an empty list. */
export function nearestPoint(points: readonly FxPoint[], x: number, y: number): FxPoint | null {
  let best: FxPoint | null = null;
  let bestDistance = Infinity;
  for (const point of points) {
    const distance = Math.hypot(point.x - x, point.y - y);
    if (distance < bestDistance) {
      best = point;
      bestDistance = distance;
    }
  }
  return best === null ? null : { x: best.x, y: best.y };
}

type Rgb = readonly [number, number, number];

function hexRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1, 7), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexRgb(hex);
  const a = alpha <= 0 ? 0 : alpha >= 1 ? 1 : alpha;
  return "rgba(" + r + "," + g + "," + b + "," + a.toFixed(3) + ")";
}

const TAU = Math.PI * 2;
const easeOut = (x: number): number => 1 - (1 - x) * (1 - x);
const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

type FxDetailTier = 0 | 1 | 2 | 3;

function fxDetailTier(quality: VisualQuality): FxDetailTier {
  if (quality === "low") return 0;
  if (quality === "medium") return 1;
  if (quality === "high") return 2;
  return 3;
}

// ---------------------------------------------------------------------------
// Cached light sprites.
// ---------------------------------------------------------------------------

const glowCache = new Map<string, HTMLCanvasElement | null>();

function glowSprite(hex: string): HTMLCanvasElement | null {
  const cached = glowCache.get(hex);
  if (cached !== undefined) return cached;
  let canvas: HTMLCanvasElement | null = null;
  if (typeof document !== "undefined") {
    canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    if (context === null) {
      canvas = null;
    } else {
      const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, rgba(hex, 1));
      gradient.addColorStop(0.22, rgba(hex, 0.6));
      gradient.addColorStop(0.5, rgba(hex, 0.18));
      gradient.addColorStop(1, rgba(hex, 0));
      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 64);
    }
  }
  glowCache.set(hex, canvas);
  return canvas;
}

const beamCache = new Map<string, HTMLCanvasElement | null>();

/** A column of light with soft edges and a white-hot centre (stretched per use). */
function beamSprite(hex: string): HTMLCanvasElement | null {
  const cached = beamCache.get(hex);
  if (cached !== undefined) return cached;
  let canvas: HTMLCanvasElement | null = null;
  if (typeof document !== "undefined") {
    canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 2;
    const context = canvas.getContext("2d");
    if (context === null) {
      canvas = null;
    } else {
      const gradient = context.createLinearGradient(0, 0, 64, 0);
      gradient.addColorStop(0, rgba(hex, 0));
      gradient.addColorStop(0.28, rgba(hex, 0.22));
      gradient.addColorStop(0.43, rgba(hex, 0.75));
      gradient.addColorStop(0.5, "rgba(255,255,255,1)");
      gradient.addColorStop(0.57, rgba(hex, 0.75));
      gradient.addColorStop(0.72, rgba(hex, 0.22));
      gradient.addColorStop(1, rgba(hex, 0));
      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 2);
    }
  }
  beamCache.set(hex, canvas);
  return canvas;
}

let smokeCanvas: HTMLCanvasElement | null | undefined;

/** A soft grey-blue puff with no hard edge (missile trails). */
function smokeSprite(): HTMLCanvasElement | null {
  if (smokeCanvas !== undefined) return smokeCanvas;
  smokeCanvas = null;
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    if (context !== null) {
      const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, "rgba(186,196,214,0.55)");
      gradient.addColorStop(0.45, "rgba(150,160,182,0.28)");
      gradient.addColorStop(1, "rgba(120,130,150,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 64);
      smokeCanvas = canvas;
    }
  }
  return smokeCanvas;
}

function glow(context: CanvasRenderingContext2D, hex: string, x: number, y: number, radius: number, alpha: number): void {
  const sprite = glowSprite(hex);
  if (sprite === null || radius <= 0.3 || alpha <= 0.004) return;
  context.globalAlpha = alpha > 1 ? 1 : alpha;
  context.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
}

function ellipseGlow(context: CanvasRenderingContext2D, hex: string, x: number, y: number, rx: number, ry: number, angle: number, alpha: number): void {
  const sprite = glowSprite(hex);
  if (sprite === null || rx <= 0.3 || ry <= 0.3 || alpha <= 0.004) return;
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.globalAlpha = alpha > 1 ? 1 : alpha;
  context.drawImage(sprite, -rx, -ry, rx * 2, ry * 2);
  context.restore();
}

function ring(context: CanvasRenderingContext2D, hex: string, x: number, y: number, radius: number, width: number, alpha: number): void {
  if (radius <= 0.5 || width <= 0.1 || alpha <= 0.004) return;
  context.globalAlpha = alpha > 1 ? 1 : alpha;
  context.strokeStyle = hex;
  context.lineWidth = width;
  context.beginPath();
  context.arc(x, y, radius, 0, TAU);
  context.stroke();
}

/** A soft, wide ring: glow stroke, bright core stroke. */
function lightRing(context: CanvasRenderingContext2D, hex: string, core: string, x: number, y: number, radius: number, width: number, alpha: number): void {
  ring(context, hex, x, y, radius, width * 3.2, alpha * 0.22);
  ring(context, hex, x, y, radius, width * 1.6, alpha * 0.45);
  ring(context, core, x, y, radius, Math.max(0.6, width * 0.45), alpha * 0.9);
}

// ---------------------------------------------------------------------------
// Lightning.
// ---------------------------------------------------------------------------

/** Deterministic jitter so a bolt keeps its shape between flickers. */
function hash(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Jagged path from a to b (midpoint displacement), as a flat point list. */
function boltPath(a: FxPoint, b: FxPoint, seed: number, roughness: number, depth: number): number[] {
  let points = [a.x, a.y, b.x, b.y];
  let spread = Math.hypot(b.x - a.x, b.y - a.y) * roughness;
  for (let level = 0; level < depth; level += 1) {
    const next: number[] = [points[0]!, points[1]!];
    for (let index = 0; index < points.length - 2; index += 2) {
      const x1 = points[index]!;
      const y1 = points[index + 1]!;
      const x2 = points[index + 2]!;
      const y2 = points[index + 3]!;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.hypot(dx, dy) || 1;
      const offset = (hash(seed + level * 17 + index * 3.1) - 0.5) * spread;
      next.push(x1 + dx * 0.5 - (dy / length) * offset, y1 + dy * 0.5 + (dx / length) * offset, x2, y2);
    }
    points = next;
    spread *= 0.52;
  }
  return points;
}

function strokePath(context: CanvasRenderingContext2D, points: readonly number[], hex: string, width: number, alpha: number): void {
  if (points.length < 4 || alpha <= 0.004) return;
  context.globalAlpha = alpha > 1 ? 1 : alpha;
  context.strokeStyle = hex;
  context.lineWidth = width;
  context.beginPath();
  context.moveTo(points[0]!, points[1]!);
  for (let index = 2; index < points.length; index += 2) context.lineTo(points[index]!, points[index + 1]!);
  context.stroke();
}

function drawBolt(context: CanvasRenderingContext2D, a: FxPoint, b: FxPoint, hex: string, width: number, alpha: number, seed: number, branches: boolean): void {
  const path = boltPath(a, b, seed, 0.22, 5);
  context.lineJoin = "round";
  context.lineCap = "round";
  strokePath(context, path, hex, width * 5, alpha * 0.16);
  strokePath(context, path, hex, width * 2.2, alpha * 0.42);
  strokePath(context, path, "#ffffff", Math.max(0.8, width * 0.7), alpha);
  if (!branches) return;
  // Two short forks off the main bolt.
  for (let fork = 0; fork < 2; fork += 1) {
    const at = 4 + Math.floor(hash(seed + fork * 9.7) * (path.length / 2 - 8)) * 2;
    const x = path[at]!;
    const y = path[at + 1]!;
    const angle = Math.atan2(b.y - a.y, b.x - a.x) + (hash(seed + fork) - 0.5) * 2.2;
    const length = Math.hypot(b.x - a.x, b.y - a.y) * (0.12 + hash(seed + fork * 3) * 0.14);
    const end = { x: x + Math.cos(angle) * length, y: y + Math.sin(angle) * length };
    const forkPath = boltPath({ x, y }, end, seed + fork * 31, 0.3, 3);
    strokePath(context, forkPath, hex, width * 1.4, alpha * 0.4);
    strokePath(context, forkPath, "#ffffff", Math.max(0.6, width * 0.4), alpha * 0.7);
  }
}

// ---------------------------------------------------------------------------
// Transient effects.
// ---------------------------------------------------------------------------

type Shockwave = { kind: "shockwave"; x: number; y: number; color: string; radius: number; rings: number; targets: FxPoint[]; t: number; duration: number };
type Lightning = { kind: "lightning"; points: FxPoint[]; color: string; width: number; t: number; duration: number };
type Orbital = { kind: "orbital"; targets: FxPoint[]; color: string; delay: number; t: number; duration: number };
type Railgun = { kind: "railgun"; from: FxPoint; to: FxPoint; color: string; t: number; duration: number };
type Missile = {
  kind: "missile";
  from: FxPoint;
  control: FxPoint;
  to: FxPoint;
  color: string;
  t: number;
  flight: number;
  duration: number;
  smokeCursor: number;
};
type Tractor = { kind: "tractor"; from: () => FxPoint; to: () => FxPoint | null; color: string; t: number; duration: number };
type Nanite = { kind: "nanite"; center: () => FxPoint; color: string; t: number; duration: number; seed: number };
type Purge = { kind: "purge"; color: string; t: number; duration: number };
type Ring = { kind: "ring"; x: number; y: number; color: string; radius: number; width: number; t: number; duration: number };
type Starfall = { kind: "starfall"; targets: FxPoint[]; color: string; t: number; duration: number; seed: number };
type Shower = { kind: "shower"; color: string; t: number; duration: number; seed: number };
type Slash = { kind: "slash"; x: number; y: number; color: string; angle: number; t: number; duration: number };
type Halo = { kind: "halo"; center: () => FxPoint; color: string; radius: number; rays: number; t: number; duration: number };
type Zap = { kind: "zap"; from: FxPoint; to: FxPoint; color: string; t: number; duration: number };
type ShieldHit = { kind: "shield-hit"; x: number; y: number; color: string; t: number; duration: number };
type Shatter = { kind: "shatter"; center: FxPoint; radius: number; color: string; t: number; duration: number; seed: number };
type Blast = { kind: "blast"; x: number; y: number; color: string; size: number; t: number; duration: number; seed: number };

type Effect =
  | Shockwave
  | Lightning
  | Orbital
  | Railgun
  | Missile
  | Tractor
  | Nanite
  | Purge
  | Ring
  | Starfall
  | Shower
  | Slash
  | Halo
  | Zap
  | ShieldHit
  | Shatter
  | Blast;

type Smoke = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number };
type Flash = { color: string; alpha: number; t: number; duration: number };

const MAX_EFFECTS = 96;
const MAX_SMOKE = 260;

export type PersistentFxState = {
  /** Ship centre and the playfield size. */
  ship: FxPoint;
  width: number;
  height: number;
  time: number;
  quality: VisualQuality;
  /** 0–1 strengths, 0 = off. */
  hexShield: number;
  mirror: number;
  stasis: number;
  singularity: number;
  /** Singularity centre. */
  singularityAt: FxPoint;
  sentinels: number;
  /** Target lock: where the locked target is (null = none). */
  lock: FxPoint | null;
  overdrive: number;
  overdriveColor: string;
  cloak: number;
  /** Equipment perks: drones flying with the ship, ready defences. */
  escortDrones: number;
  interceptorDrones: number;
  /** 1 while Phase Shift is ready to swallow the next hit. */
  phaseReady: number;
  /** Ablative plates left this stage. */
  platingBlocks: number;
};

export class SkillFxSystem {
  private effects: Effect[] = [];
  private smoke: Smoke[] = [];
  private flashes: Flash[] = [];
  private seed = 1;

  /** Drone positions from the last frame (for interception zaps). */
  readonly sentinelPositions: FxPoint[] = [];
  /** Equipment drones from the last frame (their shots start here). */
  readonly escortPositions: FxPoint[] = [];
  readonly interceptorPositions: FxPoint[] = [];

  get activeEffects(): number {
    return this.effects.length;
  }

  clear(): void {
    this.effects = [];
    this.smoke = [];
    this.flashes = [];
  }

  private push(effect: Effect): void {
    if (this.effects.length >= MAX_EFFECTS) this.effects.shift();
    this.effects.push(effect);
  }

  private nextSeed(): number {
    this.seed = (this.seed * 48271) % 2147483647;
    return this.seed / 2147483647 * 1000;
  }

  // --- Triggers --------------------------------------------------------------

  /** Expanding electric rings with lightning into each target. */
  shockwave(x: number, y: number, color: string, radius: number, targets: FxPoint[] = [], rings = 3): void {
    this.push({ kind: "shockwave", x, y, color, radius, rings, targets: targets.slice(0, 12), t: 0, duration: 0.95 });
  }

  /** Arc lightning through the points in order (ship → targets). */
  lightning(points: FxPoint[], color: string, width = 2.2, duration = 0.55): void {
    if (points.length < 2) return;
    this.push({ kind: "lightning", points: points.map((point) => ({ ...point })), color, width, t: 0, duration });
  }

  /** Target circles, then lances from the sky, then blasts. */
  orbitalStrike(targets: FxPoint[], color = "#ffe2a0", delay = 0.38): void {
    if (targets.length === 0) return;
    this.push({ kind: "orbital", targets: targets.map((point) => ({ ...point })), color, delay, t: 0, duration: delay + 0.9 });
  }

  /** A hyper-velocity shot: a straight beam with shock rings along it. */
  railgun(from: FxPoint, to: FxPoint, color = "#8fe8ff"): void {
    this.push({ kind: "railgun", from: { ...from }, to: { ...to }, color, t: 0, duration: 0.7 });
  }

  /**
   * One homing micro-missile along a bent path, exploding on arrival. With a
   * launch side (-1 left pod, 1 right pod) it first breaks outward, so a
   * volley fans out before converging on its targets.
   */
  missile(from: FxPoint, to: FxPoint, color = "#ff9a4a", delay = 0, flight = 0.42, launchSide = 0): void {
    const dx = to.x - from.x;
    const spread = hash(this.nextSeed());
    const lift = hash(this.nextSeed());
    const control =
      launchSide !== 0
        ? { x: from.x + dx * 0.25 + launchSide * (150 + spread * 220), y: from.y - 70 - lift * 170 }
        : { x: from.x + dx * 0.3 + (spread - 0.5) * 360, y: Math.min(from.y, to.y) - 40 - lift * 120 };
    this.push({ kind: "missile", from: { ...from }, control, to: { ...to }, color, t: -delay, flight, duration: flight + 0.5, smokeCursor: 0 });
  }

  tractor(from: () => FxPoint, to: () => FxPoint | null, duration = 1.1, color = "#7dff9e"): void {
    this.push({ kind: "tractor", from, to, color, t: 0, duration });
  }

  nanite(center: () => FxPoint, color = "#6dffb0", duration = 1.3): void {
    this.push({ kind: "nanite", center, color, t: 0, duration, seed: this.nextSeed() });
  }

  purge(color = "#9fffe0"): void {
    this.push({ kind: "purge", color, t: 0, duration: 0.85 });
  }

  pulse(x: number, y: number, color: string, radius: number, width = 4, duration = 0.7): void {
    this.push({ kind: "ring", x, y, color, radius, width, t: 0, duration });
  }

  starfall(targets: FxPoint[], color = "#fff1b8"): void {
    this.push({ kind: "starfall", targets: targets.map((point) => ({ ...point })), color, t: 0, duration: 1.6, seed: this.nextSeed() });
  }

  shower(color = "#ffd65a", duration = 1.8): void {
    this.push({ kind: "shower", color, t: 0, duration, seed: this.nextSeed() });
  }

  slash(x: number, y: number, color = "#ff4d6d"): void {
    this.push({ kind: "slash", x, y, color, angle: -0.5 + hash(this.nextSeed()) * 0.4, t: 0, duration: 0.5 });
  }

  halo(center: () => FxPoint, color: string, radius = 120, rays = 12, duration = 1.2): void {
    this.push({ kind: "halo", center, color, radius, rays, t: 0, duration });
  }

  zap(from: FxPoint, to: FxPoint, color = "#ffd76a"): void {
    this.push({ kind: "zap", from: { ...from }, to: { ...to }, color, t: 0, duration: 0.25 });
  }

  shieldHit(x: number, y: number, color = "#5ce1ff"): void {
    this.push({ kind: "shield-hit", x, y, color, t: 0, duration: 0.45 });
  }

  shatter(center: FxPoint, radius: number, color = "#5ce1ff"): void {
    this.push({ kind: "shatter", center: { ...center }, radius, color, t: 0, duration: 0.8, seed: this.nextSeed() });
  }

  blast(x: number, y: number, color: string, size = 60): void {
    this.push({ kind: "blast", x, y, color, size, t: 0, duration: 0.55, seed: this.nextSeed() });
  }

  /** A full-screen light flash (additive). */
  flash(color: string, alpha = 0.35, duration = 0.35): void {
    this.flashes.push({ color, alpha, t: 0, duration });
    if (this.flashes.length > 6) this.flashes.shift();
  }

  // --- Simulation ------------------------------------------------------------

  update(dt: number): void {
    const step = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.1) : 0;
    let live = 0;
    for (const effect of this.effects) {
      effect.t += step;
      if (effect.kind === "missile") this.missileSmoke(effect);
      if (effect.t < effect.duration) this.effects[live++] = effect;
    }
    this.effects.length = live;

    let smokeLive = 0;
    for (const puff of this.smoke) {
      puff.life -= step;
      puff.x += puff.vx * step;
      puff.y += puff.vy * step;
      puff.vx *= 0.96;
      puff.vy *= 0.96;
      if (puff.life > 0) this.smoke[smokeLive++] = puff;
    }
    this.smoke.length = smokeLive;

    let flashLive = 0;
    for (const flash of this.flashes) {
      flash.t += step;
      if (flash.t < flash.duration) this.flashes[flashLive++] = flash;
    }
    this.flashes.length = flashLive;
  }

  private missileSmoke(missile: Missile): void {
    if (missile.t <= 0 || missile.t > missile.flight) return;
    const p = missile.t / missile.flight;
    while (missile.smokeCursor < p && this.smoke.length < MAX_SMOKE) {
      const q = missile.smokeCursor;
      const point = quadratic(missile.from, missile.control, missile.to, q);
      this.smoke.push({
        x: point.x,
        y: point.y,
        vx: (hash(q * 91 + missile.from.x) - 0.5) * 34,
        vy: 10 + hash(q * 37) * 22,
        life: 0.75,
        max: 0.75,
        size: 5 + hash(q * 13) * 4,
      });
      missile.smokeCursor += 0.035;
    }
  }

  // --- Drawing ---------------------------------------------------------------

  /** Transient effects (over enemies). */
  draw(context: CanvasRenderingContext2D, quality: VisualQuality, height: number): void {
    const detail = fxDetailTier(quality);
    context.save();
    // Missile smoke: soft source-over puffs so it reads as smoke, not light.
    const puffSprite = smokeSprite();
    if (puffSprite !== null) {
      for (const puff of this.smoke) {
        const k = 1 - puff.life / puff.max;
        const size = puff.size * (1.2 + k * 2.2);
        context.globalAlpha = (1 - k) * 0.5;
        context.drawImage(puffSprite, puff.x - size, puff.y - size, size * 2, size * 2);
      }
    }
    context.globalCompositeOperation = "lighter";
    // The freshest puffs still glow from the rocket flame.
    for (const puff of this.smoke) {
      const k = 1 - puff.life / puff.max;
      if (k < 0.3) glow(context, "#ff9a4a", puff.x, puff.y, puff.size * 1.6, (0.3 - k) * 1.2);
    }
    for (const effect of this.effects) {
      switch (effect.kind) {
        case "shockwave":
          this.drawShockwave(context, effect, detail);
          break;
        case "lightning":
          this.drawLightning(context, effect);
          break;
        case "orbital":
          this.drawOrbital(context, effect, height, detail);
          break;
        case "railgun":
          this.drawRailgun(context, effect, detail);
          break;
        case "missile":
          this.drawMissile(context, effect);
          break;
        case "tractor":
          this.drawTractor(context, effect);
          break;
        case "nanite":
          this.drawNanite(context, effect, detail);
          break;
        case "ring":
          this.drawPulse(context, effect);
          break;
        case "starfall":
          this.drawStarfall(context, effect, height, detail);
          break;
        case "slash":
          this.drawSlash(context, effect);
          break;
        case "halo":
          this.drawHalo(context, effect);
          break;
        case "zap":
          this.drawZap(context, effect);
          break;
        case "shield-hit":
          this.drawShieldHit(context, effect);
          break;
        case "shatter":
          this.drawShatter(context, effect, detail);
          break;
        case "blast":
          this.drawBlast(context, effect, detail);
          break;
        case "purge":
        case "shower":
          break; // screen-space: drawScreen()
      }
    }
    context.restore();
  }

  /** Screen-space layers drawn last: flashes, the purge scan, showers. */
  drawScreen(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    quality: VisualQuality,
  ): void {
    const detail = fxDetailTier(quality);
    context.save();
    context.globalCompositeOperation = "lighter";
    for (const effect of this.effects) {
      if (effect.kind === "purge") {
        this.drawPurge(context, effect, width, height, detail);
      }
      if (effect.kind === "shower") {
        this.drawShower(context, effect, width, height, detail);
      }
    }
    for (const flash of this.flashes) {
      const k = flash.t / flash.duration;
      context.globalAlpha = flash.alpha * (1 - k) * (1 - k);
      context.fillStyle = flash.color;
      context.fillRect(0, 0, width, height);
    }
    context.restore();
  }

  private drawShockwave(
    context: CanvasRenderingContext2D,
    effect: Shockwave,
    detail: FxDetailTier,
  ): void {
    const k = effect.t / effect.duration;
    for (let index = 0; index < effect.rings; index += 1) {
      const local = clamp01((effect.t - index * 0.09) / (effect.duration * 0.75));
      if (local <= 0 || local >= 1) continue;
      const radius = 20 + easeOut(local) * effect.radius;
      lightRing(context, effect.color, "#ffffff", effect.x, effect.y, radius, (1 - local) * 7 + 1, (1 - local) * 0.95);
    }
    glow(context, effect.color, effect.x, effect.y, 90 * (1 - k * 0.5), (1 - k) * 0.7);
    glow(context, "#ffffff", effect.x, effect.y, 30 * (1 - k), (1 - k) * 0.9);
    // Lightning into every target while the wave passes them.
    const flicker = Math.floor(effect.t * 24);
    effect.targets.forEach((target, index) => {
      const reach = Math.hypot(target.x - effect.x, target.y - effect.y) / Math.max(1, effect.radius);
      const local = k * 1.3 - reach * 0.5;
      if (local <= 0 || local >= 1) return;
      const boltWidth = 1.35 + detail * 0.24;
      drawBolt(
        context,
        { x: effect.x, y: effect.y },
        target,
        effect.color,
        boltWidth,
        (1 - local) * 0.9,
        flicker * 13 + index * 7,
        detail >= 1,
      );
      if (detail >= 3) {
        drawBolt(
          context,
          { x: effect.x, y: effect.y },
          target,
          "#dffcff",
          boltWidth * 0.48,
          (1 - local) * 0.24,
          flicker * 19 + index * 11 + 97,
          false,
        );
      }
      glow(context, effect.color, target.x, target.y, 34 + detail * 3, (1 - local) * 0.8);
      glow(context, "#ffffff", target.x, target.y, 12, (1 - local));
    });
  }

  private drawLightning(context: CanvasRenderingContext2D, effect: Lightning): void {
    const k = effect.t / effect.duration;
    const flicker = Math.floor(effect.t * 26);
    // Each segment lights up in turn, like an arc jumping target to target.
    for (let index = 0; index < effect.points.length - 1; index += 1) {
      const start = index * 0.06;
      const local = clamp01((effect.t - start) / Math.max(0.05, effect.duration - start));
      if (effect.t < start || local >= 1) continue;
      const alpha = (1 - local) * (0.75 + 0.25 * hash(flicker + index));
      const a = effect.points[index]!;
      const b = effect.points[index + 1]!;
      drawBolt(context, a, b, effect.color, effect.width, alpha, flicker * 19 + index * 5, true);
      glow(context, effect.color, b.x, b.y, 42, alpha * 0.8);
      glow(context, "#ffffff", b.x, b.y, 14, alpha);
    }
    glow(context, effect.color, effect.points[0]!.x, effect.points[0]!.y, 40, (1 - k) * 0.7);
  }

  private drawOrbital(
    context: CanvasRenderingContext2D,
    effect: Orbital,
    height: number,
    detail: FxDetailTier,
  ): void {
    const aim = clamp01(effect.t / effect.delay);
    for (const target of effect.targets) {
      if (effect.t < effect.delay) {
        // Targeting: a shrinking ring and a thin guide line from the sky.
        const radius = 70 - aim * 44;
        lightRing(context, effect.color, "#ffffff", target.x, target.y, radius, 1.4, 0.35 + aim * 0.5);
        context.globalAlpha = 0.18 + aim * 0.3;
        context.strokeStyle = effect.color;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(target.x, 0);
        context.lineTo(target.x, target.y);
        context.stroke();
        continue;
      }
      const local = clamp01((effect.t - effect.delay) / (effect.duration - effect.delay));
      const beam = 1 - clamp01(local / 0.45);
      if (beam > 0) {
        // The lance: a wide soft column and a narrow white-hot core.
        const width = 30 + beam * 26;
        const column = beamSprite(effect.color);
        if (column !== null) {
          context.globalAlpha = beam * 0.7;
          context.drawImage(column, target.x - width, 0, width * 2, target.y);
          context.globalAlpha = beam;
          context.drawImage(column, target.x - width * 0.28, 0, width * 0.56, target.y);
        }
        ellipseGlow(context, effect.color, target.x, target.y, 90 * beam + 30, 40 * beam + 14, 0, beam);
      }
      const blast = clamp01(local / 0.8);
      lightRing(context, effect.color, "#ffffff", target.x, target.y, 16 + easeOut(blast) * 120, (1 - blast) * 8 + 0.5, (1 - blast) * 0.9);
      glow(context, "#ffffff", target.x, target.y, 60 * (1 - blast) + 10, (1 - blast));
      const debrisCount = [0, 6, 11, 16][detail] ?? 0;
      if (debrisCount > 0) {
        for (let piece = 0; piece < debrisCount; piece += 1) {
          const angle = (piece / debrisCount) * TAU + target.x * 0.01;
          const distance = easeOut(blast) * (60 + hash(piece + target.y) * 70);
          glow(context, effect.color, target.x + Math.cos(angle) * distance, target.y + Math.sin(angle) * distance * 0.7, 7, (1 - blast) * 0.9);
        }
      }
      void height;
    }
  }

  private drawRailgun(
    context: CanvasRenderingContext2D,
    effect: Railgun,
    detail: FxDetailTier,
  ): void {
    const k = effect.t / effect.duration;
    const alpha = 1 - k;
    const dx = effect.to.x - effect.from.x;
    const dy = effect.to.y - effect.from.y;
    const length = Math.hypot(dx, dy) || 1;
    const angle = Math.atan2(dy, dx);
    context.save();
    context.translate(effect.from.x, effect.from.y);
    context.rotate(angle);
    const width = 30 * (1 - k * 0.6);
    context.globalAlpha = alpha * 0.32;
    context.fillStyle = effect.color;
    context.fillRect(0, -width, length, width * 2);
    context.globalAlpha = alpha * 0.7;
    context.fillRect(0, -width * 0.38, length, width * 0.76);
    context.globalAlpha = alpha;
    context.fillStyle = "#ffffff";
    context.fillRect(0, -width * 0.12, length, width * 0.24);
    context.restore();
    // Shock rings travelling along the beam.
    const rings = [4, 6, 8, 11][detail] ?? 4;
    for (let index = 0; index < rings; index += 1) {
      const at = (index + 0.5) / rings;
      const x = effect.from.x + dx * at;
      const y = effect.from.y + dy * at;
      const local = clamp01(k * 1.6 - at * 0.3);
      ellipseGlow(context, effect.color, x, y, 18 + local * 50, 6 + local * 16, angle + Math.PI / 2, (1 - local) * 0.8);
    }
    glow(context, "#ffffff", effect.from.x, effect.from.y, 50 * alpha, alpha);
    glow(context, effect.color, effect.to.x, effect.to.y, 70 * alpha, alpha * 0.8);
  }

  private drawMissile(context: CanvasRenderingContext2D, effect: Missile): void {
    if (effect.t < 0) return;
    if (effect.t <= effect.flight) {
      const p = effect.t / effect.flight;
      const eased = p * p * (3 - 2 * p);
      const point = quadratic(effect.from, effect.control, effect.to, eased);
      const ahead = quadratic(effect.from, effect.control, effect.to, Math.min(1, eased + 0.04));
      const angle = Math.atan2(ahead.y - point.y, ahead.x - point.x);
      // Flame streak: the last stretch of the path, hot core over a wide glow.
      const trail: number[] = [];
      const tail = Math.max(0, eased - 0.16);
      for (let step = 0; step <= 6; step += 1) {
        const sample = quadratic(effect.from, effect.control, effect.to, tail + ((eased - tail) * step) / 6);
        trail.push(sample.x, sample.y);
      }
      context.lineCap = "round";
      context.lineJoin = "round";
      strokePath(context, trail, effect.color, 7, 0.28);
      strokePath(context, trail, "#ffcf7a", 3, 0.7);
      strokePath(context, trail.slice(-6), "#ffffff", 1.6, 0.9);
      ellipseGlow(context, effect.color, point.x, point.y, 26, 9, angle, 0.95);
      ellipseGlow(context, "#ffe0a0", point.x - Math.cos(angle) * 12, point.y - Math.sin(angle) * 12, 18, 6, angle, 0.8);
      glow(context, "#ffffff", point.x, point.y, 8, 1);
      return;
    }
    // Fireball on arrival: white core, orange body, expanding shock ring.
    const local = clamp01((effect.t - effect.flight) / (effect.duration - effect.flight));
    const fade = 1 - local;
    lightRing(context, effect.color, "#fff4d6", effect.to.x, effect.to.y, 10 + easeOut(local) * 60, fade * 6 + 0.5, fade);
    glow(context, "#ff6a2a", effect.to.x, effect.to.y, 64 * fade + 12, fade * 0.8);
    glow(context, effect.color, effect.to.x, effect.to.y, 42 * fade + 8, fade);
    glow(context, "#ffffff", effect.to.x, effect.to.y, 22 * fade, fade);
  }

  private drawTractor(context: CanvasRenderingContext2D, effect: Tractor): void {
    const target = effect.to();
    if (target === null) return;
    const from = effect.from();
    const k = effect.t / effect.duration;
    const alpha = Math.min(1, effect.t / 0.12) * (1 - Math.max(0, (k - 0.75) / 0.25));
    const dx = target.x - from.x;
    const dy = target.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    const angle = Math.atan2(dy, dx);
    context.save();
    context.translate(from.x, from.y);
    context.rotate(angle);
    // A widening cone of light: faint body, glowing edges and core, and
    // rings that crawl down the beam toward the ship.
    const gradient = context.createLinearGradient(0, 0, length, 0);
    gradient.addColorStop(0, rgba(effect.color, 0.26 * alpha));
    gradient.addColorStop(0.6, rgba(effect.color, 0.1 * alpha));
    gradient.addColorStop(1, rgba(effect.color, 0.16 * alpha));
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(0, -6);
    context.lineTo(length, -34);
    context.lineTo(length, 34);
    context.lineTo(0, 6);
    context.closePath();
    context.fill();
    context.lineCap = "round";
    for (const edge of [-1, 1]) {
      const path = [0, edge * 6, length, edge * 34];
      strokePath(context, path, effect.color, 7, alpha * 0.16);
      strokePath(context, path, effect.color, 2, alpha * 0.7);
    }
    const flicker = 0.75 + 0.25 * Math.sin(effect.t * 38);
    strokePath(context, [0, 0, length, 0], effect.color, 5, alpha * 0.25 * flicker);
    strokePath(context, [0, 0, length, 0], "#eafff0", 1.4, alpha * 0.8 * flicker);
    for (let band = 0; band < 6; band += 1) {
      const at = ((band / 6 + 1 - ((effect.t * 1.6) % 1)) % 1) * length;
      const spread = 6 + (at / length) * 28;
      context.globalAlpha = alpha * 0.75;
      context.strokeStyle = effect.color;
      context.lineWidth = 2;
      context.beginPath();
      context.ellipse(at, 0, 2 + spread * 0.18, spread, 0, 0, TAU);
      context.stroke();
    }
    context.restore();
    // The grip around the hauled enemy.
    lightRing(context, effect.color, "#eafff0", target.x, target.y, 34 + Math.sin(effect.t * 9) * 4, 1.6, alpha * 0.8);
    glow(context, effect.color, target.x, target.y, 60, alpha * 0.5);
    glow(context, effect.color, from.x, from.y - 30, 30, alpha * 0.8);
  }

  private drawNanite(
    context: CanvasRenderingContext2D,
    effect: Nanite,
    detail: FxDetailTier,
  ): void {
    const center = effect.center();
    const k = effect.t / effect.duration;
    const count = [18, 30, 44, 62][detail] ?? 18;
    for (let index = 0; index < count; index += 1) {
      const phase = hash(effect.seed + index);
      const local = clamp01((k - phase * 0.35) / 0.65);
      if (local <= 0 || local >= 1) continue;
      const angle = phase * TAU + local * 5.5;
      const radius = (1 - easeOut(local)) * (90 + phase * 70);
      const x = center.x + Math.cos(angle) * radius;
      const y = center.y + Math.sin(angle) * radius * 0.7;
      glow(context, effect.color, x, y, 5 + phase * 3, 0.9 * (1 - local * 0.4));
    }
    glow(context, effect.color, center.x, center.y, 70, Math.sin(k * Math.PI) * 0.6);
    lightRing(context, effect.color, "#eafff3", center.x, center.y, 30 + Math.sin(k * Math.PI) * 18, 2, Math.sin(k * Math.PI) * 0.6);
  }

  private drawPurge(
    context: CanvasRenderingContext2D,
    effect: Purge,
    width: number,
    height: number,
    detail: FxDetailTier,
  ): void {
    const k = effect.t / effect.duration;
    const y = easeOut(k) * height;
    const alpha = 1 - k * 0.6;
    const gradient = context.createLinearGradient(0, y - 90, 0, y + 8);
    gradient.addColorStop(0, rgba(effect.color, 0));
    gradient.addColorStop(0.85, rgba(effect.color, 0.28 * alpha));
    gradient.addColorStop(1, rgba("#ffffff", 0.9 * alpha));
    context.globalAlpha = 1;
    context.fillStyle = gradient;
    context.fillRect(0, y - 90, width, 98);
    // Glitch slivers along the scan line scale with visual quality only.
    const sliverCount = [7, 10, 14, 20][detail] ?? 7;
    for (let index = 0; index < sliverCount; index += 1) {
      const sliver = hash(index * 7.3 + Math.floor(effect.t * 30));
      context.globalAlpha = 0.5 * alpha;
      context.fillStyle = index % 2 === 0 ? effect.color : "#ffffff";
      context.fillRect(sliver * width, y - 20 - hash(index) * 60, 30 + hash(index * 3) * 90, 2);
    }
  }

  private drawPulse(context: CanvasRenderingContext2D, effect: Ring): void {
    const k = effect.t / effect.duration;
    lightRing(context, effect.color, "#ffffff", effect.x, effect.y, 10 + easeOut(k) * effect.radius, effect.width * (1 - k) + 0.4, 1 - k);
    glow(context, effect.color, effect.x, effect.y, effect.radius * 0.5 * (1 - k), (1 - k) * 0.6);
  }

  private drawStarfall(
    context: CanvasRenderingContext2D,
    effect: Starfall,
    height: number,
    detail: FxDetailTier,
  ): void {
    const targets = effect.targets.length > 0 ? effect.targets : [];
    const minimumStars = [6, 8, 11, 14][detail] ?? 6;
    const stars = Math.max(targets.length, minimumStars);
    for (let index = 0; index < stars; index += 1) {
      const target = targets[index % Math.max(1, targets.length)] ?? { x: hash(effect.seed + index) * 1000, y: height * 0.5 };
      const start = hash(effect.seed + index * 3.3) * 0.7;
      const local = clamp01((effect.t - start) / 0.45);
      if (effect.t < start) continue;
      const x0 = target.x + 160 + hash(index) * 80;
      const y0 = -40;
      if (local < 1) {
        const x = x0 + (target.x - x0) * local;
        const y = y0 + (target.y - y0) * local;
        const angle = Math.atan2(target.y - y0, target.x - x0);
        ellipseGlow(context, effect.color, x - Math.cos(angle) * 40, y - Math.sin(angle) * 40, 60, 5, angle, 0.5);
        glow(context, "#ffffff", x, y, 9, 1);
        glow(context, effect.color, x, y, 26, 0.8);
      } else {
        const after = clamp01((effect.t - start - 0.45) / 0.4);
        lightRing(context, effect.color, "#ffffff", target.x, target.y, 10 + after * 60, (1 - after) * 4 + 0.5, 1 - after);
        glow(context, "#ffffff", target.x, target.y, 30 * (1 - after), 1 - after);
      }
    }
  }

  private drawShower(
    context: CanvasRenderingContext2D,
    effect: Shower,
    width: number,
    height: number,
    detail: FxDetailTier,
  ): void {
    const k = effect.t / effect.duration;
    const particleCount = [18, 32, 48, 68][detail] ?? 18;
    for (let index = 0; index < particleCount; index += 1) {
      const start = hash(effect.seed + index) * 0.6;
      const local = clamp01((k - start) / 0.5);
      if (local <= 0 || local >= 1) continue;
      const x = hash(effect.seed + index * 1.7) * width;
      const y = -20 + local * height * (0.5 + hash(index * 2.1) * 0.5);
      const twinkle = 0.6 + 0.4 * Math.sin(effect.t * 18 + index);
      glow(context, effect.color, x, y, 10 + hash(index) * 8, (1 - local) * twinkle);
      glow(context, "#ffffff", x, y, 3.5, (1 - local));
    }
  }

  private drawSlash(context: CanvasRenderingContext2D, effect: Slash): void {
    const k = effect.t / effect.duration;
    const sweep = easeOut(clamp01(k / 0.35));
    const alpha = 1 - clamp01((k - 0.35) / 0.65);
    context.save();
    context.translate(effect.x, effect.y);
    context.rotate(effect.angle);
    for (const [width, color, a] of [[18, effect.color, 0.3], [7, effect.color, 0.7], [2.5, "#ffffff", 1]] as const) {
      context.globalAlpha = alpha * a;
      context.strokeStyle = color;
      context.lineWidth = width;
      context.lineCap = "round";
      context.beginPath();
      context.arc(0, 26, 70, -Math.PI * 0.85, -Math.PI * 0.85 + sweep * Math.PI * 0.7);
      context.stroke();
    }
    context.restore();
    glow(context, effect.color, effect.x, effect.y, 60 * alpha, alpha * 0.7);
  }

  private drawHalo(context: CanvasRenderingContext2D, effect: Halo): void {
    const center = effect.center();
    const k = effect.t / effect.duration;
    const alpha = Math.sin(Math.min(1, k * 1.4) * Math.PI);
    for (let ray = 0; ray < effect.rays; ray += 1) {
      const angle = (ray / effect.rays) * TAU + effect.t * 0.6;
      const reach = effect.radius * (0.8 + 0.4 * easeOut(k));
      ellipseGlow(
        context,
        effect.color,
        center.x + Math.cos(angle) * reach * 0.5,
        center.y + Math.sin(angle) * reach * 0.5,
        reach * 0.5,
        5,
        angle,
        alpha * 0.45,
      );
    }
    lightRing(context, effect.color, "#ffffff", center.x, center.y, effect.radius * (0.5 + 0.5 * easeOut(k)), 3, alpha * 0.8);
    lightRing(context, effect.color, "#ffffff", center.x, center.y, effect.radius * (0.3 + 0.9 * easeOut(k)), 1.6, alpha * 0.5);
    glow(context, effect.color, center.x, center.y, effect.radius * 0.9, alpha * 0.55);
  }

  private drawZap(context: CanvasRenderingContext2D, effect: Zap): void {
    const k = effect.t / effect.duration;
    drawBolt(context, effect.from, effect.to, effect.color, 1.4, 1 - k, Math.floor(effect.t * 40) + effect.from.x, false);
    glow(context, "#ffffff", effect.to.x, effect.to.y, 18 * (1 - k), 1 - k);
  }

  private drawShieldHit(context: CanvasRenderingContext2D, effect: ShieldHit): void {
    const k = effect.t / effect.duration;
    lightRing(context, effect.color, "#ffffff", effect.x, effect.y, 6 + easeOut(k) * 40, (1 - k) * 3 + 0.4, 1 - k);
    glow(context, effect.color, effect.x, effect.y, 36 * (1 - k) + 6, (1 - k) * 0.9);
  }

  private drawShatter(
    context: CanvasRenderingContext2D,
    effect: Shatter,
    detail: FxDetailTier,
  ): void {
    const k = effect.t / effect.duration;
    const pieceCount = [10, 14, 18, 24][detail] ?? 10;
    for (let piece = 0; piece < pieceCount; piece += 1) {
      const angle =
        (piece / pieceCount) * TAU + hash(effect.seed + piece) * 0.3;
      const distance = effect.radius + easeOut(k) * (50 + hash(piece) * 60);
      const x = effect.center.x + Math.cos(angle) * distance;
      const y = effect.center.y + Math.sin(angle) * distance;
      context.save();
      context.translate(x, y);
      context.rotate(angle + k * 4);
      context.globalAlpha = (1 - k) * 0.9;
      context.strokeStyle = effect.color;
      context.lineWidth = 1.6;
      hexagon(context, 0, 0, 7);
      context.stroke();
      context.restore();
    }
    glow(context, effect.color, effect.center.x, effect.center.y, effect.radius * 1.4, (1 - k) * 0.6);
  }

  private drawBlast(
    context: CanvasRenderingContext2D,
    effect: Blast,
    detail: FxDetailTier,
  ): void {
    const k = effect.t / effect.duration;
    lightRing(context, effect.color, "#ffffff", effect.x, effect.y, 8 + easeOut(k) * effect.size, (1 - k) * 6 + 0.5, 1 - k);
    glow(context, effect.color, effect.x, effect.y, effect.size * (1 - k * 0.5), (1 - k) * 0.9);
    glow(context, "#ffffff", effect.x, effect.y, effect.size * 0.35 * (1 - k), 1 - k);
    const sparkCount = [0, 6, 10, 14][detail] ?? 0;
    if (sparkCount <= 0) return;
    for (let spark = 0; spark < sparkCount; spark += 1) {
      const angle =
        (spark / sparkCount) * TAU + hash(effect.seed + spark);
      const distance = easeOut(k) * effect.size * (0.9 + hash(spark * 3) * 0.6);
      glow(context, effect.color, effect.x + Math.cos(angle) * distance, effect.y + Math.sin(angle) * distance, 6, (1 - k));
    }
  }

  // --- Persistent effects (from Game timers) ----------------------------------

  /** Shields, fields and drones around the ship; call before the ship. */
  drawPersistentUnder(context: CanvasRenderingContext2D, state: PersistentFxState): void {
    context.save();
    if (state.singularity > 0) drawSingularity(context, state.singularityAt, state.time, state.singularity, state.quality !== "low");
    if (state.overdrive > 0) drawOverdriveAura(context, state.ship, state.overdriveColor, state.time, state.overdrive);
    context.restore();
  }

  /** Over the ship: dome, mirror shards, drones, lock reticle, stasis tint. */
  drawPersistentOver(context: CanvasRenderingContext2D, state: PersistentFxState): void {
    context.save();
    context.globalCompositeOperation = "lighter";
    if (state.hexShield > 0) drawHexDome(context, state.ship, state.time, state.hexShield, state.quality !== "low");
    if (state.mirror > 0) drawMirror(context, state.ship, state.time, state.mirror);
    this.sentinelPositions.length = 0;
    if (state.sentinels > 0) drawSentinels(context, state.ship, state.time, state.sentinels, this.sentinelPositions);
    if (state.lock !== null) drawLock(context, state.ship, state.lock, state.time);
    if (state.cloak > 0) drawCloak(context, state.ship, state.time, state.cloak);
    this.escortPositions.length = 0;
    if (state.escortDrones > 0) drawEscorts(context, state.ship, state.time, state.escortDrones, this.escortPositions);
    this.interceptorPositions.length = 0;
    if (state.interceptorDrones > 0) drawInterceptors(context, state.ship, state.time, state.interceptorDrones, this.interceptorPositions);
    if (state.platingBlocks > 0) drawPlating(context, state.ship, state.time);
    if (state.phaseReady > 0) drawPhaseReady(context, state.ship, state.time);
    context.restore();
    if (state.stasis > 0) drawStasis(context, state.ship, state.width, state.height, state.time, state.stasis);
  }
}

function quadratic(a: FxPoint, c: FxPoint, b: FxPoint, t: number): FxPoint {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

function hexagon(context: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  context.beginPath();
  for (let corner = 0; corner < 6; corner += 1) {
    const angle = (corner / 6) * TAU + Math.PI / 6;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (corner === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.closePath();
}

/** A dome of hexagon cells around the ship with a rolling shimmer. */
function drawHexDome(context: CanvasRenderingContext2D, ship: FxPoint, time: number, strength: number, fine: boolean): void {
  const radius = 64;
  const cell = 11;
  context.save();
  context.beginPath();
  context.arc(ship.x, ship.y, radius, 0, TAU);
  context.clip();
  context.lineWidth = 1;
  const shimmerAngle = time * 1.6;
  for (let row = -6; row <= 6; row += 1) {
    for (let column = -6; column <= 6; column += 1) {
      const x = ship.x + column * cell * 1.73 + (row % 2 === 0 ? 0 : cell * 0.866);
      const y = ship.y + row * cell * 1.5;
      const distance = Math.hypot(x - ship.x, y - ship.y);
      if (distance > radius + cell) continue;
      const edge = distance / radius;
      const angle = Math.atan2(y - ship.y, x - ship.x);
      const shimmer = Math.max(0, Math.cos(angle - shimmerAngle)) ** 6;
      const alpha = strength * (0.1 + edge * edge * 0.45 + shimmer * 0.5);
      context.globalAlpha = alpha;
      context.strokeStyle = "#5ce1ff";
      hexagon(context, x, y, cell * 0.92);
      context.stroke();
      if (fine && shimmer > 0.6) {
        context.globalAlpha = alpha * 0.25;
        context.fillStyle = "#bff4ff";
        context.fill();
      }
    }
  }
  context.restore();
  lightRing(context, "#5ce1ff", "#e6fbff", ship.x, ship.y, radius, 2.2, strength * (0.75 + 0.25 * Math.sin(time * 5)));
  glow(context, "#5ce1ff", ship.x, ship.y, radius * 1.25, strength * 0.22);
}

function drawMirror(context: CanvasRenderingContext2D, ship: FxPoint, time: number, strength: number): void {
  const shards = 6;
  for (let index = 0; index < shards; index += 1) {
    const angle = time * 1.3 + (index / shards) * TAU;
    const x = ship.x + Math.cos(angle) * 74;
    const y = ship.y + Math.sin(angle) * 40;
    context.save();
    context.translate(x, y);
    context.rotate(angle + Math.PI / 2);
    context.globalAlpha = strength * 0.85;
    context.strokeStyle = "#e7b8ff";
    context.lineWidth = 1.6;
    context.beginPath();
    context.moveTo(0, -12);
    context.lineTo(6, 0);
    context.lineTo(0, 12);
    context.lineTo(-6, 0);
    context.closePath();
    context.stroke();
    context.globalAlpha = strength * 0.25;
    context.fillStyle = "#d98bff";
    context.fill();
    context.restore();
    glow(context, "#d98bff", x, y, 16, strength * 0.5);
  }
  ring(context, "#d98bff", ship.x, ship.y, 60, 1, strength * 0.35);
}

function drawSentinels(context: CanvasRenderingContext2D, ship: FxPoint, time: number, count: number, out: FxPoint[]): void {
  for (let index = 0; index < count; index += 1) {
    const angle = time * 1.8 + (index / count) * TAU;
    const x = ship.x + Math.cos(angle) * 60;
    const y = ship.y + Math.sin(angle) * 26 - 6;
    out.push({ x, y });
    const heading = angle + Math.PI / 2;
    // Engine glow, then a small arrowhead hull with a lit core.
    ellipseGlow(context, "#ffb04a", x - Math.cos(heading) * 7, y - Math.sin(heading) * 7, 9, 3.2, heading, 0.8);
    context.save();
    context.translate(x, y);
    context.rotate(heading);
    context.globalAlpha = 0.95;
    context.fillStyle = "#fff0c2";
    context.beginPath();
    context.moveTo(9, 0);
    context.lineTo(-6, -5.5);
    context.lineTo(-3, 0);
    context.lineTo(-6, 5.5);
    context.closePath();
    context.fill();
    context.restore();
    glow(context, "#ffd76a", x, y, 14, 0.6);
  }
}

/** A small drone hull: swept arrowhead, lit core, engine glow behind. */
function drawDroneHull(context: CanvasRenderingContext2D, x: number, y: number, heading: number, hull: string, glowColor: string, size: number): void {
  ellipseGlow(context, glowColor, x - Math.cos(heading) * size * 0.8, y - Math.sin(heading) * size * 0.8, size, size * 0.36, heading, 0.85);
  context.save();
  context.translate(x, y);
  context.rotate(heading);
  context.globalAlpha = 0.95;
  context.fillStyle = hull;
  context.beginPath();
  context.moveTo(size, 0);
  context.lineTo(-size * 0.66, -size * 0.62);
  context.lineTo(-size * 0.3, 0);
  context.lineTo(-size * 0.66, size * 0.62);
  context.closePath();
  context.fill();
  context.restore();
  glow(context, glowColor, x, y, size * 1.5, 0.55);
  glow(context, "#ffffff", x, y, size * 0.35, 0.9);
}

/** Escort drones hold station off the wings, bobbing, noses up. */
function drawEscorts(context: CanvasRenderingContext2D, ship: FxPoint, time: number, count: number, out: FxPoint[]): void {
  for (let index = 0; index < count; index += 1) {
    const side = count === 1 ? 1 : index % 2 === 0 ? -1 : 1;
    const row = Math.floor(index / 2);
    const x = ship.x + side * (54 + row * 22) + Math.sin(time * 1.3 + index) * 3;
    const y = ship.y + 8 + row * 16 + Math.sin(time * 2.1 + index * 1.7) * 4;
    out.push({ x, y: y - 8 });
    drawDroneHull(context, x, y, -Math.PI / 2, "#e6fbff", "#8fe8ff", 9);
  }
}

/** Interceptors circle close to the hull, scanning for shots. */
function drawInterceptors(context: CanvasRenderingContext2D, ship: FxPoint, time: number, count: number, out: FxPoint[]): void {
  for (let index = 0; index < count; index += 1) {
    const angle = -time * 1.4 + (index / count) * TAU;
    const x = ship.x + Math.cos(angle) * 46;
    const y = ship.y + Math.sin(angle) * 20 - 4;
    out.push({ x, y });
    drawDroneHull(context, x, y, angle - Math.PI / 2, "#fff0d6", "#ffb45a", 7);
  }
}

/** Ablative plates still unspent: three amber arcs guarding the hull. */
function drawPlating(context: CanvasRenderingContext2D, ship: FxPoint, time: number): void {
  context.lineCap = "round";
  for (let plate = 0; plate < 3; plate += 1) {
    const start = -Math.PI / 2 - 0.9 + plate * 0.62 + Math.sin(time * 0.8) * 0.04;
    context.globalAlpha = 0.45;
    context.strokeStyle = "#ffb86b";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(ship.x, ship.y, 40, start, start + 0.46);
    context.stroke();
  }
}

/** Phase Shift is charged: a faint violet shimmer around the ship. */
function drawPhaseReady(context: CanvasRenderingContext2D, ship: FxPoint, time: number): void {
  context.globalAlpha = 0.22 + 0.1 * Math.sin(time * 4);
  context.strokeStyle = "#b8a6ff";
  context.lineWidth = 1.4;
  context.setLineDash([3, 7]);
  context.lineDashOffset = time * 20;
  context.beginPath();
  context.arc(ship.x, ship.y, 46, 0, TAU);
  context.stroke();
  context.setLineDash([]);
}

function drawLock(context: CanvasRenderingContext2D, ship: FxPoint, target: FxPoint, time: number): void {
  // Designator beam from the nose, then rotating brackets on the target.
  context.globalAlpha = 0.28 + 0.12 * Math.sin(time * 9);
  context.strokeStyle = "#ff5a6e";
  context.lineWidth = 1.2;
  context.setLineDash([10, 6]);
  context.lineDashOffset = -time * 60;
  context.beginPath();
  context.moveTo(ship.x, ship.y - 30);
  context.lineTo(target.x, target.y);
  context.stroke();
  context.setLineDash([]);
  const radius = 34 + Math.sin(time * 6) * 3;
  context.save();
  context.translate(target.x, target.y);
  context.rotate(time * 1.4);
  context.globalAlpha = 0.95;
  context.lineWidth = 2.2;
  for (let corner = 0; corner < 4; corner += 1) {
    context.rotate(Math.PI / 2);
    context.beginPath();
    context.moveTo(radius, -10);
    context.lineTo(radius, -radius);
    context.lineTo(radius - 10, -radius);
    context.stroke();
  }
  context.restore();
  glow(context, "#ff5a6e", target.x, target.y, 44, 0.35);
}

function drawCloak(context: CanvasRenderingContext2D, ship: FxPoint, time: number, strength: number): void {
  // Phase shimmer: drifting rings and a violet haze where the hull is.
  for (let index = 0; index < 3; index += 1) {
    const phase = (time * 0.9 + index / 3) % 1;
    ring(context, "#b98cff", ship.x, ship.y, 24 + phase * 50, 1.2, strength * (1 - phase) * 0.6);
  }
  glow(context, "#9d7bff", ship.x, ship.y, 60, strength * 0.3);
}

function drawStasis(context: CanvasRenderingContext2D, ship: FxPoint, width: number, height: number, time: number, strength: number): void {
  context.save();
  // Violet vignette: time thickens toward the edges.
  const vignette = context.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.25, width / 2, height / 2, Math.max(width, height) * 0.7);
  vignette.addColorStop(0, "rgba(120, 100, 255, 0)");
  vignette.addColorStop(1, "rgba(120, 100, 255, " + (0.26 * strength).toFixed(3) + ")");
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
  context.globalCompositeOperation = "lighter";
  // Slow clock ripples from the ship, with tick marks on the inner ring.
  for (let index = 0; index < 3; index += 1) {
    const phase = (time * 0.35 + index / 3) % 1;
    lightRing(context, "#9d8bff", "#e2dcff", ship.x, ship.y, 60 + phase * Math.max(width, height) * 0.5, 1.2, strength * (1 - phase) * 0.55);
  }
  context.globalAlpha = strength * 0.55;
  context.strokeStyle = "#cfc6ff";
  context.lineWidth = 1.4;
  for (let tick = 0; tick < 12; tick += 1) {
    const angle = (tick / 12) * TAU + time * 0.2;
    context.beginPath();
    context.moveTo(ship.x + Math.cos(angle) * 88, ship.y + Math.sin(angle) * 88);
    context.lineTo(ship.x + Math.cos(angle) * 98, ship.y + Math.sin(angle) * 98);
    context.stroke();
  }
  context.restore();
}

function drawSingularity(context: CanvasRenderingContext2D, center: FxPoint, time: number, strength: number, fine: boolean): void {
  const radius = 86;
  context.save();
  context.globalCompositeOperation = "lighter";
  // Accretion disk: a tilted glowing ring, spinning.
  for (let layer = 0; layer < 3; layer += 1) {
    const r = radius * (1.05 + layer * 0.28);
    context.save();
    context.translate(center.x, center.y);
    context.scale(1, 0.38);
    context.rotate(time * (0.8 - layer * 0.2));
    context.globalAlpha = strength * (0.55 - layer * 0.14);
    context.strokeStyle = layer === 0 ? "#ffd2ff" : "#b36bff";
    context.lineWidth = 6 - layer * 1.5;
    context.beginPath();
    context.arc(0, 0, r, 0, TAU * 0.82);
    context.stroke();
    context.restore();
  }
  // Matter spiralling in along four arms, brightening as it falls.
  const motes = fine ? 48 : 16;
  for (let index = 0; index < motes; index += 1) {
    const phase = (time * 0.45 + hash(index)) % 1;
    const arm = (index % 4) * (TAU / 4);
    const angle = arm + hash(index * 3.7) * 0.9 + phase * 7;
    const distance = (1 - phase) * radius * 3.6 + radius * 0.55;
    const x = center.x + Math.cos(angle) * distance;
    const y = center.y + Math.sin(angle) * distance * 0.5;
    const color = index % 3 === 0 ? "#ffd2ff" : "#c08bff";
    glow(context, color, x, y, 8 + (1 - phase) * 7, strength * (0.3 + phase * 0.7));
    if (fine && phase > 0.55) glow(context, "#ffffff", x, y, 3, strength * phase);
  }
  lightRing(context, "#b36bff", "#f3e2ff", center.x, center.y, radius * 0.62, 2.4, strength * 0.9);
  glow(context, "#8a3dff", center.x, center.y, radius * 2.4, strength * 0.25);
  context.restore();
  // The event horizon itself is dark (drawn normally, not added).
  context.save();
  const core = context.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius * 0.6);
  core.addColorStop(0, "rgba(0, 0, 0, " + (0.95 * strength).toFixed(3) + ")");
  core.addColorStop(0.8, "rgba(10, 0, 20, " + (0.85 * strength).toFixed(3) + ")");
  core.addColorStop(1, "rgba(10, 0, 20, 0)");
  context.fillStyle = core;
  context.beginPath();
  context.arc(center.x, center.y, radius * 0.6, 0, TAU);
  context.fill();
  context.restore();
}

function drawOverdriveAura(context: CanvasRenderingContext2D, ship: FxPoint, color: string, time: number, strength: number): void {
  context.save();
  context.globalCompositeOperation = "lighter";
  const pulse = 0.85 + 0.15 * Math.sin(time * 7);
  glow(context, color, ship.x, ship.y, 150 * pulse, strength * 0.35);
  glow(context, color, ship.x, ship.y + 20, 90, strength * 0.4);
  for (let index = 0; index < 2; index += 1) {
    const phase = (time * 1.4 + index / 2) % 1;
    lightRing(context, color, "#ffffff", ship.x, ship.y, 40 + phase * 90, 2, strength * (1 - phase) * 0.7);
  }
  // Speed lines streaming past, as if the ship surges forward.
  context.globalAlpha = strength * 0.35;
  context.strokeStyle = color;
  context.lineWidth = 1.2;
  for (let line = 0; line < 10; line += 1) {
    const x = ship.x + (hash(line * 5.1) - 0.5) * 260;
    const start = ((time * 1.8 + hash(line)) % 1) * 400;
    context.beginPath();
    context.moveTo(x, ship.y - 380 + start);
    context.lineTo(x, ship.y - 320 + start);
    context.stroke();
  }
  context.restore();
}
