import type {
  CreditCrystalTier,
  CreditCrystalVariant,
} from "../rewards/combat-credit-drops";
import type { VisualQuality } from "../types";
import { creditCrystalImage } from "./credit-crystal-art";

export type CreditCrystalDrawablePiece = {
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  vx: number;
  vy: number;
  radius: number;
  /** Screen rotation: tumbles while flying out, upright, then nose-first. */
  angle: number;
  anchor: boolean;
  /** Spin around the crystal's own vertical axis (drawn as a squash). */
  flip: number;
  /** 0–1, staggers the twinkle so pieces do not blink together. */
  twinkle: number;
  magnetic: boolean;
  /** Ring buffer of recent magnet positions, x/y pairs. */
  trail: Float32Array;
  trailLength: number;
  trailHead: number;
};

export type CreditCrystalDrawBurst = {
  tier: CreditCrystalTier;
  variant: CreditCrystalVariant;
  hero: boolean;
  age: number;
  scatterSeconds: number;
  hoverSeconds: number;
  phase: "scatter" | "hover" | "magnet";
  pieces: readonly CreditCrystalDrawablePiece[];
};

export type CreditPalette = {
  core: string;
  edge: string;
  glow: string;
  trail: string;
  /** "r,g,b" of the light the crystal throws (glow, trail, sparks). */
  light: string;
  /** "r,g,b" of the hot centre (flashes, glints). */
  hot: string;
};

const GOLDEN: CreditPalette = {
  core: "#fff4a8",
  edge: "#ffb323",
  glow: "rgba(255,199,64,.45)",
  trail: "rgba(255,232,150,.62)",
  light: "255,196,72",
  hot: "255,246,200",
};

const PALETTES: Readonly<Record<CreditCrystalTier, CreditPalette>> = {
  common: {
    core: "#c79cff",
    edge: "#7b49ff",
    glow: "rgba(152,91,255,.33)",
    trail: "rgba(194,157,255,.46)",
    light: "166,108,255",
    hot: "236,220,255",
  },
  refined: {
    core: "#bffcff",
    edge: "#9b62ff",
    glow: "rgba(124,232,255,.38)",
    trail: "rgba(184,248,255,.54)",
    light: "132,206,255",
    hot: "226,252,255",
  },
  high: {
    core: "#eef8ff",
    edge: "#6979ff",
    glow: "rgba(112,156,255,.44)",
    trail: "rgba(178,220,255,.62)",
    light: "118,150,255",
    hot: "236,246,255",
  },
  elite: {
    core: "#fff4ff",
    edge: "#df4cff",
    glow: "rgba(226,76,255,.48)",
    trail: "rgba(255,190,255,.66)",
    light: "224,92,255",
    hot: "255,236,255",
  },
  "mini-boss": {
    core: "#fff",
    edge: "#c943ff",
    glow: "rgba(216,88,255,.52)",
    trail: "rgba(255,202,255,.72)",
    light: "210,100,255",
    hot: "255,240,255",
  },
  boss: {
    core: "#fff",
    edge: "#8df4ff",
    glow: "rgba(204,89,255,.57)",
    trail: "rgba(207,246,255,.78)",
    light: "150,180,255",
    hot: "236,252,255",
  },
  "major-boss": {
    core: "#fff",
    edge: "#78f6ff",
    glow: "rgba(247,104,255,.62)",
    trail: "rgba(228,252,255,.84)",
    light: "190,140,255",
    hot: "244,252,255",
  },
};

export function creditPalette(
  tier: CreditCrystalTier,
  variant: CreditCrystalVariant,
): CreditPalette {
  return variant === "golden" ? GOLDEN : PALETTES[tier];
}

function qualityFxScale(quality: VisualQuality): number {
  switch (quality) {
    case "low":
      return 0;
    case "medium":
      return 0.65;
    case "high":
      return 0.9;
    case "ultra":
      return 1.15;
  }
}

/** Trail points drawn per quality (satellites draw 60 % of them). */
const TRAIL_POINTS: Readonly<Record<VisualQuality, number>> = {
  low: 0,
  medium: 5,
  high: 8,
  ultra: 10,
};

