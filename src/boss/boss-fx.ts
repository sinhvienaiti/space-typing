import type { VisualQuality } from "../types";
import type { BossSkillKind } from "./skills";
import { drawShaft, drawStar, drawStreak } from "../vfx/flare-sprites";
import { drawGlow, drawRingGlow } from "../vfx/light-sprites";

/**
 * Boss Depth View effects that belong ON the boss (drawn after the 3D model,
 * so the model never hides them): hit glints and crystal shards, muzzle
 * flashes at the cast sockets, charge orbs and converging light, the phase
 * blast, the death chain (blasts across the sockets, final flash, shock ring,
 * shard debris, light shafts) and the arrival portal and pillar.
 *
 * Positions come from the model's projected FX sockets (FX_CORE, FX_CAST_L,
 * FX_CAST_R, FX_HALO) when the GLB is on screen, or from fixed shares of the
 * boss box otherwise (Low quality, painted art).
 *
 * Every pool is capped per quality, everything is cached sprites (no
 * shadowBlur), and the painted blasts (combat-vfx WebP) load on Medium+ only.
 */
export type BossFxPoint = { x: number; y: number };
export type BossFxSockets = { core: BossFxPoint; left: BossFxPoint; right: BossFxPoint; halo: BossFxPoint };

export type BossFxPalette = {
  primary: string;
  accent: string;
  /** Shards, glints and shafts cycle through these. */
  colors: readonly string[];
};

const TAU = Math.PI * 2;
const RAINBOW_EXTRA = ["#ffe27a", "#c49bff", "#9dffd0"] as const;

export function bossFxPalette(primary: string, accent: string, rainbow: boolean): BossFxPalette {
  return {
    primary,
    accent,
    colors: rainbow ? [primary, accent, ...RAINBOW_EXTRA, "#ffffff"] : [primary, accent, "#ffffff"],
  };
}

/** Socket positions for a box without a projected model (box shares of the G01 rig). */
export function fallbackBossSockets(x: number, y: number, size: number, out?: BossFxSockets): BossFxSockets {
  const sockets = out ?? { core: { x: 0, y: 0 }, left: { x: 0, y: 0 }, right: { x: 0, y: 0 }, halo: { x: 0, y: 0 } };
  sockets.core.x = x;
  sockets.core.y = y - size * 0.06;
  sockets.left.x = x - size * 0.17;
  sockets.left.y = y + size * 0.02;
  sockets.right.x = x + size * 0.17;
  sockets.right.y = y + size * 0.02;
  sockets.halo.x = x;
  sockets.halo.y = y - size * 0.3;
  return sockets;
}

