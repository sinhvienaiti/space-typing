import { createAuthoredOverworldGalaxy } from "./authored-overworld";

export const G09_KIT_ID = "g09-void-cathedral";

export const G09_COMPOSITIONS = createAuthoredOverworldGalaxy({
  kitId: G09_KIT_ID,
  fieldTint: [0.66, 0.64, 0.72],
  glowTint: [0.78, 0.72, 0.54],
  meteorColor: [0.62, 0.72, 0.9],
  eventTint: [0.88, 0.84, 0.72],
  particlePalette: [
    [0.9, 0.84, 0.62],
    [0.44, 0.76, 0.9],
    [0.62, 0.34, 0.62],
    [0.94, 0.94, 0.88],
  ],
  dustOpacity: 0.3,
  glowOpacity: 0.1,
  worlds: [
    { worldId: "world-41", name: "Silent Basilica", plateTexture: "plate", heroTexture: "hero-w41", heroAnchor: [0.2, 0.3], heroSize: 0.58, heroGlow: [0.86, 0.82, 0.64], plateFocus: [0.46, 0.55], fieldDensity: 0.84, particleDensity: 0.9, eventPace: 1.08, vignette: 0.4 },
    { worldId: "world-42", name: "Seraph Eclipse", plateTexture: "plate-b", heroTexture: "hero-w42", heroAnchor: [0.8, 0.34], heroSize: 0.61, heroGlow: [0.92, 0.88, 0.7], plateFocus: [0.56, 0.48], fieldDensity: 1, particleDensity: 1.04, eventPace: 1, vignette: 0.42 },
    { worldId: "world-43", name: "Astral Crypt", plateTexture: "plate-c", heroTexture: "hero-w43", heroAnchor: [0.2, 0.31], heroSize: 0.63, heroGlow: [0.54, 0.72, 0.9], plateFocus: [0.44, 0.54], fieldDensity: 0.9, particleDensity: 1.14, eventPace: 0.94, vignette: 0.41 },
    { worldId: "world-44", name: "Void Sanctuary", plateTexture: "plate-d", heroTexture: "hero-w44", heroAnchor: [0.79, 0.31], heroSize: 0.6, heroGlow: [0.62, 0.52, 0.82], plateFocus: [0.58, 0.5], fieldDensity: 0.96, particleDensity: 0.86, eventPace: 1.04, vignette: 0.43 },
    { worldId: "world-45", name: "Eventide Throne", plateTexture: "plate-e", heroTexture: "hero-w45", heroAnchor: [0.5, 0.2], heroSize: 0.59, heroGlow: [0.82, 0.62, 0.48], plateFocus: [0.5, 0.43], fieldDensity: 1.1, particleDensity: 1.22, eventPace: 0.84, vignette: 0.45 },
  ],
});
