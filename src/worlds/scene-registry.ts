import type { VisualQuality } from "../types";
import {
  WORLD_REGISTRY,
  worldById,
} from "./registry";
import type { WorldProfile } from "./types";
import {
  WORLD_CINEMATIC_MOTIONS,
  WORLD_SCENE_ARCHETYPES,
  WORLD_SCENE_MOTIONS,
  type WorldCinematicMotion,
  type WorldSceneArchetype,
  type WorldSceneMotion,
  type WorldSceneProfile,
  type WorldSceneQualityBudget,
} from "./scene-types";

type SceneGroupSpec = {
  archetype: WorldSceneArchetype;
  landmarks: readonly [string, string, string, string, string];
  floors: readonly [string, string, string, string, string];
  particles: readonly [string, string, string, string, string];
  motions: readonly [
    WorldSceneMotion,
    WorldSceneMotion,
    WorldSceneMotion,
    WorldSceneMotion,
    WorldSceneMotion,
  ];
};

const SCENE_GROUPS: readonly SceneGroupSpec[] = [
  {
    archetype: "celestial-rainbow",
    landmarks: [
      "rainbow-arch",
      "halo-garden",
      "prism-tide",
      "cherub-falls",
      "aurora-gate",
    ],
    floors: [
      "rainbow-light-lane",
      "halo-bridge",
      "prism-causeway",
      "cloud-step-lane",
      "aurora-portal-lane",
    ],
    particles: [
      "rainbow-dust",
      "holy-feathers",
      "prism-sparks",
      "light-droplets",
      "aurora-motes",
    ],
    motions: ["floating", "calm", "floating", "calm", "floating"],
  },
  {
    archetype: "infernal",
    landmarks: [
      "ember-orchard",
      "imp-furnace",
      "scarlet-halo",
      "cinder-cathedral",
      "demon-crown",
    ],
    floors: [
      "ember-rift",
      "furnace-lane",
      "scarlet-rift",
      "cinder-aisle",
      "demon-crown-lane",
    ],
    particles: [
      "embers",
      "furnace-sparks",
      "ash",
      "cinder-rain",
      "hellfire-motes",
    ],
    motions: ["floating", "heavy", "storm", "heavy", "storm"],
  },
  {
    archetype: "frost-prism",
    landmarks: [
      "snowglass-bay",
      "crystal-drift",
      "frozen-prism",
      "glacier-choir",
      "winter-oracle",
    ],
    floors: [
      "ice-plane",
      "crystal-lane",
      "frozen-prism-lane",
      "glacier-aisle",
      "oracle-ice-path",
    ],
    particles: [
      "snow",
      "crystal-dust",
      "ice-sparks",
      "snowfall",
      "oracle-motes",
    ],
    motions: ["calm", "floating", "floating", "storm", "calm"],
  },
  {
    archetype: "verdant",
    landmarks: [
      "leaflight-meadow",
      "bloom-circuit",
      "verdant-halo",
      "pollen-crown",
      "ancient-grove",
    ],
    floors: [
      "meadow-root-path",
      "bloom-vine-lane",
      "verdant-bridge",
      "pollen-root-lane",
      "ancient-root-road",
    ],
    particles: [
      "leaf-motes",
      "petal-drift",
      "green-fireflies",
      "pollen",
      "ancient-spores",
    ],
    motions: ["calm", "floating", "floating", "floating", "calm"],
  },
  {
    archetype: "shadow-nature",
    landmarks: [
      "twilight-fen",
      "umbra-garden",
      "nightglass",
      "eclipse-hollow",
      "shadow-crown",
    ],
    floors: [
      "twilight-rift",
      "umbra-root-lane",
      "nightglass-path",
      "eclipse-rift",
      "shadow-crown-lane",
    ],
    particles: [
      "shadow-dust",
      "dark-petals",
      "glass-shards",
      "eclipse-ash",
      "void-shards",
    ],
    motions: ["calm", "floating", "floating", "storm", "heavy"],
  },
  {
    archetype: "cosmic-forge",
    landmarks: [
      "starforge-port",
      "nebula-works",
      "prism-reactor",
      "nova-foundry",
      "cosmic-engine",
    ],
    floors: [
      "port-energy-lane",
      "factory-panel-lane",
      "reactor-grid",
      "foundry-track",
      "engine-conduit",
    ],
    particles: [
      "dock-sparks",
      "machine-dust",
      "reactor-sparks",
      "nova-embers",
      "engine-sparks",
    ],
    motions: ["heavy", "heavy", "floating", "storm", "heavy"],
  },
  {
    archetype: "abyssal",
    landmarks: [
      "abyss-choir",
      "cursed-orbit",
      "infernal-veil",
      "black-halo",
      "void-chapel",
    ],
    floors: [
      "abyss-aisle",
      "cursed-orbit-lane",
      "veil-rift",
      "black-halo-path",
      "void-chapel-aisle",
    ],
    particles: [
      "abyss-dust",
      "cursed-fragments",
      "veil-ash",
      "black-motes",
      "chapel-dust",
    ],
    motions: ["calm", "floating", "storm", "heavy", "calm"],
  },
  {
    archetype: "aurora-cosmic",
    landmarks: [
      "aurora-nexus",
      "comet-glacier",
      "starlit-tundra",
      "frozen-cosmos",
      "polar-singularity",
    ],
    floors: [
      "aurora-lane",
      "comet-belt-lane",
      "starlit-ice-path",
      "frozen-orbit-lane",
      "singularity-lane",
    ],
    particles: [
      "aurora-dust",
      "comet-debris",
      "star-snow",
      "ice-meteors",
      "polar-dust",
    ],
    motions: ["floating", "storm", "calm", "floating", "heavy"],
  },
  {
    archetype: "void-cathedral",
    landmarks: [
      "silent-basilica",
      "seraph-eclipse",
      "astral-crypt",
      "void-sanctuary",
      "eventide-throne",
    ],
    floors: [
      "basilica-aisle",
      "seraph-light-path",
      "crypt-stone-lane",
      "sanctuary-aisle",
      "throne-procession",
    ],
    particles: [
      "silent-dust",
      "seraph-feathers",
      "astral-dust",
      "void-incense",
      "eventide-motes",
    ],
    motions: ["calm", "floating", "calm", "heavy", "calm"],
  },
  {
    archetype: "eternity",
    landmarks: [
      "eternity-prism",
      "celestial-abyss",
      "chaos-aurora",
      "infinity-choir",
      "cosmic-crown",
    ],
    floors: [
      "eternity-prism-lane",
      "abyss-crown-lane",
      "chaos-rift-lane",
      "infinity-path",
      "cosmic-crown-road",
    ],
    particles: [
      "eternity-sparks",
      "celestial-void-motes",
      "chaos-shards",
      "infinity-dust",
      "crown-stars",
    ],
    motions: ["floating", "heavy", "storm", "floating", "storm"],
  },
] as const;


