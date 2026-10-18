/** Pure attribute pricing; avoid importing game state into the Worker. */
import type { CoreStatKey } from "../stats/core";
export const MAX_ATTRIBUTE_LEVEL = 20;
export const MAX_ECONOMY_ATTRIBUTE_LEVEL = 10;
type UpgradeCost = { credits: number; alloy: number; starCrystal: number; quantumCore: number; requiredStage: number };
export function maxAttributeLevel(key: CoreStatKey): number {
  return key === "luck" || key === "salvage"
    ? MAX_ECONOMY_ATTRIBUTE_LEVEL
    : MAX_ATTRIBUTE_LEVEL;
}

export function attributeUpgradeCost(
  key: CoreStatKey,
  currentLevel: number,
): UpgradeCost | null {
  const level = Math.max(0, Math.min(maxAttributeLevel(key), Math.floor(Number.isFinite(currentLevel) ? currentLevel : 0)));
  if (level >= maxAttributeLevel(key)) return null;

  const target = level + 1;
  const economy = key === "luck" || key === "salvage";
  const curve = economy ? 1.65 : 1;
  const requiredStage = economy
    ? Math.max(1, (target - 2) * 80 + 1)
    : Math.max(1, (target - 5) * 35 + 1);

  return {
    credits: Math.round(
      (90 + target * target * 26) * curve,
    ),
    alloy: Math.round(
      (1 + Math.floor(target / 3)) * curve,
    ),
    starCrystal:
      target >= (economy ? 8 : 16)
        ? economy
          ? 2
          : 1
        : 0,
    quantumCore:
      target === maxAttributeLevel(key) && economy ? 1 : 0,
    requiredStage: Math.max(1, Math.min(1000, requiredStage)),
  };
}
