/** Pure pricing shared by the game and Worker. */
import type { GradeId } from "../grades";
import { maxAffixesForGrade } from "../equipment/affixes";
type EquipmentInstance = { grade: GradeId; enhancement: number };
type UpgradeCost = { credits: number; alloy: number; starCrystal: number; quantumCore: number; requiredStage: number };
const GRADE_COST_MULTIPLIER: Record<GradeId, number> = {
  aluminum: 1,
  copper: 1.25,
  silver: 1.6,
  gold: 2.1,
  diamond: 2.8,
};

const GRADE_ALLOY_COST: Record<GradeId, number> = {
  aluminum: 1,
  copper: 2,
  silver: 4,
  gold: 7,
  diamond: 12,
};

export const REPAIR_PACK_COST = 64;
export const REPAIR_PACK_ALLOY_COST = 1;




export function equipmentEvolutionCost(
  item: EquipmentInstance,
): UpgradeCost | null {
  if (item.enhancement < 5) return null;

  if (item.grade === "silver") {
    return {
      credits: 850,
      alloy: 16,
      starCrystal: 3,
      quantumCore: 0,
      requiredStage: 301,
    };
  }

  if (item.grade === "gold") {
    return {
      credits: 1800,
      alloy: 28,
      starCrystal: 7,
      quantumCore: 1,
      requiredStage: 601,
    };
  }

  return null;
}

export function equipmentAffixRollCost(
  item: EquipmentInstance,
  reroll = false,
): UpgradeCost | null {
  if (maxAffixesForGrade(item.grade) <= 0) return null;

  const gradeFactor =
    item.grade === "silver"
      ? 1
      : item.grade === "gold"
        ? 1.6
        : 2.4;

  return {
    credits: Math.round(
      (reroll ? 360 : 260) * gradeFactor,
    ),
    alloy: Math.round(
      (reroll ? 6 : 4) * gradeFactor,
    ),
    starCrystal:
      item.grade === "diamond"
        ? reroll
          ? 3
          : 2
        : item.grade === "gold"
          ? 1
          : 0,
    quantumCore: 0,
    requiredStage:
      item.grade === "silver"
        ? 201
        : item.grade === "gold"
          ? 401
          : 701,
  };
}

export function equipmentUpgradeCost(
  item: EquipmentInstance,
): number | null {
  if (item.enhancement >= 5) return null;
  const base = 70 + item.enhancement * 55;
  return Math.floor(base * GRADE_COST_MULTIPLIER[item.grade]);
}

export function equipmentUpgradeAlloyCost(
  item: EquipmentInstance,
): number | null {
  if (item.enhancement >= 5) return null;
  return GRADE_ALLOY_COST[item.grade] + item.enhancement;
}