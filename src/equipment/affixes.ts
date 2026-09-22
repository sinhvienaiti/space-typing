import type { StatBonus } from "../stats/core";
import type { GradeId } from "../grades";

export const EQUIPMENT_AFFIX_IDS = [
  "fortified",
  "charged",
  "overclocked",
  "plated",
  "precise",
  "warded",
  "lucky",
  "salvager",
] as const;

export type EquipmentAffixId =
  (typeof EQUIPMENT_AFFIX_IDS)[number];

export type EquipmentAffixDefinition = {
  id: EquipmentAffixId;
  name: string;
  stats: StatBonus;
};

export const EQUIPMENT_AFFIX_REGISTRY: Record<
  EquipmentAffixId,
  EquipmentAffixDefinition
> = {
  fortified: {
    id: "fortified",
    name: "Fortified",
    stats: { hull: 10 },
  },
  charged: {
    id: "charged",
    name: "Charged",
    stats: { energy: 8 },
  },
  overclocked: {
    id: "overclocked",
    name: "Overclocked",
    stats: { firepower: 3 },
  },
  plated: {
    id: "plated",
    name: "Plated",
    stats: { armor: 3 },
  },
  precise: {
    id: "precise",
    name: "Precise",
    stats: { focus: 3 },
  },
  warded: {
    id: "warded",
    name: "Warded",
    stats: { ward: 3 },
  },
  lucky: {
    id: "lucky",
    name: "Lucky",
    stats: { luck: 2 },
  },
  salvager: {
    id: "salvager",
    name: "Salvager",
    stats: { salvage: 2 },
  },
};

export function isEquipmentAffixId(
  value: unknown,
): value is EquipmentAffixId {
  return (
    typeof value === "string" &&
    (EQUIPMENT_AFFIX_IDS as readonly string[]).includes(value)
  );
}

export function maxAffixesForGrade(
  grade: GradeId,
): number {
  if (grade === "diamond" || grade === "gold") return 2;
  if (grade === "silver") return 1;
  return 0;
}

export function sanitizeEquipmentAffixes(
  value: unknown,
  grade: GradeId,
): EquipmentAffixId[] {
  if (!Array.isArray(value)) return [];

  const result: EquipmentAffixId[] = [];
  const max = maxAffixesForGrade(grade);
  for (const candidate of value) {
    if (
      !isEquipmentAffixId(candidate) ||
      result.includes(candidate)
    ) {
      continue;
    }
    result.push(candidate);
    if (result.length >= max) break;
  }
  return result;
}

export function rollEquipmentAffix(
  existing: readonly EquipmentAffixId[],
  random = Math.random,
): EquipmentAffixId | null {
  const available = EQUIPMENT_AFFIX_IDS.filter(
    (id) => !existing.includes(id),
  );
  if (available.length === 0) return null;
  const index = Math.min(
    available.length - 1,
    Math.floor(
      Math.max(0, Math.min(0.999999, random())) *
        available.length,
    ),
  );
  return available[index] ?? null;
}

export function equipmentAffixBonus(
  ids: readonly EquipmentAffixId[],
): StatBonus {
  const result: StatBonus = {};
  for (const id of ids) {
    for (const [key, value] of Object.entries(
      EQUIPMENT_AFFIX_REGISTRY[id].stats,
    )) {
      if (typeof value !== "number") continue;
      const stat = key as keyof StatBonus;
      result[stat] = (result[stat] ?? 0) + value;
    }
  }
  return result;
}
