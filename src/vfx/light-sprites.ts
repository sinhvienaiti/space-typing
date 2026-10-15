/**
 * Pre-rendered light sprites: a soft radial glow and a soft ring, one small
 * canvas per colour, drawn with drawImage. Canvas `shadowBlur` is recomputed
 * for every stroke on every frame and was the main cause of the frame drops
 * with enemies on screen (docs/PERFORMANCE_ROOT_CAUSE_REVIEW_2026-09-29.md);
 * a cached sprite gives the same halo for the cost of one image copy.
 */
type Rgb = readonly [number, number, number];

const glowCache = new Map<string, HTMLCanvasElement | null>();
const ringCache = new Map<string, HTMLCanvasElement | null>();
const rgbCache = new Map<string, Rgb>();

/** "#rgb", "#rrggbb", "rgb(…)" or "rgba(…)" → [r, g, b] (alpha ignored). */
export function parseRgb(color: string): Rgb {
  const cached = rgbCache.get(color);
  if (cached !== undefined) return cached;
  let rgb: Rgb = [255, 255, 255];
  const value = color.trim();
  if (value.startsWith("#")) {
    const hex = value.slice(1);
    const full = hex.length === 3 ? hex.split("").map((part) => part + part).join("") : hex.slice(0, 6);
    const number = Number.parseInt(full, 16);
    if (Number.isFinite(number)) rgb = [(number >> 16) & 255, (number >> 8) & 255, number & 255];
  } else {
    const parts = value.match(/[\d.]+/g);
    if (parts !== null && parts.length >= 3) {
      rgb = [Number(parts[0]), Number(parts[1]), Number(parts[2])].map((part) =>
        Math.max(0, Math.min(255, Math.round(part))),
      ) as unknown as Rgb;
    }
  }
  rgbCache.set(color, rgb);
  return rgb;
}

function rgba(color: string, alpha: number): string {
  const [r, g, b] = parseRgb(color);
  return "rgba(" + r + "," + g + "," + b + "," + Math.max(0, Math.min(1, alpha)).toFixed(3) + ")";
}

function makeSprite(size: number, paint: (context: CanvasRenderingContext2D) => void): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context === null) return null;
  paint(context);
  return canvas;
}

/** A radial glow: bright centre fading to nothing at the edge (64 px). */
export function glowSprite(color: string): HTMLCanvasElement | null {
  const cached = glowCache.get(color);
  if (cached !== undefined) return cached;
  const sprite = makeSprite(64, (context) => {
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, rgba(color, 1));
    gradient.addColorStop(0.22, rgba(color, 0.6));
    gradient.addColorStop(0.5, rgba(color, 0.18));
    gradient.addColorStop(1, rgba(color, 0));
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
  });
  glowCache.set(color, sprite);
  return sprite;
}

/** Where the ring's brightest line sits, as a share of the sprite radius. */
const RING_AT = 0.78;

/** A soft glowing ring (128 px); its bright line sits at 78% of the radius. */
export function ringSprite(color: string): HTMLCanvasElement | null {
  const cached = ringCache.get(color);
  if (cached !== undefined) return cached;
  const sprite = makeSprite(128, (context) => {
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, rgba(color, 0));
    gradient.addColorStop(0.58, rgba(color, 0));
    gradient.addColorStop(0.7, rgba(color, 0.28));
    gradient.addColorStop(RING_AT, rgba(color, 0.85));
    gradient.addColorStop(0.86, rgba(color, 0.28));
    gradient.addColorStop(1, rgba(color, 0));
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  });
  ringCache.set(color, sprite);
  return sprite;
}

/** Draws a glow of `radius` px at (x, y); caller sets the blend mode. */
export function drawGlow(
  context: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  radius: number,
  alpha: number,
): void {
  if (radius <= 0.3 || alpha <= 0.004) return;
  const sprite = glowSprite(color);
  if (sprite === null) return;
  const previous = context.globalAlpha;
  context.globalAlpha = previous * Math.min(1, alpha);
  context.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
  context.globalAlpha = previous;
}

/** Draws a soft ring whose bright line has radius `radius` px. */
export function drawRingGlow(
  context: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  radius: number,
  alpha: number,
): void {
  if (radius <= 0.5 || alpha <= 0.004) return;
  const sprite = ringSprite(color);
  if (sprite === null) return;
  const outer = radius / RING_AT;
  const previous = context.globalAlpha;
  context.globalAlpha = previous * Math.min(1, alpha);
  context.drawImage(sprite, x - outer, y - outer, outer * 2, outer * 2);
  context.globalAlpha = previous;
}
