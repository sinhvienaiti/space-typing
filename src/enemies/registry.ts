import type { EnemyFamilyId } from "./families";
import type { EnemyRewardId } from "./rewards";
import {
  ENEMY_REWARD_DEFINITIONS,
  isEnemyRewardId,
} from "./rewards";
import type { EnemyRoleId } from "./roles";
import {
  isReadableVisualProfile,
  type EnemyVisualProfile,
} from "./visuals";

export const ENEMY_RARITIES = [
  "common",
  "uncommon",
  "rare",
  "elite",
  "boss",
] as const;

export type EnemyRarity = (typeof ENEMY_RARITIES)[number];

export type EnemyDefinition = {
  id: string;
  name: string;
  family: EnemyFamilyId;
  role: EnemyRoleId;
  rarity: EnemyRarity;
  minStage: number;
  spawnWeight: number;
  durabilityScale: number;
  speedScale: number;
  reward?: EnemyRewardId;
  rewardPower?: number;
  visual: EnemyVisualProfile;
};

const rainbowBase = {
  body: "rainbow-water-orb",
  face: "cute-round",
  wings: "feather-small",
  aura: "rainbow-sparkle",
  spawnFx: "soft-pop",
  hitFx: "rainbow-spark",
  deathFx: "rainbow-burst",
} satisfies EnemyVisualProfile;

const angelBase = {
  body: "holy-orb",
  face: "cute-round",
  wings: "feather-small",
  head: "single-halo",
  aura: "holy-glow",
  spawnFx: "holy-pop",
  hitFx: "holy-spark",
  deathFx: "holy-burst",
} satisfies EnemyVisualProfile;

const devilBase = {
  body: "infernal-orb",
  face: "cute-fierce",
  wings: "bat-small",
  head: "small-horns",
  aura: "infernal-flame",
  spawnFx: "ember-pop",
  hitFx: "ember-spark",
  deathFx: "infernal-burst",
} satisfies EnemyVisualProfile;

const frostBase = {
  body: "frost-orb",
  face: "cute-round",
  wings: "crystal",
  aura: "frost-mist",
  spawnFx: "frost-pop",
  hitFx: "ice-spark",
  deathFx: "frost-burst",
} satisfies EnemyVisualProfile;

export const ENEMY_REGISTRY = [
  {
    id: "rainbow-scout",
    name: "Rainbow Scout",
    family: "rainbow",
    role: "normal",
    rarity: "common",
    minStage: 1,
    spawnWeight: 1,
    durabilityScale: 1,
    speedScale: 1,
    visual: rainbowBase,
  },
  {
    id: "rainbow-dart",
    name: "Rainbow Dart",
    family: "rainbow",
    role: "swift",
    rarity: "uncommon",
    minStage: 10,
    spawnWeight: 0.35,
    durabilityScale: 0.8,
    speedScale: 1.28,
    visual: {
      ...rainbowBase,
      wings: "fairy",
      aura: "rainbow-sparkle-fast",
    },
  },
  {
    id: "rainbow-bubble",
    name: "Rainbow Bubble",
    family: "rainbow",
    role: "tank",
    rarity: "uncommon",
    minStage: 20,
    spawnWeight: 0.25,
    durabilityScale: 1.8,
    speedScale: 0.72,
    visual: {
      ...rainbowBase,
      body: "rainbow-water-orb-large",
      aura: "rainbow-shell",
    },
  },
  {
    id: "angel-healer",
    name: "Angel Healer",
    family: "angel",
    role: "support",
    rarity: "rare",
    minStage: 30,
    spawnWeight: 0.09,
    durabilityScale: 1,
    speedScale: 0.9,
    reward: "heal-burst",
    rewardPower: 0.15,
    visual: {
      ...angelBase,
      rewardMarker: ENEMY_REWARD_DEFINITIONS["heal-burst"].marker,
    },
  },
  {
    id: "bomb-imp",
    name: "Bomb Imp",
    family: "devil",
    role: "burst",
    rarity: "rare",
    minStage: 60,
    spawnWeight: 0.08,
    durabilityScale: 0.9,
    speedScale: 1.05,
    reward: "explosion-burst",
    rewardPower: 0.35,
    visual: {
      ...devilBase,
      side: "ember-tail",
      rewardMarker:
        ENEMY_REWARD_DEFINITIONS["explosion-burst"].marker,
    },
  },
  {
    id: "freeze-burst-sprite",
    name: "Freeze Burst Sprite",
    family: "frost",
    role: "control",
    rarity: "rare",
    minStage: 40,
    spawnWeight: 0.08,
    durabilityScale: 0.9,
    speedScale: 0.92,
    reward: "freeze-nearby",
    rewardPower: 3,
    visual: {
      ...frostBase,
      rewardMarker:
        ENEMY_REWARD_DEFINITIONS["freeze-nearby"].marker,
    },
  },
  {
    id: "seraph-elite",
    name: "Seraph Elite",
    family: "angel",
    role: "elite",
    rarity: "elite",
    minStage: 90,
    spawnWeight: 0.03,
    durabilityScale: 1.65,
    speedScale: 0.92,
    reward: "shield-burst",
    rewardPower: 0.22,
    visual: {
      ...angelBase,
      wings: "feather-large",
      head: "double-halo",
      aura: "holy-glow-elite",
      rewardMarker:
        ENEMY_REWARD_DEFINITIONS["shield-burst"].marker,
    },
  },
  {
    id: "berserk-devil",
    name: "Berserk Devil",
    family: "devil",
    role: "elite",
    rarity: "elite",
    minStage: 120,
    spawnWeight: 0.03,
    durabilityScale: 1.5,
    speedScale: 1.12,
    reward: "damage-up",
    rewardPower: 1.2,
    visual: {
      ...devilBase,
      wings: "bat-large",
      head: "large-horns",
      aura: "infernal-flame-elite",
      rewardMarker: ENEMY_REWARD_DEFINITIONS["damage-up"].marker,
    },
  },
  {
    id: "archangel-core",
    name: "Archangel Core",
    family: "angel",
    role: "boss",
    rarity: "boss",
    minStage: 100,
    spawnWeight: 0,
    durabilityScale: 1,
    speedScale: 1,
    reward: "shield-burst",
    rewardPower: 0.4,
    visual: {
      ...angelBase,
      body: "holy-orb-boss",
      wings: "feather-large-four",
      head: "triple-halo",
      orbit: "holy-orbit",
      aura: "holy-glow-boss",
      rewardMarker:
        ENEMY_REWARD_DEFINITIONS["shield-burst"].marker,
      deathFx: "holy-boss-burst",
    },
  },
  {
    id: "demon-lord-orb",
    name: "Demon Lord Orb",
    family: "devil",
    role: "boss",
    rarity: "boss",
    minStage: 200,
    spawnWeight: 0,
    durabilityScale: 1,
    speedScale: 1,
    reward: "damage-up",
    rewardPower: 1.25,
    visual: {
      ...devilBase,
      body: "infernal-orb-boss",
      wings: "bat-large",
      head: "demon-crown",
      side: "ember-tail",
      orbit: "infernal-orbit",
      aura: "infernal-flame-boss",
      rewardMarker: ENEMY_REWARD_DEFINITIONS["damage-up"].marker,
      deathFx: "infernal-boss-burst",
    },
  },
] as const satisfies readonly EnemyDefinition[];

