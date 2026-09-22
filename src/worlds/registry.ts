import {
  ENEMY_FAMILY_IDS,
  type EnemyFamilyId,
} from "../enemies/families";
import {
  enemyDefinition,
  type EnemyDefinitionId,
} from "../enemies/registry";
import { normalizeStage } from "../campaign/stage";
import type { WorldProfile } from "./types";

export const WORLD_COUNT = 50;
export const WORLDS_PER_GALAXY = 5;
export const STAGES_PER_WORLD = 20;

export const WORLD_IDS = Array.from(
  { length: WORLD_COUNT },
  (_, index) => "world-" + String(index + 1).padStart(2, "0"),
) as readonly string[];

type WorldSpec = {
  names: readonly [string, string, string, string, string];
  theme: string;
  families: readonly EnemyFamilyId[];
  rules: readonly string[];
  hazards: readonly string[];
  wordAffinity: readonly string[];
};

const GALAXY_WORLD_SPECS: readonly WorldSpec[] = [
  {
    names: [
      "Rainbow Reach",
      "Halo Garden",
      "Prismatic Tide",
      "Cherub Falls",
      "Aurora Gate",
    ],
    theme: "celestial-rainbow",
    families: ["rainbow", "angel", "prism"],
    rules: ["bright-lanes", "support-waves"],
    hazards: ["sparkle-burst", "halo-current"],
    wordAffinity: ["short-flow", "clean-streak"],
  },
  {
    names: [
      "Ember Orchard",
      "Imp Furnace",
      "Scarlet Halo",
      "Cinder Cathedral",
      "Demon Crown",
    ],
    theme: "infernal",
    families: ["devil", "rainbow", "shadow"],
    rules: ["heat-pressure", "burst-waves"],
    hazards: ["ember-rain", "burn-zone"],
    wordAffinity: ["rapid-words", "interrupts"],
  },
  {
    names: [
      "Snowglass Bay",
      "Crystal Drift",
      "Frozen Prism",
      "Glacier Choir",
      "Winter Oracle",
    ],
    theme: "frost-prism",
    families: ["frost", "prism", "angel"],
    rules: ["slow-fields", "shielded-waves"],
    hazards: ["ice-mist", "freeze-pulse"],
    wordAffinity: ["steady-accuracy", "long-words"],
  },
  {
    names: [
      "Leaflight Meadow",
      "Bloom Circuit",
      "Verdant Halo",
      "Pollen Crown",
      "Ancient Grove",
    ],
    theme: "verdant",
    families: ["nature", "angel", "rainbow"],
    rules: ["regrowth", "support-clusters"],
    hazards: ["root-field", "pollen-cloud"],
    wordAffinity: ["rhythm", "recovery"],
  },
  {
    names: [
      "Twilight Fen",
      "Umbra Garden",
      "Nightglass",
      "Eclipse Hollow",
      "Shadow Crown",
    ],
    theme: "shadow-nature",
    families: ["shadow", "nature", "devil"],
    rules: ["concealed-threats", "control-waves"],
    hazards: ["darkness", "curse-mist"],
    wordAffinity: ["focus", "accuracy"],
  },
  {
    names: [
      "Starforge Port",
      "Nebula Works",
      "Prism Reactor",
      "Nova Foundry",
      "Cosmic Engine",
    ],
    theme: "cosmic-forge",
    families: ["cosmic", "prism", "rainbow"],
    rules: ["reactor-surges", "elite-pressure"],
    hazards: ["nova-wave", "gravity-pulse"],
    wordAffinity: ["long-words", "streak"],
  },
  {
    names: [
      "Abyss Choir",
      "Cursed Orbit",
      "Infernal Veil",
      "Black Halo",
      "Void Chapel",
    ],
    theme: "abyssal",
    families: ["shadow", "devil", "cosmic"],
    rules: ["drain-pressure", "control-chains"],
    hazards: ["void-distortion", "curse-zone"],
    wordAffinity: ["interrupts", "precision"],
  },
  {
    names: [
      "Aurora Nexus",
      "Comet Glacier",
      "Starlit Tundra",
      "Frozen Cosmos",
      "Polar Singularity",
    ],
    theme: "aurora-cosmic",
    families: ["frost", "cosmic", "prism"],
    rules: ["gravity-slow", "layered-pressure"],
    hazards: ["comet-rain", "time-frost"],
    wordAffinity: ["sequence", "long-words"],
  },
  {
    names: [
      "Silent Basilica",
      "Seraph Eclipse",
      "Astral Crypt",
      "Void Sanctuary",
      "Eventide Throne",
    ],
    theme: "void-cathedral",
    families: ["shadow", "angel", "cosmic"],
    rules: ["silence-windows", "barrier-waves"],
    hazards: ["void-gravity", "judgment-flare"],
    wordAffinity: ["accuracy", "interrupts"],
  },
  {
    names: [
      "Eternity Prism",
      "Celestial Abyss",
      "Chaos Aurora",
      "Infinity Choir",
      "Cosmic Crown",
    ],
    theme: "eternity",
    families: [
      "cosmic",
      "prism",
      "shadow",
      "angel",
      "devil",
      "frost",
      "nature",
      "rainbow",
    ],
    rules: ["remix-pressure", "apex-waves"],
    hazards: ["dimensional-shift", "cosmic-storm"],
    wordAffinity: ["mixed-mastery", "perfect-chain"],
  },
] as const;

