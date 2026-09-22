import {
  ENEMY_DEFINITION_IDS,
  ENEMY_REGISTRY,
  enemyDefinition,
  type EnemyDefinitionId,
} from "../enemies/registry";
import {
  WORLD_IDS,
  WORLD_REGISTRY,
  worldById,
} from "../worlds/registry";

export const CODEX_REWARD_IDS = [
  "performance-precision",
  "performance-flawless",
  "performance-streak",
  "performance-tempo",
  "performance-objective",
  "sector-cache",
  "boss-choice",
] as const;

export type CodexRewardId =
  (typeof CODEX_REWARD_IDS)[number];

export type CodexState = {
  version: 1;
  worlds: string[];
  enemies: EnemyDefinitionId[];
  rewards: CodexRewardId[];
};

export type CodexCollectionEntry = {
  id: string;
  category: "world" | "enemy" | "boss" | "reward";
  discovered: boolean;
  title: string;
  description: string;
};

export function createCodexState(): CodexState {
  return {
    version: 1,
    worlds: [],
    enemies: [],
    rewards: [],
  };
}

export function isCodexRewardId(
  value: unknown,
): value is CodexRewardId {
  return (
    typeof value === "string" &&
    (CODEX_REWARD_IDS as readonly string[]).includes(value)
  );
}

export function sanitizeCodexState(value: unknown): CodexState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return createCodexState();
  }

  const raw = value as {
    worlds?: unknown;
    enemies?: unknown;
    rewards?: unknown;
  };
  const rawWorlds = Array.isArray(raw.worlds) ? raw.worlds : [];
  const rawEnemies = Array.isArray(raw.enemies) ? raw.enemies : [];
  const rawRewards = Array.isArray(raw.rewards) ? raw.rewards : [];

  return {
    version: 1,
    worlds: WORLD_IDS.filter((id) => rawWorlds.includes(id)),
    enemies: ENEMY_DEFINITION_IDS.filter((id) =>
      rawEnemies.includes(id),
    ),
    rewards: CODEX_REWARD_IDS.filter((id) =>
      rawRewards.includes(id),
    ),
  };
}

export function isValidCodexState(
  value: unknown,
): value is CodexState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const raw = value as {
    version?: unknown;
    worlds?: unknown;
    enemies?: unknown;
    rewards?: unknown;
  };

  return (
    raw.version === 1 &&
    Array.isArray(raw.worlds) &&
    new Set(raw.worlds).size === raw.worlds.length &&
    raw.worlds.every(
      (id) =>
        typeof id === "string" &&
        (WORLD_IDS as readonly string[]).includes(id),
    ) &&
    Array.isArray(raw.enemies) &&
    new Set(raw.enemies).size === raw.enemies.length &&
    raw.enemies.every(
      (id) =>
        typeof id === "string" &&
        (ENEMY_DEFINITION_IDS as readonly string[]).includes(id),
    ) &&
    Array.isArray(raw.rewards) &&
    new Set(raw.rewards).size === raw.rewards.length &&
    raw.rewards.every(isCodexRewardId)
  );
}

function addUnique<T extends string>(
  current: readonly T[],
  value: T,
): { values: T[]; changed: boolean } {
  if (current.includes(value)) {
    return { values: [...current], changed: false };
  }
  return {
    values: [...current, value],
    changed: true,
  };
}

export function discoverCodexWorld(
  input: CodexState,
  worldId: string,
): { state: CodexState; changed: boolean } {
  const state = sanitizeCodexState(input);
  if (!(WORLD_IDS as readonly string[]).includes(worldId)) {
    return { state, changed: false };
  }
  const result = addUnique(state.worlds, worldId);
  return {
    state: { ...state, worlds: result.values },
    changed: result.changed,
  };
}

export function discoverCodexEnemy(
  input: CodexState,
  enemyId: EnemyDefinitionId,
): { state: CodexState; changed: boolean } {
  const state = sanitizeCodexState(input);
  if (
    !(ENEMY_DEFINITION_IDS as readonly EnemyDefinitionId[]).includes(
      enemyId,
    )
  ) {
    return { state, changed: false };
  }
  const result = addUnique(state.enemies, enemyId);
  return {
    state: { ...state, enemies: result.values },
    changed: result.changed,
  };
}