type CinematicDefaults = {
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
};

function cinematicDefaults(
  archetype: WorldSceneArchetype,
  variant: 1 | 2 | 3 | 4 | 5,
): CinematicDefaults {
  const variantScale = 0.92 + variant * 0.035;

  if (archetype === "celestial-rainbow") {
    return {
      primaryMotion: "deep-flight",
      secondaryMotion:
        variant === 5 ? "aurora-wave" : variant === 2 ? "cloud-drift" : "orbital-swirl",
      flightIntensity: 0.86 * variantScale,
      starDensity: 0.98,
      midObjectDensity: 0.72,
      foregroundDensity: 0.68,
      eventFrequency: 0.36 + variant * 0.035,
      vortexStrength: variant === 3 ? 0.92 : 0.68,
      asteroidDensity: variant === 2 || variant === 4 ? 0.34 : 0.52,
      cloudDensity: variant === 2 || variant === 4 ? 0.76 : 0.42,
    };
  }

  if (archetype === "infernal") {
    return {
      primaryMotion: "ember-rise",
      secondaryMotion: variant >= 3 ? "meteor-storm" : "cloud-drift",
      flightIntensity: 0.56 * variantScale,
      starDensity: 0.22,
      midObjectDensity: 0.62,
      foregroundDensity: 0.84,
      eventFrequency: 0.42 + variant * 0.035,
      vortexStrength: 0.08,
      asteroidDensity: 0.26,
      cloudDensity: 0.7,
    };
  }

  if (archetype === "frost-prism") {
    return {
      primaryMotion: "snow-flight",
      secondaryMotion: "aurora-wave",
      flightIntensity: 0.58 * variantScale,
      starDensity: 0.5,
      midObjectDensity: 0.48,
      foregroundDensity: 0.72,
      eventFrequency: 0.18 + variant * 0.02,
      vortexStrength: 0.12,
      asteroidDensity: variant === 2 ? 0.22 : 0.1,
      cloudDensity: 0.48,
    };
  }

  if (archetype === "verdant") {
    return {
      primaryMotion: "organic-drift",
      secondaryMotion: "cloud-drift",
      flightIntensity: 0.44 * variantScale,
      starDensity: 0.12,
      midObjectDensity: 0.6,
      foregroundDensity: 0.78,
      eventFrequency: 0.12 + variant * 0.015,
      vortexStrength: 0.05,
      asteroidDensity: 0,
      cloudDensity: 0.66,
    };
  }

  if (archetype === "shadow-nature") {
    return {
      primaryMotion: "void-drift",
      secondaryMotion: variant >= 4 ? "orbital-swirl" : "organic-drift",
      flightIntensity: 0.5 * variantScale,
      starDensity: 0.24,
      midObjectDensity: 0.58,
      foregroundDensity: 0.7,
      eventFrequency: 0.16 + variant * 0.025,
      vortexStrength: 0.34 + variant * 0.06,
      asteroidDensity: 0.18,
      cloudDensity: 0.6,
    };
  }

  if (archetype === "cosmic-forge") {
    return {
      primaryMotion: "reactor-motion",
      secondaryMotion: "deep-flight",
      flightIntensity: 0.62 * variantScale,
      starDensity: 0.5,
      midObjectDensity: 0.74,
      foregroundDensity: 0.68,
      eventFrequency: 0.26 + variant * 0.025,
      vortexStrength: 0.42,
      asteroidDensity: 0.16,
      cloudDensity: 0.22,
    };
  }

  if (archetype === "abyssal") {
    return {
      primaryMotion: "void-drift",
      secondaryMotion: "orbital-swirl",
      flightIntensity: 0.46 * variantScale,
      starDensity: 0.3,
      midObjectDensity: 0.62,
      foregroundDensity: 0.64,
      eventFrequency: 0.2 + variant * 0.025,
      vortexStrength: 0.78,
      asteroidDensity: 0.34,
      cloudDensity: 0.5,
    };
  }

  if (archetype === "aurora-cosmic") {
    return {
      primaryMotion: "asteroid-flow",
      secondaryMotion: variant === 1 ? "aurora-wave" : "meteor-storm",
      flightIntensity: 0.9 * variantScale,
      starDensity: 0.9,
      midObjectDensity: 0.88,
      foregroundDensity: 0.76,
      eventFrequency: 0.44 + variant * 0.035,
      vortexStrength: variant === 5 ? 0.72 : 0.22,
      asteroidDensity: 0.94,
      cloudDensity: 0.34,
    };
  }

  if (archetype === "void-cathedral") {
    return {
      primaryMotion: "sacred-drift",
      secondaryMotion: variant === 2 ? "orbital-swirl" : "void-drift",
      flightIntensity: 0.34 * variantScale,
      starDensity: 0.36,
      midObjectDensity: 0.42,
      foregroundDensity: 0.46,
      eventFrequency: 0.12 + variant * 0.015,
      vortexStrength: variant === 2 ? 0.56 : 0.2,
      asteroidDensity: 0.08,
      cloudDensity: 0.38,
    };
  }

  return {
    primaryMotion: "deep-flight",
    secondaryMotion: variant === 3 ? "meteor-storm" : "orbital-swirl",
    flightIntensity: 0.78 * variantScale,
    starDensity: 0.84,
    midObjectDensity: 0.82,
    foregroundDensity: 0.78,
    eventFrequency: 0.34 + variant * 0.035,
    vortexStrength: 0.68 + variant * 0.035,
    asteroidDensity: 0.46,
    cloudDensity: 0.32,
  };
}

