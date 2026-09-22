import {
  EQUIPMENT_IDS,
  type EquipmentId,
} from "../equipment/registry";
import {
  GRADE_IDS,
  type GradeId,
} from "../grades";

export type LootSource =
  | "normal"
  | "elite"
  | "golden"
  | "treasure"
  | "anomaly"
  | "boss";

type GradeWeights = Record<GradeId, number>;

export const GRADE_DROP_WEIGHTS: Record<
  LootSource,
  GradeWeights
> = {
  normal: {
    aluminum: 78,
    copper: 18,
    silver: 3.5,
    gold: 0.48,
    diamond: 0.02,
  },
  elite: {
    aluminum: 45,
    copper: 38,
    silver: 14,
    gold: 2.9,
    diamond: 0.1,
  },
  golden: {
    aluminum: 18,
    copper: 50,
    silver: 26,
    gold: 5.8,
    diamond: 0.2,
  },
  treasure: {
    aluminum: 5,
    copper: 40,
    silver: 40,
    gold: 14.5,
    diamond: 0.5,
  },
  anomaly: {
    aluminum: 0,
    copper: 15,
    silver: 55,
    gold: 29,
    diamond: 1,
  },
  boss: {
    aluminum: 20,
    copper: 40,
    silver: 30,
    gold: 9.5,
    diamond: 0.5,
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
  const base = GRADE_DROP_WEIGHTS[source];
  const safeLuck = Math.min(100, Math.max(0, luck));

  return {
    aluminum: base.aluminum,
    copper: base.copper * (1 + safeLuck * 0.004),
    silver: base.silver * (1 + safeLuck * 0.008),
    gold: base.gold * (1 + safeLuck * 0.012),
    diamond: base.diamond * (1 + safeLuck * 0.015),
  };
}

export function rollEquipmentGrade(
  source: LootSource,
  luck: number,
  random = Math.random(),
): GradeId {
  const weights = adjustedWeights(source, luck);
  const total = GRADE_IDS.reduce(
    (sum, grade) => sum + weights[grade],
    0,
  );
  let cursor =
    Math.max(0, Math.min(0.999999, random)) * total;

  for (const grade of GRADE_IDS) {
    cursor -= weights[grade];
    if (cursor < 0) return grade;
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
    Math.floor(
      Math.max(0, Math.min(0.999999, random)) * table.length,
    ),
  );
  return table[index] ?? EQUIPMENT_IDS[0];
}

export function gradeChanceSummary(
  source: LootSource,
  luck: number,
): GradeWeights {
  const adjusted = adjustedWeights(source, luck);
  const total = GRADE_IDS.reduce(
    (sum, grade) => sum + adjusted[grade],
    0,
  );

  return Object.fromEntries(
    GRADE_IDS.map((grade) => [
      grade,
      total > 0 ? adjusted[grade] / total : 0,
    ]),
  ) as GradeWeights;
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
  const salvageBonus =
    1 + Math.min(100, Math.max(0, salvage)) * 0.004;
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
