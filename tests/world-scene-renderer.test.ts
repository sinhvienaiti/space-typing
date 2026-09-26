import { describe, expect, it } from "vitest";
import { sceneProfileForWorld } from "../src/worlds/scene-registry";
import {
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
