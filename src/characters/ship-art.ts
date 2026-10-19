import type { ArtAssetCatalog } from "../assets/pipeline";
import { CHARACTER_SHIP_SHEET_ASSET_ID } from "./visuals";
import type { CharacterId } from "./registry";
import type { ShipLightRig } from "./ship-lights";
import { activeShipRuntimeReliefAssetVersionId } from "../admin/ship-runtime-policy";
import { shipRuntimeImageAssetVersionId } from "./ship-media-runtime";
import { SHIP_VISUAL_CATALOG, resolveShipVisualId } from "./ship-visual";

type VisualArt = { image: HTMLImageElement; rig: Readonly<ShipLightRig> | null };
type VisualColors = { hot: string; plume: string; outer: string; accent?: string };
const visualArt = new Map<string, VisualArt>();
const visualArtLoads = new Map<string, Promise<void>>();
const visualColors = new Map<string, VisualColors>();
const HEX = /^#[0-9a-f]{6}$/i;

/** Identity includes exact Admin ownership, so old async loads cannot replace it. */
export function shipVisualRuntimeKey(id: CharacterId): string {
  return [id, resolveShipVisualId(id), shipRuntimeImageAssetVersionId(id) ?? "", activeShipRuntimeReliefAssetVersionId(id) ?? ""].join(":");
}

/** Decodes each prepared fallback once, outside all per-frame draw paths. */
export function loadShipVisualArt(visualId: string): Promise<void> {
  if (typeof Image === "undefined" || typeof fetch !== "function") return Promise.resolve();
  const existing = visualArtLoads.get(visualId);
  if (existing) return existing;
  const load = (async () => {
    const base = `/assets/space-typing/ships/3d/${visualId}/`;
    const response = await fetch(base + "model.json", { cache: "no-cache" });
    if (!response.ok) return;
    const model = await response.json() as {
      color?: unknown; aspect?: unknown; nozzles?: number[][];
      anchors?: { canopy?: number[]; nose?: number[]; wingtips?: number[][] };
      colors?: Record<string, unknown>;
    };
    const c = model.colors;
    const colors: VisualColors | null = c && [c.hot, c.plume, c.outer].every(value => typeof value === "string" && HEX.test(value))
      ? { hot: c.hot as string, plume: c.plume as string, outer: c.outer as string, ...(typeof c.accent === "string" && HEX.test(c.accent) ? { accent: c.accent } : {}) }
      : null;
    if (colors) visualColors.set(visualId, colors);
    const image = new Image();
    image.decoding = "async";
    // Only generated sibling filenames are accepted from the bundled metadata.
    const color = typeof model.color === "string" && /^color\.webp(?:\?v=[a-f0-9]+)?$/.test(model.color) ? model.color : "color.webp";
    image.src = base + color;
    await image.decode();
    if (image.naturalWidth <= 0 || image.naturalHeight <= 0) return;
    const aspect = image.naturalWidth / image.naturalHeight;
    const width = aspect >= 1 ? 78 : 78 * aspect;
    const height = aspect >= 1 ? 78 / aspect : 78;
    const point = (p: number[] | undefined): [number, number] | null => p && p.length >= 2 && p.every(Number.isFinite)
      ? [(p[0]! - 0.5) * width, (p[1]! - 0.5) * height] : null;
    const nozzles = (model.nozzles ?? []).map(point).filter((p): p is [number, number] => p !== null);
    const core = point(model.anchors?.canopy) ?? [0, -height * 0.15] as [number, number];
    const rig: ShipLightRig | null = colors && nozzles.length > 0 ? {
      nozzles, plumeWidth: Math.max(2, width * 0.045), plumeLength: 28,
      core, coreRadius: Math.max(7, width * 0.12),
      glint: point(model.anchors?.nose) ?? [core[0], core[1] - 8],
      tips: (model.anchors?.wingtips ?? []).map(point).filter((p): p is [number, number] => p !== null),
      ...colors, halo: colors.accent ?? colors.plume, light: colors.hot,
    } : null;
    visualArt.set(visualId, { image, rig });
  })().catch(() => { /* Missing prepared art keeps the legacy atlas usable. */ });
  visualArtLoads.set(visualId, load);
  return load;
}

export async function preloadShipVisualArt(visualIds: readonly string[] = SHIP_VISUAL_CATALOG.map(visual => visual.id)): Promise<void> {
  await Promise.all(visualIds.map(loadShipVisualArt));
}

export function shipVisualImage(id: CharacterId): HTMLImageElement | null {
  return visualArt.get(resolveShipVisualId(id))?.image ?? null;
}

export function shipVisualLightRig(id: CharacterId): Readonly<ShipLightRig> | null {
  return visualArt.get(resolveShipVisualId(id))?.rig ?? null;
}

export function shipVisualColors(visualId: string): VisualColors | undefined {
  return visualColors.get(visualId);
}

/** V3 is the reviewed default atlas; V2/procedural remain fail-soft and QA fallbacks. */
export const PREMIUM_SHIP_SHEET_ASSET_ID = "player-ship-sheet-v3";

/** A single 4 × 3 atlas; 256 source pixels per character cell. */
export const PREMIUM_SHIP_ATLAS_WIDTH = 1024;
export const PREMIUM_SHIP_ATLAS_HEIGHT = 768;

export type ShipArtPreference = "auto" | "v2";

export function parseShipArtPreference(raw: string | null): ShipArtPreference {
  return raw === "v2" ? "v2" : "auto";
}

export type ShipSheetSelection = {
  image: HTMLImageElement | null;
  source: "v3" | "v2" | "procedural";
};

/** Reject V3 atlases whose dimensions do not match the runtime slicing contract. */
export function validPremiumShipDimensions(
  naturalWidth: number,
  naturalHeight: number,
): boolean {
  return (
    Number.isInteger(naturalWidth) &&
    Number.isInteger(naturalHeight) &&
    naturalWidth === PREMIUM_SHIP_ATLAS_WIDTH &&
    naturalHeight === PREMIUM_SHIP_ATLAS_HEIGHT
  );
}

/**
 * The already-loaded ArtAssetCatalog owns all images. Never create an Image
 * or decode an asset in the per-frame Canvas renderer.
 */
export function selectCharacterShipSheet(
  catalog: ArtAssetCatalog | null,
  preference: ShipArtPreference = "auto",
): ShipSheetSelection {
  const premium =
    catalog?.assets.get(PREMIUM_SHIP_SHEET_ASSET_ID)?.image ?? null;
  if (
    preference === "auto" &&
    premium !== null &&
    validPremiumShipDimensions(
      premium.naturalWidth,
      premium.naturalHeight,
    )
  ) {
    return { image: premium, source: "v3" };
  }

  const existing =
    catalog?.assets.get(CHARACTER_SHIP_SHEET_ASSET_ID)?.image ?? null;
  if (
    existing !== null &&
    existing.naturalWidth > 0 &&
    existing.naturalHeight > 0
  ) {
    return { image: existing, source: "v2" };
  }

  return { image: null, source: "procedural" };
}