const FAMILY_ROSTERS: Record<
  EnemyFamilyId,
  readonly EnemyDefinitionId[]
> = {
  rainbow: [
    "rainbow-scout",
    "rainbow-dart",
    "rainbow-bubble",
    "lucky-rainbow",
  ],
  angel: [
    "angel-healer",
    "angel-guard",
    "angel-blesser",
    "seraph-elite",
  ],
  devil: ["imp-spark", "bomb-imp", "berserk-devil"],
  frost: ["snow-wisp", "freeze-burst-sprite", "frost-keeper"],
  prism: ["prism-sprite", "treasure-prism", "fortune-prism"],
  nature: ["leaf-puff", "bloom-puff"],
  shadow: ["shade-wisp", "night-wisp", "umbra-elite"],
  cosmic: ["star-core", "nova-core", "nebula-elite"],
};

const MINI_BOSS_BY_FAMILY: Record<
  EnemyFamilyId,
  EnemyDefinitionId
> = {
  rainbow: "halo-seraph",
  angel: "halo-seraph",
  devil: "crown-demon",
  frost: "glacier-oracle",
  prism: "prism-sentinel",
  nature: "halo-seraph",
  shadow: "crown-demon",
  cosmic: "prism-sentinel",
};

const WORLD_BOSS_BY_FAMILY: Record<
  EnemyFamilyId,
  EnemyDefinitionId
> = {
  rainbow: "prism-archon",
  angel: "archangel-core",
  devil: "demon-lord-orb",
  frost: "glacier-queen",
  prism: "prism-archon",
  nature: "archangel-core",
  shadow: "void-eye",
  cosmic: "cosmic-emperor",
};

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function rankDistribution(worldIndex: number): Readonly<Record<string, number>> {
  const progress = worldIndex / (WORLD_COUNT - 1);
  const peak = 1 + Math.round(progress * 9);
  const result: Record<string, number> = {};
  const labels = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

  labels.forEach((label, index) => {
    const rank = index + 1;
    const distance = Math.abs(rank - peak);
    result[label] =
      distance === 0 ? 5 : distance === 1 ? 3 : distance === 2 ? 1 : 0;
  });
  return result;
}

function worldProfile(index: number): WorldProfile {
  const worldNumber = index + 1;
  const galaxy = Math.floor(index / WORLDS_PER_GALAXY) + 1;
  const slot = index % WORLDS_PER_GALAXY;
  const spec = GALAXY_WORLD_SPECS[galaxy - 1]!;
  const primary = spec.families[slot % spec.families.length]!;
  const families = unique([
    primary,
    ...spec.families,
  ]) as EnemyFamilyId[];
  const stageStart = index * STAGES_PER_WORLD + 1;
  const stageEnd = stageStart + STAGES_PER_WORLD - 1;
  const id = "world-" + String(worldNumber).padStart(2, "0");

  return {
    id,
    name: spec.names[slot] ?? spec.names[0],
    galaxy,
    stageStart,
    stageEnd,
    visualTheme: spec.theme + "-" + String(slot + 1),
    backgroundProfile: id + "-background",
    ambientProfile: id + "-ambient",
    enemyFamilies: families,
    enemyRoster: unique(
      families.flatMap((family) => FAMILY_ROSTERS[family]),
    ),
    rankDistribution: rankDistribution(index),
    elitePool: unique(
      families
        .flatMap((family) => FAMILY_ROSTERS[family])
        .filter((enemyId) => enemyId.includes("elite")),
    ),
    apexPool: ["apex-" + primary],
    miniBoss: MINI_BOSS_BY_FAMILY[primary],
    worldBoss: WORLD_BOSS_BY_FAMILY[primary],
    worldRules: [
      ...spec.rules,
      "world-slot-" + String(slot + 1),
    ],
    environmentalHazards: [...spec.hazards],
    wordAffinity: [...spec.wordAffinity],
    rewardPool: [
      "credits",
      "alloy",
      slot >= 2 ? "star-crystal" : "equipment",
      slot === 4 ? "world-boss-choice" : "equipment",
    ],
    shopPool: [
      "normal",
      "station",
      ...(slot >= 1 ? ["traveling"] : []),
      ...(galaxy >= 2 ? ["black-market"] : []),
    ],
    hiddenEventPool: [
      "echo-rift",
      "hidden-signal-" + id,
    ],
    hiddenChallengePool: [
      "challenge-" + id,
    ],
    musicProfile: id,
    transitionPresentation: spec.theme + "-entry",
  };
}

export const WORLD_REGISTRY: readonly WorldProfile[] = Array.from(
  { length: WORLD_COUNT },
  (_, index) => worldProfile(index),
);

export function worldIndexForStage(stage: number): number {
  return Math.floor((normalizeStage(stage) - 1) / STAGES_PER_WORLD);
}