// --- Cached light sprites ----------------------------------------------------

type Canvas = HTMLCanvasElement | OffscreenCanvas;

function makeCanvas(size: number): Canvas | null {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(size, size);
  }
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    return canvas;
  }
  return null;
}

function context2d(canvas: Canvas): CanvasRenderingContext2D | null {
  return canvas.getContext("2d") as CanvasRenderingContext2D | null;
}

const glowCache = new Map<string, Canvas | null>();

/** Soft round light, full strength at the centre. */
export function creditGlowSprite(rgb: string): Canvas | null {
  const cached = glowCache.get(rgb);
  if (cached !== undefined) return cached;
  const size = 64;
  const canvas = makeCanvas(size);
  const g = canvas === null ? null : context2d(canvas);
  if (canvas !== null && g !== null) {
    const gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(" + rgb + ",1)");
    gradient.addColorStop(0.22, "rgba(" + rgb + ",.62)");
    gradient.addColorStop(0.5, "rgba(" + rgb + ",.2)");
    gradient.addColorStop(1, "rgba(" + rgb + ",0)");
    g.fillStyle = gradient;
    g.fillRect(0, 0, size, size);
  }
  glowCache.set(rgb, canvas);
  return canvas;
}

const starCache = new Map<string, Canvas | null>();

/** Four-point glint: white core, coloured rays. */
export function creditStarSprite(rgb: string): Canvas | null {
  const cached = starCache.get(rgb);
  if (cached !== undefined) return cached;
  const size = 96;
  const c = size / 2;
  const canvas = makeCanvas(size);
  const g = canvas === null ? null : context2d(canvas);
  if (canvas !== null && g !== null) {
    g.globalCompositeOperation = "lighter";
    const halo = g.createRadialGradient(c, c, 0, c, c, c * 0.42);
    halo.addColorStop(0, "rgba(255,255,255,1)");
    halo.addColorStop(0.25, "rgba(" + rgb + ",.75)");
    halo.addColorStop(1, "rgba(" + rgb + ",0)");
    g.fillStyle = halo;
    g.fillRect(0, 0, size, size);
    for (const [w, h, alpha] of [
      [c, 3.2, 1],
      [c * 0.62, 2, 0.7],
    ] as const) {
      for (const vertical of [false, true]) {
        const ray = vertical
          ? g.createLinearGradient(c, c - w, c, c + w)
          : g.createLinearGradient(c - w, c, c + w, c);
        ray.addColorStop(0, "rgba(" + rgb + ",0)");
        ray.addColorStop(0.5, "rgba(255,255,255," + alpha + ")");
        ray.addColorStop(1, "rgba(" + rgb + ",0)");
        g.fillStyle = ray;
        g.beginPath();
        if (vertical) {
          g.moveTo(c, c - w);
          g.lineTo(c + h, c);
          g.lineTo(c, c + w);
          g.lineTo(c - h, c);
        } else {
          g.moveTo(c - w, c);
          g.lineTo(c, c - h);
          g.lineTo(c + w, c);
          g.lineTo(c, c + h);
        }
        g.closePath();
        g.fill();
      }
    }
  }
  starCache.set(rgb, canvas);
  return canvas;
}

const SPRITE_BUCKETS = [16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512];
const spriteCache = new WeakMap<HTMLImageElement, Map<number, Canvas>>();

/**
 * The crystal art pre-shrunk by halves to the nearest size bucket, so a
 * 512 px painting drawn at 20 px stays crisp instead of shimmering.
 */
