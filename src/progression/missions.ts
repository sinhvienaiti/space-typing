import type { CampaignProgress } from "../campaign/types";
import type { HiddenDiscoveryState } from "../discovery/hidden-content";

export const MISSION_IDS = [
  "clear-5",
  "clear-25",
  "accuracy-98x3",
  "shop-5",
  "drops-10",
] as const;

export type MissionId = (typeof MISSION_IDS)[number];

export const ACHIEVEMENT_IDS = [
  "first-clear",
  "galaxy-one",
  "centurion",
  "precision-pilot",
  "hidden-signal",
  "deep-space",
] as const;

export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

export type MissionCounters = {
  stageClears: number;
  highAccuracyClears: number;
  shopPurchases: number;
  equipmentDrops: number;
};

export type ProgressionState = {
  counters: MissionCounters;
  claimedMissions: MissionId[];
  unlockedAchievements: AchievementId[];
};

export type MissionDefinition = {
  id: MissionId;
  name: string;
  description: string;
  counter: keyof MissionCounters;
  target: number;
  rewardCredits: number;
};

export type AchievementDefinition = {
  id: AchievementId;
  name: string;
  description: string;
};

export type ProgressionEvent =
  | { type: "stage-clear"; accuracy: number }
  | { type: "shop-purchase" }
  | { type: "equipment-drop" };

export const MISSION_REGISTRY: Record<MissionId, MissionDefinition> = {
  "clear-5": {
    id: "clear-5",
    name: "First Patrol",
    description: "Clear 5 stages.",
    counter: "stageClears",
    target: 5,
    rewardCredits: 150,
  },
  "clear-25": {
    id: "clear-25",
    name: "Sector Veteran",
    description: "Clear 25 stages.",
    counter: "stageClears",
    target: 25,
    rewardCredits: 450,
  },
  "accuracy-98x3": {
    id: "accuracy-98x3",
    name: "Precision Run",
    description: "Clear 3 stages at 98% accuracy or higher.",
    counter: "highAccuracyClears",
    target: 3,
    rewardCredits: 300,
  },
  "shop-5": {
    id: "shop-5",
    name: "Quartermaster",
    description: "Complete 5 shop purchases.",
    counter: "shopPurchases",
    target: 5,
    rewardCredits: 220,
  },
  "drops-10": {
    id: "drops-10",
    name: "Salvage Hunter",
    description: "Collect 10 equipment drops.",
    counter: "equipmentDrops",
    target: 10,
    rewardCredits: 350,
  },
};

export const ACHIEVEMENT_REGISTRY: Record<
  AchievementId,
  AchievementDefinition
> = {
  "first-clear": {
    id: "first-clear",
    name: "Launch Confirmed",
    description: "Clear your first Campaign stage.",
  },
  "galaxy-one": {
    id: "galaxy-one",
    name: "Galaxy One",
    description: "Clear Stage 100.",
  },
  centurion: {
    id: "centurion",
    name: "Centurion",
    description: "Clear 100 unique Campaign stages.",
  },
  "precision-pilot": {
    id: "precision-pilot",
    name: "Precision Pilot",
    description: "Record a 99%+ best accuracy on any stage.",
  },
  "hidden-signal": {
    id: "hidden-signal",
    name: "Hidden Signal",
    description: "Discover any hidden-content entry.",
  },
  "deep-space": {
    id: "deep-space",
    name: "Deep Space",
    description: "Reach Stage 500.",
  },
};

function emptyCounters(): MissionCounters {
  return {
    stageClears: 0,
    highAccuracyClears: 0,
    shopPurchases: 0,
    equipmentDrops: 0,
  };
}

export function createProgressionState(): ProgressionState {
  return {
    counters: emptyCounters(),
    claimedMissions: [],
    unlockedAchievements: [],
  };
}

function safeCounter(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(1_000_000, Math.floor(value)))
    : 0;
}

