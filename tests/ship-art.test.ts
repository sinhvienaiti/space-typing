import { describe, expect, it } from "vitest";
import type { ArtAssetCatalog, ArtAssetEntry } from "../src/assets/pipeline";
import {
  PREMIUM_SHIP_SHEET_ASSET_ID,
  parseShipArtPreference,
  selectCharacterShipSheet,
  validPremiumShipDimensions,
} from "../src/characters/ship-art";
import { CHARACTER_SHIP_SHEET_ASSET_ID } from "../src/characters/visuals";

function image(width: number, height: number): HTMLImageElement {
  return {
    naturalWidth: width,
    naturalHeight: height,
  } as HTMLImageElement;
}

function catalog(
  premium: HTMLImageElement | null,
  existing: HTMLImageElement | null,
): ArtAssetCatalog {
  const entry = (id: string): ArtAssetEntry => ({
    id,
    category: "player",
    sourceType: "generated",
    source: "project",
    author: "Space Typing",
    license: "project original",
    attributionRequired: false,
  });
  return {
    manifest: { version: 1, entries: [] },
    assets: new Map([
      [
        PREMIUM_SHIP_SHEET_ASSET_ID,
        { entry: entry(PREMIUM_SHIP_SHEET_ASSET_ID), image: premium },
      ],
      [
        CHARACTER_SHIP_SHEET_ASSET_ID,
        { entry: entry(CHARACTER_SHIP_SHEET_ASSET_ID), image: existing },
      ],
    ]),
    failed: [],
  };
}

describe("Ship Visual V3 integrity and fallback", () => {
  it("requires the 1024 × 768 runtime atlas layout", () => {
    expect(validPremiumShipDimensions(1024, 768)).toBe(true);
    expect(validPremiumShipDimensions(2048, 1536)).toBe(false);
    expect(validPremiumShipDimensions(1024, 1024)).toBe(false);
    expect(validPremiumShipDimensions(0, 768)).toBe(false);
  });

  it("prefers reviewed V3 art when the one decoded image has valid dimensions", () => {
    const premium = image(1024, 768);
    const selected = selectCharacterShipSheet(
      catalog(premium, image(480, 360)),
    );
    expect(selected).toEqual({ source: "v3", image: premium });
  });

  it("keeps V2 as the deterministic A/B baseline even when V3 is loaded", () => {
    expect(parseShipArtPreference("v2")).toBe("v2");
    expect(parseShipArtPreference("V2")).toBe("auto");
    expect(parseShipArtPreference(null)).toBe("auto");
    const existing = image(480, 360);
    expect(
      selectCharacterShipSheet(
        catalog(image(1024, 768), existing),
        "v2",
      ),
    ).toEqual({ source: "v2", image: existing });
    expect(selectCharacterShipSheet(catalog(image(1024, 768), null), "v2"))
      .toEqual({ source: "procedural", image: null });
  });

  it("retains V2 when premium art is unavailable or has wrong dimensions", () => {
    const existing = image(480, 360);
    expect(
      selectCharacterShipSheet(catalog(null, existing)),
    ).toEqual({ source: "v2", image: existing });
    expect(
      selectCharacterShipSheet(catalog(image(2048, 1536), existing)),
    ).toEqual({ source: "v2", image: existing });
  });

  it("falls back to existing procedural Canvas art when both images fail", () => {
    expect(selectCharacterShipSheet(catalog(null, null))).toEqual({
      source: "procedural",
      image: null,
    });
    expect(selectCharacterShipSheet(null).source).toBe("procedural");
  });
});
