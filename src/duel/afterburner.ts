import type { VisualQuality } from "../types";
import { drawGlow, drawRingGlow, glowSprite, parseRgb } from "../vfx/light-sprites";

/**
 * Afterburner plumes for your ship in the Duel Depth View (3D hull and chase
 * sprite). Presentation only.
 *
 * The flame answers your typing: every correct key makes it flare, a long
 * run of correct keys makes it burn longer and wider, a new momentum tier
 * fires a surge (longer flame, shock ring), and a broken run makes it
 * sputter. High and Ultra add shock diamonds, living flame tongues, a lens
 * flare, light spill and a tier-coloured aura; Medium keeps the flame and
 * halo only.
 *
 * Every layer is a cached sprite drawn additively (no gradients or
 * shadowBlur per frame): about a dozen drawImage calls per nozzle.
 */

type Look = {
  /** Flame length and width multipliers. */
  length: number;
  width: number;
  /** Shock diamonds along the flame, extra flame tongues. */
  diamonds: number;
  tongues: number;
  /** Lens-flare streak, light spill, tier aura (0 = off). */
  flare: number;
  spill: number;
  aura: number;
  halo: number;
};

export const AFTERBURNER_LOOK: Readonly<Record<VisualQuality, Look>> = {
  low: { length: 0.6, width: 0.85, diamonds: 0, tongues: 0, flare: 0, spill: 0, aura: 0, halo: 0.85 },
  medium: { length: 0.85, width: 0.95, diamonds: 0, tongues: 0, flare: 0, spill: 0.55, aura: 0.5, halo: 1 },
  high: { length: 1.05, width: 1.05, diamonds: 3, tongues: 1, flare: 0.7, spill: 1, aura: 1, halo: 1.15 },
  ultra: { length: 1.3, width: 1.15, diamonds: 5, tongues: 2, flare: 1, spill: 1.35, aura: 1.3, halo: 1.3 },
};

export type AfterburnerColors = {
  /** White-hot core, the flame body, its cooler edge (#rrggbb). */
  hot: string;
  plume: string;
  outer: string;
};

export type AfterburnerNozzle = {
  x: number;
  y: number;
  /** Screen direction the flame leaves in (any length). */
  dx: number;
  dy: number;
};

/**
 * Engines burn visibly even before you type (the owner read a 0.25 idle as
 * "unchanged"); a long run of correct keys adds up to RUN on top.
 */
const IDLE = 0.45;
const RUN = 0.6;

const SPRITE_W = 48;
const SPRITE_H = 192;
const plumes = new Map<string, HTMLCanvasElement | null>();

/**
 * A flame along +y: narrow at the nozzle, widest just behind it, tapering to
 * a point, brightest at the nozzle. One cached canvas per colour.
 */
function plumeSprite(color: string): HTMLCanvasElement | null {
  const cached = plumes.get(color);
  if (cached !== undefined) return cached;
  let canvas: HTMLCanvasElement | null = null;
  if (typeof document !== "undefined") {
    canvas = document.createElement("canvas");
    canvas.width = SPRITE_W;
    canvas.height = SPRITE_H;
    const context = canvas.getContext("2d");
    if (context === null) {
      canvas = null;
    } else {
      const [r, g, b] = parseRgb(color);
      const image = context.createImageData(SPRITE_W, SPRITE_H);
      const half = SPRITE_W / 2;
      for (let y = 0; y < SPRITE_H; y += 1) {
        const v = y / (SPRITE_H - 1);
        const swell = 0.62 + 0.38 * Math.min(1, v / 0.16);
        const width = half * swell * Math.pow(1 - v, 0.75);
        const fade = Math.pow(1 - v, 0.95) * Math.min(1, v / 0.025 + 0.35);
        for (let x = 0; x < SPRITE_W; x += 1) {
          const across = width <= 0.01 ? 99 : (x + 0.5 - half) / width;
          const alpha = fade * Math.exp(-across * across * 2.4);
          const at = (y * SPRITE_W + x) * 4;
          image.data[at] = r;
          image.data[at + 1] = g;
          image.data[at + 2] = b;
          image.data[at + 3] = Math.round(255 * Math.min(1, alpha));
        }
      }
      context.putImageData(image, 0, 0);
    }
  }
  plumes.set(color, canvas);
  return canvas;
}

/** Engine flame state for one ship (pure numbers; draw() does the canvas). */
export class DuelAfterburner {
  private pulse = 0;
  private surge = 0;
  private sputter = 0;
  private streak = 0;
  private tier = 0;
  private level = IDLE;
  private time = 0;
  private seed = 0x51ed;
  /** Tier colour for the aura, cross-faded on tier changes. */
  private auraFrom = "#3fd2ff";
  private auraTo = "#3fd2ff";
  private auraT = 1;

