import { createAuthoredOverworldGalaxy } from "./authored-overworld";

export const G04_KIT_ID = "g04-verdant";

export const G04_COMPOSITIONS = createAuthoredOverworldGalaxy({
  kitId: G04_KIT_ID,
  fieldTint: [0.62, 0.82, 0.7],
  glowTint: [0.42, 1, 0.7],
  meteorColor: [0.72, 1, 0.72],
  eventTint: [0.84, 1, 0.88],
  particlePalette: [
    [0.48, 1, 0.66],
    [0.32, 0.9, 0.84],
    [0.9, 0.8, 0.4],
    [0.72, 1, 0.48],
  ],
  dustOpacity: 0.24,
  glowOpacity: 0.13,
  worlds: [
    { worldId: "world-16", name: "Leaflight Meadow", plateTexture: "plate", heroTexture: "hero-w16", heroAnchor: [0.2, 0.3], heroSize: 0.58, heroGlow: [0.46, 1, 0.68], plateFocus: [0.46, 0.55], fieldDensity: 0.84, particleDensity: 0.9, eventPace: 1.08, vignette: 0.4 },
    { worldId: "world-17", name: "Bloom Circuit", plateTexture: "plate-b", heroTexture: "hero-w17", heroAnchor: [0.8, 0.34], heroSize: 0.61, heroGlow: [0.66, 1, 0.5], plateFocus: [0.56, 0.48], fieldDensity: 1, particleDensity: 1.04, eventPace: 1, vignette: 0.42 },
    { worldId: "world-18", name: "Verdant Halo", plateTexture: "plate-c", heroTexture: "hero-w18", heroAnchor: [0.2, 0.31], heroSize: 0.63, heroGlow: [0.42, 1, 0.82], plateFocus: [0.44, 0.54], fieldDensity: 0.9, particleDensity: 1.14, eventPace: 0.94, vignette: 0.41 },
    { worldId: "world-19", name: "Pollen Crown", plateTexture: "plate-d", heroTexture: "hero-w19", heroAnchor: [0.79, 0.31], heroSize: 0.6, heroGlow: [1, 0.82, 0.42], plateFocus: [0.58, 0.5], fieldDensity: 0.96, particleDensity: 0.86, eventPace: 1.04, vignette: 0.43 },
    { worldId: "world-20", name: "Ancient Grove", plateTexture: "plate-e", heroTexture: "hero-w20", heroAnchor: [0.5, 0.2], heroSize: 0.59, heroGlow: [0.58, 1, 0.68], plateFocus: [0.5, 0.43], fieldDensity: 1.1, particleDensity: 1.22, eventPace: 0.84, vignette: 0.45 },
  ],
});
