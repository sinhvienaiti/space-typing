import type { CampaignProgress } from "../campaign/types";
import {
  CHARACTER_IDS,
  getCharacter,
  type CharacterId,
} from "../characters/registry";
import type { CharacterState } from "../characters/state";
import {
  EQUIPMENT_IDS,
  getEquipmentDefinition,
  type EquipmentId,
} from "../equipment/registry";
import type { EquipmentState } from "../equipment/loadout";
import {
  HIDDEN_CONTENT_IDS,
  hiddenCodexEntries,
  type HiddenDiscoveryState,
} from "../discovery/hidden-content";
import {
  ACHIEVEMENT_IDS,
  ACHIEVEMENT_REGISTRY,
  type ProgressionState,
} from "./missions";

export const META_RANKS = [
  { id: "cadet", name: "Cadet", minPoints: 0 },
  { id: "navigator", name: "Navigator", minPoints: 100 },
  { id: "ace", name: "Ace", minPoints: 300 },
  { id: "commander", name: "Commander", minPoints: 650 },
  { id: "legend", name: "Legend", minPoints: 1100 },
] as const;

export type MetaRankId = (typeof META_RANKS)[number]["id"];

export type CollectionEntry = {
  id: string;
  category: "character" | "equipment" | "hidden" | "achievement";
  discovered: boolean;
  title: string;
  description: string;
};

export type MetaProgression = {
  points: number;
  level: number;
  rank: MetaRankId;
  rankName: string;
  nextRankAt: number | null;
  uniqueStagesCleared: number;
  charactersUnlocked: number;
  equipmentTypesOwned: number;
  hiddenDiscovered: number;
  achievementsUnlocked: number;
  collectionFound: number;
  collectionTotal: number;
};

export function metaPoints(input: {
  campaign: CampaignProgress;
  characters: CharacterState;
  equipment: EquipmentState;
  hidden: HiddenDiscoveryState;
  progression: ProgressionState;
}): number {
  const equipmentTypes = new Set(
    input.equipment.items.map((item) => item.definitionId),
  ).size;

  return (
    input.campaign.clearedStages.length +
    input.characters.unlocked.length * 10 +
    equipmentTypes * 5 +
    input.hidden.discovered.length * 25 +
    input.progression.unlockedAchievements.length * 20
  );
}

export function resolveMetaProgression(input: {
  campaign: CampaignProgress;
  characters: CharacterState;
  equipment: EquipmentState;
  hidden: HiddenDiscoveryState;
  progression: ProgressionState;
}): MetaProgression {
  const points = metaPoints(input);
  const equipmentTypesOwned = new Set(
    input.equipment.items.map((item) => item.definitionId),
  ).size;
  const rank =
    [...META_RANKS]
      .reverse()
      .find((entry) => points >= entry.minPoints) ?? META_RANKS[0];
  const rankIndex = META_RANKS.findIndex((entry) => entry.id === rank.id);
  const next = META_RANKS[rankIndex + 1] ?? null;
  const collectionFound =
    input.characters.unlocked.length +
    equipmentTypesOwned +
    input.hidden.discovered.length +
    input.progression.unlockedAchievements.length;
  const collectionTotal =
    CHARACTER_IDS.length +
    EQUIPMENT_IDS.length +
    HIDDEN_CONTENT_IDS.length +
    ACHIEVEMENT_IDS.length;

  return {
    points,
    level: Math.min(20, 1 + Math.floor(points / 75)),
    rank: rank.id,
    rankName: rank.name,
    nextRankAt: next?.minPoints ?? null,
    uniqueStagesCleared: input.campaign.clearedStages.length,
    charactersUnlocked: input.characters.unlocked.length,
    equipmentTypesOwned,
    hiddenDiscovered: input.hidden.discovered.length,
    achievementsUnlocked: input.progression.unlockedAchievements.length,
    collectionFound,
    collectionTotal,
  };
}

export function collectionEntries(input: {
  characters: CharacterState;
  equipment: EquipmentState;
  hidden: HiddenDiscoveryState;
  progression: ProgressionState;
}): CollectionEntry[] {
  const characters = new Set(input.characters.unlocked);
  const equipment = new Set(
    input.equipment.items.map((item) => item.definitionId),
  );
  const achievements = new Set(
    input.progression.unlockedAchievements,
  );

  const characterEntries = CHARACTER_IDS.map((id: CharacterId) => {
    const definition = getCharacter(id);
    const discovered = characters.has(id);
    return {
      id: "character:" + id,
      category: "character" as const,
      discovered,
      title: discovered ? definition.name : "???",
      description: discovered
        ? definition.role + " · " + definition.summary
        : "Undiscovered character.",
    };
  });

  const equipmentEntries = EQUIPMENT_IDS.map((id: EquipmentId) => {
    const definition = getEquipmentDefinition(id);
    const discovered = equipment.has(id);
    return {
      id: "equipment:" + id,
      category: "equipment" as const,
      discovered,
      title: discovered ? definition.name : "???",
      description: discovered
        ? definition.slot + " · " + definition.description
        : "Undiscovered equipment type.",
    };
  });

  const hiddenEntries = hiddenCodexEntries(input.hidden).map((entry) => ({
    id: "hidden:" + entry.id,
    category: "hidden" as const,
    discovered: entry.discovered,
    title: entry.title,
    description: entry.description,
  }));

  const achievementEntries = ACHIEVEMENT_IDS.map((id) => {
    const definition = ACHIEVEMENT_REGISTRY[id];
    const discovered = achievements.has(id);
    return {
      id: "achievement:" + id,
      category: "achievement" as const,
      discovered,
      title: discovered ? definition.name : "???",
      description: discovered
        ? definition.description
        : "Locked achievement.",
    };
  });

  return [
    ...characterEntries,
    ...equipmentEntries,
    ...hiddenEntries,
    ...achievementEntries,
  ];
}
