import { clamp, typingText } from "../logic";
import {
  rollEquipmentDefinition,
  rollEquipmentRarity,
  type EquipmentDrop,
} from "../loot/equipment-loot";
import type { VocabularyEntry } from "../types";

export type RewardChoiceCrate = {
  entry: VocabularyEntry;
  typed: number;
  x: number;
  y: number;
  speed: number;
  age: number;
  lifetime: number;
};

export function rewardChoiceCrateChance(stage: number): number {
  const safeStage = clamp(Math.floor(stage), 1, 1000);
  if (safeStage < 30) return 0;
  return Math.min(0.1, 0.045 + (safeStage - 30) * 0.000057);
}

export function shouldScheduleRewardChoiceCrate(
  stage: number,
  random = Math.random(),
): boolean {
  return random < rewardChoiceCrateChance(stage);
}

export function createRewardChoiceOptions(
  luck: number,
  random = Math.random,
): EquipmentDrop[] {
  const choices: EquipmentDrop[] = [];
  const seen = new Set<string>();
  let attempts = 0;

  while (choices.length < 3 && attempts < 30) {
    attempts += 1;
    const definitionId = rollEquipmentDefinition("treasure", random());
    if (seen.has(definitionId)) continue;

    seen.add(definitionId);
    choices.push({
      source: "treasure",
      definitionId,
      rarity: rollEquipmentRarity("treasure", luck, random()),
    });
  }

  return choices;
}

export function rewardChoiceWord(
  vocabulary: readonly VocabularyEntry[],
  random = Math.random(),
): VocabularyEntry | null {
  const candidates = vocabulary.filter((entry) => {
    const length = typingText(entry.en).length;
    return length >= 5 && length <= 10;
  });
  const source = candidates.length > 0 ? candidates : vocabulary;
  if (source.length === 0) return null;

  const index = Math.min(
    source.length - 1,
    Math.floor(clamp(random, 0, 0.999999) * source.length),
  );
  return source[index] ?? null;
}
