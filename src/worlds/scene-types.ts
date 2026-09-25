export const WORLD_SCENE_ARCHETYPES = [
  "celestial-rainbow",
  "infernal",
  "frost-prism",
  "verdant",
  "shadow-nature",
  "cosmic-forge",
  "abyssal",
  "aurora-cosmic",
  "void-cathedral",
  "eternity",
] as const;

export type WorldSceneArchetype =
  (typeof WORLD_SCENE_ARCHETYPES)[number];

export const WORLD_SCENE_MOTIONS = [
  "calm",
  "floating",
  "storm",
  "heavy",
] as const;

export type WorldSceneMotion =
  (typeof WORLD_SCENE_MOTIONS)[number];

export const WORLD_CINEMATIC_MOTIONS = [
  "deep-flight",
  "cloud-drift",
  "orbital-swirl",
  "asteroid-flow",
  "meteor-storm",
  "ember-rise",
  "snow-flight",
  "aurora-wave",
  "organic-drift",
  "void-drift",
  "reactor-motion",
  "sacred-drift",
] as const;

export type WorldCinematicMotion =
  (typeof WORLD_CINEMATIC_MOTIONS)[number];

export type WorldSceneProfile = {
  id: string;
  worldId: string;
  archetype: WorldSceneArchetype;
  variant: 1 | 2 | 3 | 4 | 5;
  landmarkStyle: string;
  floorStyle: string;
  particleStyle: string;
  motion: WorldSceneMotion;
  primaryMotion: WorldCinematicMotion;
  secondaryMotion: WorldCinematicMotion | null;
  flightIntensity: number;
  starDensity: number;
  midObjectDensity: number;
  foregroundDensity: number;
  eventFrequency: number;
  vortexStrength: number;
  asteroidDensity: number;
  cloudDensity: number;
  seed: number;
  horizonRatio: number;
  landmarkIntensity: number;
};

export type WorldSceneQualityBudget = {
  ambientParticles: number;
  farDetails: number;
  midDetails: number;
  farStars: number;
  nearStars: number;
  midObjects: number;
  foregroundObjects: number;
  eventObjects: number;
};
