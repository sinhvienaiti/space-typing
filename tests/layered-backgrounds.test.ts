import { describe, expect, it } from "vitest";
import { WORLD_REGISTRY } from "../src/worlds/registry";
import { sceneProfileForWorld } from "../src/worlds/scene-registry";
import {
  layeredBackgroundForScene,
  validateLayeredBackgroundProfile,
} from "../src/worlds/layered-background-registry";
import {
  backgroundLayerRotation,
  backgroundTreatmentStyle,
  qualityAllowsLayer,
} from "../src/worlds/layered-background-renderer";

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
    for (const worldId of [
      "world-01",
      "world-02",
      "world-03",
      "world-04",
      "world-05",
    ]) {
      expect(
        layeredBackgroundForScene(sceneProfileForWorld(worldId)).renderMode,
      ).toBe("authored-production");
    }

    for (const worldId of [
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
    expect(family("world-03")).toBe("prism");
    expect(family("world-04")).toBe("cherub");
    expect(family("world-05")).toBe("aurora");
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

  it("gives Worlds 02-05 isolated theme-specific authored layers", () => {
    const signatures: Record<string, readonly string[]> = {
      "world-02": [
        "/backgrounds/heaven/halo-garden-production-v1.avif",
        "/backgrounds/heaven/cloud-islands.svg",
        "/backgrounds/heaven/halo-gate.svg",
      ],
      "world-03": [
        "/backgrounds/vendor/screaming-brain/nebula-blue-6-1024.png",
        "/backgrounds/frost/aurora.svg",
        "/backgrounds/eternity/rings.svg",
      ],
      "world-04": [
        "/backgrounds/heaven/sky.svg",
        "/backgrounds/heaven/cloud-islands.svg",
        "/backgrounds/heaven/halo-gate.svg",
      ],
      "world-05": [
        "/backgrounds/meteor/sky.svg",
        "/backgrounds/frost/aurora.svg",
        "/backgrounds/meteor/asteroid-belt.svg",
      ],
    };

    const idSets: string[] = [];
    for (const [worldId, expectedSources] of Object.entries(signatures)) {
      const profile = layeredBackgroundForScene(
        sceneProfileForWorld(worldId),
      );
      const sources = profile.layers.map((layer) => layer.src);
      const ids = profile.layers.map((layer) => layer.id);

      for (const expected of expectedSources) {
        expect(
          sources.some((source) => source.includes(expected)),
          worldId + " missing " + expected,
        ).toBe(true);
      }

      expect(
        profile.layers.some((layer) =>
          layer.src.includes("planet-ocean-03-512.png"),
        ),
        worldId + " should not reuse the large blue planet",
      ).toBe(false);

      if (worldId === "world-02") {
        const productionArt = profile.layers.find(
          (layer) => layer.id === "halo-garden-production-art",
        );
        expect(productionArt?.src).toContain(
          "/backgrounds/heaven/halo-garden-production-v1.avif",
        );
        expect(productionArt?.fit).toBe("cover");
        expect(productionArt?.opacity).toBe(1);
        expect(
          profile.layers.some((layer) => layer.src.includes("heaven/sky.svg")),
        ).toBe(false);
      }
      expect(
        profile.layers.some((layer) => layer.scale >= 1.7 && layer.depth > 0.25),
        worldId + " should keep large foreground overlays out of gameplay",
      ).toBe(false);

      idSets.push(ids.join("|"));
    }

    expect(new Set(idSets).size).toBe(4);
  });

  it("keeps the Halo Garden production painting level", () => {
    const halo = layeredBackgroundForScene(
      sceneProfileForWorld("world-02"),
    );
    const art = halo.layers.find(
      (layer) => layer.id === "halo-garden-production-art",
    );

    expect(art).toBeDefined();
    expect(art?.rotationSpeed).toBe(0);
    expect(backgroundLayerRotation(art!, 120, 1, 4.2)).toBe(0);
  });

  it("uses only subtle image overlays above Halo Garden production art", () => {
    const halo = layeredBackgroundForScene(
      sceneProfileForWorld("world-02"),
    );
    const overlays = halo.layers.filter(
      (layer) => layer.id !== "halo-garden-production-art",
    );

    expect(overlays.length).toBeGreaterThanOrEqual(2);
    expect(Math.max(...overlays.map((layer) => layer.opacity))).toBeLessThanOrEqual(
      0.08,
    );
  });

  it("keeps authored objects away from a shared cross-World mutable layer set", () => {
    const worlds = ["world-01", "world-02", "world-03", "world-04", "world-05"];
    const profiles = worlds.map((worldId) =>
      layeredBackgroundForScene(sceneProfileForWorld(worldId)),
    );

    for (let index = 0; index < profiles.length; index += 1) {
      for (let other = index + 1; other < profiles.length; other += 1) {
        expect(profiles[index]!.layers).not.toBe(profiles[other]!.layers);
      }
    }
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
      "/assets/space-typing/backgrounds/vendor/screaming-brain/nebula-blue-6-1024.png",
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
    expect(productionAsteroids).toHaveLength(6);
    expect(
      productionAsteroids.some(
        (layer) =>
          layer.id === "galaxy-asteroid-near-hero" &&
          layer.motion === "approach" &&
          layer.scale >= 0.26,
      ),
    ).toBe(true);
    expect(
      productionAsteroids.filter((layer) => layer.motion === "wrap"),
    ).toHaveLength(4);
    expect(
      productionAsteroids.filter((layer) => layer.motion === "approach"),
    ).toHaveLength(2);

    const midAsteroids = productionAsteroids.filter((layer) =>
      layer.id.includes("-mid-"),
    );
    expect(midAsteroids).toHaveLength(3);
    expect(new Set(midAsteroids.map((layer) => layer.src)).size).toBe(3);
    expect(
      midAsteroids.reduce(
        (total, layer) => total + (layer.instances ?? 1),
        0,
      ),
    ).toBeGreaterThanOrEqual(10);
    expect(Math.max(...midAsteroids.map((layer) => layer.scale))).toBeGreaterThan(
      Math.min(...midAsteroids.map((layer) => layer.scale)) * 1.8,
    );

    const nearHero = productionAsteroids.find(
      (layer) => layer.id === "galaxy-asteroid-near-hero",
    )!;
    const nearSecondary = productionAsteroids.find(
      (layer) => layer.id === "galaxy-asteroid-near-secondary",
    )!;
    expect(nearHero.scale).toBeGreaterThan(
      Math.max(...midAsteroids.map((layer) => layer.scale)) * 3,
    );
    expect(nearHero.placement).toBe("anchor");
    expect(nearHero.anchorX).toBeGreaterThan(0.94);
    expect(nearHero.anchorY).toBeLessThan(0.22);
    expect(nearHero.minQuality).toBe("medium");
    expect(nearSecondary.minQuality).toBe("high");
    expect(nearSecondary.scale).toBeGreaterThanOrEqual(0.18);
    expect(nearSecondary.anchorX).toBeLessThan(0.08);
    expect(nearSecondary.anchorY).toBeGreaterThan(0.74);

    const farFragments = galaxy.layers.find(
      (layer) => layer.id === "galaxy-asteroid-far-fragments",
    )!;
    expect(farFragments.depth).toBeLessThan(0.5);
    expect(farFragments.scale).toBeLessThan(0.025);
    expect(farFragments.instances).toBeGreaterThanOrEqual(8);
    expect(farFragments.placement).toBe("edges");
    expect(farFragments.minQuality).toBeUndefined();
    expect(qualityAllowsLayer(farFragments, "low")).toBe(true);
    expect(qualityAllowsLayer(farFragments, "medium")).toBe(true);

    const asteroidField = galaxy.layers.find(
      (layer) => layer.id === "galaxy-authored-asteroid-field",
    );
    expect(asteroidField?.motion).toBe("wrap");
    expect(asteroidField?.optional).toBe(false);
    expect(asteroidField?.minQuality).toBe("medium");

    for (const id of [
      "galaxy-planet-far",
      "galaxy-moon-far",
    ]) {
      expect(galaxy.layers.find((layer) => layer.id === id)?.motion).toBe(
        "orbit",
      );
    }

    expect(
      galaxy.layers.find((layer) => layer.id === "galaxy-planet-primary"),
    ).toBeUndefined();
    const farPlanet = galaxy.layers.find(
      (layer) => layer.id === "galaxy-planet-far",
    )!;
    expect(farPlanet.anchorX).toBeGreaterThan(0.8);
    expect(farPlanet.scale).toBeLessThan(0.1);
  });

  it("keeps World 01 visual identity on Medium while reserving decoration for High", () => {
    const galaxy = layeredBackgroundForScene(
      sceneProfileForWorld("world-01"),
    );
    const byId = (id: string) => {
      const found = galaxy.layers.find((layer) => layer.id === id);
      expect(found, "missing authored layer: " + id).toBeDefined();
      return found!;
    };

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
      qualityAllowsLayer(byId("galaxy-distant-sentinel"), "medium"),
    ).toBe(true);
    expect(
      qualityAllowsLayer(byId("galaxy-distant-patrol-right"), "medium"),
    ).toBe(false);
    expect(
      qualityAllowsLayer(byId("galaxy-distant-patrol-right"), "high"),
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
    expect(new Set(nebulaLayers.map((layer) => layer.src)).size)
      .toBeGreaterThanOrEqual(2);

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
    expect(
      shipLayers.every((layer) => layer.sourceRect !== undefined),
    ).toBe(true);

    const persistentShip = shipLayers.find(
      (layer) => layer.id === "galaxy-distant-sentinel",
    )!;
    const flybyShips = shipLayers.filter((layer) => layer.motion === "flyby");

    expect(persistentShip.motion).toBe("float");
    expect(persistentShip.optional).toBe(false);
    expect(persistentShip.minQuality).toBe("medium");
    expect(persistentShip.placement).toBe("anchor");
    expect(persistentShip.opacity).toBeLessThanOrEqual(0.12);

    expect(flybyShips.length).toBeGreaterThanOrEqual(1);
    expect(flybyShips.every((layer) => layer.optional === true)).toBe(true);
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


describe("World 01 holistic authored composition contract", () => {
  const galaxy = layeredBackgroundForScene(
    sceneProfileForWorld("world-01"),
  );
  const byId = (id: string) => {
    const found = galaxy.layers.find((layer) => layer.id === id);
    expect(found, "missing authored layer: " + id).toBeDefined();
    return found!;
  };

  it("keeps a complete D0-D5 visual hierarchy on Medium", () => {
    expect(galaxy.renderMode).toBe("authored-production");

    const essentialIds = [
      "galaxy-sky",
      "galaxy-nebula",
      "galaxy-planet-far",
      "galaxy-luminous-orbit",
      "galaxy-authored-asteroid-field",
      "galaxy-asteroid-far-fragments",
      "galaxy-asteroid-mid-left",
      "galaxy-asteroid-near-hero",
      "galaxy-distant-sentinel",
    ];

    for (const id of essentialIds) {
      expect(qualityAllowsLayer(byId(id), "medium"), id).toBe(true);
    }
  });

  it("preserves obvious far-mid-near asteroid scale separation", () => {
    const far = byId("galaxy-asteroid-far-fragments");
    const mids = [
      byId("galaxy-asteroid-mid-left"),
      byId("galaxy-asteroid-mid-right"),
      byId("galaxy-asteroid-mid-heavy"),
    ];
    const near = byId("galaxy-asteroid-near-hero");

    expect(far.depth).toBeLessThan(0.5);
    expect(Math.max(...mids.map((layer) => layer.depth))).toBeLessThan(0.8);
    expect(Math.min(...mids.map((layer) => layer.depth))).toBeGreaterThan(0.5);
    expect(near.depth).toBeGreaterThan(0.8);

    expect(Math.min(...mids.map((layer) => layer.scale))).toBeGreaterThan(
      far.scale * 2,
    );
    expect(near.scale).toBeGreaterThan(
      Math.max(...mids.map((layer) => layer.scale)) * 3,
    );
  });

  it("keeps authored density edge-biased around the typing corridor", () => {
    for (const id of [
      "galaxy-asteroid-far-fragments",
      "galaxy-asteroid-mid-left",
      "galaxy-asteroid-mid-right",
      "galaxy-asteroid-mid-heavy",
    ]) {
      expect(byId(id).placement).toBe("edges");
    }

    expect(byId("galaxy-asteroid-near-hero").placement).toBe("anchor");
    expect(byId("galaxy-asteroid-near-hero").anchorX).toBeGreaterThan(0.94);
    expect(byId("galaxy-asteroid-near-secondary").anchorX).toBeLessThan(0.08);
    expect(byId("galaxy-distant-sentinel").anchorX).toBeGreaterThan(0.65);
    expect(
      galaxy.layers.find((layer) => layer.id === "galaxy-planet-primary"),
    ).toBeUndefined();
    expect(byId("galaxy-planet-far").anchorX).toBeGreaterThan(0.85);
  });

  it("uses more than one authored nebula source in production", () => {
    const sources = galaxy.layers
      .filter((layer) => layer.id.includes("nebula") || layer.id === "galaxy-sky")
      .map((layer) => layer.src);

    expect(new Set(sources).size).toBeGreaterThanOrEqual(2);
  });
});


describe("World 01 sourced-art integration treatments", () => {
  it("assigns progressively stronger Galaxy lighting to far, mid and near rocks", () => {
    const galaxy = layeredBackgroundForScene(
      sceneProfileForWorld("world-01"),
    );
    const byId = (id: string) =>
      galaxy.layers.find((layer) => layer.id === id)!;

    expect(byId("galaxy-asteroid-far-fragments").treatment).toBe(
      "galaxy-rock-far",
    );
    expect(byId("galaxy-asteroid-mid-heavy").treatment).toBe(
      "galaxy-rock-mid",
    );
    expect(byId("galaxy-asteroid-near-hero").treatment).toBe(
      "galaxy-rock-near",
    );

    const far = backgroundTreatmentStyle("galaxy-rock-far");
    const mid = backgroundTreatmentStyle("galaxy-rock-mid");
    const near = backgroundTreatmentStyle("galaxy-rock-near");

    expect(far.filter).not.toBe("none");
    expect(mid.shadowBlur).toBeGreaterThan(far.shadowBlur);
    expect(near.shadowBlur).toBeGreaterThan(mid.shadowBlur);
    expect(near.shadowColor).toContain("255");
  });
});


describe("World 01 hero narrative accent", () => {
  it("keeps a luminous orbital structure off-axis on Medium quality", () => {
    const galaxy = layeredBackgroundForScene(
      sceneProfileForWorld("world-01"),
    );
    const orbit = galaxy.layers.find(
      (layer) => layer.id === "galaxy-luminous-orbit",
    );

    expect(orbit).toBeDefined();
    expect(orbit?.src).toContain("/backgrounds/eternity/rings.svg");
    expect(orbit?.blend).toBe("screen");
    expect(orbit?.minQuality).toBe("medium");
    expect(orbit?.anchorX).toBeGreaterThan(0.75);
    expect(orbit?.anchorY).toBeLessThan(0.35);
    expect(orbit?.opacity).toBeLessThanOrEqual(0.16);
  });
});
