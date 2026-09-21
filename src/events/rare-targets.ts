import { clamp } from "../logic";
import type { VocabularyEntry } from "../types";

export type TreasureDrone = {
  entry: VocabularyEntry;
  typed: number;
  x: number;
  y: number;
  speed: number;
  age: number;
  lifetime: number;
};


export function goldenEnemyChance(stage: number): number {
  const safeStage = clamp(Math.floor(stage), 1, 1000);
  if (safeStage < 20) return 0;
  return Math.min(0.04, 0.014 + (safeStage - 20) * 0.000026);
}

export function shouldSpawnGoldenEnemy(
  stage: number,
  random = Math.random(),
): boolean {
  return random < goldenEnemyChance(stage);
}

export function treasureDroneChance(stage: number): number {
  const safeStage = clamp(Math.floor(stage), 1, 1000);
  if (safeStage < 10) return 0;
  return Math.min(0.12, 0.055 + (safeStage - 10) * 0.000065);
}

export function shouldScheduleTreasureDrone(
  stage: number,
  random = Math.random(),
): boolean {
  return random < treasureDroneChance(stage);
}
