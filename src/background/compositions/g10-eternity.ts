import { createAuthoredOverworldGalaxy } from "./authored-overworld";

export const G10_KIT_ID = "g10-eternity";

export const G10_COMPOSITIONS = createAuthoredOverworldGalaxy({
  kitId: G10_KIT_ID,
  fieldTint: [0.74, 0.76, 0.84],
  glowTint: [0.62, 0.5, 1],
  meteorColor: [0.92, 0.86, 1],
  eventTint: [0.94, 0.92, 1],
  particlePalette: [
    [0.5, 0.9, 1],
    [0.72, 0.5, 1],
    [0.92, 0.8, 0.48],
    [0.48, 0.9, 0.68],
  ],
  dustOpacity: 0.28,
  glowOpacity: 0.14,
  worlds: [
    { worldId: "world-46", name: "Eternity Prism", plateTexture: "plate", heroTexture: "hero-w46", heroAnchor: [0.2, 0.3], heroSize: 0.58, heroGlow: [0.52, 0.9, 1], plateFocus: [0.46, 0.55], fieldDensity: 0.84, particleDensity: 0.9, eventPace: 1.08, vignette: 0.4 },
    { worldId: "world-47", name: "Celestial Abyss", plateTexture: "plate-b", heroTexture: "hero-w47", heroAnchor: [0.8, 0.34], heroSize: 0.61, heroGlow: [0.52, 0.42, 0.86], plateFocus: [0.56, 0.48], fieldDensity: 1, particleDensity: 1.04, eventPace: 1, vignette: 0.42 },
    { worldId: "world-48", name: "Chaos Aurora", plateTexture: "plate-c", heroTexture: "hero-w48", heroAnchor: [0.2, 0.31], heroSize: 0.63, heroGlow: [0.5, 0.94, 0.82], plateFocus: [0.44, 0.54], fieldDensity: 0.9, particleDensity: 1.14, eventPace: 0.94, vignette: 0.41 },
    { worldId: "world-49", name: "Infinity Choir", plateTexture: "plate-d", heroTexture: "hero-w49", heroAnchor: [0.79, 0.31], heroSize: 0.6, heroGlow: [0.86, 0.78, 1], plateFocus: [0.58, 0.5], fieldDensity: 0.96, particleDensity: 0.86, eventPace: 1.04, vignette: 0.43 },
    { worldId: "world-50", name: "Cosmic Crown", plateTexture: "plate-e", heroTexture: "hero-w50", heroAnchor: [0.5, 0.2], heroSize: 0.59, heroGlow: [0.94, 0.88, 0.62], plateFocus: [0.5, 0.43], fieldDensity: 1.1, particleDensity: 1.22, eventPace: 0.84, vignette: 0.45 },
  ],
});