  /** 0…1+ how hard the engines burn this frame. */
  get power(): number {
    return Math.max(0.12, this.level + this.pulse * 0.32 + this.surge * 0.35 - this.sputter * 0.3);
  }

  /** Typing momentum from the battle view (called on every view update). */
  observe(streak: number, tier: number, tierColor: string): void {
    if (streak > this.streak) {
      // Each accepted key flares the flame; bursts of keys stack up to full.
      this.pulse = Math.min(1, this.pulse + 0.24 * Math.min(4, streak - this.streak));
    } else if (streak < this.streak && this.streak >= 5) {
      this.sputter = 1;
      this.pulse = 0;
    }
    if (tier > this.tier) this.surge = 1;
    if (tier !== this.tier || tierColor !== this.auraTo) {
      this.auraFrom = this.auraT >= 1 ? this.auraTo : this.auraFrom;
      this.auraTo = tierColor;
      this.auraT = 0;
    }
    this.streak = streak;
    this.tier = tier;
  }

  /** Advances flicker and decay; `dt` is the effects clock (seconds). */
  update(dt: number, reduced = false): void {
    const step = Math.max(0, Math.min(0.1, dt));
    this.time += reduced ? 0 : step;
    // A long run burns hotter: 10 keys ≈ 0.56, 35 ≈ 0.72, 75 ≈ 0.86, 150 ≈ 1.03.
    const run = 1 - Math.exp(-this.streak / 45);
    const target = IDLE + RUN * run;
    this.level += (target - this.level) * Math.min(1, step * (target > this.level ? 3 : 1.6));
    this.pulse *= Math.exp(-step * 3.2);
    this.surge = Math.max(0, this.surge - step / 1.4);
    this.sputter = Math.max(0, this.sputter - step / 0.7);
    this.auraT = Math.min(1, this.auraT + step * 2.5);
  }

  /** Back to idle (new round, respawn). */
  reset(): void {
    this.pulse = 0;
    this.surge = 0;
    this.sputter = 0;
    this.streak = 0;
    this.tier = 0;
    this.level = IDLE;
    this.auraFrom = this.auraTo = "#3fd2ff";
    this.auraT = 1;
  }