function sceneSeed(worldIndex: number): number {
  return Math.imul(worldIndex + 1, 0x45d9f3b) >>> 0;
}

function sceneProfile(
  world: WorldProfile,
  index: number,
): WorldSceneProfile {
  const galaxyIndex = Math.max(0, Math.min(9, world.galaxy - 1));
  const slot = index % 5;
  const spec = SCENE_GROUPS[galaxyIndex]!;
  const variant = (slot + 1) as 1 | 2 | 3 | 4 | 5;
  const cinematic = cinematicDefaults(spec.archetype, variant);

  return {
    id: world.backgroundProfile + "-scene",
    worldId: world.id,
    archetype: spec.archetype,
    variant,
    landmarkStyle: spec.landmarks[slot]!,
    floorStyle: spec.floors[slot]!,
    particleStyle: spec.particles[slot]!,
    motion: spec.motions[slot]!,
    ...cinematic,
    seed: sceneSeed(index),
    horizonRatio: 0.18 + slot * 0.012,
    landmarkIntensity: 0.72 + slot * 0.055,
  };
}

export const WORLD_SCENE_REGISTRY: Readonly<
  Record<string, WorldSceneProfile>
> = Object.fromEntries(
  WORLD_REGISTRY.map((world, index) => [
    world.id,
    sceneProfile(world, index),
  ]),
);