function crystalSprite(
  image: HTMLImageElement,
  devicePx: number,
): CanvasImageSource {
  const bucket =
    SPRITE_BUCKETS.find((size) => size >= devicePx) ??
    SPRITE_BUCKETS[SPRITE_BUCKETS.length - 1]!;
  if (bucket >= image.naturalWidth) return image;
  let sizes = spriteCache.get(image);
  if (sizes === undefined) {
    sizes = new Map();
    spriteCache.set(image, sizes);
  }
  const cached = sizes.get(bucket);
  if (cached !== undefined) return cached;

  let source: CanvasImageSource = image;
  let sourceSize = image.naturalWidth;
  while (sourceSize / 2 >= bucket) {
    const next = makeCanvas(Math.round(sourceSize / 2));
    const g = next === null ? null : context2d(next);
    if (next === null || g === null) return image;
    g.imageSmoothingQuality = "high";
    g.drawImage(source, 0, 0, next.width, next.height);
    source = next;
    sourceSize = next.width;
  }
  if (sourceSize !== bucket) {
    const final = makeCanvas(bucket);
    const g = final === null ? null : context2d(final);
    if (final === null || g === null) return source;
    g.imageSmoothingQuality = "high";
    g.drawImage(source, 0, 0, bucket, bucket);
    source = final;
  }
  sizes.set(bucket, source as Canvas);
  return source;
}

// --- Drawing -----------------------------------------------------------------

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Pops in past full size and settles (scale 0.25 → 1.22 → 1). */
function popScale(age: number): number {
  const t = clamp01(age / 0.24);
  if (t >= 1) return 1;
  const s = 2.2;
  const u = t - 1;
  const back = 1 + (s + 1) * u * u * u + s * u * u;
  return 0.25 + 0.75 * back;
}

function drawLight(
  context: CanvasRenderingContext2D,
  sprite: Canvas | null,
  x: number,
  y: number,
  size: number,
  alpha: number,
): void {
  if (sprite === null || alpha <= 0.01 || size <= 0.5) return;
  context.globalAlpha = Math.min(1, alpha);
  context.drawImage(sprite, x - size / 2, y - size / 2, size, size);
}

function drawBurstRelease(
  context: CanvasRenderingContext2D,
  burst: CreditCrystalDrawBurst,
  colors: CreditPalette,
  quality: VisualQuality,
): void {
  const fx = qualityFxScale(quality);
  if (fx <= 0 || burst.pieces.length === 0) return;

  const anchor =
    burst.pieces.find((piece) => piece.anchor) ??
    burst.pieces[0]!;
  const releaseAge = Math.min(1, burst.age / 0.38);
  const fade = Math.max(0, 1 - releaseAge);
  if (fade <= 0) return;

  const heroScale = burst.hero ? 1.55 : 1;
  context.globalCompositeOperation = "lighter";

  // Bright pop of light where the enemy broke open.
  const flash = clamp01(1 - burst.age / 0.13);
  if (flash > 0) {
    drawLight(
      context,
      creditGlowSprite(colors.hot),
      anchor.x,
      anchor.y,
      (40 + anchor.radius * 5) * heroScale * (0.7 + (1 - flash) * 0.8),
      flash * (burst.hero ? 0.95 : 0.75),
    );
  }

  const radius =
    (18 + anchor.radius * (1.7 + releaseAge * 2.6)) *
    heroScale *
    fx;
  context.globalAlpha = fade * (burst.hero ? 0.78 : 0.58) * fx;
  context.strokeStyle = colors.trail;
  context.lineWidth =
    Math.max(1.2, anchor.radius * 0.1) *
    (quality === "ultra" ? 1.5 : 1) *
    (0.4 + fade * 0.9);
  context.beginPath();
  context.arc(anchor.x, anchor.y, radius, 0, Math.PI * 2);
  context.stroke();
  if (quality !== "medium") {
    context.globalAlpha = fade * fade * 0.5 * fx;
    context.lineWidth = 1;
    context.beginPath();
    context.arc(anchor.x, anchor.y, radius * 0.62, 0, Math.PI * 2);
    context.stroke();
  }

  const rayCount =
    quality === "medium"
      ? 5
      : quality === "high"
        ? 8
        : 12;
  const rayLength =
    anchor.radius *
    (burst.hero ? 3.2 : 2.5) *
    (0.75 + releaseAge * 0.6);
  context.lineWidth = quality === "ultra" ? 1.8 : 1.2;
  context.globalAlpha = fade * (burst.hero ? 0.8 : 0.62) * fx;
  for (let index = 0; index < rayCount; index += 1) {
    const angle =
      (index / rayCount) * Math.PI * 2 +
      burst.age * (burst.hero ? 1.4 : 2.2);
    const inner = anchor.radius * (0.7 + releaseAge * 1.2);
    const outer = inner + rayLength * (0.55 + (index % 3) * 0.16);
    context.beginPath();
    context.moveTo(
      anchor.x + Math.cos(angle) * inner,
      anchor.y + Math.sin(angle) * inner,
    );
    context.lineTo(
      anchor.x + Math.cos(angle) * outer,
      anchor.y + Math.sin(angle) * outer,
    );
    context.stroke();
  }
  context.globalCompositeOperation = "source-over";
}