export function sanitizeProgressionState(value: unknown): ProgressionState {
  const result = createProgressionState();
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return result;
  }

  const raw = value as {
    counters?: unknown;
    claimedMissions?: unknown;
    unlockedAchievements?: unknown;
  };

  if (
    raw.counters !== null &&
    typeof raw.counters === "object" &&
    !Array.isArray(raw.counters)
  ) {
    const counters = raw.counters as Partial<Record<keyof MissionCounters, unknown>>;
    result.counters = {
      stageClears: safeCounter(counters.stageClears),
      highAccuracyClears: safeCounter(counters.highAccuracyClears),
      shopPurchases: safeCounter(counters.shopPurchases),
      equipmentDrops: safeCounter(counters.equipmentDrops),
    };
  }

  if (Array.isArray(raw.claimedMissions)) {
    const ids = new Set(
      raw.claimedMissions.filter(
        (id): id is MissionId =>
          typeof id === "string" &&
          MISSION_IDS.includes(id as MissionId),
      ),
    );
    result.claimedMissions = MISSION_IDS.filter((id) => ids.has(id));
  }

  if (Array.isArray(raw.unlockedAchievements)) {
    const ids = new Set(
      raw.unlockedAchievements.filter(
        (id): id is AchievementId =>
          typeof id === "string" &&
          ACHIEVEMENT_IDS.includes(id as AchievementId),
      ),
    );
    result.unlockedAchievements = ACHIEVEMENT_IDS.filter((id) => ids.has(id));
  }

  return result;
}

export function isValidProgressionState(
  value: unknown,
): value is ProgressionState {
  const state = sanitizeProgressionState(value);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  return JSON.stringify(state) === JSON.stringify(value);
}

export function recordProgressionEvent(
  input: ProgressionState,
  event: ProgressionEvent,
): ProgressionState {
  const state = sanitizeProgressionState(input);
  const counters = { ...state.counters };

  if (event.type === "stage-clear") {
    counters.stageClears += 1;
    if (event.accuracy >= 98) counters.highAccuracyClears += 1;
  } else if (event.type === "shop-purchase") {
    counters.shopPurchases += 1;
  } else {
    counters.equipmentDrops += 1;
  }

  return { ...state, counters };
}

export function missionProgress(
  state: ProgressionState,
  id: MissionId,
): number {
  const mission = MISSION_REGISTRY[id];
  return Math.min(
    mission.target,
    sanitizeProgressionState(state).counters[mission.counter],
  );
}

export function missionClaimable(
  state: ProgressionState,
  id: MissionId,
): boolean {
  const safe = sanitizeProgressionState(state);
  return (
    !safe.claimedMissions.includes(id) &&
    missionProgress(safe, id) >= MISSION_REGISTRY[id].target
  );
}

export function claimMission(
  state: ProgressionState,
  id: MissionId,
): {
  state: ProgressionState;
  rewardCredits: number;
  claimed: boolean;
} {
  const safe = sanitizeProgressionState(state);
  if (!missionClaimable(safe, id)) {
    return { state: safe, rewardCredits: 0, claimed: false };
  }

  return {
    state: {
      ...safe,
      claimedMissions: [...safe.claimedMissions, id],
    },
    rewardCredits: MISSION_REGISTRY[id].rewardCredits,
    claimed: true,
  };
}

export function syncAchievements(
  input: ProgressionState,
  campaign: CampaignProgress,
  hidden: HiddenDiscoveryState,
): {
  state: ProgressionState;
  newlyUnlocked: AchievementId[];
} {
  const state = sanitizeProgressionState(input);
  const candidates = new Set<AchievementId>();

  if (campaign.clearedStages.length >= 1) candidates.add("first-clear");
  if (campaign.clearedStages.includes(100)) candidates.add("galaxy-one");
  if (campaign.clearedStages.length >= 100) candidates.add("centurion");
  if (
    Object.values(campaign.bestByStage).some(
      (best) => best.accuracy >= 99,
    )
  ) {
    candidates.add("precision-pilot");
  }
  if (hidden.discovered.length > 0) candidates.add("hidden-signal");
  if (campaign.highestUnlockedStage >= 500) candidates.add("deep-space");

  const unlocked = new Set(state.unlockedAchievements);
  const newlyUnlocked = ACHIEVEMENT_IDS.filter(
    (id) => candidates.has(id) && !unlocked.has(id),
  );
  for (const id of newlyUnlocked) unlocked.add(id);

  return {
    state: {
      ...state,
      unlockedAchievements: ACHIEVEMENT_IDS.filter((id) => unlocked.has(id)),
    },
    newlyUnlocked,
  };
}
