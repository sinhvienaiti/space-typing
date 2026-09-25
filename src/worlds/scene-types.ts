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

export type WorldSceneProfile = {
  id: string;
  worldId: string;
  archetype: WorldSceneArchetype;
  variant: 1 | 2 | 3 | 4 | 5;
  landmarkStyle: string;
  floorStyle: string;
  particleStyle: string;
  motion: WorldSceneMotion;
  seed: number;
  horizonRatio: number;
  landmarkIntensity: number;
};

export type WorldSceneQualityBudget = {
  ambientParticles: number;
  farDetails: number;
  midDetails: number;
};
