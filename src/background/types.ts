import type { VisualQuality } from "../types";

/**
 * Background Visual Reboot (BGV) data contracts.
 *
 * Scenic art is authored outside the code (docs/BACKGROUND_VISUAL_REBOOT_PLAN.md).
 * A kit is the set of runtime textures of one Galaxy, described by the
 * generated `kit.json`; a World composition decides how that kit is layered,
 * graded and animated for one World.
 */

export type BackgroundTier = VisualQuality;

export type Rgb = readonly [number, number, number];

export type TierCounts = Readonly<Record<BackgroundTier, number>>;

export type SheetBlend = "add" | "screen" | "mask";

// ---------------------------------------------------------------------------
// Kit manifest — written by scripts/bg-art/prepare-kit.mjs as kit.json.
// ---------------------------------------------------------------------------

export type KitTextureVariant = {
  /** Longest side in pixels. */
  maxSize: number;
  url: string;
  sha256: string;
};

export type KitTexture = {
  /** Sorted by maxSize, ascending. */
  variants: readonly KitTextureVariant[];
  /** width / height of the source art. */
  aspect: number;
  wrap: "clamp" | "repeat";
  mipmaps: boolean;
};

export type KitFrame = {
  id: string;
  /** Normalized texture coordinates, v grows downward like image rows. */
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  /** width / height of the trimmed sprite. */
  aspect: number;
  /** 0 = largest sprite in its atlas, 1 = smallest. */
  sizeRank: number;
};

export type KitAtlas = {
  texture: string;
  frames: readonly KitFrame[];
};

export type BackgroundKit = {
  id: string;
  version: number;
  textures: Readonly<Record<string, KitTexture>>;
  atlases: Readonly<Record<string, KitAtlas>>;
};

// ---------------------------------------------------------------------------
// World composition — authored in src/background/compositions/*.ts.
// ---------------------------------------------------------------------------

export type GradeSpec = {
  /** Linear exposure multiplier. */
  exposure: number;
  /** Power curve; values above 1 deepen shadows. */
  gamma: number;
  saturation: number;
  /** Hue rotation in degrees. */
  hueShift: number;
  tint: Rgb;
};

export type PlateSpec = {
  texture: string;
  flipX: boolean;
  /** Extra zoom over a "cover" fit, leaving room for drift (>= 1). */
  overscan: number;
  /** Drift amplitude as a fraction of the viewport size. */
  drift: readonly [number, number];
  /** Seconds for one full drift cycle. */
  driftPeriod: number;
  /**
   * Which part of the plate stays in view when the screen crops it, per axis
   * (0 = left/top edge, 0.5 = centre, 1 = right/bottom). Defaults to centre.
   */
  focus?: readonly [number, number];
  grade: GradeSpec;
};

export type SheetSpec = {
  texture: string;
  blend: SheetBlend;
  opacity: number;
  /** Tile edge length as a multiple of the viewport height. */
  tileScale: number;
  /** Multiple of the flight speed. */
  depth: number;
  /** Lateral drift in CSS px per second. */
  lateral: number;
  /** Flow distortion in tile units (0 disables the flow samples). */
  flow: number;
  tint: Rgb;
  /** Fixed per-World rotation in degrees, hides tiling repetition. */
  rotation: number;
  minTier: BackgroundTier;
};

export type GlowSpec = {
  color: Rgb;
  /** Glow diameter as a multiple of the hero size. */
  radius: number;
  strength: number;
};

export type HeroSpec = {
  texture: string;
  /** Center position at composition start, as viewport fractions. */
  anchor: readonly [number, number];
  /** Height as a fraction of the viewport height. */
  size: number;
  /** Multiple of the flight speed (landmarks: 0.02-0.08). */
  depth: number;
  flipX: boolean;
  /** Radians per second; keep tiny for painted lighting. */
  spin: number;
  alpha: number;
  /** Colour multiplier; darkens a bright landmark without making it see-through. */
  tint?: Rgb;
  glow: GlowSpec | null;
};

export type SizeClass = "large" | "medium" | "small" | "any";

export type FieldBand = "far" | "mid" | "near";

export type FieldSpec = {
  id: string;
  atlas: string;
  sizeClass: SizeClass;
  band: FieldBand;
  counts: TierCounts;
  /** Multiple of the flight speed. */
  depth: readonly [number, number];
  /** Sprite height as a fraction of the viewport height. */
  size: readonly [number, number];
  /** Degrees per second for the smallest sprite; larger ones spin slower. */
  spin: readonly [number, number];
  /** Maximum deviation from straight-down travel, in degrees. */
  spread: number;
  tint: Rgb;
  alpha: number;
  /** Mipmap LOD bias; blurs near or very far objects. */
  blur: number;
  /** Keep large bright sprites out of the central word corridor. */
  avoidCenter: boolean;
};

export type PointLayerSpec = {
  id: string;
  counts: TierCounts;
  /** How many of the points get diffraction spikes. */
  spikes: TierCounts;
  /** Multiple of the flight speed. */
  depth: readonly [number, number];
  /** Core radius in CSS px. */
  radius: readonly [number, number];
  brightness: readonly [number, number];
  palette: readonly Rgb[];
  /** Twinkle amplitude 0..1. */
  twinkle: number;
  /** Twinkle frequency range in Hz. */
  twinkleHz: readonly [number, number];
  /** Lateral wander in CSS px. */
  wander: number;
  minTier: BackgroundTier;
};

export type MeteorShowerSpec = {
  kind: "meteor-shower";
  /** Seconds between showers. */
  interval: readonly [number, number];
  meteors: readonly [number, number];
  color: Rgb;
  minTier: BackgroundTier;
};

export type PassSpec = {
  kind: "pass";
  id: string;
  atlas: string;
  /** Frame ids to choose from; empty means "largest frames". */
  frames: readonly string[];
  sizeClass: SizeClass;
  interval: readonly [number, number];
  /** Seconds to cross the screen. */
  duration: readonly [number, number];
  /** Travel directions to choose from, degrees (0 = right, 90 = down). */
  headings: readonly number[];
  /** Direction the sprite art faces, degrees (-90 = up, top-down art). */
  facing: number;
  /**
   * Side-view art (whales, ships drawn in profile): travelling against the
   * facing direction mirrors the sprite instead of turning it upside down.
   */
  mirror?: boolean;
  size: readonly [number, number];
  alpha: number;
  tint: Rgb;
  blur: number;
  minTier: BackgroundTier;
};

export type EventSpec = MeteorShowerSpec | PassSpec;

export type PostSpec = {
  /** 0..1 darkening at the corners. */
  vignette: number;
};

export type WorldComposition = {
  worldId: string;
  kitId: string;
  camera: "deep-space" | "over-world";
  plate: PlateSpec;
  /** Drawn in order; `front` sheets are drawn after the hero. */
  sheets: readonly (SheetSpec & { front: boolean })[];
  hero: HeroSpec | null;
  fields: readonly FieldSpec[];
  stars: readonly PointLayerSpec[];
  particles: readonly PointLayerSpec[];
  events: readonly EventSpec[];
  post: PostSpec;
};