/** Loot pillar over boss and golden drops (Diablo-style), first ~1.1 s. */
function drawLootBeam(
  context: CanvasRenderingContext2D,
  burst: CreditCrystalDrawBurst,
  colors: CreditPalette,
  quality: VisualQuality,
): void {
  if (quality === "low" || burst.age > 1.15) return;
  const anchor = burst.pieces.find((piece) => piece.anchor);
  if (anchor === undefined || anchor.magnetic) return;
  const rise = clamp01(burst.age / 0.1);
  const fall = clamp01((1.15 - burst.age) / 0.45);
  const alpha = rise * fall * (quality === "ultra" ? 0.9 : 0.7);
  if (alpha <= 0.01) return;

  const width = Math.max(14, anchor.radius * 1.5) * (0.6 + rise * 0.4);
  const height = 150 + anchor.radius * 5;
  const top = anchor.y - height;
  context.globalCompositeOperation = "lighter";
  context.globalAlpha = alpha;
  const column = context.createLinearGradient(0, top, 0, anchor.y + 16);
  column.addColorStop(0, "rgba(" + colors.light + ",0)");
  column.addColorStop(0.55, "rgba(" + colors.light + ",.42)");
  column.addColorStop(0.9, "rgba(" + colors.hot + ",.9)");
  column.addColorStop(1, "rgba(" + colors.hot + ",0)");
  context.fillStyle = column;
  context.beginPath();
  context.moveTo(anchor.x - width * 0.18, top);
  context.lineTo(anchor.x + width * 0.18, top);
  context.lineTo(anchor.x + width * 0.5, anchor.y + 16);
  context.lineTo(anchor.x - width * 0.5, anchor.y + 16);
  context.closePath();
  context.fill();
  // White hot core line.
  context.globalAlpha = alpha * 0.8;
  context.fillStyle = column;
  context.fillRect(anchor.x - width * 0.07, top + height * 0.2, width * 0.14, height * 0.8 + 10);
  drawLight(
    context,
    creditGlowSprite(colors.light),
    anchor.x,
    anchor.y,
    anchor.radius * 6,
    alpha * 0.55,
  );
  context.globalCompositeOperation = "source-over";
}

const streakCache = new Map<string, Canvas | null>();

/** Tapered comet tail, bright head on the right, fading to the left. */
function streakSprite(colors: CreditPalette): Canvas | null {
  const key = colors.light + "|" + colors.hot;
  const cached = streakCache.get(key);
  if (cached !== undefined) return cached;
  const width = 128;
  const height = 32;
  const canvas = makeCanvas(width);
  if (canvas !== null) {
    canvas.width = width;
    canvas.height = height;
  }
  const g = canvas === null ? null : context2d(canvas);
  if (canvas !== null && g !== null) {
    const fade = g.createLinearGradient(0, 0, width, 0);
    fade.addColorStop(0, "rgba(" + colors.light + ",0)");
    fade.addColorStop(0.6, "rgba(" + colors.light + ",.55)");
    fade.addColorStop(0.92, "rgba(" + colors.hot + ",.95)");
    fade.addColorStop(1, "rgba(" + colors.hot + ",0)");
    g.fillStyle = fade;
    g.beginPath();
    g.moveTo(0, height / 2);
    g.quadraticCurveTo(width * 0.7, 2, width - 4, height * 0.25);
    g.arc(width - 4 - height * 0.25, height / 2, height * 0.25, -Math.PI / 2, Math.PI / 2);
    g.quadraticCurveTo(width * 0.7, height - 2, 0, height / 2);
    g.closePath();
    g.fill();
  }
  streakCache.set(key, canvas);
  return canvas;
}

