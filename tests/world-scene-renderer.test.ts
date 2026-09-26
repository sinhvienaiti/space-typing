import { describe, expect, it } from "vitest";
import { sceneProfileForWorld } from "../src/worlds/scene-registry";
import {
  galaxySceneryReadabilityFactor,
  productionGalaxyStarReadabilityEnabled,
  worldSceneCacheKey,
  worldSceneRenderPolicy,
} from "../src/worlds/scene-renderer";
import { layeredBackgroundForScene } from "../src/worlds/layered-background-registry";

describe("World scene production rendering policy", () => {
  it("removes legacy procedural scene passes from World 01", () => {
    const policy = worldSceneRenderPolicy(
      layeredBackgroundForScene(sceneProfileForWorld("world-01")),
    );

    expect(policy).toEqual({
      drawLegacyStaticScene: false,
      drawLegacyCinematicMotion: false,
      drawLegacyFloorFallback: false,
      drawLegacyCinematicEvents: false,
    });
  });

  it("preserves the legacy pipeline for Worlds not migrated yet", () => {
    const policy = worldSceneRenderPolicy(
      layeredBackgroundForScene(sceneProfileForWorld("world-06")),
    );

    expect(policy).toEqual({
      drawLegacyStaticScene: true,
      drawLegacyCinematicMotion: true,
      drawLegacyFloorFallback: true,
      drawLegacyCinematicEvents: true,
    });
  });
});

describe("World scene renderer cache contract", () => {
  it("keeps a stable key for identical render inputs", () => {
    const scene = sceneProfileForWorld("world-01");
    expect(worldSceneCacheKey(scene, 1280, 720, 1.5, "high"))
      .toBe(worldSceneCacheKey(scene, 1280, 720, 1.5, "high"));
  });

  it("invalidates the static identity across World, size, DPR and quality", () => {
    const first = sceneProfileForWorld("world-01");
    const second = sceneProfileForWorld("world-02");
    const base = worldSceneCacheKey(first, 1280, 720, 1.5, "high");

    expect(worldSceneCacheKey(second, 1280, 720, 1.5, "high"))
      .not.toBe(base);
    expect(worldSceneCacheKey(first, 1440, 720, 1.5, "high"))
      .not.toBe(base);
    expect(worldSceneCacheKey(first, 1280, 720, 1.75, "high"))
      .not.toBe(base);
    expect(worldSceneCacheKey(first, 1280, 720, 1.5, "ultra"))
      .not.toBe(base);
  });
});


describe("Galaxy scenery readability contract", () => {
  it("limits the new readability bias to the accepted World 01 production scene", () => {
    expect(
      productionGalaxyStarReadabilityEnabled(
        sceneProfileForWorld("world-01"),
      ),
    ).toBe(true);
    expect(
      productionGalaxyStarReadabilityEnabled(
        sceneProfileForWorld("world-02"),
      ),
    ).toBe(false);
    expect(
      productionGalaxyStarReadabilityEnabled(
        sceneProfileForWorld("world-03"),
      ),
    ).toBe(false);
  });

  it("suppresses the active center while preserving and slightly enriching outer thirds for stars and ambient scenery", () => {
    const center = galaxySceneryReadabilityFactor(0.5, 0.35);
    const shoulder = galaxySceneryReadabilityFactor(0.35, 0.35);
    const edge = galaxySceneryReadabilityFactor(0.12, 0.35);
    const hudBand = galaxySceneryReadabilityFactor(0.5, 0.05);

    expect(center).toBeLessThan(0.4);
    expect(shoulder).toBeGreaterThan(center);
    expect(shoulder).toBeLessThan(1);
    expect(edge).toBeGreaterThan(1);
    expect(hudBand).toBe(1);
  });
});
