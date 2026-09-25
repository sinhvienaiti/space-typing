import type { VisualQuality } from "../types";

export type BackgroundFit = "cover" | "contain";
export type BackgroundBlend =
  | "source-over"
  | "lighter"
  | "screen"
  | "multiply";

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
