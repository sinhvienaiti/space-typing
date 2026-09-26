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
        expect(
          layer.src.startsWith("/assets/space-typing/backgrounds/") ||
            layer.src.startsWith("/assets/space-typing/ships/"),
        ).toBe(true);
        expect(layer.depth).toBeGreaterThan(0);
        expect(layer.opacity).toBeGreaterThanOrEqual(0);
        expect(layer.opacity).toBeLessThanOrEqual(1);
        if (layer.instances !== undefined) {
          expect(layer.instances).toBeGreaterThanOrEqual(1);
          expect(layer.instances).toBeLessThanOrEqual(12);
        }
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

  it("uses curated sourced Galaxy art instead of deprecated placeholders", () => {
    const galaxy = layeredBackgroundForScene(
      sceneProfileForWorld("world-01"),
    );
    const sources = galaxy.layers.map((layer) => layer.src);

    expect(sources).toContain(
      "/assets/space-typing/backgrounds/vendor/kenney-remastered/bg-dark-purple.png",
    );
    expect(sources).toContain(
      "/assets/space-typing/backgrounds/vendor/screaming-brain/nebula-purple-3-1024.png",
    );
    expect(sources).toContain(
      "/assets/space-typing/backgrounds/vendor/screaming-brain/planet-ocean-03-512.png",
    );
    expect(sources).toContain(
      "/assets/space-typing/backgrounds/vendor/screaming-brain/planet-blue-giant-04-512.png",
    );

    const meteorSources = sources.filter((src) =>
      src.includes("/vendor/kenney-remastered/meteor-"),
    );
    expect(meteorSources.length).toBeGreaterThanOrEqual(6);

    expect(
      sources.some((src) => src.includes("/backgrounds/galaxy/")),
    ).toBe(false);
    expect(
      sources.some((src) => src.includes("/vendor/wisedawn/")),
    ).toBe(false);
    expect(
      sources.some((src) => src.includes("/vendor/sparklinlabs/black-hole")),
    ).toBe(false);
    expect(
      sources.some((src) => src.includes("/vendor/rawdanitsu/")),
    ).toBe(false);
  });

  it("builds Galaxy depth from treated rocks, nebula volume and rare ship flybys", () => {
    const galaxy = layeredBackgroundForScene(
      sceneProfileForWorld("world-01"),
    );

    const nebulaLayers = galaxy.layers.filter((layer) =>
      layer.id.includes("nebula"),
    );
    expect(nebulaLayers.length).toBeGreaterThanOrEqual(2);

    const asteroidLayers = galaxy.layers.filter(
      (layer) => layer.artTreatment === "asteroid",
    );
    expect(asteroidLayers.length).toBeGreaterThanOrEqual(6);
    expect(
      asteroidLayers.some((layer) => layer.motion === "approach"),
    ).toBe(true);

    const shipLayers = galaxy.layers.filter((layer) =>
      layer.src.startsWith("/assets/space-typing/ships/"),
    );
    expect(shipLayers.length).toBeGreaterThanOrEqual(2);
    expect(shipLayers.every((layer) => layer.motion === "flyby")).toBe(
      true,
    );
    expect(
      shipLayers.every((layer) => layer.sourceRect !== undefined),
    ).toBe(true);
    expect(shipLayers.every((layer) => layer.optional === true)).toBe(
      true,
    );
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
