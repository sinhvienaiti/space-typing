import { createAuthoredOverworldGalaxy } from "./authored-overworld";

export const G03_KIT_ID = "g03-frost-prism";

export const G03_COMPOSITIONS = createAuthoredOverworldGalaxy({
  kitId: G03_KIT_ID,
  fieldTint: [0.72, 0.86, 1],
  glowTint: [0.48, 0.84, 1],
  meteorColor: [0.72, 0.92, 1],
  eventTint: [0.88, 0.95, 1],
  particlePalette: [
    [0.5, 0.9, 1],
    [0.74, 0.82, 1],
    [0.9, 0.95, 1],
    [0.76, 0.58, 1],
  ],
  dustOpacity: 0.28,
  glowOpacity: 0.14,
  worlds: [
    { worldId: "world-11", name: "Snowglass Bay", plateTexture: "plate", heroTexture: "hero-w11", heroAnchor: [0.2, 0.3], heroSize: 0.58, heroGlow: [0.45, 0.9, 1], plateFocus: [0.46, 0.55], fieldDensity: 0.84, particleDensity: 0.9, eventPace: 1.08, vignette: 0.4 },
    { worldId: "world-12", name: "Crystal Drift", plateTexture: "plate", heroTexture: "hero-w12", heroAnchor: [0.8, 0.34], heroSize: 0.61, heroGlow: [0.55, 0.78, 1], plateFocus: [0.56, 0.48], fieldDensity: 1, particleDensity: 1.04, eventPace: 1, vignette: 0.42 },
    { worldId: "world-13", name: "Frozen Prism", plateTexture: "plate", heroTexture: "hero-w13", heroAnchor: [0.2, 0.31], heroSize: 0.63, heroGlow: [0.72, 0.62, 1], plateFocus: [0.44, 0.54], fieldDensity: 0.9, particleDensity: 1.14, eventPace: 0.94, vignette: 0.41 },
    { worldId: "world-14", name: "Glacier Choir", plateTexture: "plate", heroTexture: "hero-w14", heroAnchor: [0.79, 0.31], heroSize: 0.6, heroGlow: [0.62, 0.9, 1], plateFocus: [0.58, 0.5], fieldDensity: 0.96, particleDensity: 0.86, eventPace: 1.04, vignette: 0.43 },
    { worldId: "world-15", name: "Winter Oracle", plateTexture: "plate", heroTexture: "hero-w15", heroAnchor: [0.5, 0.2], heroSize: 0.59, heroGlow: [0.78, 0.76, 1], plateFocus: [0.5, 0.43], fieldDensity: 1.1, particleDensity: 1.22, eventPace: 0.84, vignette: 0.45 },
  ],
});
