import { stageRole } from "../campaign/stage";
import type { CharacterId } from "../characters/registry";
import type { EquipmentState } from "../equipment/loadout";
import type { HiddenDiscoveryState } from "../discovery/hidden-content";
import type { Inventory } from "../items/inventory";
import { EQUIPMENT_IDS } from "../equipment/registry";
import { ITEM_IDS } from "../items/registry";
import { CHARACTER_IDS } from "../characters/registry";
import type { EnemyKind } from "../types";

export const ACHIEVEMENT_IDS = [
  "first-clear",
  "ace-pilot",
  "streak-50",
  "galaxy-one",
  "deep-space",
  "ghost-contract",
] as const;

export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

export const COLLECTION_ENEMY_IDS: readonly EnemyKind[] = [
  "scout",
  "mine",
  "tank",
  "destroyer",
  "oppressor",
  "shield",
  "carrier",
  "jammer",
  "cloaker",
  "healer",
  "splitter",
  "sniper",
  "leech",
  "commander",
];

export type MetaProgressState = {
  achievements: AchievementId[];
  completedMissions: string[];
  discoveredEnemies: EnemyKind[];
  discoveredBossStages: number[];
};

export type StageMission = {
  id: string;
  name: string;
  description: string;
  rewardCredits: number;
  kind: "accuracy" | "streak";
  target: number;
  hidden: boolean;
};

export type StageProgressInput = {
  stage: number;
  accuracy: number;
  maxStreak: number;
  hiddenMissionUnlocked: boolean;
};

export type StageProgressResult = {
  state: MetaProgressState;
  unlockedAchievements: AchievementId[];
  completedMission: StageMission | null;
  rewardCredits: number;
};

export function createMetaProgressState(): MetaProgressState {
  return {
    achievements: [],
    completedMissions: [],
    discoveredEnemies: [],
    discoveredBossStages: [],
  };
}

export function sanitizeMetaProgressState(
  value: unknown,
): MetaProgressState {
  const result = createMetaProgressState();
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return result;
  }

  const raw = value as Partial<Record<keyof MetaProgressState, unknown>>;

  if (Array.isArray(raw.achievements)) {
    const seen = new Set<AchievementId>();
    for (const id of raw.achievements) {
      if (
        typeof id === "string" &&
        ACHIEVEMENT_IDS.includes(id as AchievementId)
      ) {
        seen.add(id as AchievementId);
      }
    }
    result.achievements = ACHIEVEMENT_IDS.filter((id) => seen.has(id));
  }

  if (Array.isArray(raw.completedMissions)) {
    result.completedMissions = Array.from(
      new Set(
        raw.completedMissions.filter(
          (id): id is string =>
            typeof id === "string" &&
            id.length > 0 &&
            id.length <= 80,
        ),
      ),
    ).slice(0, 2000);
  }

  if (Array.isArray(raw.discoveredEnemies)) {
    const seen = new Set<EnemyKind>();
    for (const id of raw.discoveredEnemies) {
      if (
        typeof id === "string" &&
        COLLECTION_ENEMY_IDS.includes(id as EnemyKind)
      ) {
        seen.add(id as EnemyKind);
      }
    }
    result.discoveredEnemies = COLLECTION_ENEMY_IDS.filter((id) =>
      seen.has(id),
    );
  }

  if (Array.isArray(raw.discoveredBossStages)) {
    result.discoveredBossStages = Array.from(
      new Set(
        raw.discoveredBossStages
          .filter(
            (stage): stage is number =>
              typeof stage === "number" &&
              Number.isInteger(stage) &&
              stage >= 1 &&
              stage <= 1000,
          )
          .sort((a, b) => a - b),
      ),
    );
  }

  return result;
}

export function isValidMetaProgressState(
  value: unknown,
): value is MetaProgressState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const raw = value as MetaProgressState;

  const sanitized = sanitizeMetaProgressState(raw);
  return (
    Array.isArray(raw.achievements) &&
    Array.isArray(raw.completedMissions) &&
    Array.isArray(raw.discoveredEnemies) &&
    Array.isArray(raw.discoveredBossStages) &&
    JSON.stringify(sanitized) === JSON.stringify(raw)
  );
}