function hash(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

// --- Painted blasts (Medium+) -------------------------------------------------------

type PaintedId = "precision-burst" | "shockwave-ring" | "spark-burst";
const PAINTED_IDS: readonly PaintedId[] = ["precision-burst", "shockwave-ring", "spark-burst"];
const PAINTED_EDGE = 256;
const paintedImages = new Map<PaintedId, HTMLImageElement>();
const paintedSprites = new Map<string, HTMLCanvasElement | null>();
let paintedRequested = false;

/** Starts decoding the painted blast sheets (once). */
export function preloadBossPaintedFx(): void {
  if (paintedRequested || typeof Image === "undefined") return;
  paintedRequested = true;
  for (const id of PAINTED_IDS) {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => paintedImages.set(id, image);
    image.src = "/assets/space-typing/combat-vfx/" + id + ".webp";
  }
}

/**
 * The sheet, recoloured once into a 256 px canvas: "color" blending keeps the
 * painted light and detail but takes the boss's hue (orange fire → prism).
 * `tint` null keeps the original colours.
 */
function paintedSprite(id: PaintedId, tint: string | null): HTMLCanvasElement | null {
  const key = id + "|" + (tint ?? "");
  const cached = paintedSprites.get(key);
  if (cached !== undefined) return cached;
  const image = paintedImages.get(id);
  if (image === undefined || typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = PAINTED_EDGE;
  canvas.height = PAINTED_EDGE;
  const context = canvas.getContext("2d");
  if (context === null) {
    paintedSprites.set(key, null);
    return null;
  }
  const scale = PAINTED_EDGE / Math.max(image.naturalWidth, image.naturalHeight, 1);
  const w = image.naturalWidth * scale;
  const h = image.naturalHeight * scale;
  context.drawImage(image, (PAINTED_EDGE - w) / 2, (PAINTED_EDGE - h) / 2, w, h);
  if (tint !== null) {
    context.globalCompositeOperation = "color";
    context.fillStyle = tint;
    context.fillRect(0, 0, PAINTED_EDGE, PAINTED_EDGE);
    context.globalCompositeOperation = "destination-in";
    context.drawImage(image, (PAINTED_EDGE - w) / 2, (PAINTED_EDGE - h) / 2, w, h);
  }
  paintedSprites.set(key, canvas);
  return canvas;
}

// --- Crystal shot body ----------------------------------------------------------------

const shotSprites = new Map<string, HTMLCanvasElement | null>();

/**
 * A faceted prism crystal pointing along +x (sprite 128 px, crystal radius
 * 32 px), dark inside so the white letter drawn on top stays readable.
 */
function crystalShotSprite(primary: string, accent: string): HTMLCanvasElement | null {
  const key = primary + accent;
  const cached = shotSprites.get(key);
  if (cached !== undefined) return cached;
  let canvas: HTMLCanvasElement | null = null;
  if (typeof document !== "undefined") {
    canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    if (context === null) canvas = null;
    else {
      const r = 32;
      context.translate(64, 64);
      context.globalCompositeOperation = "lighter";
      const halo = context.createRadialGradient(0, 0, 0, 0, 0, 62);
      halo.addColorStop(0, primary + "aa");
      halo.addColorStop(0.42, primary + "38");
      halo.addColorStop(1, primary + "00");
      context.fillStyle = halo;
      context.fillRect(-64, -64, 128, 128);
      context.globalCompositeOperation = "source-over";
      // Outline: long front tip, short back tip, two shoulders.
      const tip = [r * 1.32, 0];
      const back = [-r * 0.98, 0];
      const top = [r * 0.12, -r * 0.66];
      const bottom = [r * 0.12, r * 0.66];
      const topBack = [-r * 0.52, -r * 0.5];
      const bottomBack = [-r * 0.52, r * 0.5];
      const outline = [tip, top, topBack, back, bottomBack, bottom];
      context.beginPath();
      outline.forEach(([px, py], index) => (index === 0 ? context.moveTo(px!, py!) : context.lineTo(px!, py!)));
      context.closePath();
      context.fillStyle = "rgba(10, 6, 26, 0.86)";
      context.fill();
      // Facets: a lit upper face and a cooler lower face.
      context.globalCompositeOperation = "lighter";
      const face = (points: number[][], color: string, alpha: number) => {
        context.beginPath();
        points.forEach(([px, py], index) => (index === 0 ? context.moveTo(px!, py!) : context.lineTo(px!, py!)));
        context.closePath();
        context.globalAlpha = alpha;
        context.fillStyle = color;
        context.fill();
      };
      face([tip, top, [r * 0.12, -r * 0.18]], "#ffffff", 0.26);
      face([tip, bottom, [r * 0.12, r * 0.18]], accent, 0.2);
      face([back, topBack, [-r * 0.52, -r * 0.12]], primary, 0.22);
      context.globalAlpha = 1;
      const edge = context.createLinearGradient(-r, -r, r * 1.3, r);
      edge.addColorStop(0, primary);
      edge.addColorStop(0.55, "#ffffff");
      edge.addColorStop(1, accent);
      context.strokeStyle = edge;
      context.lineWidth = 3;
      context.lineJoin = "round";
      context.beginPath();
      outline.forEach(([px, py], index) => (index === 0 ? context.moveTo(px!, py!) : context.lineTo(px!, py!)));
      context.closePath();
      context.stroke();
      context.lineWidth = 1.2;
      context.globalAlpha = 0.7;
      context.beginPath();
      context.moveTo(tip[0]!, tip[1]!);
      context.lineTo(r * 0.12, 0);
      context.lineTo(back[0]!, back[1]!);
      context.moveTo(top[0]!, top[1]!);
      context.lineTo(bottom[0]!, bottom[1]!);
      context.stroke();
      context.globalAlpha = 1;
    }
  }
  shotSprites.set(key, canvas);
  return canvas;
}

/**
 * A boss shot as a glowing prism crystal with a short rainbow trail, at the
 * context origin, `radius` px, flying along `angle`. False without a DOM.
 */
export function drawBossCrystalShot(
  context: CanvasRenderingContext2D,
  radius: number,
  angle: number,
  palette: BossFxPalette,
  time: number,
  quality: VisualQuality,
): boolean {
  const sprite = crystalShotSprite(palette.primary, palette.accent);
  if (sprite === null) return false;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  context.save();
  context.globalCompositeOperation = "lighter";
  // Motion: a tapered light trail and rainbow glints falling behind it.
  drawGlow(context, palette.primary, 0, 0, radius * 2.3, 0.55);
  if (quality !== "low") drawShaft(context, palette.accent, 0, 0, angle - Math.PI / 2, radius * 5.2, radius * 1.5, 0.75);
  const trail = quality === "low" ? 2 : quality === "medium" ? 3 : 5;
  for (let step = 1; step <= trail; step += 1) {
    const back = radius * (0.7 + step * 0.62);
    const color = palette.colors[step % palette.colors.length]!;
    drawGlow(context, color, -cos * back, -sin * back, radius * (1.05 - step * 0.13), 0.7 - step * 0.1);
  }
  // A slow glint travelling over the facets.
  const glint = 0.5 + 0.5 * Math.sin(time * 6 + radius);
  context.globalCompositeOperation = "source-over";
  context.rotate(angle);
  const scale = radius / 32;
  context.drawImage(sprite, -64 * scale, -64 * scale, 128 * scale, 128 * scale);
  context.globalCompositeOperation = "lighter";
  drawStar(context, "#ffffff", radius * 0.95, -radius * 0.18, radius * (0.55 + glint * 0.35), 0.35 + glint * 0.35);
  context.restore();
  return true;
}

// --- Pooled effects ---------------------------------------------------------------------

type FxKind = "shard" | "spark" | "glint" | "streak" | "ring" | "flash" | "painted" | "shafts";

type Fx = {
  kind: FxKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Seconds left; starts at `max` (negative while delayed). */
  life: number;
  max: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
  gravity: number;
  drag: number;
  sprite: HTMLCanvasElement | null;
  /** Painted/ring/flash: growth from 1 at birth (× size). */
  grow: number;
  alpha: number;
};

type DeathSequence = {
  t: number;
  fired: number;
  size: number;
  palette: BossFxPalette;
  sockets: () => BossFxSockets | null;
  fallback: BossFxPoint;
};

type EntranceSequence = {
  t: number;
  palette: BossFxPalette;
  flashed: boolean;
};

export type BossFxEvent = { type: "death-blast"; x: number; y: number; final: boolean };

const CAP: Readonly<Record<VisualQuality, number>> = { low: 70, medium: 150, high: 240, ultra: 320 };
/** Death chain: [time, socket] — hands, halo, core, then the final blast. */
const DEATH_CHAIN: ReadonlyArray<readonly [number, keyof BossFxSockets]> = [
  [0.03, "core"],
  [0.12, "left"],
  [0.21, "right"],
  [0.32, "halo"],
  [0.44, "left"],
  [0.54, "right"],
  [0.66, "core"],
];
/** Seconds (effect time) from the killing blow to the final blast. */
export const BOSS_DEATH_FINAL_AT = 0.8;

export class BossFxLayer {
  private items: Fx[] = [];
  private deaths: DeathSequence[] = [];
  private entrance: EntranceSequence | null = null;
  private quality: VisualQuality = "high";
  private seed = 7;

  get active(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
    this.deaths = [];
    this.entrance = null;
  }

  private random(): number {
    this.seed += 1;
    return hash(this.seed * 0.731);
  }

  /** `delay` seconds before it appears (it waits with life > max). */
  private add(kind: FxKind, x: number, y: number, life: number, size: number, color: string, extra: Partial<Fx> = {}, delay = 0): void {
    if (this.items.length >= CAP[this.quality]) {
      // Drop the oldest small particle first; flashes and rings carry the read.
      const index = this.items.findIndex((item) => item.kind === "shard" || item.kind === "spark");
      this.items.splice(index >= 0 ? index : 0, 1);
    }
    this.items.push({
      kind,
      x,
      y,
      vx: 0,
      vy: 0,
      life: life + Math.max(0, delay),
      max: life,
      size,
      rotation: 0,
      spin: 0,
      color,
      gravity: 0,
      drag: 0.9,
      sprite: null,
      grow: 1,
      alpha: 1,
      ...extra,
    });
  }

  private shards(x: number, y: number, count: number, palette: BossFxPalette, speed: number, size: number, life: number, gravity: number): void {
    for (let index = 0; index < count; index += 1) {
      const angle = this.random() * TAU;
      const velocity = speed * (0.35 + this.random() * 0.85);
      this.add("shard", x, y, life * (0.65 + this.random() * 0.6), size * (0.55 + this.random() * 0.8), palette.colors[index % palette.colors.length]!, {
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - speed * 0.15,
        rotation: this.random() * TAU,
        spin: (this.random() - 0.5) * 14,
        gravity,
        drag: 0.93,
      });
    }
  }

  private sparks(x: number, y: number, count: number, color: string, speed: number, life: number, direction?: number, spread = TAU): void {
    for (let index = 0; index < count; index += 1) {
      const angle = direction === undefined ? this.random() * TAU : direction + (this.random() - 0.5) * spread;
      const velocity = speed * (0.45 + this.random() * 0.75);
      this.add("spark", x, y, life * (0.6 + this.random() * 0.6), 1.6 + this.random() * 1.4, color, {
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        gravity: 120,
        drag: 0.9,
      });
    }
  }

  private painted(id: PaintedId, tint: string | null, x: number, y: number, size: number, life: number, grow: number, alpha = 1, delay = 0): void {
    if (this.quality === "low") return;
    const sprite = paintedSprite(id, tint);
    if (sprite === null) return;
    this.add("painted", x, y, life, size, "#ffffff", { sprite, grow, rotation: this.random() * TAU, alpha }, delay);
  }

  // --- Events -----------------------------------------------------------------------------

  /** A bolt lands on the boss: white glint, crystal chips, a small ring. */
  // White is kept to small hot cores: big soft white glows washed the crystal
  // model out (the owner's earlier complaint); colour, glints, streaks, rings
  // and shards carry the energy instead.

  hit(x: number, y: number, palette: BossFxPalette, power: number, quality: VisualQuality): void {
    this.quality = quality;
    const k = Math.max(0.6, Math.min(1.8, power));
    this.add("flash", x, y, 0.14, 13 * k, palette.primary, { alpha: 0.7 });
    this.add("glint", x, y, 0.2, 24 * k, "#ffffff", { rotation: this.random() * 0.6, alpha: 0.9 });
    this.add("ring", x, y, 0.26, 24 * k, palette.accent);
    const chips = quality === "low" ? 3 : quality === "medium" ? 5 : 8;
    this.shards(x, y, Math.round(chips * k), palette, 210, 5, 0.42, 260);
    if (quality !== "low") this.sparks(x, y, Math.round(4 * k), "#ffffff", 300, 0.22);
    this.painted("spark-burst", palette.accent, x, y, 58 * k, 0.24, 1.5, 0.6);
  }

  /** A boss word lands (bigger): star flare, shards, a painted burst. */
  burst(x: number, y: number, palette: BossFxPalette, size: number, quality: VisualQuality): void {
    this.quality = quality;
    this.add("flash", x, y, 0.22, size * 0.13, "#ffffff", { alpha: 0.85 });
    this.add("flash", x, y, 0.4, size * 0.36, palette.primary, { alpha: 0.5 });
    this.add("glint", x, y, 0.32, size * 0.36, "#ffffff", { rotation: 0.2 });
    this.add("streak", x, y, 0.32, size * 1.5, palette.accent);
    this.add("ring", x, y, 0.4, size * 0.55, palette.primary);
    this.shards(x, y, quality === "low" ? 6 : quality === "medium" ? 10 : 16, palette, 260, 6.5, 0.7, 240);
    // Painted sparks, not the star burst: its white disc covered the chest.
    this.painted("spark-burst", palette.primary, x, y, size * 0.7, 0.3, 1.45, 0.7);
  }

  /** Light leaving a cast socket (volley shot, skill release). */
  muzzle(x: number, y: number, palette: BossFxPalette, direction: number, size: number, quality: VisualQuality): void {
    this.quality = quality;
    this.add("flash", x, y, 0.26, size * 1.9, palette.primary, { alpha: 0.8 });
    this.add("flash", x, y, 0.14, size * 0.55, "#ffffff");
    this.add("glint", x, y, 0.26, size * 1.8, "#ffffff", { rotation: direction });
    this.add("streak", x, y, 0.26, size * 5.2, palette.accent);
    this.add("ring", x, y, 0.3, size * 1.4, palette.accent);
    this.painted("spark-burst", palette.accent, x, y, size * 3, 0.24, 1.4, 0.6);
    if (quality !== "low") this.sparks(x, y, quality === "medium" ? 4 : 6, palette.accent, 280, 0.22, direction, 0.9);
  }

  /** A skill releases: a hard point of light at its source and a burst. */
  release(kind: BossSkillKind, sockets: BossFxSockets, size: number, palette: BossFxPalette, quality: VisualQuality): void {
    this.quality = quality;
    const sources: BossFxPoint[] =
      kind === "quake" ? [sockets.left, sockets.right] : kind === "tether" ? [sockets.left] : kind === "cataclysm" ? [sockets.halo] : [sockets.core];
    // Two sources (the quake's hands) overlap on the robe: keep each smaller.
    const k = sources.length > 1 ? 0.65 : 1;
    for (const point of sources) {
      this.add("flash", point.x, point.y, 0.16, size * 0.09 * k, "#ffffff");
      this.add("flash", point.x, point.y, 0.4, size * 0.24 * k, palette.primary, { alpha: 0.45 });
      this.add("glint", point.x, point.y, 0.3, size * 0.36 * k, "#ffffff", { rotation: 0.4 });
      this.add("streak", point.x, point.y, 0.3, size * 1.8, palette.accent);
      this.add("ring", point.x, point.y, 0.36, size * 0.48, palette.accent);
      if (quality !== "low") this.shards(point.x, point.y, quality === "medium" ? 5 : 9, palette, 230, 5, 0.5, 160);
    }
    // No shaft burst here: shafts rooted on the body hazed the whole model.
  }

  /** Entering a new phase: a flare, shock rings, shards, a burst of shafts. */
  phase(x: number, y: number, size: number, palette: BossFxPalette, enraged: boolean, quality: VisualQuality): void {
    this.quality = quality;
    const hot = enraged ? "#ff4d5e" : palette.primary;
    this.add("flash", x, y, 0.22, size * 0.14, "#ffffff");
    this.add("flash", x, y, 0.8, size * 0.62, hot, { alpha: 0.42 });
    this.add("glint", x, y, 0.45, size * 0.55, "#ffffff", { rotation: 0.25 });
    this.add("streak", x, y, 0.5, size * 3.2, enraged ? "#ffb066" : palette.accent);
    this.add("ring", x, y, 0.75, size * 1.25, hot);
    this.add("ring", x, y, 0.95, size * 1.8, palette.accent, {}, 0.12);
    this.add("shafts", x, y, 0.9, size * 1.9, hot);
    this.shards(x, y, quality === "low" ? 8 : quality === "medium" ? 14 : 22, palette, 320, 7, 0.9, 200);
    this.painted("shockwave-ring", enraged ? "#ff4d6d" : palette.primary, x, y, size * 1.3, 0.75, 2.2, 0.9);
  }

  /**
   * Death: crackling blasts hop across the sockets, then a final flash, a
   * painted shock ring, shard debris and a burst of light shafts. `sockets`
   * follows the breaking wreck. update() reports each blast (sound, shake).
   */
  death(x: number, y: number, size: number, palette: BossFxPalette, sockets: () => BossFxSockets | null, quality: VisualQuality): void {
    this.quality = quality;
    this.deaths.push({ t: 0, fired: 0, size, palette, sockets, fallback: { x, y } });
    this.add("flash", x, y, 0.22, size * 0.14, "#ffffff");
    this.add("glint", x, y, 0.32, size * 0.5, "#ffffff");
    this.add("streak", x, y, 0.3, size * 2.2, palette.accent);
  }

  /** Arrival: a rift and a light pillar at the boss, a flash as it emerges. */
  arrive(palette: BossFxPalette): void {
    this.entrance = { t: 0, palette, flashed: false };
  }

  private deathBlast(point: BossFxPoint, sequence: DeathSequence, final: boolean): void {
    const { size, palette } = sequence;
    const q = this.quality;
    if (!final) {
      this.add("flash", point.x, point.y, 0.16, size * 0.09, "#ffffff");
      this.add("flash", point.x, point.y, 0.34, size * 0.22, palette.colors[sequence.fired % palette.colors.length]!, { alpha: 0.7 });
      this.add("glint", point.x, point.y, 0.26, size * 0.26, "#ffffff", { rotation: this.random() });
      this.add("streak", point.x, point.y, 0.22, size * 1.1, palette.accent);
      this.add("ring", point.x, point.y, 0.3, size * 0.26, palette.primary);
      this.shards(point.x, point.y, q === "low" ? 4 : q === "medium" ? 7 : 11, palette, 260, 6, 0.6, 260);
      this.painted("spark-burst", palette.colors[sequence.fired % palette.colors.length]!, point.x, point.y, size * 0.4, 0.28, 1.4, 0.75);
      return;
    }
    // Short and tight, so the dissolving body shows right after it.
    this.add("flash", point.x, point.y, 0.2, size * 0.22, "#ffffff", { alpha: 0.9 });
    this.add("flash", point.x, point.y, 0.7, size * 0.75, palette.primary, { alpha: 0.45 });
    this.add("glint", point.x, point.y, 0.55, size * 0.8, "#ffffff", { rotation: 0.3 });
    this.add("streak", point.x, point.y, 0.7, size * 5, "#ffffff");
    this.add("streak", point.x, point.y, 0.9, size * 3.4, palette.accent);
    this.add("ring", point.x, point.y, 0.85, size * 1.5, "#ffffff");
    this.add("ring", point.x, point.y, 1.2, size * 2.3, palette.primary, {}, 0.1);
    this.add("shafts", point.x, point.y, 1.3, size * 2.6, palette.primary);
    this.shards(point.x, point.y, q === "low" ? 14 : q === "medium" ? 26 : 42, palette, 420, 9, 1.4, 300);
    if (q !== "low") this.sparks(point.x, point.y, q === "medium" ? 10 : 18, "#ffffff", 520, 0.6);
    this.painted("shockwave-ring", palette.primary, point.x, point.y, size * 1.5, 1.0, 2.6, 0.95);
    this.painted("shockwave-ring", palette.accent, point.x, point.y, size * 0.9, 0.7, 2.2, 0.6, 0.08);
  }

  // --- Simulation ---------------------------------------------------------------------------

  update(dt: number): BossFxEvent[] {
    const events: BossFxEvent[] = [];
    const step = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.1) : 0;
    let live = 0;
    for (const item of this.items) {
      item.life -= step;
      if (item.life <= 0) continue;
      // Delayed items (life > max) wait in place.
      if (item.life <= item.max) {
        const drag = Math.pow(item.drag, step * 60);
        item.vx *= drag;
        item.vy = item.vy * drag + item.gravity * step;
        item.x += item.vx * step;
        item.y += item.vy * step;
        item.rotation += item.spin * step;
      }
      this.items[live++] = item;
    }
    this.items.length = live;

    let deathLive = 0;
    for (const sequence of this.deaths) {
      sequence.t += step;
      const sockets = sequence.sockets();
      while (sequence.fired < DEATH_CHAIN.length && sequence.t >= DEATH_CHAIN[sequence.fired]![0]) {
        const socket = DEATH_CHAIN[sequence.fired]![1];
        const base = sockets?.[socket] ?? sequence.fallback;
        // Scatter repeated sockets a little so the chain walks over the body.
        const jitter = sequence.fired >= 4 ? sequence.size * 0.07 : 0;
        const point = { x: base.x + (this.random() - 0.5) * jitter * 2, y: base.y + (this.random() - 0.5) * jitter * 2 };
        this.deathBlast(point, sequence, false);
        events.push({ type: "death-blast", x: point.x, y: point.y, final: false });
        sequence.fired += 1;
      }
      if (sequence.fired === DEATH_CHAIN.length && sequence.t >= BOSS_DEATH_FINAL_AT) {
        const point = sockets?.core ?? sequence.fallback;
        this.deathBlast(point, sequence, true);
        events.push({ type: "death-blast", x: point.x, y: point.y, final: true });
        sequence.fired += 1;
      }
      if (sequence.fired <= DEATH_CHAIN.length) this.deaths[deathLive++] = sequence;
    }
    this.deaths.length = deathLive;

    if (this.entrance !== null) {
      this.entrance.t += step;
      if (this.entrance.t > 2.6) this.entrance = null;
    }
    return events;
  }

  // --- Drawing --------------------------------------------------------------------------------

  /**
   * Behind the boss: the arrival rift and pillar root. `boss` is where the
   * boss is drawn now (it flies in through the rift).
   */
  drawUnder(context: CanvasRenderingContext2D, boss: BossFxPoint, size: number, quality: VisualQuality): void {
    const entrance = this.entrance;
    if (entrance === null) return;
    const t = entrance.t;
    const open = clamp01(t / 0.35) * (1 - clamp01((t - 1.4) / 0.9));
    if (open <= 0.01) return;
    const { primary, accent } = entrance.palette;
    context.save();
    context.globalCompositeOperation = "lighter";
    // Rift: a flattened ring and a deep glow behind the arriving boss.
    const rx = size * (0.4 + 0.45 * clamp01(t / 0.6));
    drawGlow(context, primary, boss.x, boss.y, rx * 1.6, 0.5 * open);
    context.globalAlpha = 0.9 * open;
    context.strokeStyle = accent;
    context.lineWidth = 2.5;
    context.beginPath();
    context.ellipse(boss.x, boss.y + size * 0.05, rx, rx * 0.26, 0, 0, TAU);
    context.stroke();
    context.globalAlpha = 0.5 * open;
    context.lineWidth = 7;
    context.strokeStyle = primary;
    context.stroke();
    context.globalAlpha = 1;
    if (quality !== "low") {
      const shafts = quality === "medium" ? 6 : 9;
      for (let index = 0; index < shafts; index += 1) {
        const a = (index / shafts) * TAU + t * 0.6;
        drawShaft(context, index % 2 === 0 ? primary : accent, boss.x, boss.y, a, size * (1.1 + hash(index) * 0.9) * open, size * 0.35, 0.32 * open);
      }
    }
    context.restore();
  }

  /** Over the boss (after the model and its shots). */
  draw(context: CanvasRenderingContext2D, boss: BossFxPoint | null, size: number, quality: VisualQuality): void {
    this.quality = quality;
    const entrance = this.entrance;
    if (this.items.length === 0 && entrance === null && this.deaths.length === 0) return;
    context.save();
    context.globalCompositeOperation = "lighter";
    if (entrance !== null && boss !== null) this.drawArrival(context, entrance, boss, size);
    for (const sequence of this.deaths) this.drawDeathBuild(context, sequence);
    // Big soft light first, then painted blasts, rings, shards, sparks, glints.
    for (const item of this.items) {
      if (item.life > item.max) continue;
      const k = clamp01(item.life / item.max);
      const age = 1 - k;
      switch (item.kind) {
        case "flash":
          drawGlow(context, item.color, item.x, item.y, item.size * (0.75 + age * 0.5), k * k * item.alpha);
          break;
        case "shafts": {
          const count = quality === "low" ? 6 : quality === "medium" ? 9 : 14;
          const reach = item.size * (0.35 + 0.65 * (1 - (1 - age) * (1 - age)));
          for (let index = 0; index < count; index += 1) {
            const a = (index / count) * TAU + hash(index * 2.7 + item.x) * 0.5;
            const length = reach * (0.6 + hash(index * 1.3) * 0.6);
            drawShaft(context, index % 3 === 0 ? "#ffffff" : item.color, item.x, item.y, a, length, item.size * 0.16, k * 0.55);
          }
          break;
        }
        default:
          break;
      }
    }
    for (const item of this.items) {
      if (item.kind !== "painted" || item.sprite === null || item.life > item.max) continue;
      const k = clamp01(item.life / item.max);
      const age = 1 - k;
      const size = item.size * (1 + (item.grow - 1) * (1 - (1 - age) * (1 - age)));
      context.save();
      context.translate(item.x, item.y);
      context.rotate(item.rotation);
      context.globalAlpha = Math.min(1, k * 1.6) * item.alpha;
      context.drawImage(item.sprite, -size / 2, -size / 2, size, size);
      context.restore();
    }
    for (const item of this.items) {
      if (item.life > item.max) continue;
      const k = clamp01(item.life / item.max);
      const age = 1 - k;
      switch (item.kind) {
        case "ring": {
          const radius = 4 + item.size * (1 - (1 - age) * (1 - age));
          drawRingGlow(context, item.color, item.x, item.y, radius, k * 0.85);
          context.globalAlpha = k * 0.9;
          context.strokeStyle = item.color;
          context.lineWidth = Math.max(0.6, 3 * k);
          context.beginPath();
          context.arc(item.x, item.y, radius, 0, TAU);
          context.stroke();
          context.globalAlpha = 1;
          break;
        }
        case "shard":
          this.drawShard(context, item, Math.min(1, k * 1.8));
          break;
        case "spark": {
          const speed = Math.hypot(item.vx, item.vy) || 1;
          const length = Math.min(18, 3 + speed * 0.035);
          context.globalAlpha = Math.min(1, k * 1.5);
          context.strokeStyle = item.color;
          context.lineWidth = item.size;
          context.beginPath();
          context.moveTo(item.x, item.y);
          context.lineTo(item.x - (item.vx / speed) * length, item.y - (item.vy / speed) * length);
          context.stroke();
          context.globalAlpha = 1;
          break;
        }
        default:
          break;
      }
    }
    for (const item of this.items) {
      if (item.life > item.max) continue;
      const k = clamp01(item.life / item.max);
      if (item.kind === "glint") {
        // Pops open fast, then shrinks away while turning a little.
        const open = Math.min(1, (1 - k) * 6);
        drawStar(context, item.color, item.x, item.y, item.size * open * (0.6 + 0.4 * k), k, item.rotation + (1 - k) * 0.5);
      } else if (item.kind === "streak") {
        drawStreak(context, item.color, item.x, item.y, item.size * (0.6 + 0.4 * Math.min(1, (1 - k) * 5)), Math.max(3, item.size * 0.035), k);
      }
    }
    context.restore();
  }

  private drawShard(context: CanvasRenderingContext2D, item: Fx, alpha: number): void {
    const s = item.size;
    context.save();
    context.translate(item.x, item.y);
    context.rotate(item.rotation);
    context.globalAlpha = alpha;
    context.fillStyle = item.color;
    context.beginPath();
    context.moveTo(0, -s);
    context.lineTo(s * 0.36, -s * 0.1);
    context.lineTo(0, s * 0.62);
    context.lineTo(-s * 0.36, -s * 0.1);
    context.closePath();
    context.fill();
    // A white facet edge catches the light as it spins.
    context.globalAlpha = alpha * (0.45 + 0.45 * Math.abs(Math.sin(item.rotation * 2)));
    context.strokeStyle = "#ffffff";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(0, -s);
    context.lineTo(s * 0.36, -s * 0.1);
    context.stroke();
    context.restore();
    if (this.quality !== "low") drawGlow(context, item.color, item.x, item.y, s * 1.5, alpha * 0.35);
  }

  /** Before the final blast: the core swells with light and the wreck crackles. */
  private drawDeathBuild(context: CanvasRenderingContext2D, sequence: DeathSequence): void {
    if (sequence.t >= BOSS_DEATH_FINAL_AT) return;
    const k = clamp01(sequence.t / BOSS_DEATH_FINAL_AT);
    const sockets = sequence.sockets();
    const core = sockets?.core ?? sequence.fallback;
    const flicker = 0.75 + 0.25 * Math.sin(sequence.t * 60);
    drawGlow(context, "#ffffff", core.x, core.y, sequence.size * (0.05 + k * k * 0.12), (0.3 + k * 0.5) * flicker);
    drawGlow(context, sequence.palette.primary, core.x, core.y, sequence.size * (0.22 + k * 0.3), 0.16 + k * 0.24);
    drawStar(context, "#ffffff", core.x, core.y, sequence.size * (0.1 + k * 0.25), 0.4 + k * 0.5, sequence.t * 2);
    if (k > 0.55) drawStreak(context, "#ffffff", core.x, core.y, sequence.size * (0.6 + (k - 0.55) * 4), 6, (k - 0.55) * 1.8);
  }

  /** Over the boss while it arrives: the pillar it descends through, then a flash. */
  private drawArrival(context: CanvasRenderingContext2D, entrance: EntranceSequence, boss: BossFxPoint, size: number): void {
    const t = entrance.t;
    const pillar = clamp01(t / 0.25) * (1 - clamp01((t - 0.6) / 0.6)) * 0.65;
    const { primary, accent } = entrance.palette;
    if (pillar > 0.01) {
      // A light pillar from the top of the screen down to the boss.
      const width = size * (0.18 + 0.22 * pillar);
      const top = 0;
      const bottom = boss.y + size * 0.1;
      const gradient = context.createLinearGradient(boss.x - width, 0, boss.x + width, 0);
      gradient.addColorStop(0, "rgba(255,255,255,0)");
      gradient.addColorStop(0.5, "rgba(255,255,255," + (0.28 * pillar).toFixed(3) + ")");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = gradient;
      context.fillRect(boss.x - width, top, width * 2, bottom - top);
      context.globalAlpha = 0.55 * pillar;
      context.fillStyle = accent;
      context.fillRect(boss.x - 1.5, top, 3, bottom - top);
      context.globalAlpha = 1;
      drawGlow(context, primary, boss.x, bottom, size * 0.5, 0.5 * pillar);
    }
    // The flash when it breaks through (the first beat of the title card).
    const flash = t > 0.3 ? Math.max(0, 1 - (t - 0.3) / 0.45) : 0;
    if (flash > 0) {
      drawGlow(context, primary, boss.x, boss.y, size * (0.45 + (1 - flash) * 0.5), flash * 0.35);
      drawGlow(context, "#ffffff", boss.x, boss.y, size * 0.12, flash * 0.6);
      drawStreak(context, "#ffffff", boss.x, boss.y, size * (2.4 + (1 - flash) * 2.6), 7, flash);
      drawStar(context, "#ffffff", boss.x, boss.y, size * 0.55, flash);
    }
  }
}

// --- Persistent per-frame drawing (stateless) ---------------------------------------------

/**
 * Charge FX on the model while a skill winds up: light converging into the
 * sockets that will fire, growing orbs and glints there, and the halo
 * flaring. `progress` 0 … 1 through the telegraph; `strike` 0 … 1 through
 * its last moment (the authored strike), when everything tightens and
 * brightens.
 */
export function drawBossChargeFx(
  context: CanvasRenderingContext2D,
  kind: BossSkillKind,
  sockets: BossFxSockets,
  size: number,
  progress: number,
  strike: number,
  time: number,
  palette: BossFxPalette,
  quality: VisualQuality,
): void {
  const p = clamp01(progress);
  const s = clamp01(strike);
  const targets: BossFxPoint[] =
    kind === "quake" ? [sockets.left, sockets.right] : kind === "tether" ? [sockets.left] : kind === "cataclysm" ? [sockets.halo] : [sockets.core];
  const color = kind === "tether" || kind === "quake" ? palette.accent : kind === "cataclysm" ? "#ffb066" : palette.primary;
  const motes = quality === "low" ? 4 : quality === "medium" ? 8 : quality === "high" ? 12 : 16;
  context.save();
  context.globalCompositeOperation = "lighter";
  // Converging light: each mote falls into its socket on its own cycle.
  if (quality !== "low" && s < 0.6) {
    const reach = size * (kind === "cataclysm" ? 1.25 : 0.8);
    for (const [targetIndex, target] of targets.entries()) {
      for (let index = 0; index < motes; index += 1) {
        const seed = hash(index * 3.17 + targetIndex * 11.3);
        const cycle = (time * (0.9 + seed * 0.7) + seed) % 1;
        const angle = seed * TAU * 3 + targetIndex;
        const distance = reach * (1 - cycle) * (0.55 + hash(index * 1.9) * 0.45);
        const mx = target.x + Math.cos(angle) * distance;
        const my = target.y + Math.sin(angle) * distance * 0.8;
        const alpha = Math.sin(cycle * Math.PI) * (0.35 + p * 0.65) * (1 - s);
        const tail = 0.18 * distance;
        context.globalAlpha = alpha * 0.8;
        context.strokeStyle = palette.colors[(index + targetIndex) % palette.colors.length]!;
        context.lineWidth = 1.6;
        context.beginPath();
        context.moveTo(mx, my);
        context.lineTo(mx + Math.cos(angle) * tail, my + Math.sin(angle) * tail * 0.8);
        context.stroke();
        context.globalAlpha = 1;
        drawGlow(context, "#ffffff", mx, my, 3 + p * 2.5, alpha);
      }
    }
  }
  // Orbs at the firing sockets.
  // Orbs at the firing sockets: small hot cores with sharp glints, so the
  // model stays readable behind them.
  for (const target of targets) {
    const pulse = 0.85 + 0.15 * Math.sin(time * 18 + target.x);
    const radius = size * (0.022 + p * 0.032 + s * 0.026) * pulse;
    drawGlow(context, color, target.x, target.y, radius * 2.8, 0.22 + p * 0.3);
    drawGlow(context, "#ffffff", target.x, target.y, radius * 0.75, 0.55 + p * 0.45);
    drawStar(context, "#ffffff", target.x, target.y, radius * (2.4 + s * 2.2), 0.3 + p * 0.5 + s * 0.2, time * 1.2);
    if (s > 0) drawStreak(context, color, target.x, target.y, size * (0.4 + s * 1.4), 3 + s * 3, s);
  }
  // The halo flares for every skill (its "crown" lights up).
  if (kind !== "cataclysm") {
    const halo = sockets.halo;
    drawRingGlow(context, palette.accent, halo.x, halo.y, size * (0.06 + p * 0.06), 0.25 + p * 0.5);
    drawStreak(context, palette.accent, halo.x, halo.y, size * (0.25 + p * 0.65), 3 + p * 3, 0.2 + p * 0.5);
  } else {
    drawRingGlow(context, "#ffb066", sockets.halo.x, sockets.halo.y, size * (0.1 + p * 0.22), 0.4 + p * 0.5);
  }
  context.restore();
}

/** Rising heat sparks around a raging boss (behind the model). */
export function drawBossEnrage(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  time: number,
  strength: number,
  quality: VisualQuality,
): void {
  if (strength <= 0.01 || quality === "low") return;
  const count = quality === "medium" ? 10 : quality === "high" ? 16 : 22;
  context.save();
  context.globalCompositeOperation = "lighter";
  for (let index = 0; index < count; index += 1) {
    const seed = hash(index * 5.31);
    const p = (time * (0.35 + seed * 0.3) + seed) % 1;
    const px = x + (hash(index * 2.2) - 0.5) * size * 0.95 + Math.sin(time * 3 + index) * 5;
    const py = y + size * 0.35 - p * size * 0.95;
    const alpha = Math.sin(p * Math.PI) * strength;
    drawGlow(context, index % 3 === 0 ? "#ffb066" : "#ff4d5e", px, py, 6 + (1 - p) * 6, alpha * 0.8);
    drawGlow(context, "#fff0d0", px, py, 2 + (1 - p) * 1.5, alpha);
  }
  context.restore();
}
