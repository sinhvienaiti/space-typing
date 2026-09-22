import type { EnemyKind } from "../types";
import type { EnemyRoleId } from "../enemies/roles";
import {
  enemyDefinition,
  type EnemyDefinition,
  type EnemyDefinitionId,
} from "../enemies/registry";
import { rewardEnemyChance } from "../enemies/spawn-profile";
import { clamp } from "../logic";
import { worldForStage } from "./registry";
import type { WorldProfile } from "./types";

const KIND_ROLE_PREFERENCES: Record<
  EnemyKind,
  readonly EnemyRoleId[]
> = {
  scout: ["normal", "swift"],
  mine: ["swift", "burst", "control"],
  tank: ["tank", "support", "normal"],
  destroyer: ["burst", "normal", "control"],
  oppressor: ["control", "burst", "tank"],
  shield: ["support", "tank", "normal"],
  carrier: ["support", "normal", "tank"],
  jammer: ["control", "support", "swift"],
  cloaker: ["control", "swift", "normal"],
  healer: ["support", "normal"],
  splitter: ["normal", "burst", "swift"],
  sniper: ["swift", "control", "burst"],
  leech: ["control", "burst", "normal"],
  commander: ["support", "tank", "control"],
};

function safeRandom(value: number): number {
  return clamp(value, 0, 0.999999);
}

function definitionsForWorld(
  world: WorldProfile,
): EnemyDefinition[] {
  return world.enemyRoster
    .map((id) => enemyDefinition(id))
    .filter(
      (definition): definition is EnemyDefinition =>
        definition !== undefined &&
        definition.role !== "boss" &&
        definition.role !== "mini-boss",
    );
}

function familyRank(
  world: WorldProfile,
  definition: EnemyDefinition,
): number {
  const index = world.enemyFamilies.indexOf(definition.family);
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}

function bestRoleCandidates(
  definitions: readonly EnemyDefinition[],
  preferences: readonly EnemyRoleId[],
): EnemyDefinition[] {
  for (const role of preferences) {
    const matches = definitions.filter(
      (definition) => definition.role === role,
    );
    if (matches.length > 0) return matches;
  }
  return [];
}

function bestFamilyCandidates(
  world: WorldProfile,
  definitions: readonly EnemyDefinition[],
): EnemyDefinition[] {
  if (definitions.length <= 1) return [...definitions];

  let bestRank = Number.MAX_SAFE_INTEGER;
  for (const definition of definitions) {
    bestRank = Math.min(bestRank, familyRank(world, definition));
  }

  return definitions.filter(
    (definition) => familyRank(world, definition) === bestRank,
  );
}

function pickDefinition(
  definitions: readonly EnemyDefinition[],
  random: number,
): EnemyDefinition | undefined {
  if (definitions.length === 0) return undefined;
  const index = Math.min(
    definitions.length - 1,
    Math.floor(safeRandom(random) * definitions.length),
  );
  return definitions[index];
}

function regularCandidates(
  world: WorldProfile,
  kind: EnemyKind,
): EnemyDefinition[] {
  const definitions = definitionsForWorld(world).filter(
    (definition) =>
      definition.role !== "elite" &&
      definition.role !== "reward",
  );
  const preferred = bestRoleCandidates(
    definitions,
    KIND_ROLE_PREFERENCES[kind],
  );
  const source = preferred.length > 0 ? preferred : definitions;
  return bestFamilyCandidates(world, source);
}

function eliteCandidates(
  world: WorldProfile,
): EnemyDefinition[] {
  const explicit = world.elitePool
    .map((id) => enemyDefinition(id))
    .filter(
      (definition): definition is EnemyDefinition =>
        definition !== undefined && definition.role === "elite",
    );
  return bestFamilyCandidates(world, explicit);
}

function rewardCandidates(
  world: WorldProfile,
  kind: EnemyKind,
): EnemyDefinition[] {
  const definitions = definitionsForWorld(world).filter(
    (definition) =>
      definition.role !== "elite" &&
      definition.reward !== undefined,
  );
  if (definitions.length === 0) return [];

  const preferred = bestRoleCandidates(
    definitions,
    [
      ...KIND_ROLE_PREFERENCES[kind],
      "reward",
    ],
  );
  const source = preferred.length > 0 ? preferred : definitions;
  return bestFamilyCandidates(world, source);
}

export function worldRuntimeEnemyDefinitionId(
  kind: EnemyKind,
  elite: boolean,
  stage: number,
  rosterRandom = Math.random(),
): EnemyDefinitionId {
  const world = worldForStage(stage);

  if (elite) {
    const eliteDefinition = pickDefinition(
      eliteCandidates(world),
      rosterRandom,
    );
    if (eliteDefinition !== undefined) {
      return eliteDefinition.id;
    }
  }

  const regular = pickDefinition(
    regularCandidates(world, kind),
    rosterRandom,
  );
  if (regular !== undefined) return regular.id;

  // Every validated World has a non-empty roster. This fallback protects
  // gameplay from a future malformed authored profile without introducing
  // a second roster system.
  return world.enemyRoster[0] ?? "rainbow-scout";
}

export function spawnWorldEnemyDefinitionId(
  kind: EnemyKind,
  elite: boolean,
  stage: number,
  rewardRandom = Math.random(),
  rosterRandom = Math.random(),
): EnemyDefinitionId {
  const base = worldRuntimeEnemyDefinitionId(
    kind,
    elite,
    stage,
    rosterRandom,
  );

  if (
    elite ||
    kind === "healer" ||
    safeRandom(rewardRandom) >= rewardEnemyChance(stage)
  ) {
    return base;
  }

  const reward = pickDefinition(
    rewardCandidates(worldForStage(stage), kind),
    rosterRandom,
  );
  return reward?.id ?? base;
}

export function worldEnemyFamilyForSpawn(
  kind: EnemyKind,
  elite: boolean,
  stage: number,
  rosterRandom = 0,
): EnemyDefinition["family"] {
  const id = worldRuntimeEnemyDefinitionId(
    kind,
    elite,
    stage,
    rosterRandom,
  );
  return (
    enemyDefinition(id)?.family ??
    worldForStage(stage).enemyFamilies[0] ??
    "rainbow"
  );
}

export function validateWorldRosterRuntime(): string[] {
  const errors: string[] = [];

  for (let stage = 1; stage <= 1000; stage += 1) {
    const world = worldForStage(stage);
    const kinds = Object.keys(
      KIND_ROLE_PREFERENCES,
    ) as EnemyKind[];

    for (const kind of kinds) {
      for (const elite of [false, true]) {
        const id = worldRuntimeEnemyDefinitionId(
          kind,
          elite,
          stage,
          0.37,
        );
        const definition = enemyDefinition(id);
        if (definition === undefined) {
          errors.push(
            world.id + ": unresolved runtime enemy " + id + ".",
          );
          continue;
        }
        if (!world.enemyRoster.includes(id)) {
          errors.push(
            world.id +
              ": runtime enemy " +
              id +
              " is outside the World roster.",
          );
        }
        if (!world.enemyFamilies.includes(definition.family)) {
          errors.push(
            world.id +
              ": runtime enemy family " +
              definition.family +
              " is outside the World family contract.",
          );
        }
        if (
          definition.role === "boss" ||
          definition.role === "mini-boss"
        ) {
          errors.push(
            world.id + ": regular runtime selected a boss definition.",
          );
        }
      }
    }
  }

  return errors;
}
