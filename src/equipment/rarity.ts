export const EQUIPMENT_RARITIES = [
  "common",
  "rare",
  "epic",
  "legendary",
] as const;

export type EquipmentRarity = (typeof EQUIPMENT_RARITIES)[number];

export const RARITY_STAT_MULTIPLIER: Record<
  EquipmentRarity,
  number
> = {
  common: 1,
  rare: 1.12,
  epic: 1.28,
  legendary: 1.5,
};

export function isEquipmentRarity(
  value: string,
): value is EquipmentRarity {
  return (EQUIPMENT_RARITIES as readonly string[]).includes(value);
}

export function rarityStatMultiplier(
  rarity: EquipmentRarity,
): number {
  return RARITY_STAT_MULTIPLIER[rarity];
}