export function discoverCodexReward(
  input: CodexState,
  rewardId: CodexRewardId,
): { state: CodexState; changed: boolean } {
  const state = sanitizeCodexState(input);
  const result = addUnique(state.rewards, rewardId);
  return {
    state: { ...state, rewards: result.values },
    changed: result.changed,
  };
}

const REWARD_DESCRIPTIONS: Record<
  CodexRewardId,
  { title: string; description: string }
> = {
  "performance-precision": {
    title: "Precision Reward",
    description: "Earned for clearing a stage at 99%+ accuracy.",
  },
  "performance-flawless": {
    title: "Flawless Reward",
    description: "Earned for clearing a stage without a typing miss.",
  },
  "performance-streak": {
    title: "Streak Reward",
    description: "Earned for reaching a 25-hit stage streak.",
  },
  "performance-tempo": {
    title: "Tempo Reward",
    description:
      "Earned by exceeding the selected difficulty target WPM by 5%.",
  },
  "performance-objective": {
    title: "Objective Reward",
    description: "Earned when the active stage objective is completed.",
  },
  "sector-cache": {
    title: "Sector Cache",
    description:
      "A stronger reward committed at each ten-stage sector checkpoint.",
  },
  "boss-choice": {
    title: "Boss Choice",
    description:
      "A three-option reward decision offered after a Campaign boss victory.",
  },
};

export function codexCollectionEntries(
  input: CodexState,
): CodexCollectionEntry[] {
  const state = sanitizeCodexState(input);
  const worldSet = new Set(state.worlds);
  const enemySet = new Set(state.enemies);
  const rewardSet = new Set(state.rewards);

  const worlds: CodexCollectionEntry[] = WORLD_REGISTRY.map((world) => {
    const discovered = worldSet.has(world.id);
    return {
      id: "world:" + world.id,
      category: "world",
      discovered,
      title: discovered ? world.name : "???",
      description: discovered
        ? "Stages " +
          String(world.stageStart).padStart(3, "0") +
          "-" +
          String(world.stageEnd).padStart(3, "0") +
          " · " +
          world.enemyFamilies.join(", ") +
          "."
        : "Undiscovered World.",
    };
  });

  const enemies: CodexCollectionEntry[] = ENEMY_REGISTRY.map((enemy) => {
    const discovered = enemySet.has(enemy.id);
    const boss =
      enemy.role === "boss" || enemy.role === "mini-boss";
    const sourceWorld = WORLD_REGISTRY.find(
      (world) =>
        world.enemyRoster.includes(enemy.id) ||
        world.miniBoss === enemy.id ||
        world.worldBoss === enemy.id,
    );

    return {
      id: (boss ? "boss:" : "enemy:") + enemy.id,
      category: boss ? "boss" : "enemy",
      discovered,
      title: discovered ? enemy.name : "???",
      description: discovered
        ? enemy.family +
          " · " +
          enemy.role +
          " · first available Stage " +
          String(enemy.minStage).padStart(3, "0") +
          (sourceWorld === undefined
            ? ""
            : " · " + (worldById(sourceWorld.id)?.name ?? sourceWorld.id))
        : boss
          ? "Undiscovered boss."
          : "Undiscovered enemy.",
    };
  });

  const rewards: CodexCollectionEntry[] = CODEX_REWARD_IDS.map((id) => {
    const discovered = rewardSet.has(id);
    const definition = REWARD_DESCRIPTIONS[id];
    return {
      id: "reward:" + id,
      category: "reward",
      discovered,
      title: discovered ? definition.title : "???",
      description: discovered
        ? definition.description
        : "Undiscovered reward layer.",
    };
  });

  return [...worlds, ...enemies, ...rewards];
}

export function codexDiscoveredCount(input: CodexState): number {
  const state = sanitizeCodexState(input);
  return (
    state.worlds.length +
    state.enemies.length +
    state.rewards.length
  );
}

export function codexEntryCount(): number {
  return WORLD_REGISTRY.length + ENEMY_REGISTRY.length + CODEX_REWARD_IDS.length;
}

export function codexEnemyDefinition(
  id: EnemyDefinitionId,
) {
  return enemyDefinition(id);
}