export function worldForStage(stage: number): WorldProfile {
  return WORLD_REGISTRY[worldIndexForStage(stage)]!;
}

export function worldById(id: string): WorldProfile | undefined {
  return WORLD_REGISTRY.find((world) => world.id === id);
}

export function stageInWorld(stage: number): number {
  return ((normalizeStage(stage) - 1) % STAGES_PER_WORLD) + 1;
}

export function isWorldEntryStage(stage: number): boolean {
  return stageInWorld(stage) === 1;
}

export function isWorldMiniBossStage(stage: number): boolean {
  return stageInWorld(stage) === 10;
}

export function isWorldBossStage(stage: number): boolean {
  return stageInWorld(stage) === STAGES_PER_WORLD;
}

export type PlannedWorldStageRole =
  | "normal"
  | "mini-boss"
  | "world-boss"
  | "galaxy-major-boss";

export function plannedWorldStageRole(
  stage: number,
): PlannedWorldStageRole {
  const safeStage = normalizeStage(stage);
  if (safeStage % 100 === 0) return "galaxy-major-boss";
  if (isWorldBossStage(safeStage)) return "world-boss";
  if (isWorldMiniBossStage(safeStage)) return "mini-boss";
  return "normal";
}

export function validateWorldRegistry(
  worlds: readonly WorldProfile[] = WORLD_REGISTRY,
): string[] {
  const errors: string[] = [];
  if (worlds.length !== WORLD_COUNT) {
    errors.push("World registry must contain exactly 50 Worlds.");
  }

  const ids = new Set<string>();
  const names = new Set<string>();

  worlds.forEach((world, index) => {
    const expectedNumber = index + 1;
    const expectedId =
      "world-" + String(expectedNumber).padStart(2, "0");
    const expectedStart = index * STAGES_PER_WORLD + 1;
    const expectedEnd = expectedStart + STAGES_PER_WORLD - 1;
    const expectedGalaxy =
      Math.floor(index / WORLDS_PER_GALAXY) + 1;

    if (world.id !== expectedId) {
      errors.push(expectedId + ": registry order/id mismatch.");
    }
    if (ids.has(world.id)) {
      errors.push("Duplicate World id: " + world.id);
    }
    ids.add(world.id);

    if (world.name.trim().length === 0 || names.has(world.name)) {
      errors.push(world.id + ": World name must be unique/non-empty.");
    }
    names.add(world.name);

    if (
      world.stageStart !== expectedStart ||
      world.stageEnd !== expectedEnd
    ) {
      errors.push(world.id + ": invalid 20-stage Campaign range.");
    }
    if (world.galaxy !== expectedGalaxy) {
      errors.push(world.id + ": invalid Galaxy mapping.");
    }
    if (
      world.enemyFamilies.length === 0 ||
      !world.enemyFamilies.every((family) =>
        ENEMY_FAMILY_IDS.includes(family),
      )
    ) {
      errors.push(world.id + ": invalid enemy-family contract.");
    }
    if (
      world.enemyRoster.length === 0 ||
      world.miniBoss.trim().length === 0 ||
      world.worldBoss.trim().length === 0
    ) {
      errors.push(world.id + ": enemy/boss contract cannot be empty.");
    }

    for (const enemyId of world.enemyRoster) {
      const definition = enemyDefinition(enemyId);
      if (definition === undefined) {
        errors.push(world.id + ": unknown enemy id " + enemyId + ".");
        continue;
      }
      if (!world.enemyFamilies.includes(definition.family)) {
        errors.push(
          world.id +
            ": enemy " +
            enemyId +
            " is outside the World family contract.",
        );
      }
      if (
        definition.role === "boss" ||
        definition.role === "mini-boss"
      ) {
        errors.push(
          world.id + ": boss definitions cannot be regular roster entries.",
        );
      }
    }

    for (const eliteId of world.elitePool) {
      const definition = enemyDefinition(eliteId);
      if (
        definition === undefined ||
        definition.role !== "elite" ||
        !world.enemyRoster.includes(eliteId)
      ) {
        errors.push(world.id + ": invalid elite pool entry " + eliteId + ".");
      }
    }

    const miniBoss = enemyDefinition(world.miniBoss);
    if (
      miniBoss === undefined ||
      miniBoss.role !== "mini-boss" ||
      !world.enemyFamilies.includes(miniBoss.family)
    ) {
      errors.push(world.id + ": invalid Mini Boss contract.");
    }

    const worldBoss = enemyDefinition(world.worldBoss);
    if (
      worldBoss === undefined ||
      worldBoss.role !== "boss" ||
      !world.enemyFamilies.includes(worldBoss.family)
    ) {
      errors.push(world.id + ": invalid World Boss contract.");
    }
    if (
      world.visualTheme.trim().length === 0 ||
      world.backgroundProfile.trim().length === 0 ||
      world.ambientProfile.trim().length === 0 ||
      world.musicProfile.trim().length === 0 ||
      world.transitionPresentation.trim().length === 0
    ) {
      errors.push(world.id + ": visual/audio/transition contract is incomplete.");
    }
  });

  return errors;
}
