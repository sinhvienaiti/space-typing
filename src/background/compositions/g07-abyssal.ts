import { createAuthoredOverworldGalaxy } from "./authored-overworld";

export const G07_KIT_ID = "g07-abyssal";

export const G07_COMPOSITIONS = createAuthoredOverworldGalaxy({
  kitId: G07_KIT_ID,
  fieldTint: [0.48, 0.46, 0.62],
  glowTint: [0.44, 0.24, 0.7],
  meteorColor: [0.72, 0.2, 0.34],
  eventTint: [0.7, 0.66, 0.82],
  particlePalette: [
    [0.34, 0.24, 0.64],
    [0.62, 0.2, 0.54],
    [0.26, 0.6, 0.72],
    [0.72, 0.18, 0.28],
  ],
  dustOpacity: 0.38,
  glowOpacity: 0.09,
  worlds: [
    { worldId: "world-31", name: "Abyss Choir", plateTexture: "plate", heroTexture: "hero-w31", heroAnchor: [0.2, 0.3], heroSize: 0.58, heroGlow: [0.34, 0.46, 0.74], plateFocus: [0.46, 0.55], fieldDensity: 0.84, particleDensity: 0.9, eventPace: 1.08, vignette: 0.4 },
    { worldId: "world-32", name: "Cursed Orbit", plateTexture: "plate-b", heroTexture: "hero-w32", heroAnchor: [0.8, 0.34], heroSize: 0.61, heroGlow: [0.58, 0.28, 0.72], plateFocus: [0.56, 0.48], fieldDensity: 1, particleDensity: 1.04, eventPace: 1, vignette: 0.42 },
    { worldId: "world-33", name: "Infernal Veil", plateTexture: "plate-c", heroTexture: "hero-w33", heroAnchor: [0.2, 0.31], heroSize: 0.63, heroGlow: [0.7, 0.18, 0.3], plateFocus: [0.44, 0.54], fieldDensity: 0.9, particleDensity: 1.14, eventPace: 0.94, vignette: 0.41 },
    { worldId: "world-34", name: "Black Halo", plateTexture: "plate-d", heroTexture: "hero-w34", heroAnchor: [0.79, 0.31], heroSize: 0.6, heroGlow: [0.26, 0.56, 0.68], plateFocus: [0.58, 0.5], fieldDensity: 0.96, particleDensity: 0.86, eventPace: 1.04, vignette: 0.43 },
    { worldId: "world-35", name: "Void Chapel", plateTexture: "plate-e", heroTexture: "hero-w35", heroAnchor: [0.5, 0.2], heroSize: 0.59, heroGlow: [0.54, 0.3, 0.72], plateFocus: [0.5, 0.43], fieldDensity: 1.1, particleDensity: 1.22, eventPace: 0.84, vignette: 0.45 },
  ],
});
