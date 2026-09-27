import type {
  BackgroundKit,
  KitAtlas,
  KitFrame,
  KitTexture,
  KitTextureVariant,
  SizeClass,
} from "./types";

export const BACKGROUND_KIT_ROOT = "/assets/space-typing/backgrounds";

/** Texture id of the procedural FX atlas owned by the renderer. */
export const FX_TEXTURE = "__fx";

/** GPU texture key; kit textures are namespaced so two kits can coexist during a swap. */
export function textureKey(kitId: string, textureId: string): string {
  return textureId === FX_TEXTURE ? FX_TEXTURE : kitId + ":" + textureId;
}

export function kitManifestUrl(kitId: string): string {
  return BACKGROUND_KIT_ROOT + "/" + kitId + "/kit.json";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseVariant(value: unknown, base: string): KitTextureVariant | null {
  if (!isRecord(value)) return null;
  const { maxSize, url, sha256 } = value;
  if (!finite(maxSize) || maxSize <= 0) return null;
  if (typeof url !== "string" || url.length === 0 || url.includes("..")) return null;
  if (typeof sha256 !== "string" || !/^[0-9a-f]{64}$/.test(sha256)) return null;
  // Play mode serves /assets/ as immutable for 30 days and file names stay the
  // same when art is regenerated; the content hash makes new art a new URL.
  return { maxSize, url: base + "/" + url + "?v=" + sha256.slice(0, 16), sha256 };
}

function parseTexture(value: unknown, base: string): KitTexture | null {
  if (!isRecord(value) || !Array.isArray(value["variants"])) return null;
  const variants: KitTextureVariant[] = [];
  for (const candidate of value["variants"]) {
    const variant = parseVariant(candidate, base);
    if (variant === null) return null;
    variants.push(variant);
  }
  if (variants.length === 0) return null;
  variants.sort((a, b) => a.maxSize - b.maxSize);
  const aspect = value["aspect"];
  const wrap = value["wrap"];
  const mipmaps = value["mipmaps"];
  if (!finite(aspect) || aspect <= 0) return null;
  if (wrap !== "clamp" && wrap !== "repeat") return null;
  if (typeof mipmaps !== "boolean") return null;
  return { variants, aspect, wrap, mipmaps };
}

function parseFrame(value: unknown): KitFrame | null {
  if (!isRecord(value)) return null;
  const { id, u0, v0, u1, v1, aspect, sizeRank } = value;
  if (typeof id !== "string" || id.length === 0) return null;
  if (![u0, v0, u1, v1, aspect, sizeRank].every(finite)) return null;
  const frame = { id, u0, v0, u1, v1, aspect, sizeRank } as KitFrame;
  const inUnit = [frame.u0, frame.v0, frame.u1, frame.v1].every(
    (coordinate) => coordinate >= 0 && coordinate <= 1,
  );
  if (!inUnit || frame.u1 <= frame.u0 || frame.v1 <= frame.v0) return null;
  if (frame.aspect <= 0 || frame.sizeRank < 0 || frame.sizeRank > 1) return null;
  return frame;
}

/**
 * Strictly validates a generated kit.json. Anything unexpected rejects the
 * whole kit so the game keeps its previous background instead of drawing
 * half-broken layers.
 */
export function parseKit(value: unknown, kitId: string): BackgroundKit | null {
  if (!isRecord(value) || value["id"] !== kitId) return null;
  const version = value["version"];
  if (!finite(version)) return null;
  const base = BACKGROUND_KIT_ROOT + "/" + kitId;

  const texturesValue = value["textures"];
  const atlasesValue = value["atlases"];
  if (!isRecord(texturesValue) || !isRecord(atlasesValue)) return null;

  const textures: Record<string, KitTexture> = {};
  for (const [id, candidate] of Object.entries(texturesValue)) {
    const texture = parseTexture(candidate, base);
    if (texture === null) return null;
    textures[id] = texture;
  }

  const atlases: Record<string, KitAtlas> = {};
  for (const [id, candidate] of Object.entries(atlasesValue)) {
    if (!isRecord(candidate) || !Array.isArray(candidate["frames"])) return null;
    const texture = candidate["texture"];
    if (typeof texture !== "string" || textures[texture] === undefined) return null;
    const frames: KitFrame[] = [];
    for (const frameValue of candidate["frames"]) {
      const frame = parseFrame(frameValue);
      if (frame === null) return null;
      frames.push(frame);
    }
    if (frames.length === 0) return null;
    atlases[id] = { texture, frames };
  }

  return { id: kitId, version, textures, atlases };
}

/** Smallest variant that covers `preferredSize`, else the largest one. */
export function pickVariant(
  texture: KitTexture,
  preferredSize: number,
): KitTextureVariant {
  for (const variant of texture.variants) {
    if (variant.maxSize >= preferredSize) return variant;
  }
  return texture.variants[texture.variants.length - 1]!;
}

const SIZE_CLASS_RANGE: Readonly<Record<SizeClass, readonly [number, number]>> = {
  large: [0, 0.25],
  medium: [0.25, 0.6],
  small: [0.6, 1],
  any: [0, 1],
};

/** Frames of one size class; falls back to all frames when the class is empty. */
export function framesForClass(
  atlas: KitAtlas,
  sizeClass: SizeClass,
): readonly KitFrame[] {
  const [min, max] = SIZE_CLASS_RANGE[sizeClass];
  const frames = atlas.frames.filter(
    (frame) =>
      frame.sizeRank >= min &&
      (frame.sizeRank < max || (max === 1 && frame.sizeRank <= 1)),
  );
  return frames.length > 0 ? frames : atlas.frames;
}

export function framesById(
  atlas: KitAtlas,
  ids: readonly string[],
): readonly KitFrame[] {
  const wanted = new Set(ids);
  return atlas.frames.filter((frame) => wanted.has(frame.id));
}
