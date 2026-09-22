import type { GradeId } from "../grades";

export const EQUIPMENT_RARITIES = [
  "common",
  "rare",
  "epic",
  "legendary",
] as const;

export type EquipmentRarity = (typeof EQUIPMENT_RARITIES)[number];

export const LEGACY_RARITY_TO_GRADE: Record<
  EquipmentRarity,
  GradeId
> = {
  common: "aluminum",
  rare: "copper",
  epic: "silver",
  legendary: "gold",
};

export function isEquipmentRarity(
  value: string,
): value is EquipmentRarity {
  return (EQUIPMENT_RARITIES as readonly string[]).includes(value);
}

export function legacyRarityToGrade(
  rarity: EquipmentRarity,
): GradeId {
  return LEGACY_RARITY_TO_GRADE[rarity];
}
