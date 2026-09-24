import type {
  AchievementId,
  MissionId,
} from "../progression/missions";
import type { CollectionEntry } from "../progression/meta";
import type {
  StageObjectiveStatus,
  StageObjectiveType,
} from "../events/objectives";

export type MissionUiState = "active" | "claimable" | "claimed";

export type ImportancePresentation = {
  icon: string;
  label: string;
  accent: string;
  stateLabel: string;
};

const MISSION_PRESENTATION: Record<
  MissionId,
  Omit<ImportancePresentation, "stateLabel">
> = {
  "clear-5": {
    icon: "◎",
    label: "Campaign",
    accent: "#86d9ee",
  },
  "clear-25": {
    icon: "✦",
    label: "Campaign",
    accent: "#a8dff0",
  },
  "accuracy-98x3": {
    icon: "⌖",
    label: "Precision",
    accent: "#9fe8c8",
  },
  "shop-5": {
    icon: "₡",
    label: "Economy",
    accent: "#e4c47d",
  },
  "drops-10": {
    icon: "⬢",
    label: "Loot",
    accent: "#d8aeef",
  },
};

const ACHIEVEMENT_PRESENTATION: Record<
  AchievementId,
  Omit<ImportancePresentation, "stateLabel">
> = {
  "first-clear": {
    icon: "↗",
    label: "Milestone",
    accent: "#86d9ee",
  },
  "galaxy-one": {
    icon: "◉",
    label: "Milestone",
    accent: "#9fddec",
  },
  centurion: {
    icon: "100",
    label: "Milestone",
    accent: "#e2c87f",
  },
  "precision-pilot": {
    icon: "⌖",
    label: "Precision",
    accent: "#9fe8c8",
  },
  "hidden-signal": {
    icon: "✧",
    label: "Discovery",
    accent: "#d4a9ef",
  },
  "deep-space": {
    icon: "∞",
    label: "Milestone",
    accent: "#a7b8ff",
  },
};

const COLLECTION_PRESENTATION: Record<
  CollectionEntry["category"],
  Omit<ImportancePresentation, "stateLabel">
> = {
  character: {
    icon: "♙",
    label: "Character",
    accent: "#91d8e8",
  },
  equipment: {
    icon: "⬢",
    label: "Equipment",
    accent: "#c8b7ef",
  },
  hidden: {
    icon: "✧",
    label: "Hidden",
    accent: "#d4a9ef",
  },
  achievement: {
    icon: "★",
    label: "Achievement",
    accent: "#e6c875",
  },
  world: {
    icon: "◉",
    label: "World",
    accent: "#86d9ee",
  },
  enemy: {
    icon: "◆",
    label: "Enemy",
    accent: "#e29b82",
  },
  boss: {
    icon: "♛",
    label: "Boss",
    accent: "#ef8a9b",
  },
  reward: {
    icon: "⬡",
    label: "Reward",
    accent: "#b6e59c",
  },
};

const OBJECTIVE_PRESENTATION: Record<
  StageObjectiveType,
  Omit<ImportancePresentation, "stateLabel">
> = {
  survive: {
    icon: "◇",
    label: "Survive",
    accent: "#9fddec",
  },
  accuracy: {
    icon: "⌖",
    label: "Accuracy",
    accent: "#9fe8c8",
  },
  "no-miss": {
    icon: "✓",
    label: "No miss",
    accent: "#9fe8c8",
  },
  protect: {
    icon: "◈",
    label: "Protect",
    accent: "#8fd6ff",
  },
  "commander-first": {
    icon: "!",
    label: "Priority",
    accent: "#f0c46f",
  },
  "marked-target": {
    icon: "◎",
    label: "Marked target",
    accent: "#f0b775",
  },
  "elite-hunt": {
    icon: "✦",
    label: "Elite hunt",
    accent: "#d9a4ef",
  },
  "speed-clear": {
    icon: "»",
    label: "Speed clear",
    accent: "#95dff1",
  },
};

export function missionImportance(
  id: MissionId,
  state: MissionUiState,
): ImportancePresentation {
  const base = MISSION_PRESENTATION[id];
  return {
    ...base,
    accent:
      state === "claimable"
        ? "#f0c96d"
        : state === "claimed"
          ? "#8eb49e"
          : base.accent,
    stateLabel:
      state === "claimable"
        ? "Reward ready"
        : state === "claimed"
          ? "Claimed"
          : "In progress",
  };
}

export function achievementImportance(
  id: AchievementId,
  unlocked: boolean,
): ImportancePresentation {
  if (!unlocked) {
    return {
      icon: "?",
      label: "Achievement",
      accent: "#667985",
      stateLabel: "Locked",
    };
  }
  return {
    ...ACHIEVEMENT_PRESENTATION[id],
    stateLabel: "Unlocked",
  };
}

export function collectionImportance(
  category: CollectionEntry["category"],
  discovered: boolean,
): ImportancePresentation {
  if (!discovered) {
    return {
      icon: "?",
      label: "Undiscovered",
      accent: "#667985",
      stateLabel: "Locked entry",
    };
  }

  return {
    ...COLLECTION_PRESENTATION[category],
    stateLabel: "Discovered",
  };
}

export function objectiveImportance(
  type: StageObjectiveType,
  required: boolean,
  status: StageObjectiveStatus,
): ImportancePresentation {
  const base = OBJECTIVE_PRESENTATION[type];
  const statusLabel =
    status === "complete"
      ? "Complete"
      : status === "failed"
        ? "Failed"
        : required
          ? "Required"
          : "Bonus";
  const accent =
    status === "complete"
      ? "#9fe8c8"
      : status === "failed"
        ? "#f19a9d"
        : required
          ? "#f0c46f"
          : base.accent;

  return {
    ...base,
    accent,
    stateLabel: statusLabel,
  };
}
