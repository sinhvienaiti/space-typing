import type { VisualQuality } from "../types";
import {
  WORLD_REGISTRY,
  worldById,
} from "./registry";
import type { WorldProfile } from "./types";
import {
  WORLD_SCENE_ARCHETYPES,
  WORLD_SCENE_MOTIONS,
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

  return {
    id: world.backgroundProfile + "-scene",
    worldId: world.id,
    archetype: spec.archetype,
    variant,
    landmarkStyle: spec.landmarks[slot]!,
    floorStyle: spec.floors[slot]!,
    particleStyle: spec.particles[slot]!,
    motion: spec.motions[slot]!,
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
    return { ambientParticles: 8, farDetails: 3, midDetails: 2 };
  }
  if (quality === "medium") {
    return { ambientParticles: 14, farDetails: 4, midDetails: 3 };
  }
  if (quality === "high") {
    return { ambientParticles: 20, farDetails: 5, midDetails: 4 };
  }
  return { ambientParticles: 28, farDetails: 6, midDetails: 5 };
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
  }

  return errors;
}