  /**
   * Draws every nozzle's flame. `scale` is the ship's drawn scale; colours
   * come from the ship's light rig. The caller's transform is respected.
   */
  draw(
    context: CanvasRenderingContext2D,
    nozzles: readonly AfterburnerNozzle[],
    scale: number,
    quality: VisualQuality,
    colors: AfterburnerColors,
    reduced = false,
  ): void {
    if (nozzles.length === 0) return;
    const look = AFTERBURNER_LOOK[quality];
    const power = this.power;
    const t = this.time;
    const flicker = reduced ? 1 : 0.9 + 0.1 * Math.sin(t * 37) * Math.sin(t * 23 + 1.3) + (this.random() - 0.5) * 0.08;
    const sputter = this.sputter > 0 && !reduced ? 1 - this.sputter * (0.35 + this.random() * 0.55) : 1;
    const length = scale * 46 * (0.5 + 1.75 * power + 0.55 * this.surge) * look.length * flicker * sputter;
    const width = scale * 13 * (0.7 + 0.6 * Math.min(1.2, power)) * look.width;
    const aura = this.auraT >= 1 ? this.auraTo : this.auraT < 0.5 ? this.auraFrom : this.auraTo;
    const auraAlpha = this.auraT >= 1 ? 1 : Math.abs(this.auraT - 0.5) * 2;
    const tierMix = Math.min(1, this.tier / 3);

    context.save();
    context.globalCompositeOperation = "lighter";

    // Light spill: the engines light the space around the tail.
    if (look.spill > 0) {
      let cx = 0, cy = 0, ux = 0, uy = 0;
      for (const nozzle of nozzles) {
        cx += nozzle.x; cy += nozzle.y;
        const n = Math.hypot(nozzle.dx, nozzle.dy) || 1;
        ux += nozzle.dx / n; uy += nozzle.dy / n;
      }
      cx /= nozzles.length; cy /= nozzles.length;
      const n = Math.hypot(ux, uy) || 1;
      drawGlow(context, colors.outer, cx + ux / n * length * 0.3, cy + uy / n * length * 0.3, scale * 58 * (0.6 + power) * look.spill, (0.1 + 0.12 * power) * sputter);
    }

    const outerSprite = plumeSprite(colors.outer);
    const plumeSpriteBody = plumeSprite(colors.plume);
    const hotSprite = plumeSprite(colors.hot);
    const auraSprite = plumeSprite(aura);
    const diamond = glowSprite(colors.hot);

    nozzles.forEach((nozzle, index) => {
      const n = Math.hypot(nozzle.dx, nozzle.dy);
      const ux = n > 1e-4 ? nozzle.dx / n : 0;
      const uy = n > 1e-4 ? nozzle.dy / n : 1;
      context.save();
      context.translate(nozzle.x, nozzle.y);
      // Local +y runs down the flame, +x across it.
      context.rotate(Math.atan2(uy, ux) - Math.PI / 2);
      const start = -width * 0.18; // tuck the flame into the nozzle
      // Tier aura: a wide soft sheath in the momentum colour.
      if (look.aura > 0 && auraSprite !== null) {
        context.globalAlpha = Math.min(1, (0.16 + 0.2 * tierMix) * look.aura * auraAlpha * sputter);
        context.drawImage(auraSprite, -width * 1.15, start, width * 2.3, length * 1.12);
      }
      // Cool outer flame, then the body.
      if (outerSprite !== null) {
        context.globalAlpha = Math.min(1, (0.5 + 0.3 * power) * sputter);
        context.drawImage(outerSprite, -width * 0.8, start, width * 1.6, length);
      }
      if (plumeSpriteBody !== null) {
        context.globalAlpha = Math.min(1, (0.62 + 0.3 * power) * sputter);
        context.drawImage(plumeSpriteBody, -width * 0.52, start, width * 1.04, length * 0.82);
      }
      // Living flame tongues that lick sideways (High, Ultra).
      if (plumeSpriteBody !== null && !reduced) {
        for (let k = 0; k < look.tongues; k += 1) {
          const sway = Math.sin(t * (9 + k * 4) + index * 1.7 + k * 2.1) * width * 0.22;
          const reach = 0.6 + 0.25 * Math.sin(t * (13 + k * 5) + index);
          context.globalAlpha = Math.min(1, (0.28 + 0.2 * power) * sputter);
          context.drawImage(plumeSpriteBody, sway - width * 0.32, start, width * 0.64, length * reach);
        }
      }
      // White-hot core.
      if (hotSprite !== null) {
        context.globalAlpha = Math.min(1, 0.9 * sputter);
        context.drawImage(hotSprite, -width * 0.26, start, width * 0.52, length * 0.6);
      }
      // Shock diamonds: bright knots in the jet once it burns hard.
      if (diamond !== null && look.diamonds > 0) {
        const strength = Math.max(0, Math.min(1, (power - 0.32) / 0.3));
        for (let k = 0; k < look.diamonds && strength > 0; k += 1) {
          const at = length * (0.13 + k * 0.12);
          const size = width * (0.5 - k * 0.06);
          const shimmer = reduced ? 1 : 0.75 + 0.25 * Math.sin(t * 31 + k * 1.9 + index);
          context.globalAlpha = Math.min(1, (0.85 - k * 0.12) * strength * shimmer * sputter);
          context.drawImage(diamond, -size * 0.5, at - size * 0.75, size, size * 1.5);
        }
      }
      context.restore();
      context.globalAlpha = 1;

      // Nozzle halo: coloured bloom plus a white-hot centre.
      drawGlow(context, colors.plume, nozzle.x, nozzle.y, scale * (13 + 15 * power) * look.halo, 0.55 * sputter);
      drawGlow(context, colors.hot, nozzle.x, nozzle.y, scale * (5 + 6 * power) * look.halo, 0.9 * sputter);
      // Lens flare: a thin horizontal streak through each nozzle.
      if (look.flare > 0 && diamond !== null) {
        const streak = scale * (34 + 70 * power) * look.flare;
        context.globalAlpha = Math.min(1, (0.18 + 0.22 * power) * sputter);
        context.drawImage(diamond, nozzle.x - streak, nozzle.y - scale * 2.2, streak * 2, scale * 4.4);
        context.globalAlpha = 1;
      }
      // Tier surge: a shock ring blown out of each nozzle.
      if (this.surge > 0.02 && look.aura > 0) {
        drawRingGlow(context, aura, nozzle.x, nozzle.y, scale * (10 + (1 - this.surge) * 46), this.surge * 0.75);
      }
    });
    context.restore();
  }

  private random(): number {
    this.seed = (this.seed * 48271) % 2147483647;
    return this.seed / 2147483647;
  }
}

/** A thin flame-shaped streak (wingtip vapour, energy trails), additive. */
export function drawFlameStreak(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
  length: number,
  width: number,
  color: string,
  alpha: number,
): void {
  if (length <= 1 || alpha <= 0.01) return;
  const sprite = plumeSprite(color);
  if (sprite === null) return;
  const n = Math.hypot(dx, dy);
  context.save();
  context.translate(x, y);
  context.rotate(Math.atan2(n > 1e-4 ? dy / n : 1, n > 1e-4 ? dx / n : 0) - Math.PI / 2);
  context.globalAlpha = Math.min(1, alpha);
  context.drawImage(sprite, -width / 2, -width * 0.2, width, length);
  context.restore();
}
