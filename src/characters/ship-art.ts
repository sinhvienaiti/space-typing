import type { ArtAssetCatalog } from "../assets/pipeline";
import { CHARACTER_SHIP_SHEET_ASSET_ID } from "./visuals";

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
