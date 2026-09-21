import {
  EQUIPMENT_IDS,
  type EquipmentId,
} from "../equipment/registry";
import type { EquipmentRarity } from "../equipment/rarity";

export type LootSource = "normal" | "elite" | "boss";

type RarityWeights = Record<EquipmentRarity, number>;

export const RARITY_WEIGHTS: Record<
  LootSource,
  RarityWeights
> = {
  normal: {
    common: 78,
    rare: 18,
    epic: 3.5,
    legendary: 0.5,
  },
  elite: {
    common: 45,
    rare: 38,
    epic: 14,
    legendary: 3,
  },
  boss: {
    common: 20,
    rare: 40,
    epic: 30,
    legendary: 10,
  },
};

export const EQUIPMENT_LOOT_TABLES: Record<
  LootSource,
  readonly EquipmentId[]
> = {
  normal: EQUIPMENT_IDS,
  elite: EQUIPMENT_IDS,
  boss: EQUIPMENT_IDS,
};

function adjustedWeights(
  source: LootSource,
  luck: number,
): RarityWeights {
  const base = RARITY_WEIGHTS[source];
  const safeLuck = Math.max(0, luck);

  return {
    common: base.common,
    rare: base.rare * (1 + safeLuck * 0.005),
    epic: base.epic * (1 + safeLuck * 0.01),
    legendary: base.legendary * (1 + safeLuck * 0.015),
  };
}

export function rollEquipmentRarity(
  source: LootSource,
  luck: number,
  random = Math.random(),
): EquipmentRarity {
  const weights = adjustedWeights(source, luck);
  const entries = [
    ["common", weights.common],
    ["rare", weights.rare],
    ["epic", weights.epic],
    ["legendary", weights.legendary],
  ] as const;

  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let cursor = Math.max(0, Math.min(0.999999, random)) * total;

  for (const [rarity, weight] of entries) {
    cursor -= weight;
    if (cursor < 0) return rarity;
  }

  return "legendary";
}

export function rollEquipmentDefinition(
  source: LootSource,
  random = Math.random(),
): EquipmentId {
  const table = EQUIPMENT_LOOT_TABLES[source];
  const index = Math.min(
    table.length - 1,
    Math.floor(Math.max(0, Math.min(0.999999, random)) * table.length),
  );
  return table[index] ?? EQUIPMENT_IDS[0];
}

export function rarityChanceSummary(
  source: LootSource,
  luck: number,
): RarityWeights {
  const adjusted = adjustedWeights(source, luck);
  const total =
    adjusted.common +
    adjusted.rare +
    adjusted.epic +
    adjusted.legendary;

  return {
    common: adjusted.common / total,
    rare: adjusted.rare / total,
    epic: adjusted.epic / total,
    legendary: adjusted.legendary / total,
  };
}

export type EquipmentDrop = {
  source: LootSource;
  definitionId: EquipmentId;
  rarity: EquipmentRarity;
};

export function equipmentDropChance(
  source: LootSource,
  salvage: number,
): number {
  const base =
    source === "boss"
      ? 1
      : source === "elite"
        ? 0.22
        : 0.035;
  const salvageBonus = 1 + Math.min(100, Math.max(0, salvage)) * 0.004;
  return Math.min(1, base * salvageBonus);
}

export function rollEquipmentDrop(
  source: LootSource,
  luck: number,
  salvage: number,
  random = Math.random,
): EquipmentDrop | null {
  if (random() >= equipmentDropChance(source, salvage)) {
    return null;
  }

  return {
    source,
    rarity: rollEquipmentRarity(source, luck, random()),
    definitionId: rollEquipmentDefinition(source, random()),
  };
}