export function missionForStage(
  stage: number,
  hiddenMissionUnlocked: boolean,
): StageMission | null {
  const safeStage = Math.max(1, Math.min(1000, Math.floor(stage)));
  const local = ((safeStage - 1) % 100) + 1;

  if (hiddenMissionUnlocked && local === 25) {
    return {
      id: "ghost-contract-" + String(safeStage),
      name: "Ghost Contract",
      description: "Clear this hidden contract with 99%+ accuracy.",
      rewardCredits: 180,
      kind: "accuracy",
      target: 99,
      hidden: true,
    };
  }

  const role = stageRole(safeStage);
  if (role === "special") {
    return {
      id: "special-" + String(safeStage),
      name: "Precision Mission",
      description: "Clear with 97%+ accuracy.",
      rewardCredits: 80,
      kind: "accuracy",
      target: 97,
      hidden: false,
    };
  }
  if (role === "hazard") {
    return {
      id: "hazard-" + String(safeStage),
      name: "Hazard Discipline",
      description: "Clear the hazard with 95%+ accuracy.",
      rewardCredits: 95,
      kind: "accuracy",
      target: 95,
      hidden: false,
    };
  }
  if (role === "gauntlet") {
    return {
      id: "gauntlet-" + String(safeStage),
      name: "Gauntlet Streak",
      description: "Clear with a 30+ max streak.",
      rewardCredits: 130,
      kind: "streak",
      target: 30,
      hidden: false,
    };
  }
  if (role === "major-boss") {
    return {
      id: "major-boss-" + String(safeStage),
      name: "Major Boss Precision",
      description: "Defeat the milestone boss with 94%+ accuracy.",
      rewardCredits: 160,
      kind: "accuracy",
      target: 94,
      hidden: false,
    };
  }

  return null;
}

function achievementCandidates(
  input: StageProgressInput,
  missionCompleted: StageMission | null,
): AchievementId[] {
  const ids: AchievementId[] = [];
  if (input.stage >= 1) ids.push("first-clear");
  if (input.accuracy >= 98) ids.push("ace-pilot");
  if (input.maxStreak >= 50) ids.push("streak-50");
  if (input.stage >= 100) ids.push("galaxy-one");
  if (input.stage >= 500) ids.push("deep-space");
  if (missionCompleted?.hidden === true) ids.push("ghost-contract");
  return ids;
}

export function evaluateStageProgress(
  current: MetaProgressState,
  input: StageProgressInput,
): StageProgressResult {
  const state = sanitizeMetaProgressState(current);
  const mission = missionForStage(
    input.stage,
    input.hiddenMissionUnlocked,
  );
  const missionSatisfied =
    mission !== null &&
    (mission.kind === "accuracy"
      ? input.accuracy >= mission.target
      : input.maxStreak >= mission.target);
  const missionCompleted =
    missionSatisfied && !state.completedMissions.includes(mission.id)
      ? mission
      : null;

  const completedMissions =
    missionCompleted === null
      ? state.completedMissions
      : [...state.completedMissions, missionCompleted.id];

  const existing = new Set(state.achievements);
  const candidates = achievementCandidates(input, missionCompleted);
  const unlockedAchievements = candidates.filter((id) => !existing.has(id));
  const achievements = ACHIEVEMENT_IDS.filter(
    (id) => existing.has(id) || unlockedAchievements.includes(id),
  );

  return {
    state: {
      ...state,
      achievements,
      completedMissions,
    },
    unlockedAchievements,
    completedMission: missionCompleted,
    rewardCredits: missionCompleted?.rewardCredits ?? 0,
  };
}

export function recordEnemyDiscovery(
  current: MetaProgressState,
  kind: EnemyKind,
): MetaProgressState {
  const state = sanitizeMetaProgressState(current);
  if (state.discoveredEnemies.includes(kind)) return state;
  return {
    ...state,
    discoveredEnemies: COLLECTION_ENEMY_IDS.filter(
      (id) => state.discoveredEnemies.includes(id) || id === kind,
    ),
  };
}

export function recordBossDiscovery(
  current: MetaProgressState,
  stage: number,
): MetaProgressState {
  const state = sanitizeMetaProgressState(current);
  const safeStage = Math.max(1, Math.min(1000, Math.floor(stage)));
  if (state.discoveredBossStages.includes(safeStage)) return state;
  return {
    ...state,
    discoveredBossStages: [...state.discoveredBossStages, safeStage].sort(
      (a, b) => a - b,
    ),
  };
}

export type CollectionSummary = {
  enemies: [number, number];
  bosses: [number, number];
  items: [number, number];
  equipment: [number, number];
  characters: [number, number];
  hidden: [number, number];
  achievements: [number, number];
};

export function collectionSummary(
  meta: MetaProgressState,
  input: {
    inventory: Inventory;
    equipment: EquipmentState;
    characters: readonly CharacterId[];
    hiddenDiscovery: HiddenDiscoveryState;
  },
): CollectionSummary {
  const itemCount = ITEM_IDS.filter(
    (id) => (input.inventory[id] ?? 0) > 0,
  ).length;
  const equipmentIds = new Set(
    input.equipment.items.map((item) => item.definitionId),
  );

  return {
    enemies: [
      meta.discoveredEnemies.length,
      COLLECTION_ENEMY_IDS.length,
    ],
    bosses: [meta.discoveredBossStages.length, 40],
    items: [itemCount, ITEM_IDS.length],
    equipment: [equipmentIds.size, EQUIPMENT_IDS.length],
    characters: [input.characters.length, CHARACTER_IDS.length],
    hidden: [
      input.hiddenDiscovery.discovered.length,
      Object.keys(input.hiddenDiscovery.drought).length,
    ],
    achievements: [
      meta.achievements.length,
      ACHIEVEMENT_IDS.length,
    ],
  };
}