export function sceneProfileForWorld(
  worldOrId: WorldProfile | string,
): WorldSceneProfile {
  const world =
    typeof worldOrId === "string"
      ? worldById(worldOrId)
      : worldOrId;
  if (world === undefined) {
    return WORLD_SCENE_REGISTRY["world-01"]!;
  }
  return WORLD_SCENE_REGISTRY[world.id]!;
}

export function sceneQualityBudget(
  quality: VisualQuality,
): WorldSceneQualityBudget {
  if (quality === "low") {
    return {
      ambientParticles: 8,
      farDetails: 3,
      midDetails: 2,
      farStars: 70,
      nearStars: 12,
      midObjects: 5,
      foregroundObjects: 8,
      eventObjects: 1,
    };
  }
  if (quality === "medium") {
    return {
      ambientParticles: 14,
      farDetails: 4,
      midDetails: 3,
      farStars: 110,
      nearStars: 18,
      midObjects: 7,
      foregroundObjects: 12,
      eventObjects: 1,
    };
  }
  if (quality === "high") {
    return {
      ambientParticles: 20,
      farDetails: 5,
      midDetails: 4,
      farStars: 155,
      nearStars: 26,
      midObjects: 10,
      foregroundObjects: 16,
      eventObjects: 2,
    };
  }
  return {
    ambientParticles: 28,
    farDetails: 6,
    midDetails: 5,
    farStars: 210,
    nearStars: 34,
    midObjects: 13,
    foregroundObjects: 22,
    eventObjects: 2,
  };
}

export function validateWorldSceneRegistry(): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const [index, world] of WORLD_REGISTRY.entries()) {
    const profile = WORLD_SCENE_REGISTRY[world.id];
    if (profile === undefined) {
      errors.push(world.id + ": missing scene profile.");
      continue;
    }
    if (profile.worldId !== world.id) {
      errors.push(world.id + ": scene world mismatch.");
    }
    if (ids.has(profile.id)) {
      errors.push(world.id + ": duplicate scene id " + profile.id + ".");
    }
    ids.add(profile.id);
    if (!WORLD_SCENE_ARCHETYPES.includes(profile.archetype)) {
      errors.push(world.id + ": unknown scene archetype.");
    }
    if (!WORLD_SCENE_MOTIONS.includes(profile.motion)) {
      errors.push(world.id + ": unknown scene motion.");
    }
    if (!WORLD_CINEMATIC_MOTIONS.includes(profile.primaryMotion)) {
      errors.push(world.id + ": unknown primary cinematic motion.");
    }
    if (
      profile.secondaryMotion !== null &&
      !WORLD_CINEMATIC_MOTIONS.includes(profile.secondaryMotion)
    ) {
      errors.push(world.id + ": unknown secondary cinematic motion.");
    }
    if (profile.variant !== (index % 5) + 1) {
      errors.push(world.id + ": invalid scene variant.");
    }
    if (
      profile.landmarkStyle.trim().length === 0 ||
      profile.floorStyle.trim().length === 0 ||
      profile.particleStyle.trim().length === 0
    ) {
      errors.push(world.id + ": incomplete scene style.");
    }
    if (
      !Number.isFinite(profile.horizonRatio) ||
      profile.horizonRatio <= 0 ||
      profile.horizonRatio >= 0.5 ||
      !Number.isFinite(profile.landmarkIntensity) ||
      profile.landmarkIntensity <= 0 ||
      profile.landmarkIntensity > 1
    ) {
      errors.push(world.id + ": invalid scene intensity/horizon.");
    }
    for (const [label, value] of [
      ["flightIntensity", profile.flightIntensity],
      ["starDensity", profile.starDensity],
      ["midObjectDensity", profile.midObjectDensity],
      ["foregroundDensity", profile.foregroundDensity],
      ["eventFrequency", profile.eventFrequency],
      ["vortexStrength", profile.vortexStrength],
      ["asteroidDensity", profile.asteroidDensity],
      ["cloudDensity", profile.cloudDensity],
    ] as const) {
      if (!Number.isFinite(value) || value < 0 || value > 1.2) {
        errors.push(world.id + ": invalid cinematic " + label + ".");
      }
    }
  }

  return errors;
}
