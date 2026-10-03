import type { EnemyKind, VisualQuality } from "../types";
import type { EnemyFamilyId } from "./families";

/**
 * Painted enemy and boss art made outside the codebase (see
 * docs/art-requests/ENEMIES_BOSSES.md), prepared by `pnpm sprites:prepare`.
 *
 * Standard:
 *   enemies/<family>-<kind>.webp
 *   bosses/<boss id>.webp
 *
 * Detailed High/Ultra companion:
 *   enemies/<family>-<kind>@2x.webp
 *   bosses/<boss id>@2x.webp
 *
 * Missing detailed art falls back to the standard sprite. Missing painted art
 * entirely keeps the code-drawn body. Images load lazily, are preloaded per
 * World/quality tier and are cached pre-scaled per on-screen size.
 */
const ENEMY_FILES = import.meta.glob<string>("../assets/enemies/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});
const BOSS_FILES = import.meta.glob<string>("../assets/bosses/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

type SpriteVariants = {
  standard?: string;
  detailed?: string;
};

function indexVariants(
  files: Record<string, string>,
): ReadonlyMap<string, SpriteVariants> {
  const map = new Map<string, SpriteVariants>();
  for (const [path, url] of Object.entries(files)) {
    const stem = path
      .slice(path.lastIndexOf("/") + 1)
      .replace(/\.webp$/, "");
    const detailed = stem.endsWith("@2x");
    const name = detailed ? stem.slice(0, -3) : stem;
    const previous = map.get(name) ?? {};
    map.set(
      name,
      detailed
        ? { ...previous, detailed: url }
        : { ...previous, standard: url },
    );
  }
  return map;
}

const ENEMY_URLS = indexVariants(ENEMY_FILES);
const BOSS_URLS = indexVariants(BOSS_FILES);

function preferredUrl(
  variants: SpriteVariants | undefined,
  quality: VisualQuality,
): string | undefined {
  if (variants === undefined) return undefined;
  if (quality === "high" || quality === "ultra") {
    return variants.detailed ?? variants.standard;
  }
  return variants.standard ?? variants.detailed;
}

function fallbackUrl(
  variants: SpriteVariants | undefined,
  preferred: string | undefined,
): string | undefined {
  if (variants === undefined) return undefined;
  if (preferred === variants.detailed) return variants.standard;
  if (preferred === variants.standard) return variants.detailed;
  return variants.standard ?? variants.detailed;
}

type Loaded = { image: HTMLImageElement; ready: boolean; failed: boolean };
const images = new Map<string, Loaded>();

function load(url: string): Loaded | null {
  if (typeof Image === "undefined") return null;
  let entry = images.get(url);
  if (entry === undefined) {
    const image = new Image();
    image.decoding = "async";
    entry = { image, ready: false, failed: false };
    const loaded = entry;
    image.onload = () => {
      loaded.ready = true;
    };
    image.onerror = () => {
      loaded.failed = true;
    };
    image.src = url;
    images.set(url, entry);
  }
  return entry;
}

function ready(url: string | undefined): HTMLImageElement | null {
  if (url === undefined) return null;
  const entry = load(url);
  return entry !== null && entry.ready && !entry.failed ? entry.image : null;
}

function readyVariant(
  variants: SpriteVariants | undefined,
  quality: VisualQuality,
): HTMLImageElement | null {
  const preferred = preferredUrl(variants, quality);
  return ready(preferred) ?? ready(fallbackUrl(variants, preferred));
}

/** Logical sprite names this build has (tests, QA); @2x is not a new enemy. */
export function paintedSpriteNames(): { enemies: string[]; bosses: string[] } {
  return {
    enemies: [...ENEMY_URLS.keys()].sort(),
    bosses: [...BOSS_URLS.keys()].sort(),
  };
}

export function hasPaintedEnemy(
  family: EnemyFamilyId,
  kind: EnemyKind,
): boolean {
  return ENEMY_URLS.has(family + "-" + kind) || ENEMY_URLS.has(kind);
}

/** Loaded painted sprite for this family/kind, preferring the quality tier. */
export function paintedEnemySprite(
  family: EnemyFamilyId,
  kind: EnemyKind,
  quality: VisualQuality,
): HTMLImageElement | null {
  return (
    readyVariant(ENEMY_URLS.get(family + "-" + kind), quality) ??
    readyVariant(ENEMY_URLS.get(kind), quality)
  );
}

/** URL of the sharpest boss painting (for the 3D relief, src/boss/boss-relief.ts). */
export function paintedBossArtUrl(id: string): string | undefined {
  const variants = BOSS_URLS.get(id);
  return variants?.detailed ?? variants?.standard;
}

export function paintedBossSprite(
  id: string,
  quality: VisualQuality,
): HTMLImageElement | null {
  return readyVariant(BOSS_URLS.get(id), quality);
}

/** Starts loading the art a World will need before its first spawn. */
export function preloadPaintedSprites(
  families: readonly EnemyFamilyId[],
  kinds: readonly EnemyKind[],
  bossIds: readonly string[],
  quality: VisualQuality,
): void {
  for (const family of families) {
    for (const kind of kinds) {
      const variants =
        ENEMY_URLS.get(family + "-" + kind) ??
        ENEMY_URLS.get(kind);
      const url = preferredUrl(variants, quality);
      if (url !== undefined) load(url);
    }
  }
  for (const id of bossIds) {
    const url = preferredUrl(BOSS_URLS.get(id), quality);
    if (url !== undefined) load(url);
  }
}

// --- Pre-scaled copies --------------------------------------------------------

type Scaled = {
  body: HTMLCanvasElement;
  flash: HTMLCanvasElement;
  lastUsed: number;
};
const scaled = new Map<string, Scaled>();
let tick = 0;
const SCALED_LIMIT = 72;

function scaledCopy(image: HTMLImageElement, pixels: number): Scaled | null {
  if (typeof document === "undefined") return null;
  const size = Math.max(16, Math.min(1024, Math.round(pixels / 8) * 8));
  const key = image.src + "@" + size;
  const cached = scaled.get(key);
  if (cached !== undefined) {
    cached.lastUsed = ++tick;
    return cached;
  }

  const body = document.createElement("canvas");
  body.width = size;
  body.height = size;
  const context = body.getContext("2d");
  if (context === null) return null;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const aspect = image.naturalWidth / Math.max(1, image.naturalHeight);
  const width = aspect >= 1 ? size : size * aspect;
  const height = aspect >= 1 ? size / aspect : size;
  context.drawImage(
    image,
    (size - width) / 2,
    (size - height) / 2,
    width,
    height,
  );

  const flash = document.createElement("canvas");
  flash.width = size;
  flash.height = size;
  const flashContext = flash.getContext("2d");
  if (flashContext !== null) {
    flashContext.drawImage(body, 0, 0);
    flashContext.globalCompositeOperation = "source-in";
    flashContext.fillStyle = "#ffffff";
    flashContext.fillRect(0, 0, size, size);
  }

  if (scaled.size >= SCALED_LIMIT) {
    let oldest: string | null = null;
    let oldestTick = Infinity;
    for (const [candidate, entry] of scaled) {
      if (entry.lastUsed < oldestTick) {
        oldest = candidate;
        oldestTick = entry.lastUsed;
      }
    }
    if (oldest !== null) scaled.delete(oldest);
  }

  const entry = { body, flash, lastUsed: ++tick };
  scaled.set(key, entry);
  return entry;
}

/**
 * Draws a painted sprite centred on the origin, `size` CSS px wide. DPR only
 * controls the pre-scaled cache resolution; the source variant is selected
 * separately from the user's quality setting.
 */
export function drawPaintedSprite(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  size: number,
  flash: number,
  deviceScale: number,
): boolean {
  const copy = scaledCopy(image, size * Math.max(1, deviceScale));
  if (copy === null) return false;

  const previous = context.globalCompositeOperation;
  context.globalCompositeOperation = "source-over";
  context.drawImage(copy.body, -size / 2, -size / 2, size, size);
  if (flash > 0.02) {
    const alpha = context.globalAlpha;
    context.globalCompositeOperation = "lighter";
    context.globalAlpha = alpha * Math.min(1, flash) * 0.55;
    context.drawImage(copy.flash, -size / 2, -size / 2, size, size);
    context.globalAlpha = alpha;
  }
  context.globalCompositeOperation = previous;
  return true;
}
