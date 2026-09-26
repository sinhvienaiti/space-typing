import { describe, expect, it } from "vitest";
import { WORLD_REGISTRY } from "../src/worlds/registry";
import { sceneProfileForWorld } from "../src/worlds/scene-registry";
import {
  layeredBackgroundForScene,
  validateLayeredBackgroundProfile,
} from "../src/worlds/layered-background-registry";
import { qualityAllowsLayer } from "../src/worlds/layered-background-renderer";

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

  it("keeps the production migration boundary explicit", () => {
    expect(
      layeredBackgroundForScene(sceneProfileForWorld("world-01")).renderMode,
    ).toBe("authored-production");

    for (const worldId of [
      "world-02",
      "world-06",
      "world-11",
      "world-16",
      "world-21",
      "world-26",
      "world-31",
      "world-36",
      "world-41",
      "world-46",
    ]) {
      expect(
        layeredBackgroundForScene(sceneProfileForWorld(worldId)).renderMode,
      ).toBe("legacy-hybrid");
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

  it("uses authored parallax Galaxy art instead of Kenney placeholder scenery", () => {
    const galaxy = layeredBackgroundForScene(
      sceneProfileForWorld("world-01"),
    );
    const sources = galaxy.layers.map((layer) => layer.src);

    expect(sources).toContain(
      "/assets/space-typing/backgrounds/vendor/screaming-brain/nebula-purple-3-1024.png",
    );
    expect(sources).toContain(
      "/assets/space-typing/backgrounds/vendor/luminousdragon/stars-dense.png",
    );
    expect(sources).toContain(
      "/assets/space-typing/backgrounds/vendor/luminousdragon/stars-sparse.png",
    );
    expect(sources).toContain(
      "/assets/space-typing/backgrounds/vendor/luminousdragon/stars-planets.png",
    );
    expect(sources).toContain(
      "/assets/space-typing/backgrounds/vendor/luminousdragon/asteroid-field.png",
    );
    expect(sources).toContain(
      "/assets/space-typing/backgrounds/vendor/screaming-brain/planet-ocean-03-512.png",
    );
    expect(sources).toContain(
      "/assets/space-typing/backgrounds/vendor/screaming-brain/planet-blue-giant-04-512.png",
    );
    expect(
      sources.some((src) => src.includes("/vendor/kenney-remastered/")),
    ).toBe(false);

    const starLayers = galaxy.layers.filter((layer) =>
      layer.src.includes("/vendor/luminousdragon/stars-"),
    );
    expect(starLayers.length).toBeGreaterThanOrEqual(3);
    expect(starLayers.every((layer) => layer.blend === "screen")).toBe(
      true,
    );

    const productionAsteroids = galaxy.layers.filter((layer) =>
      layer.src.includes("/vendor/ohjirochan/asteroid-"),
    );
    expect(productionAsteroids).toHaveLength(3);
    expect(
      productionAsteroids.some(
        (layer) =>
          layer.id === "galaxy-asteroid-near-hero" &&
          layer.motion === "approach" &&
          layer.scale >= 0.1,
      ),
    ).toBe(true);
    expect(
      productionAsteroids.filter((layer) => layer.motion === "wrap"),
    ).toHaveLength(2);

    const asteroidField = galaxy.layers.find(
      (layer) => layer.id === "galaxy-authored-asteroid-field",
    );
    expect(asteroidField?.motion).toBe("wrap");
    expect(asteroidField?.optional).toBe(true);
    expect(asteroidField?.minQuality).toBe("medium");

    for (const id of [
      "galaxy-planet-primary",
      "galaxy-planet-far",
      "galaxy-moon-far",
    ]) {
      expect(galaxy.layers.find((layer) => layer.id === id)?.motion).toBe(
        "orbit",
      );
    }
  });

  it("keeps World 01 visual identity on Medium while reserving decoration for High", () => {
    const galaxy = layeredBackgroundForScene(
      sceneProfileForWorld("world-01"),
    );
    const byId = (id: string) =>
      galaxy.layers.find((layer) => layer.id === id)!;

    expect(qualityAllowsLayer(byId("galaxy-sky"), "low")).toBe(true);

    for (const id of [
      "galaxy-moon-far",
      "galaxy-authored-asteroid-field",
      "galaxy-asteroid-near-hero",
    ]) {
      expect(qualityAllowsLayer(byId(id), "low")).toBe(false);
      expect(qualityAllowsLayer(byId(id), "medium")).toBe(true);
      expect(qualityAllowsLayer(byId(id), "high")).toBe(true);
    }

    expect(
      qualityAllowsLayer(byId("galaxy-distant-patrol-left"), "medium"),
    ).toBe(false);
    expect(
      qualityAllowsLayer(byId("galaxy-distant-patrol-left"), "high"),
    ).toBe(true);
  });

  it("preserves multi-depth nebula volume and rare authored ship flybys", () => {
    const galaxy = layeredBackgroundForScene(
      sceneProfileForWorld("world-01"),
    );

    const nebulaLayers = galaxy.layers.filter((layer) =>
      layer.id.includes("nebula") || layer.id === "galaxy-sky",
    );
    expect(nebulaLayers.length).toBeGreaterThanOrEqual(3);

    const sky = galaxy.layers.find((layer) => layer.id === "galaxy-sky")!;
    const mainNebula = galaxy.layers.find(
      (layer) => layer.id === "galaxy-nebula",
    )!;
    const depthNebula = galaxy.layers.find(
      (layer) => layer.id === "galaxy-nebula-depth",
    )!;

    expect(sky.opacity).toBeLessThanOrEqual(0.5);
    expect(mainNebula.blend).toBe("screen");
    expect(depthNebula.blend).toBe("screen");
    expect(mainNebula.scale).toBeGreaterThan(sky.scale);
    expect(depthNebula.scale - mainNebula.scale).toBeGreaterThan(0.25);
    expect(Math.abs(mainNebula.anchorX - depthNebula.anchorX)).toBeGreaterThan(
      0.35,
    );
    expect(Math.abs(mainNebula.anchorY - depthNebula.anchorY)).toBeGreaterThan(
      0.2,
    );

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
