import { createAuthoredOverworldGalaxy } from "./authored-overworld";

export const G05_KIT_ID = "g05-shadow-nature";

export const G05_COMPOSITIONS = createAuthoredOverworldGalaxy({
  kitId: G05_KIT_ID,
  fieldTint: [0.54, 0.6, 0.68],
  glowTint: [0.52, 0.34, 0.78],
  meteorColor: [0.66, 0.34, 0.72],
  eventTint: [0.76, 0.72, 0.84],
  particlePalette: [
    [0.38, 0.74, 0.82],
    [0.5, 0.3, 0.7],
    [0.7, 0.22, 0.34],
    [0.78, 0.52, 0.82],
  ],
  dustOpacity: 0.34,
  glowOpacity: 0.1,
  worlds: [
    { worldId: "world-21", name: "Twilight Fen", plateTexture: "plate", heroTexture: "hero-w21", heroAnchor: [0.2, 0.3], heroSize: 0.58, heroGlow: [0.36, 0.72, 0.8], plateFocus: [0.46, 0.55], fieldDensity: 0.84, particleDensity: 0.9, eventPace: 1.08, vignette: 0.4 },
    { worldId: "world-22", name: "Umbra Garden", plateTexture: "plate-b", heroTexture: "hero-w22", heroAnchor: [0.8, 0.34], heroSize: 0.61, heroGlow: [0.54, 0.32, 0.76], plateFocus: [0.56, 0.48], fieldDensity: 1, particleDensity: 1.04, eventPace: 1, vignette: 0.42 },
    { worldId: "world-23", name: "Nightglass", plateTexture: "plate-c", heroTexture: "hero-w23", heroAnchor: [0.2, 0.31], heroSize: 0.63, heroGlow: [0.42, 0.72, 0.92], plateFocus: [0.44, 0.54], fieldDensity: 0.9, particleDensity: 1.14, eventPace: 0.94, vignette: 0.41 },
    { worldId: "world-24", name: "Eclipse Hollow", plateTexture: "plate-d", heroTexture: "hero-w24", heroAnchor: [0.79, 0.31], heroSize: 0.6, heroGlow: [0.72, 0.22, 0.4], plateFocus: [0.58, 0.5], fieldDensity: 0.96, particleDensity: 0.86, eventPace: 1.04, vignette: 0.43 },
    { worldId: "world-25", name: "Shadow Crown", plateTexture: "plate-e", heroTexture: "hero-w25", heroAnchor: [0.5, 0.2], heroSize: 0.59, heroGlow: [0.72, 0.34, 0.78], plateFocus: [0.5, 0.43], fieldDensity: 1.1, particleDensity: 1.22, eventPace: 0.84, vignette: 0.45 },
  ],
});
