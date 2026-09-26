import type { VisualQuality } from "../types";

export type BackgroundFit = "cover" | "contain";
export type BackgroundBlend =
  | "source-over"
  | "lighter"
  | "screen"
  | "multiply";

export type BackgroundMotion =
  | "auto"
  | "static"
  | "float"
  | "wrap"
  | "orbit"
  | "flyby"
  | "approach";

export type BackgroundPlacement = "anchor" | "wide" | "edges";

export type BackgroundArtTreatment = "none" | "asteroid";

export type BackgroundSourceRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LayeredBackgroundLayer = {
  id: string;
  src: string;
  depth: number;
  opacity: number;
  scale: number;
  fit: BackgroundFit;
  anchorX: number;
  anchorY: number;
  driftX: number;
  driftY: number;
  rotationSpeed: number;
  pulseAmount: number;
  blend: BackgroundBlend;
  optional?: boolean;
  /**
   * Explicit motion semantics. "auto" preserves the legacy behavior: layers
   * with meaningful drift wrap, while quiet layers float.
   */
  motion?: BackgroundMotion;
  /**
   * Deterministic authored instances generated from this source image. This is
   * bounded by the renderer's quality scaling; it is never an unbounded spawn
   * count.
   */
  instances?: number;
  spreadX?: number;
  spreadY?: number;
  scaleJitter?: number;
  opacityJitter?: number;
  speedJitter?: number;
  placement?: BackgroundPlacement;
  /**
   * Optional crop inside a source spritesheet. Values are authored in the
   * source image's natural pixel coordinate space.
   */
  sourceRect?: BackgroundSourceRect;
  /**
   * One-time precomposed art treatment. Runtime animation still draws a cached
   * CanvasImageSource so richer art does not add per-frame texture work.
   */
  artTreatment?: BackgroundArtTreatment;
};

export type LayeredBackgroundProfile = {
  id: string;
  family: string;
  layers: readonly LayeredBackgroundLayer[];
};

export type LayeredBackgroundDrawInput = {
  width: number;
  height: number;
  time: number;
  quality: VisualQuality;
  flightIntensity: number;
  variant: number;
};

export type LoadedBackgroundAsset = {
  image: HTMLImageElement;
  loaded: boolean;
  failed: boolean;
};
