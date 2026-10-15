import { createAuthoredOverworldGalaxy } from "./authored-overworld";

export const G08_KIT_ID = "g08-aurora-cosmic";

export const G08_COMPOSITIONS = createAuthoredOverworldGalaxy({
  kitId: G08_KIT_ID,
  fieldTint: [0.68, 0.86, 0.96],
  glowTint: [0.3, 0.92, 0.86],
  meteorColor: [0.76, 0.94, 1],
  eventTint: [0.84, 0.96, 1],
  particlePalette: [
    [0.28, 0.96, 0.84],
    [0.36, 0.7, 1],
    [0.62, 0.46, 1],
    [0.9, 0.98, 1],
  ],
  dustOpacity: 0.24,
  glowOpacity: 0.15,
  worlds: [
    { worldId: "world-36", name: "Aurora Nexus", plateTexture: "plate", heroTexture: "hero-w36", heroAnchor: [0.2, 0.3], heroSize: 0.58, heroGlow: [0.28, 0.96, 0.84], plateFocus: [0.46, 0.55], fieldDensity: 0.84, particleDensity: 0.9, eventPace: 1.08, vignette: 0.4 },
    { worldId: "world-37", name: "Comet Glacier", plateTexture: "plate-b", heroTexture: "hero-w37", heroAnchor: [0.8, 0.34], heroSize: 0.61, heroGlow: [0.52, 0.88, 1], plateFocus: [0.56, 0.48], fieldDensity: 1, particleDensity: 1.04, eventPace: 1, vignette: 0.42 },
    { worldId: "world-38", name: "Starlit Tundra", plateTexture: "plate-c", heroTexture: "hero-w38", heroAnchor: [0.2, 0.31], heroSize: 0.63, heroGlow: [0.42, 0.72, 1], plateFocus: [0.44, 0.54], fieldDensity: 0.9, particleDensity: 1.14, eventPace: 0.94, vignette: 0.41 },
    { worldId: "world-39", name: "Frozen Cosmos", plateTexture: "plate-d", heroTexture: "hero-w39", heroAnchor: [0.79, 0.31], heroSize: 0.6, heroGlow: [0.64, 0.52, 1], plateFocus: [0.58, 0.5], fieldDensity: 0.96, particleDensity: 0.86, eventPace: 1.04, vignette: 0.43 },
    { worldId: "world-40", name: "Polar Singularity", plateTexture: "plate-e", heroTexture: "hero-w40", heroAnchor: [0.5, 0.2], heroSize: 0.59, heroGlow: [0.34, 0.9, 0.92], plateFocus: [0.5, 0.43], fieldDensity: 1.1, particleDensity: 1.22, eventPace: 0.84, vignette: 0.45 },
  ],
});
