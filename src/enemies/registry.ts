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

export const ENEMY_DEFINITION_IDS = [
  "rainbow-scout",
  "rainbow-dart",
  "rainbow-bubble",
  "imp-spark",
  "snow-wisp",
  "lucky-rainbow",
  "angel-healer",
  "angel-guard",
  "angel-blesser",
  "bomb-imp",
  "freeze-burst-sprite",
  "seraph-elite",
  "berserk-devil",
  "frost-keeper",
  "fortune-prism",
  "prism-sprite",
  "treasure-prism",
  "leaf-puff",
  "bloom-puff",
  "shade-wisp",
  "night-wisp",
  "umbra-elite",
  "star-core",
  "nova-core",
  "nebula-elite",
  "halo-seraph",
  "crown-demon",
  "glacier-oracle",
  "prism-sentinel",
  "archangel-core",
  "demon-lord-orb",
  "glacier-queen",
  "prism-archon",
  "void-eye",
  "cosmic-emperor",
] as const;

export type EnemyRarity = (typeof ENEMY_RARITIES)[number];
export type EnemyDefinitionId = (typeof ENEMY_DEFINITION_IDS)[number];

export type EnemyDefinition = {
  id: EnemyDefinitionId;
  name: string;
  family: EnemyFamilyId;
  role: EnemyRoleId;
  rarity: EnemyRarity;
  minStage: number;
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

const prismBase = {
  body: "prism-crystal-orb",
  face: "cute-round",
  wings: "fairy",
  head: "prism-ring",
  aura: "prism-sparkle",
  orbit: "prism-orbit",
  spawnFx: "prism-pop",
  hitFx: "prism-spark",
  deathFx: "prism-burst",
} satisfies EnemyVisualProfile;

const natureBase = {
  body: "nature-puff",
  face: "cute-round",
  wings: "petal",
  head: "leaf-crown",
  aura: "nature-pollen",
  spawnFx: "leaf-pop",
  hitFx: "leaf-spark",
  deathFx: "nature-burst",
} satisfies EnemyVisualProfile;

const shadowBase = {
  body: "shadow-wisp",
  face: "bright-eyes",
  wings: "shadow",
  aura: "shadow-smoke",
  spawnFx: "shadow-pop",
  hitFx: "shadow-spark",
  deathFx: "shadow-burst",
} satisfies EnemyVisualProfile;

const cosmicBase = {
  body: "cosmic-core",
  face: "star-eyes",
  wings: "cosmic",
  aura: "cosmic-stars",
  orbit: "orbital-rings",
  spawnFx: "cosmic-pop",
  hitFx: "cosmic-spark",
  deathFx: "cosmic-burst",
} satisfies EnemyVisualProfile;

export const ENEMY_REGISTRY: readonly EnemyDefinition[] = [
  {
    id: "rainbow-scout",
    name: "Rainbow Scout",
    family: "rainbow",
    role: "normal",
    rarity: "common",
    minStage: 1,
    visual: rainbowBase,
  },
  {
    id: "rainbow-dart",
    name: "Rainbow Dart",
    family: "rainbow",
    role: "swift",
    rarity: "uncommon",
    minStage: 10,
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
    visual: {
      ...rainbowBase,
      body: "rainbow-water-orb-large",
      aura: "rainbow-shell",
    },
  },
  {
    id: "imp-spark",
    name: "Imp Spark",
    family: "devil",
    role: "normal",
    rarity: "common",
    minStage: 50,
    visual: devilBase,
  },
  {
    id: "snow-wisp",
    name: "Snow Wisp",
    family: "frost",
    role: "normal",
    rarity: "common",
    minStage: 30,
    visual: frostBase,
  },
  {
    id: "lucky-rainbow",
    name: "Lucky Rainbow",
    family: "rainbow",
    role: "reward",
    rarity: "rare",
    minStage: 15,
    reward: "luck-up",
    rewardPower: 15,
    visual: {
      ...rainbowBase,
      orbit: "rainbow-star-ring",
      rewardMarker: ENEMY_REWARD_DEFINITIONS["luck-up"].marker,
    },
  },
  {
    id: "angel-healer",
    name: "Angel Healer",
    family: "angel",
    role: "support",
    rarity: "rare",
    minStage: 30,
    reward: "heal-burst",
    rewardPower: 0.15,
    visual: {
      ...angelBase,
      rewardMarker: ENEMY_REWARD_DEFINITIONS["heal-burst"].marker,
    },
  },
  {
    id: "angel-guard",
    name: "Angel Guard",
    family: "angel",
    role: "support",
    rarity: "rare",
    minStage: 20,
    reward: "shield-burst",
    rewardPower: 0.22,
    visual: {
      ...angelBase,
      wings: "feather-large",
      rewardMarker: ENEMY_REWARD_DEFINITIONS["shield-burst"].marker,
    },
  },
  {
    id: "angel-blesser",
    name: "Angel Blesser",
    family: "angel",
    role: "reward",
    rarity: "rare",
    minStage: 70,
    reward: "energy-burst",
    rewardPower: 0.28,
    visual: {
      ...angelBase,
      head: "double-halo",
      rewardMarker: ENEMY_REWARD_DEFINITIONS["energy-burst"].marker,
    },
  },
  {
    id: "bomb-imp",
    name: "Bomb Imp",
    family: "devil",
    role: "burst",
    rarity: "rare",
    minStage: 60,
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
    reward: "damage-up",
    rewardPower: 8,
    visual: {
      ...devilBase,
      wings: "bat-large",
      head: "large-horns",
      aura: "infernal-flame-elite",
      rewardMarker: ENEMY_REWARD_DEFINITIONS["damage-up"].marker,
    },
  },
  {
    id: "frost-keeper",
    name: "Frost Keeper",
    family: "frost",
    role: "elite",
    rarity: "elite",
    minStage: 110,
    reward: "slow-nearby",
    rewardPower: 5,
    visual: {
      ...frostBase,
      wings: "crystal-large",
      head: "ice-crown",
      aura: "frost-mist-elite",
      rewardMarker:
        ENEMY_REWARD_DEFINITIONS["slow-nearby"].marker,
    },
  },
  {
    id: "fortune-prism",
    name: "Fortune Prism",
    family: "prism",
    role: "elite",
    rarity: "elite",
    minStage: 140,
    reward: "luck-up",
    rewardPower: 18,
    visual: {
      ...prismBase,
      aura: "prism-sparkle-elite",
      rewardMarker: ENEMY_REWARD_DEFINITIONS["luck-up"].marker,
    },
  },
  {
    id: "prism-sprite",
    name: "Prism Sprite",
    family: "prism",
    role: "normal",
    rarity: "uncommon",
    minStage: 80,
    visual: prismBase,
  },
  {
    id: "treasure-prism",
    name: "Treasure Prism",
    family: "prism",
    role: "reward",
    rarity: "rare",
    minStage: 100,
    reward: "score-x2",
    rewardPower: 10,
    visual: {
      ...prismBase,
      aura: "prism-sparkle-reward",
      rewardMarker: ENEMY_REWARD_DEFINITIONS["score-x2"].marker,
    },
  },
  {
    id: "leaf-puff",
    name: "Leaf Puff",
    family: "nature",
    role: "normal",
    rarity: "common",
    minStage: 25,
    visual: natureBase,
  },
  {
    id: "bloom-puff",
    name: "Bloom Puff",
    family: "nature",
    role: "reward",
    rarity: "rare",
    minStage: 45,
    reward: "heal-burst",
    rewardPower: 0.1,
    visual: {
      ...natureBase,
      head: "flower-crown",
      aura: "nature-pollen-reward",
      rewardMarker: ENEMY_REWARD_DEFINITIONS["heal-burst"].marker,
    },
  },
  {
    id: "shade-wisp",
    name: "Shade Wisp",
    family: "shadow",
    role: "normal",
    rarity: "uncommon",
    minStage: 300,
    visual: shadowBase,
  },
  {
    id: "night-wisp",
    name: "Night Wisp",
    family: "shadow",
    role: "control",
    rarity: "rare",
    minStage: 340,
    reward: "cooldown-charge",
    rewardPower: 3,
    visual: {
      ...shadowBase,
      head: "void-eye-ring",
      rewardMarker:
        ENEMY_REWARD_DEFINITIONS["cooldown-charge"].marker,
    },
  },
  {
    id: "umbra-elite",
    name: "Umbra Elite",
    family: "shadow",
    role: "elite",
    rarity: "elite",
    minStage: 380,
    reward: "cooldown-charge",
    rewardPower: 5,
    visual: {
      ...shadowBase,
      wings: "shadow-large",
      head: "void-eye-ring",
      aura: "shadow-smoke-elite",
      rewardMarker:
        ENEMY_REWARD_DEFINITIONS["cooldown-charge"].marker,
    },
  },
  {
    id: "star-core",
    name: "Star Core",
    family: "cosmic",
    role: "reward",
    rarity: "rare",
    minStage: 520,
    reward: "overdrive-charge",
    rewardPower: 26,
    visual: {
      ...cosmicBase,
      rewardMarker:
        ENEMY_REWARD_DEFINITIONS["overdrive-charge"].marker,
    },
  },
  {
    id: "nova-core",
    name: "Nova Core",
    family: "cosmic",
    role: "burst",
    rarity: "rare",
    minStage: 560,
    reward: "explosion-burst",
    rewardPower: 0.45,
    visual: {
      ...cosmicBase,
      aura: "cosmic-stars-nova",
      rewardMarker:
        ENEMY_REWARD_DEFINITIONS["explosion-burst"].marker,
    },
  },
  {
    id: "nebula-elite",
    name: "Nebula Elite",
    family: "cosmic",
    role: "elite",
    rarity: "elite",
    minStage: 620,
    reward: "energy-burst",
    rewardPower: 0.38,
    visual: {
      ...cosmicBase,
      wings: "cosmic-large",
      aura: "cosmic-stars-elite",
      rewardMarker:
        ENEMY_REWARD_DEFINITIONS["energy-burst"].marker,
    },
  },
  {
    id: "halo-seraph",
    name: "Halo Seraph",
    family: "angel",
    role: "mini-boss",
    rarity: "boss",
    minStage: 20,
    visual: {
      ...angelBase,
      body: "holy-orb-mini-boss",
      wings: "feather-large",
      head: "double-halo",
      orbit: "holy-orbit",
      aura: "holy-glow-elite",
      deathFx: "holy-boss-burst",
    },
  },
  {
    id: "crown-demon",
    name: "Crown Demon",
    family: "devil",
    role: "mini-boss",
    rarity: "boss",
    minStage: 120,
    visual: {
      ...devilBase,
      body: "infernal-orb-mini-boss",
      wings: "bat-large",
      head: "demon-crown",
      side: "ember-tail",
      orbit: "infernal-orbit",
      aura: "infernal-flame-elite",
      deathFx: "infernal-boss-burst",
    },
  },
  {
    id: "glacier-oracle",
    name: "Glacier Oracle",
    family: "frost",
    role: "mini-boss",
    rarity: "boss",
    minStage: 220,
    visual: {
      ...frostBase,
      body: "frost-orb-mini-boss",
      wings: "crystal-large",
      head: "ice-crown",
      orbit: "snow-halo",
      aura: "frost-mist-elite",
      deathFx: "frost-boss-burst",
    },
  },
  {
    id: "prism-sentinel",
    name: "Prism Sentinel",
    family: "prism",
    role: "mini-boss",
    rarity: "boss",
    minStage: 320,
    visual: {
      ...prismBase,
      body: "prism-crystal-orb-mini-boss",
      wings: "fairy-large",
      head: "prism-crown",
      orbit: "prism-rune-rings",
      aura: "prism-sparkle-elite",
      deathFx: "prism-boss-burst",
    },
  },
  {
    id: "archangel-core",
    name: "Archangel Core",
    family: "angel",
    role: "boss",
    rarity: "boss",
    minStage: 100,
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
    id: "glacier-queen",
    name: "Glacier Queen",
    family: "frost",
    role: "boss",
    rarity: "boss",
    minStage: 300,
    reward: "freeze-nearby",
    rewardPower: 4,
    visual: {
      ...frostBase,
      body: "frost-orb-boss",
      wings: "crystal-large",
      head: "ice-crown",
      orbit: "snow-halo",
      aura: "frost-mist-boss",
      rewardMarker:
        ENEMY_REWARD_DEFINITIONS["freeze-nearby"].marker,
      deathFx: "frost-boss-burst",
    },
  },
  {
    id: "prism-archon",
    name: "Prism Archon",
    family: "prism",
    role: "boss",
    rarity: "boss",
    minStage: 400,
    reward: "credits-x2",
    rewardPower: 12,
    visual: {
      ...prismBase,
      body: "prism-crystal-orb-boss",
      wings: "fairy-large",
      head: "prism-crown",
      orbit: "prism-rune-rings",
      aura: "prism-sparkle-boss",
      rewardMarker:
        ENEMY_REWARD_DEFINITIONS["credits-x2"].marker,
      deathFx: "prism-boss-burst",
    },
  },
  {
    id: "void-eye",
    name: "Void Eye",
    family: "shadow",
    role: "boss",
    rarity: "boss",
    minStage: 800,
    reward: "cooldown-charge",
    rewardPower: 6,
    visual: {
      ...shadowBase,
      body: "shadow-wisp-boss",
      wings: "shadow-large",
      head: "void-eye-ring",
      orbit: "void-orbit",
      aura: "shadow-smoke-boss",
      rewardMarker:
        ENEMY_REWARD_DEFINITIONS["cooldown-charge"].marker,
      deathFx: "shadow-boss-burst",
    },
  },
  {
    id: "cosmic-emperor",
    name: "Cosmic Emperor",
    family: "cosmic",
    role: "boss",
    rarity: "boss",
    minStage: 900,
    reward: "overdrive-charge",
    rewardPower: 40,
    visual: {
      ...cosmicBase,
      body: "cosmic-core-boss",
      wings: "cosmic-large",
      head: "star-crown",
      orbit: "cosmic-orbital-rings",
      aura: "cosmic-stars-boss",
      rewardMarker:
        ENEMY_REWARD_DEFINITIONS["overdrive-charge"].marker,
      deathFx: "cosmic-boss-burst",
    },
  },
  {
    id: "demon-lord-orb",
    name: "Demon Lord Orb",
    family: "devil",
    role: "boss",
    rarity: "boss",
    minStage: 200,
    reward: "damage-up",
    rewardPower: 10,
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
] satisfies readonly EnemyDefinition[];

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
