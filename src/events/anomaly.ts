import { clamp, typingText } from "../logic";
import {
  rollEquipmentDefinition,
  rollEquipmentGrade,
  type EquipmentDrop,
  type LootSource,
} from "../loot/equipment-loot";
import type { VocabularyEntry } from "../types";

export const ANOMALY_CHOICES = ["stabilize", "overload"] as const;
export type AnomalyChoice = (typeof ANOMALY_CHOICES)[number];

export type AnomalyCrate = {
  entry: VocabularyEntry;
  typed: number;
  x: number;
  y: number;
  speed: number;
  age: number;
  lifetime: number;
};

export function anomalyCrateChance(stage: number): number {
  const safeStage = clamp(Math.floor(stage), 1, 1000);
  if (safeStage < 50) return 0;
  return Math.min(0.075, 0.03 + (safeStage - 50) * 0.000048);
}

export function shouldScheduleAnomalyCrate(
  stage: number,
  random = Math.random(),
): boolean {
  return random < anomalyCrateChance(stage);
}

export function anomalyRiskHullRatio(stage: number): number {
  const safeStage = clamp(Math.floor(stage), 1, 1000);
  return clamp(0.12 + safeStage * 0.00008, 0.12, 0.2);
}

export function anomalyRewardSource(
  choice: AnomalyChoice,
): LootSource {
  return choice === "overload" ? "anomaly" : "golden";
}

export function createAnomalyReward(
  choice: AnomalyChoice,
  luck: number,
  random = Math.random,
): EquipmentDrop {
  const source = anomalyRewardSource(choice);
  return {
    source,
    definitionId: rollEquipmentDefinition(source, random()),
    grade: rollEquipmentGrade(source, luck, random()),
  };
}

export function anomalyWord(
  vocabulary: readonly VocabularyEntry[],
  random = Math.random(),
): VocabularyEntry | null {
  const candidates = vocabulary.filter((entry) => {
    const length = typingText(entry.en).length;
    return length >= 6 && length <= 11;
  });
  const source = candidates.length > 0 ? candidates : vocabulary;
  if (source.length === 0) return null;

  const index = Math.min(
    source.length - 1,
    Math.floor(clamp(random, 0, 0.999999) * source.length),
  );
  return source[index] ?? null;
}
