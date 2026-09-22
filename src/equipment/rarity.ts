import type { GradeId } from "../grades";

export const LEGACY_EQUIPMENT_RARITIES = [
  "common",
  "rare",
  "epic",
  "legendary",
] as const;

export type LegacyEquipmentRarity =
  (typeof LEGACY_EQUIPMENT_RARITIES)[number];

export const LEGACY_RARITY_TO_GRADE: Record<
  LegacyEquipmentRarity,
  GradeId
> = {
  common: "aluminum",
  rare: "copper",
  epic: "silver",
  legendary: "gold",
};

export function isLegacyEquipmentRarity(
  value: unknown,
): value is LegacyEquipmentRarity {
  return (
    typeof value === "string" &&
    (LEGACY_EQUIPMENT_RARITIES as readonly string[]).includes(value)
  );
}

export function legacyRarityToGrade(
  rarity: LegacyEquipmentRarity,
): GradeId {
  return LEGACY_RARITY_TO_GRADE[rarity];
}
