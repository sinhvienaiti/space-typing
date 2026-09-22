import {
  EQUIPMENT_IDS,
  type EquipmentId,
} from "../equipment/registry";
import type { GradeId } from "../grades";

export type LootSource =
  | "normal"
  | "elite"
  | "golden"
  | "treasure"
  | "anomaly"
  | "boss";

type GradeWeights = Record<GradeId, number>;

export const GRADE_WEIGHTS: Record<
  LootSource,
  GradeWeights
> = {
  normal: {
    aluminum: 78,
    copper: 18,
    silver: 3.4,
    gold: 0.55,
    diamond: 0.05,
  },
  elite: {
    aluminum: 45,
    copper: 38,
    silver: 13.5,
    gold: 3.2,
    diamond: 0.3,
  },
  golden: {
    aluminum: 18,
    copper: 50,
    silver: 25,
    gold: 6.5,
    diamond: 0.5,
  },
  treasure: {
    aluminum: 5,
    copper: 40,
    silver: 38,
    gold: 15,
    diamond: 2,
  },
  anomaly: {
    aluminum: 0,
    copper: 10,
    silver: 50,
    gold: 35,
    diamond: 5,
  },
  boss: {
    aluminum: 15,
    copper: 35,
    silver: 32,
    gold: 15,
    diamond: 3,
  },
};

export const EQUIPMENT_LOOT_TABLES: Record<
  LootSource,
  readonly EquipmentId[]
> = {
  normal: EQUIPMENT_IDS,
  elite: EQUIPMENT_IDS,
  golden: EQUIPMENT_IDS,
  treasure: EQUIPMENT_IDS,
  anomaly: EQUIPMENT_IDS,
  boss: EQUIPMENT_IDS,
};

function adjustedWeights(
  source: LootSource,
  luck: number,
): GradeWeights {
  const base = GRADE_WEIGHTS[source];
  const safeLuck = Math.max(0, luck);

  return {
    aluminum: base.aluminum,
    copper: base.copper * (1 + safeLuck * 0.004),
    silver: base.silver * (1 + safeLuck * 0.008),
    gold: base.gold * (1 + safeLuck * 0.012),
    diamond: base.diamond * (1 + safeLuck * 0.014),
  };
}

export function rollEquipmentGrade(
  source: LootSource,
  luck: number,
  random = Math.random(),
): GradeId {
  const weights = adjustedWeights(source, luck);
  const entries = [
    ["aluminum", weights.aluminum],
    ["copper", weights.copper],
    ["silver", weights.silver],
    ["gold", weights.gold],
    ["diamond", weights.diamond],
  ] as const;

  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let cursor = Math.max(0, Math.min(0.999999, random)) * total;

  for (const [rarity, weight] of entries) {
    cursor -= weight;
    if (cursor < 0) return rarity;
  }

  return "diamond";
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

export function gradeChanceSummary(
  source: LootSource,
  luck: number,
): GradeWeights {
  const adjusted = adjustedWeights(source, luck);
  const total =
    adjusted.aluminum +
    adjusted.copper +
    adjusted.silver +
    adjusted.gold +
    adjusted.diamond;

  return {
    aluminum: adjusted.aluminum / total,
    copper: adjusted.copper / total,
    silver: adjusted.silver / total,
    gold: adjusted.gold / total,
    diamond: adjusted.diamond / total,
  };
}

export type EquipmentDrop = {
  source: LootSource;
  definitionId: EquipmentId;
  grade: GradeId;
};

export function equipmentDropChance(
  source: LootSource,
  salvage: number,
): number {
  const base =
    source === "boss" ||
    source === "golden" ||
    source === "treasure" ||
    source === "anomaly"
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
    grade: rollEquipmentGrade(source, luck, random()),
    definitionId: rollEquipmentDefinition(source, random()),
  };
}
