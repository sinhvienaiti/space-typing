import { createAuthoredOverworldGalaxy } from "./authored-overworld";

export const G06_KIT_ID = "g06-cosmic-forge";

export const G06_COMPOSITIONS = createAuthoredOverworldGalaxy({
  kitId: G06_KIT_ID,
  fieldTint: [0.66, 0.72, 0.8],
  glowTint: [0.28, 0.78, 1],
  meteorColor: [1, 0.58, 0.22],
  eventTint: [0.82, 0.9, 1],
  particlePalette: [
    [0.28, 0.82, 1],
    [1, 0.62, 0.24],
    [0.72, 0.5, 1],
    [0.92, 0.96, 1],
  ],
  dustOpacity: 0.26,
  glowOpacity: 0.14,
  worlds: [
    { worldId: "world-26", name: "Starforge Port", plateTexture: "plate", heroTexture: "hero-w26", heroAnchor: [0.2, 0.3], heroSize: 0.58, heroGlow: [0.3, 0.82, 1], plateFocus: [0.46, 0.55], fieldDensity: 0.84, particleDensity: 0.9, eventPace: 1.08, vignette: 0.4 },
    { worldId: "world-27", name: "Nebula Works", plateTexture: "plate-b", heroTexture: "hero-w27", heroAnchor: [0.8, 0.34], heroSize: 0.61, heroGlow: [0.4, 0.72, 1], plateFocus: [0.56, 0.48], fieldDensity: 1, particleDensity: 1.04, eventPace: 1, vignette: 0.42 },
    { worldId: "world-28", name: "Prism Reactor", plateTexture: "plate-c", heroTexture: "hero-w28", heroAnchor: [0.2, 0.31], heroSize: 0.63, heroGlow: [0.72, 0.5, 1], plateFocus: [0.44, 0.54], fieldDensity: 0.9, particleDensity: 1.14, eventPace: 0.94, vignette: 0.41 },
    { worldId: "world-29", name: "Nova Foundry", plateTexture: "plate-d", heroTexture: "hero-w29", heroAnchor: [0.79, 0.31], heroSize: 0.6, heroGlow: [1, 0.48, 0.18], plateFocus: [0.58, 0.5], fieldDensity: 0.96, particleDensity: 0.86, eventPace: 1.04, vignette: 0.43 },
    { worldId: "world-30", name: "Cosmic Engine", plateTexture: "plate-e", heroTexture: "hero-w30", heroAnchor: [0.5, 0.2], heroSize: 0.59, heroGlow: [0.5, 0.86, 1], plateFocus: [0.5, 0.43], fieldDensity: 1.1, particleDensity: 1.22, eventPace: 0.84, vignette: 0.45 },
  ],
});