type Pose = {
  size: number;
  /** Final canvas transform (base × translate × rotate × scale). */
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  settle: number;
  face: number;
  twinkle: number;
  hero: boolean;
};

type Base = { a: number; b: number; c: number; d: number; e: number; f: number };

const pose: Pose = {
  size: 0, a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
  settle: 0, face: 1, twinkle: 0, hero: false,
};

function poseFor(
  piece: CreditCrystalDrawablePiece,
  burst: CreditCrystalDrawBurst,
  base: Base,
): Pose {
  const r = piece.radius;
  const age = burst.age;
  // Small shards are drawn a little larger so they read as gems.
  const boost = 1.3 * (1 + 0.3 * clamp01((20 - r) / 16));
  pose.size = r * 2.15 * boost * popScale(age);
  pose.settle = clamp01(
    (age - burst.scatterSeconds * 0.6) /
      Math.max(0.08, burst.hoverSeconds + burst.scatterSeconds * 0.4),
  );
  pose.face = Math.abs(Math.cos(piece.flip));
  pose.twinkle =
    0.5 + 0.5 * Math.sin(age * (piece.anchor ? 6 : 9) + piece.twinkle * 6.28);
  pose.hero = burst.hero && piece.anchor;
  // Spin around its own vertical axis reads as a squash in width.
  const sx = 1 - pose.settle * (1 - (0.46 + 0.54 * pose.face));
  const speed = piece.magnetic ? Math.hypot(piece.vx, piece.vy) : 0;
  const sy = 1 + Math.min(0.18, speed / 4000);
  const cos = Math.cos(piece.angle);
  const sin = Math.sin(piece.angle);
  // Local matrix: translate(x, y) · rotate(angle) · scale(sx, sy).
  const la = cos * sx;
  const lb = sin * sx;
  const lc = -sin * sy;
  const ld = cos * sy;
  pose.a = base.a * la + base.c * lb;
  pose.b = base.b * la + base.d * lb;
  pose.c = base.a * lc + base.c * ld;
  pose.d = base.b * lc + base.d * ld;
  pose.e = base.a * piece.x + base.c * piece.y + base.e;
  pose.f = base.b * piece.x + base.d * piece.y + base.f;
  return pose;
}

/** Comet tail behind a crystal flying to the ship, capped in pixels. */
function drawTrail(
  context: CanvasRenderingContext2D,
  piece: CreditCrystalDrawablePiece,
  colors: CreditPalette,
  quality: VisualQuality,
  base: Base,
): void {
  const wanted = Math.round(
    TRAIL_POINTS[quality] * (piece.anchor ? 1 : 0.6),
  );
  const count = Math.min(piece.trailLength, wanted);
  if (count < 1) return;
  const sprite = streakSprite(colors);
  if (sprite === null) return;

  // Walk back through the samples until the tail is long enough.
  const maxLength =
    (piece.anchor ? 34 + piece.radius * 2.6 : 22 + piece.radius * 2.2) *
    (quality === "ultra" ? 1.2 : quality === "medium" ? 0.75 : 1);
  const capacity = piece.trail.length / 2;
  let lastX = piece.x;
  let lastY = piece.y;
  let tailX = piece.x;
  let tailY = piece.y;
  let travelled = 0;
  for (let i = 0; i < count; i += 1) {
    const slot = ((piece.trailHead - 1 - i + capacity * 2) % capacity) * 2;
    const x = piece.trail[slot]!;
    const y = piece.trail[slot + 1]!;
    const step = Math.hypot(x - lastX, y - lastY);
    if (step < 0.01) continue;
    if (travelled + step >= maxLength) {
      const keep = (maxLength - travelled) / step;
      tailX = lastX + (x - lastX) * keep;
      tailY = lastY + (y - lastY) * keep;
      travelled = maxLength;
      break;
    }
    travelled += step;
    tailX = lastX = x;
    tailY = lastY = y;
  }
  if (travelled < 3) return;

  const width =
    Math.max(3, piece.radius * (piece.anchor ? 1.15 : 1)) *
    (quality === "ultra" ? 1.25 : 1);
  const dx = (piece.x - tailX) / travelled;
  const dy = (piece.y - tailY) / travelled;
  // Sprite x runs tail → head along the flight; y across it.
  const la = dx;
  const lb = dy;
  const lc = -dy;
  const ld = dx;
  context.setTransform(
    base.a * la + base.c * lb,
    base.b * la + base.d * lb,
    base.a * lc + base.c * ld,
    base.b * lc + base.d * ld,
    base.a * piece.x + base.c * piece.y + base.e,
    base.b * piece.x + base.d * piece.y + base.f,
  );
  context.globalAlpha = piece.anchor ? 1 : 0.85;
  const head = width * 0.5;
  context.drawImage(sprite, -travelled - head * 0.2, -width / 2, travelled + head, width);
}

