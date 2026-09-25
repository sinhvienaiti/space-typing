import { describe, expect, it } from "vitest";
import { WORLD_REGISTRY } from "../src/worlds/registry";
import { sceneProfileForWorld } from "../src/worlds/scene-registry";
import {
  layeredBackgroundForScene,
  validateLayeredBackgroundProfile,
} from "../src/worlds/layered-background-registry";

describe("Layered authored background registry", () => {
  it("resolves valid local asset layers for every World", () => {
    for (const world of WORLD_REGISTRY) {
      const scene = sceneProfileForWorld(world);
      const layered = layeredBackgroundForScene(scene);

      expect(validateLayeredBackgroundProfile(layered)).toEqual([]);
      expect(layered.layers.length).toBeGreaterThanOrEqual(3);

      for (const layer of layered.layers) {
        expect(layer.src.startsWith(
          "/assets/space-typing/backgrounds/",
        )).toBe(true);
        expect(layer.depth).toBeGreaterThan(0);
        expect(layer.opacity).toBeGreaterThanOrEqual(0);
        expect(layer.opacity).toBeLessThanOrEqual(1);
      }
    }
  });

  it("gives representative Worlds distinct authored families", () => {
    const family = (worldId: string) =>
      layeredBackgroundForScene(
        sceneProfileForWorld(worldId),
      ).family;

    expect(family("world-01")).toBe("galaxy");
    expect(family("world-02")).toBe("heaven");
    expect(family("world-06")).toBe("infernal");
    expect(family("world-11")).toBe("frost-prism");
    expect(family("world-16")).toBe("verdant");
    expect(family("world-21")).toBe("shadow-nature");
    expect(family("world-26")).toBe("cosmic-forge");
    expect(family("world-31")).toBe("abyssal");
    expect(family("world-36")).toBe("aurora-cosmic");
    expect(family("world-41")).toBe("void-cathedral");
    expect(family("world-46")).toBe("eternity");
  });

  it("keeps authored asset ids unique inside each scene", () => {
    for (const world of WORLD_REGISTRY) {
      const layered = layeredBackgroundForScene(
        sceneProfileForWorld(world),
      );
      const ids = layered.layers.map((layer) => layer.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
