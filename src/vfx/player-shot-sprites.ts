/**
 * Painted shot sprites made by the owner (Gemini) and processed by
 * scripts/bg-art/prepare-fx.mjs into public/assets/space-typing/fx/<fx>/.
 * Every sprite is additive light on pure black, projectiles and muzzle flashes
 * pointing right; `anchor` is the point pinned to the bolt head, the muzzle or
 * the impact. Missing or broken art leaves the code-drawn look in place.
 */

export const SHOT_FX_ROOT = "/assets/space-typing/fx";

export const SHOT_SPRITE_IDS = ["bolt", "finisher", "impact", "muzzle"] as const;
export type ShotSpriteId = (typeof SHOT_SPRITE_IDS)[number];

export type ShotSpriteSpec = {
  url: string;
  sha256: string;
  width: number;
  height: number;
  /** Fractions of the sprite: the pinned point. */
  anchor: readonly [number, number];
};

export type ShotFxManifest = {
  id: string;
  version: number;
  sprites: Partial<Record<ShotSpriteId, ShotSpriteSpec>>;
};

export type ShotSprite = {
  image: CanvasImageSource;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
};

export type ShotSpriteSet = Partial<Record<ShotSpriteId, ShotSprite>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function unit(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

/** Strict fx.json parser; anything unexpected rejects the whole set. */
export function parseShotFx(value: unknown, fx: string): ShotFxManifest | null {
  if (!isRecord(value) || value["id"] !== fx) return null;
  const version = value["version"];
  const rawSprites = value["sprites"];
  if (typeof version !== "number" || !Number.isFinite(version) || !isRecord(rawSprites)) return null;
  const sprites: Partial<Record<ShotSpriteId, ShotSpriteSpec>> = {};
  for (const [id, raw] of Object.entries(rawSprites)) {
    if (!(SHOT_SPRITE_IDS as readonly string[]).includes(id) || !isRecord(raw)) return null;
    const { url, sha256, width, height, anchor } = raw;
    if (typeof url !== "string" || url.length === 0 || url.includes("..") || url.includes("/")) return null;
    if (typeof sha256 !== "string" || !/^[0-9a-f]{64}$/.test(sha256)) return null;
    if (!positive(width) || !positive(height)) return null;
    if (!Array.isArray(anchor) || anchor.length !== 2 || !unit(anchor[0]) || !unit(anchor[1])) return null;
    sprites[id as ShotSpriteId] = {
      url: SHOT_FX_ROOT + "/" + fx + "/" + url + "?v=" + sha256.slice(0, 16),
      sha256,
      width,
      height,
      anchor: [anchor[0], anchor[1]],
    };
  }
  return { id: fx, version, sprites };
}

/**
 * Head sprite for a bolt: finishing shots prefer the heavy lance, normal
 * shots the light bolt, each falling back to the other.
 */
export function pickHeadSprite(set: ShotSpriteSet | null, finisher: boolean): ShotSprite | null {
  if (set === null) return null;
  return (finisher ? set.finisher ?? set.bolt : set.bolt ?? set.finisher) ?? null;
}

const loaded = new Map<string, ShotSpriteSet>();
const requested = new Set<string>();

/** Preserve premultiplied light energy while removing an opaque black matte.
 * Campaign draws these with additive blending; Duel also needs them on a
 * transparent layer. This is done once on load, never in a frame loop. */
export function decodeLightSpriteAlpha(pixels: Uint8ClampedArray): void {
  for (let i = 0; i < pixels.length; i += 4) {
    const peak = Math.max(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!);
    if (peak === 0) { pixels[i + 3] = 0; continue; }
    pixels[i + 3] = Math.round(pixels[i + 3]! * peak / 255);
    pixels[i] = Math.round(pixels[i]! * 255 / peak);
    pixels[i + 1] = Math.round(pixels[i + 1]! * 255 / peak);
    pixels[i + 2] = Math.round(pixels[i + 2]! * 255 / peak);
  }
}

async function alphaLightImage(image: HTMLImageElement): Promise<CanvasImageSource> {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (context === null) return image;
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  decodeLightSpriteAlpha(pixels.data);
  context.putImageData(pixels, 0, 0);
  if (typeof createImageBitmap === "function") {
    try { return await createImageBitmap(canvas); }
    catch { /* Keep decoded art even if bitmap allocation is unavailable. */ }
  }
  return canvas;
}

/** Loaded sprites of one fx folder, or null while loading / unavailable. */
export function shotSpriteSet(fx: string | null): ShotSpriteSet | null {
  return fx === null ? null : loaded.get(fx) ?? null;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener("error", () => reject(new Error("shot sprite " + url)), { once: true });
    image.src = url;
  });
}

/** Starts loading one fx folder once; safe to call every stage or ship change. */
export function preloadShotSprites(fx: string | null): void {
  if (fx === null || requested.has(fx)) return;
  if (typeof document === "undefined" || typeof Image === "undefined" || typeof fetch !== "function") return;
  requested.add(fx);
  void (async () => {
    try {
      const response = await fetch(SHOT_FX_ROOT + "/" + fx + "/fx.json", { cache: "no-cache" });
      if (!response.ok) return;
      const manifest = parseShotFx(await response.json(), fx);
      if (manifest === null) {
        console.warn("Shot FX " + fx + ": invalid fx.json; code-drawn shots stay active.");
        return;
      }
      const set: ShotSpriteSet = {};
      await Promise.all(
        Object.entries(manifest.sprites).map(async ([id, spec]) => {
          try {
            const image = await loadImage(spec.url);
            set[id as ShotSpriteId] = {
              image: await alphaLightImage(image),
              width: spec.width,
              height: spec.height,
              anchorX: spec.anchor[0],
              anchorY: spec.anchor[1],
            };
          } catch (error) {
            console.warn("Shot FX " + fx + ": sprite " + id + " unavailable.", error);
          }
        }),
      );
      loaded.set(fx, set);
    } catch (error) {
      console.warn("Shot FX " + fx + " unavailable; code-drawn shots stay active.", error);
    }
  })();
}
