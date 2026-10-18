import { parseRgb } from "./light-sprites";

/**
 * Pre-rendered lens and light shapes for boss effects, one small canvas per
 * colour (built once from ImageData, drawn with drawImage, additive):
 *
 * - streak: a thin anamorphic flare, the "cinematic" horizontal light line;
 * - star:   a four-point glint for hits, casts and flashes;
 * - shaft:  a soft light shaft (god ray) that widens and fades from its root.
 *
 * Like light-sprites.ts they replace per-frame shadowBlur and gradients.
 */
type Painter = (u: number, v: number) => number;

const streakCache = new Map<string, HTMLCanvasElement | null>();
const starCache = new Map<string, HTMLCanvasElement | null>();
const shaftCache = new Map<string, HTMLCanvasElement | null>();

function paint(width: number, height: number, color: string, alphaAt: Painter): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context === null) return null;
  const image = context.createImageData(width, height);
  const [r, g, b] = parseRgb(color);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = Math.max(0, Math.min(1, alphaAt((x + 0.5) / width, (y + 0.5) / height)));
      // A white-hot centre line: blend toward white where the light is strongest.
      const hot = alpha * alpha;
      const index = (y * width + x) * 4;
      image.data[index] = r + (255 - r) * hot;
      image.data[index + 1] = g + (255 - g) * hot;
      image.data[index + 2] = b + (255 - b) * hot;
      image.data[index + 3] = alpha * 255;
    }
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

function cached(cache: Map<string, HTMLCanvasElement | null>, color: string, build: () => HTMLCanvasElement | null): HTMLCanvasElement | null {
  const hit = cache.get(color);
  if (hit !== undefined) return hit;
  const sprite = build();
  cache.set(color, sprite);
  return sprite;
}

/** 256 × 16: the line across, falling off fast vertically and slowly to the ends. */
export function streakSprite(color: string): HTMLCanvasElement | null {
  return cached(streakCache, color, () =>
    paint(256, 16, color, (u, v) => {
      const along = 1 - Math.abs(u * 2 - 1);
      const across = Math.abs(v * 2 - 1);
      return Math.pow(along, 2.2) * Math.exp(-across * across * 9);
    }),
  );
}

/** 96 × 96: four thin rays and a soft core. */
export function starSprite(color: string): HTMLCanvasElement | null {
  return cached(starCache, color, () =>
    paint(96, 96, color, (u, v) => {
      const x = u * 2 - 1;
      const y = v * 2 - 1;
      const r = Math.hypot(x, y);
      const ray = (a: number, b: number) => Math.exp(-(b * b) / 0.0016) * Math.pow(Math.max(0, 1 - Math.abs(a)), 2.6);
      const cross = Math.max(ray(x, y), ray(y, x));
      const d1 = (x + y) / Math.SQRT2;
      const d2 = (x - y) / Math.SQRT2;
      const diagonal = Math.max(ray(d1 * 1.7, d2), ray(d2 * 1.7, d1)) * 0.45;
      const core = Math.exp(-r * r * 22);
      return Math.max(cross, diagonal, core);
    }),
  );
}

/** 48 × 256: root at the bottom centre, widening and fading toward the top. */
export function shaftSprite(color: string): HTMLCanvasElement | null {
  return cached(shaftCache, color, () =>
    paint(48, 256, color, (u, v) => {
      const along = 1 - v;
      const width = 0.12 + along * 0.88;
      const across = (u * 2 - 1) / width;
      const fadeIn = Math.min(1, along / 0.14);
      return Math.pow(1 - along, 1.35) * fadeIn * Math.exp(-across * across * 2.6) * 0.85;
    }),
  );
}

/** Horizontal flare centred on (x, y); `length` is the full width in px. */
export function drawStreak(
  context: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  length: number,
  thickness: number,
  alpha: number,
): void {
  if (length < 2 || alpha <= 0.004) return;
  const sprite = streakSprite(color);
  if (sprite === null) return;
  const previous = context.globalAlpha;
  context.globalAlpha = previous * Math.min(1, alpha);
  context.drawImage(sprite, x - length / 2, y - thickness / 2, length, thickness);
  context.globalAlpha = previous;
}

/** Four-point glint of `radius` px (ray tip to centre). */
export function drawStar(
  context: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  radius: number,
  alpha: number,
  rotation = 0,
): void {
  if (radius < 1 || alpha <= 0.004) return;
  const sprite = starSprite(color);
  if (sprite === null) return;
  const previous = context.globalAlpha;
  context.globalAlpha = previous * Math.min(1, alpha);
  if (rotation === 0) {
    context.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
  } else {
    context.save();
    context.translate(x, y);
    context.rotate(rotation);
    context.drawImage(sprite, -radius, -radius, radius * 2, radius * 2);
    context.restore();
  }
  context.globalAlpha = previous;
}

/** A light shaft from (x, y) pointing along `angle` (0 = up), `length` px long. */
export function drawShaft(
  context: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  angle: number,
  length: number,
  width: number,
  alpha: number,
): void {
  if (length < 2 || alpha <= 0.004) return;
  const sprite = shaftSprite(color);
  if (sprite === null) return;
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.globalAlpha *= Math.min(1, alpha);
  context.drawImage(sprite, -width / 2, -length, width, length);
  context.restore();
}