function drawFallbackShape(
  context: CanvasRenderingContext2D,
  r: number,
  colors: CreditPalette,
  hero: boolean,
): void {
  context.fillStyle = colors.edge;
  context.beginPath();
  context.moveTo(0, -r);
  context.lineTo(r * 0.72, -r * 0.18);
  context.lineTo(r * 0.42, r);
  context.lineTo(-r * 0.46, r * 0.88);
  context.lineTo(-r * 0.74, -r * 0.16);
  context.closePath();
  context.fill();

  context.fillStyle = colors.core;
  context.globalAlpha = 0.92;
  context.beginPath();
  context.moveTo(0, -r * 0.82);
  context.lineTo(r * 0.44, -r * 0.12);
  context.lineTo(0, r * 0.62);
  context.lineTo(-r * 0.32, -r * 0.08);
  context.closePath();
  context.fill();

  context.strokeStyle = "rgba(255,255,255,.82)";
  context.lineWidth = hero ? 1.5 : 1;
  context.beginPath();
  context.moveTo(-r * 0.28, -r * 0.18);
  context.lineTo(0, -r * 0.72);
  context.lineTo(r * 0.24, -r * 0.2);
  context.stroke();
}

export function drawCreditCrystalBursts(
  context: CanvasRenderingContext2D,
  bursts: readonly CreditCrystalDrawBurst[],
  quality: VisualQuality,
): void {
  if (bursts.length === 0) return;
  context.save();
  context.lineCap = "round";
  const matrix =
    typeof context.getTransform === "function"
      ? context.getTransform()
      : null;
  const base: Base =
    matrix === null
      ? { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
      : { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d, e: matrix.e, f: matrix.f };
  const deviceScale = Math.max(1, Math.hypot(base.a, base.b));
  const resetTransform = (): void =>
    context.setTransform(base.a, base.b, base.c, base.d, base.e, base.f);
  const fancy = quality !== "low";

  // Pass 1, additive: release rings, loot beams, comet tails, gem glow.
  if (fancy) {
    for (const burst of bursts) {
      const colors = creditPalette(burst.tier, burst.variant);
      drawBurstRelease(context, burst, colors, quality);
      if (burst.hero || burst.variant === "golden") {
        drawLootBeam(context, burst, colors, quality);
      }
    }
    context.globalCompositeOperation = "lighter";
    for (const burst of bursts) {
      const colors = creditPalette(burst.tier, burst.variant);
      for (const piece of burst.pieces) {
        if (piece.magnetic) drawTrail(context, piece, colors, quality, base);
      }
    }
    resetTransform();
    for (const burst of bursts) {
      const glow = creditGlowSprite(creditPalette(burst.tier, burst.variant).light);
      if (glow === null) continue;
      for (const piece of burst.pieces) {
        const p = poseFor(piece, burst, base);
        const size = p.size * (p.hero ? 2.3 : 1.9);
        context.globalAlpha = (p.hero ? 0.62 : 0.42) * (0.75 + p.twinkle * 0.25);
        context.drawImage(glow, piece.x - size / 2, piece.y - size / 2, size, size);
      }
    }
  }

  // Pass 2, normal: the crystals themselves.
  context.globalCompositeOperation = "source-over";
  context.globalAlpha = 1;
  for (const burst of bursts) {
    const colors = creditPalette(burst.tier, burst.variant);
    const image = creditCrystalImage(burst.tier, burst.variant, quality);
    for (const piece of burst.pieces) {
      const p = poseFor(piece, burst, base);
      context.setTransform(p.a, p.b, p.c, p.d, p.e, p.f);
      if (image !== null) {
        const sprite = crystalSprite(image, p.size * deviceScale);
        context.drawImage(sprite, -p.size / 2, -p.size / 2, p.size, p.size);
      } else {
        drawFallbackShape(context, p.size / 2.15, colors, p.hero);
        context.globalAlpha = 1;
      }
    }
  }

  // Pass 3, additive: white-hot birth flash, hero sweep, glints, twinkles.
  if (fancy) {
    context.globalCompositeOperation = "lighter";
    for (const burst of bursts) {
      const colors = creditPalette(burst.tier, burst.variant);
      const image = creditCrystalImage(burst.tier, burst.variant, quality);
      const hot = clamp01(1 - burst.age / 0.14);
      const star = creditStarSprite(colors.light);
      for (const piece of burst.pieces) {
        const p = poseFor(piece, burst, base);
        const half = p.size / 2;
        if ((hot > 0 && image !== null) || (p.hero && quality !== "medium")) {
          context.setTransform(p.a, p.b, p.c, p.d, p.e, p.f);
          if (hot > 0 && image !== null) {
            context.globalAlpha = hot * 0.85;
            context.drawImage(crystalSprite(image, p.size * deviceScale), -half, -half, p.size, p.size);
          }
          if (p.hero && quality !== "medium") {
            const sweep = ((burst.age * 2.6) % 1) * 2 - 1;
            context.globalAlpha = quality === "ultra" ? 0.9 : 0.68;
            context.strokeStyle = "#fff";
            context.lineWidth = quality === "ultra" ? 2.1 : 1.4;
            context.beginPath();
            context.moveTo(sweep * half - half * 0.18, -half * 0.7);
            context.lineTo(sweep * half + half * 0.2, half * 0.72);
            context.stroke();
          }
          resetTransform();
        }
        if (star === null) continue;

        // Glint when a facet turns square to the camera.
        if (p.settle > 0.4 && (piece.anchor || quality !== "medium")) {
          const glint = clamp01((p.face - 0.9) / 0.1) * p.settle;
          if (glint > 0.02) {
            const offset = p.size * 0.2;
            const size = p.size * (piece.anchor ? 1.25 : 1);
            context.globalAlpha = glint * (quality === "ultra" ? 1 : 0.8);
            context.drawImage(
              star,
              piece.x + Math.sin(piece.angle) * offset - size / 2,
              piece.y - Math.cos(piece.angle) * offset - size / 2,
              size,
              size,
            );
          }
        }

        // Free twinkles orbiting the bigger crystals before they fly home.
        if (
          quality !== "medium" &&
          !piece.magnetic &&
          (piece.anchor || piece.twinkle > 0.66)
        ) {
          const alpha =
            (quality === "ultra" ? 0.85 : 0.6) *
            (piece.anchor ? 1 : 0.7) *
            Math.max(0, p.twinkle * 1.4 - 0.4);
          if (alpha > 0.05) {
            const angle = piece.twinkle * 6.28 + burst.age * 1.9;
            const offset = p.size * (piece.anchor ? 0.48 : 0.38);
            const size = Math.max(8, p.size * (piece.anchor ? 0.55 : 0.45));
            context.globalAlpha = alpha;
            context.drawImage(
              star,
              piece.x + Math.cos(angle) * offset - size / 2,
              piece.y + Math.sin(angle) * offset - size / 2,
              size,
              size,
            );
          }
        }
      }
    }
  }
  context.restore();
}