export function enemyDefinition(
  id: string,
): EnemyDefinition | undefined {
  return ENEMY_REGISTRY.find((definition) => definition.id === id);
}

export function validateEnemyRegistry(
  definitions: readonly EnemyDefinition[] = ENEMY_REGISTRY,
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const definition of definitions) {
    if (definition.id.trim().length === 0) {
      errors.push("Enemy id cannot be empty.");
    } else if (ids.has(definition.id)) {
      errors.push("Duplicate enemy id: " + definition.id);
    } else {
      ids.add(definition.id);
    }

    if (definition.name.trim().length === 0) {
      errors.push(definition.id + ": name cannot be empty.");
    }
    if (!Number.isInteger(definition.minStage) || definition.minStage < 1) {
      errors.push(definition.id + ": minStage must be >= 1.");
    }
    if (!Number.isFinite(definition.spawnWeight) || definition.spawnWeight < 0) {
      errors.push(definition.id + ": spawnWeight must be >= 0.");
    }
    if (
      !Number.isFinite(definition.durabilityScale) ||
      definition.durabilityScale <= 0
    ) {
      errors.push(definition.id + ": durabilityScale must be > 0.");
    }
    if (!Number.isFinite(definition.speedScale) || definition.speedScale <= 0) {
      errors.push(definition.id + ": speedScale must be > 0.");
    }
    if (!isReadableVisualProfile(definition.visual)) {
      errors.push(definition.id + ": visual profile is incomplete.");
    }
    if (definition.reward !== undefined) {
      if (!isEnemyRewardId(definition.reward)) {
        errors.push(definition.id + ": reward id is invalid.");
      }
      if (
        definition.visual.rewardMarker === undefined ||
        definition.visual.rewardMarker.trim().length === 0
      ) {
        errors.push(definition.id + ": reward marker is required.");
      }
    }
    if (
      definition.rewardPower !== undefined &&
      (!Number.isFinite(definition.rewardPower) ||
        definition.rewardPower <= 0)
    ) {
      errors.push(definition.id + ": rewardPower must be > 0.");
    }
    if (definition.role === "elite" && definition.rarity !== "elite") {
      errors.push(definition.id + ": elite role must use elite rarity.");
    }
    if (
      (definition.role === "boss" ||
        definition.role === "mini-boss") &&
      definition.rarity !== "boss"
    ) {
      errors.push(definition.id + ": boss role must use boss rarity.");
    }
  }

  return errors;
}
