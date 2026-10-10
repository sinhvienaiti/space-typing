import type { VisualQuality } from "../types";

/**
 * Engine exhaust sparks in screen space. They leave the nozzles along the
 * ship's axis and then drift free, so when the ship turns or sways the trail
 * bends behind it instead of rotating rigidly with the hull.
 *
 * Fixed Float32Array pool, cached glow textures, no shadowBlur.
 */

export type ExhaustPoint = { x: number; y: number };

export type ExhaustColors = {
  /** #rrggbb: the hot sparks near the nozzle, and the cooler trail. */
  hot: string;
  plume: string;
};

const MAX_SPARKS = 192;
const STRIDE = 8; // x, y, vx, vy, life, maxLife, size, hot
/** Sparks per second per nozzle at idle; throttle adds up to +80%. */
const RATE: Readonly<Record<VisualQuality, number>> = {
  low: 10,
  medium: 28,
  high: 46,
  ultra: 66,
};
/** Space streams past the ship (it flies up the screen). */
const WORLD_FLOW = 70;

type Rgb = readonly [number, number, number];

function hexRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1, 7), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

const textures = new Map<string, HTMLCanvasElement | null>();

function sparkTexture(hex: string): HTMLCanvasElement | null {
  const cached = textures.get(hex);
  if (cached !== undefined) return cached;
  let canvas: HTMLCanvasElement | null = null;
  if (typeof document !== "undefined") {
    canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext("2d");
    if (context === null) {
      canvas = null;
    } else {
      const [r, g, b] = hexRgb(hex);
      const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, "rgba(" + r + "," + g + "," + b + ",1)");
      gradient.addColorStop(0.3, "rgba(" + r + "," + g + "," + b + ",0.55)");
      gradient.addColorStop(1, "rgba(" + r + "," + g + "," + b + ",0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 32, 32);
    }
  }
  textures.set(hex, canvas);
  return canvas;
}

export class ShipExhaust {
  private readonly sparks = new Float32Array(MAX_SPARKS * STRIDE);
  private count = 0;
  private readonly debt: number[] = [];
  private seed = 0x2f6b1;
  private size = 1;

  get activeSparks(): number {
    return this.count;
  }

  /**
   * Sheds sparks from each nozzle (canvas px). `heading` is the ship's turn
   * (0 = nose up), `boost` its 0–1 throttle, `size` scales new sparks (a
   * ship drawn big, like the Duel chase view, needs bigger, faster sparks).
   */
  update(
    dt: number,
    nozzles: readonly ExhaustPoint[],
    heading: number,
    boost: number,
    quality: VisualQuality,
    size = 1,
  ): void {
    this.size = size;
    const step = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.05) : 0;
    const sparks = this.sparks;

    let live = 0;
    for (let index = 0; index < this.count; index += 1) {
      const at = index * STRIDE;
      const life = sparks[at + 4]! - step;
      if (life <= 0) continue;
      const to = live * STRIDE;
      const drag = Math.exp(-3.2 * step);
      sparks[to] = sparks[at]! + sparks[at + 2]! * step;
      sparks[to + 1] = sparks[at + 1]! + sparks[at + 3]! * step;
      sparks[to + 2] = sparks[at + 2]! * drag;
      sparks[to + 3] = (sparks[at + 3]! - WORLD_FLOW) * drag + WORLD_FLOW;
      sparks[to + 4] = life;
      sparks[to + 5] = sparks[at + 5]!;
      sparks[to + 6] = sparks[at + 6]!;
      sparks[to + 7] = sparks[at + 7]!;
      live += 1;
    }
    this.count = live;
    if (step === 0) return;

    // Backward along the hull: nose is (sin h, -cos h).
    const backX = -Math.sin(heading);
    const backY = Math.cos(heading);
    const rate = RATE[quality] * (1 + Math.max(0, Math.min(1, boost)) * 0.8);
    nozzles.forEach((nozzle, index) => {
      let debt = (this.debt[index] ?? 0) + rate * step;
      while (debt >= 1) {
        debt -= 1;
        this.emit(nozzle, backX, backY, boost);
      }
      this.debt[index] = debt;
    });
  }

  draw(context: CanvasRenderingContext2D, colors: ExhaustColors): void {
    if (this.count === 0) return;
    const hot = sparkTexture(colors.hot);
    const plume = sparkTexture(colors.plume);
    if (hot === null || plume === null) return;
    const sparks = this.sparks;
    context.save();
    context.globalCompositeOperation = "lighter";
    for (let index = 0; index < this.count; index += 1) {
      const at = index * STRIDE;
      const k = 1 - sparks[at + 4]! / sparks[at + 5]!;
      const radius = sparks[at + 6]! * (1 + k * 0.8);
      const alpha = Math.pow(1 - k, 1.3) * 0.95;
      if (alpha <= 0.01) continue;
      context.globalAlpha = alpha;
      const texture = sparks[at + 7]! > 0.5 && k < 0.45 ? hot : plume;
      context.drawImage(texture, sparks[at]! - radius, sparks[at + 1]! - radius, radius * 2, radius * 2);
    }
    context.restore();
  }

  clear(): void {
    this.count = 0;
    this.debt.length = 0;
  }

  private random(): number {
    // Park–Miller: deterministic and allocation-free.
    this.seed = (this.seed * 48271) % 2147483647;
    return this.seed / 2147483647;
  }

  private emit(nozzle: ExhaustPoint, backX: number, backY: number, boost: number): void {
    if (this.count >= MAX_SPARKS) return;
    const at = this.count * STRIDE;
    const k = this.size;
    const speed = (190 + this.random() * 140 + boost * 110) * Math.sqrt(k);
    const spread = (this.random() - 0.5) * 40 * k;
    const sparks = this.sparks;
    sparks[at] = nozzle.x + backX * 6 * k + (this.random() - 0.5) * 3 * k;
    sparks[at + 1] = nozzle.y + backY * 6 * k;
    // Across the jet: (-backY, backX).
    sparks[at + 2] = backX * speed - backY * spread;
    sparks[at + 3] = backY * speed + backX * spread;
    const life = 0.16 + this.random() * 0.18 + boost * 0.08;
    sparks[at + 4] = life;
    sparks[at + 5] = life;
    sparks[at + 6] = (0.9 + this.random() * 1.1 + boost * 0.4) * k;
    sparks[at + 7] = this.random() < 0.5 ? 1 : 0;
    this.count += 1;
  }
}
