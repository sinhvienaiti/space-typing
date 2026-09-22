import { describe, expect, it } from "vitest";
import {
  assetAttributions,
  parseArtAssetManifest,
  preloadArtAssets,
} from "../src/assets/pipeline";

describe("art asset pipeline", () => {
  it("validates unique licensed manifest entries", () => {
    const manifest = parseArtAssetManifest({
      version: 1,
      entries: [
        {
          id: "player",
          category: "player",
          sourceType: "procedural",
          source: "local renderer",
          author: "project",
          license: "original",
          attributionRequired: false,
        },
      ],
    });

    expect(manifest.entries[0]?.id).toBe("player");
  });

  it("rejects duplicate IDs", () => {
    const entry = {
      id: "same",
      category: "enemy",
      sourceType: "procedural",
      source: "renderer",
      author: "project",
      license: "original",
      attributionRequired: false,
    };

    expect(() =>
      parseArtAssetManifest({
        version: 1,
        entries: [entry, entry],
      }),
    ).toThrow("invalid or duplicate");
  });

  it("keeps procedural fallback when optional image loading fails", async () => {
    const manifest = parseArtAssetManifest({
      version: 1,
      entries: [
        {
          id: "optional",
          category: "boss",
          sourceType: "generated",
          source: "generated for project",
          author: "project",
          license: "project asset",
          attributionRequired: false,
          url: "/missing.png",
        },
      ],
    });

    const catalog = await preloadArtAssets(
      manifest,
      async () => {
        throw new Error("missing");
      },
    );

    expect(catalog.failed).toEqual(["optional"]);
    expect(catalog.assets.get("optional")?.image).toBeNull();
  });

  it("reports only required attributions", () => {
    const manifest = parseArtAssetManifest({
      version: 1,
      entries: [
        {
          id: "licensed",
          category: "enemy",
          sourceType: "open-license",
          source: "https://example.invalid/source",
          author: "Example Artist",
          license: "CC BY 4.0",
          attributionRequired: true,
        },
        {
          id: "original",
          category: "player",
          sourceType: "procedural",
          source: "local",
          author: "project",
          license: "original",
          attributionRequired: false,
        },
      ],
    });

    expect(assetAttributions(manifest)).toEqual([
      "licensed · Example Artist · CC BY 4.0 · https://example.invalid/source",
    ]);
  });
});
