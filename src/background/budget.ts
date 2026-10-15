import type { BackgroundTier } from "./types";

export type BackgroundBudget = {
  /** Upper bound for the background canvas device-pixel ratio. */
  dprCap: number;
  /** Upper bound for background canvas device pixels. */
  pixelBudget: number;
  /**
   * Preferred longest side per texture role. Sized to the pixels actually
   * drawn at this tier, which keeps GPU residency (RGBA8 + mipmaps) within
   * the tier budget: ~20 MB Low, ~30 MB Medium, ~75 MB High, ~160 MB Ultra
   * for one World (only the current World's hero is resident).
   */
  plateSize: number;
  sheetSize: number;
  heroSize: number;
  atlasSize: number;
  /** How many sheets may use the flow distortion samples. */
  flowSheets: number;
  /** Render the background every N display frames. */
  frameInterval: 1 | 2;
};

const TIER_ORDER: readonly BackgroundTier[] = ["low", "medium", "high", "ultra"];

/**
 * Background GPU time scales with its pixel count; full-screen passes
 * dominate. The WebGL context asks for the high-performance GPU (the owner's
 * Radeon Pro 560X), which gave ~25% more headroom than the integrated Intel
 * UHD 630 at High. Raising High to DPR 1.5 cost ~45% more GPU time on it, so
 * the caps stay here. The background is softer than gameplay by design
 * (depth), so its DPR stays below the gameplay canvas.
 */
const BUDGETS: Readonly<Record<BackgroundTier, BackgroundBudget>> = {
  low: {
    dprCap: 0.75,
    pixelBudget: 900_000,
    plateSize: 1280,
    sheetSize: 1024,
    heroSize: 512,
    atlasSize: 1024,
    flowSheets: 0,
    frameInterval: 2,
  },
  medium: {
    dprCap: 1,
    pixelBudget: 1_600_000,
    plateSize: 1920,
    sheetSize: 1024,
    heroSize: 1024,
    atlasSize: 1024,
    flowSheets: 0,
    frameInterval: 1,
  },
  high: {
    dprCap: 1.25,
    pixelBudget: 2_600_000,
    plateSize: 1920,
    sheetSize: 1024,
    heroSize: 1024,
    atlasSize: 2048,
    flowSheets: 1,
    frameInterval: 1,
  },
  ultra: {
    dprCap: 1.5,
    pixelBudget: 4_000_000,
    plateSize: 2880,
    sheetSize: 2048,
    heroSize: 2048,
    atlasSize: 2048,
    flowSheets: 2,
    frameInterval: 1,
  },
};

/** Reference flight speed at depth 1: 60 CSS px/s for a 900 px tall view. */
export const FLIGHT_SPEED_PER_HEIGHT = 60 / 900;

export function backgroundBudget(tier: BackgroundTier): Readonly<BackgroundBudget> {
  return BUDGETS[tier];
}

export function tierRank(tier: BackgroundTier): number {
  return TIER_ORDER.indexOf(tier);
}

export function tierAllows(minTier: BackgroundTier, tier: BackgroundTier): boolean {
  return tierRank(tier) >= tierRank(minTier);
}

export function resolveBackgroundDpr(
  budget: Readonly<BackgroundBudget>,
  deviceDpr: number,
  cssWidth: number,
  cssHeight: number,
): number {
  const safeDpr = Number.isFinite(deviceDpr) && deviceDpr > 0 ? deviceDpr : 1;
  const area = Math.max(1, cssWidth) * Math.max(1, cssHeight);
  const pixelBudgetDpr = Math.sqrt(budget.pixelBudget / area);
  return Math.max(0.5, Math.min(budget.dprCap, safeDpr, pixelBudgetDpr));
}

export function flightSpeed(viewportHeight: number): number {
  return Math.max(1, viewportHeight) * FLIGHT_SPEED_PER_HEIGHT;
}
