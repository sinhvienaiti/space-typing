import type { EnemyKind } from "../types";
import type { EnemyFamilyId } from "./families";

/**
 * Painted enemy and boss art made outside the codebase (see
 * docs/art-requests/ENEMIES_BOSSES.md), prepared by `pnpm sprites:prepare`
 * into src/assets/{enemies,bosses}/<name>.webp and bundled at build time.
 *
 *   enemies/<family>-<kind>.webp   e.g. devil-sniper.webp  (preferred)
 *   enemies/<kind>.webp            one look for every family (fallback)
 *   bosses/<boss id>.webp          e.g. tyrant-g02.webp (src/boss/identity.ts)
 *
 * Missing art keeps the code-drawn body. Images load lazily (and are
 * preloaded per World), then are cached pre-scaled per on-screen size, so a
 * frame only copies small bitmaps.
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

function indexByName(files: Record<string, string>): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const [path, url] of Object.entries(files)) {
    map.set(path.slice(path.lastIndexOf("/") + 1).replace(/\.webp$/, ""), url);
  }
  return map;
}

const ENEMY_URLS = indexByName(ENEMY_FILES);
const BOSS_URLS = indexByName(BOSS_FILES);

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

/** Sprite names this build has (tests, QA). */
export function paintedSpriteNames(): { enemies: string[]; bosses: string[] } {
  return { enemies: [...ENEMY_URLS.keys()].sort(), bosses: [...BOSS_URLS.keys()].sort() };
}

export function hasPaintedEnemy(family: EnemyFamilyId, kind: EnemyKind): boolean {
  return ENEMY_URLS.has(family + "-" + kind) || ENEMY_URLS.has(kind);
}

/** The loaded painted sprite for this family and kind, or null. */
export function paintedEnemySprite(family: EnemyFamilyId, kind: EnemyKind): HTMLImageElement | null {
  return ready(ENEMY_URLS.get(family + "-" + kind)) ?? ready(ENEMY_URLS.get(kind));
}

export function paintedBossSprite(id: string): HTMLImageElement | null {
  return ready(BOSS_URLS.get(id));
}

/** Starts loading the art a World will need, so enemies never pop in. */
export function preloadPaintedSprites(families: readonly EnemyFamilyId[], kinds: readonly EnemyKind[], bossIds: readonly string[]): void {
  for (const family of families) {
    for (const kind of kinds) {
      const url = ENEMY_URLS.get(family + "-" + kind) ?? ENEMY_URLS.get(kind);
      if (url !== undefined) load(url);
    }
  }
  for (const id of bossIds) {
    const url = BOSS_URLS.get(id);
    if (url !== undefined) load(url);
  }
}

// --- Pre-scaled copies --------------------------------------------------------

type Scaled = { body: HTMLCanvasElement; flash: HTMLCanvasElement; lastUsed: number };
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
  context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
  // White silhouette for hit flashes (drawn additively over the body).
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
 * Draws a painted sprite centred on the origin, `size` px wide, with a white
 * hit flash (0–1) on top. `deviceScale` picks the cached resolution.
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
