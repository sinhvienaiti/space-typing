import { describe, expect, it } from "vitest";
import { sceneProfileForWorld } from "../src/worlds/scene-registry";
import { worldSceneCacheKey } from "../src/worlds/scene-renderer";

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
