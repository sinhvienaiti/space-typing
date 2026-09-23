import type { CharacterId } from "./registry";
import type { EquipmentState } from "../equipment/loadout";
import { getEquipmentDefinition } from "../equipment/registry";
import type { GradeId } from "../grades";

export const EQUIPMENT_VISUAL_AFFINITIES = [
  "tech",
  "guard",
  "storm",
  "flame",
  "precision",
  "fortune",
  "void",
  "celestial",
] as const;

export type EquipmentVisualAffinity =
  (typeof EQUIPMENT_VISUAL_AFFINITIES)[number];

export type EquipmentAuraProfile = {
  primary: EquipmentVisualAffinity;
  secondary: EquipmentVisualAffinity | null;
  intensity: number;
  equippedCount: number;
};

const GRADE_VISUAL_WEIGHT: Record<GradeId, number> = {
  aluminum: 0.3,
  copper: 0.48,
  silver: 0.66,
  gold: 0.84,
  diamond: 1,
};

const CHARACTER_TIE_BREAK: Record<CharacterId, EquipmentVisualAffinity> = {
  vanguard: "tech",
  aegis: "guard",
  volt: "storm",
  wraith: "void",
  fortune: "fortune",
  arsenal: "flame",
  oracle: "precision",
  bastion: "guard",
  reaper: "void",
  celestial: "celestial",
  zenith: "celestial",
};

function add(
  scores: Record<EquipmentVisualAffinity, number>,
  id: EquipmentVisualAffinity,
  amount: number,
): void {
  scores[id] += amount;
}

export function deriveEquipmentAura(
  state: EquipmentState,
  characterId: CharacterId,
): EquipmentAuraProfile {
  const scores = Object.fromEntries(
    EQUIPMENT_VISUAL_AFFINITIES.map((id) => [id, 0]),
  ) as Record<EquipmentVisualAffinity, number>;

  add(scores, CHARACTER_TIE_BREAK[characterId], 0.35);

  let equippedCount = 0;
  let visualPower = 0;

  for (const instanceId of Object.values(state.loadout)) {
    if (instanceId === null) continue;
    const item = state.items.find(
      (candidate) => candidate.instanceId === instanceId,
    );
    if (item === undefined) continue;

    equippedCount += 1;
    const definition = getEquipmentDefinition(item.definitionId);
    const stats = definition.stats;
    const gradeWeight = GRADE_VISUAL_WEIGHT[item.grade];
    const enhancementWeight = Math.min(
      0.24,
      Math.max(0, item.enhancement) * 0.018,
    );
    const weight = gradeWeight + enhancementWeight;
    visualPower += weight;

    if (definition.slot === "weapon") add(scores, "flame", 1.3 * weight);
    if (definition.slot === "shield" || definition.slot === "armor") {
      add(scores, "guard", 1.05 * weight);
    }
    if (definition.slot === "reactor") add(scores, "storm", 1.1 * weight);
    if (definition.slot === "utility") add(scores, "precision", 0.85 * weight);
    if (definition.slot === "drone" || definition.slot === "core") {
      add(scores, "tech", 0.6 * weight);
    }

    add(scores, "guard", ((stats.hull ?? 0) + (stats.shield ?? 0)) * 0.02 * weight);
    add(scores, "guard", ((stats.armor ?? 0) + (stats.ward ?? 0)) * 0.045 * weight);
    add(scores, "storm", ((stats.energy ?? 0) + (stats.reactor ?? 0) * 3) * 0.025 * weight);
    add(scores, "flame", (stats.firepower ?? 0) * 0.08 * weight);
    add(scores, "precision", (stats.focus ?? 0) * 0.1 * weight);
    add(scores, "fortune", ((stats.luck ?? 0) + (stats.salvage ?? 0)) * 0.1 * weight);

    for (const affix of item.affixes ?? []) {
      if (affix === "fortified" || affix === "plated" || affix === "warded") {
        add(scores, "guard", 0.9 * weight);
      } else if (affix === "charged") {
        add(scores, "storm", 1.05 * weight);
      } else if (affix === "overclocked") {
        add(scores, "flame", 1.05 * weight);
      } else if (affix === "precise") {
        add(scores, "precision", 1.05 * weight);
      } else if (affix === "lucky" || affix === "salvager") {
        add(scores, "fortune", 1.05 * weight);
      }
    }
  }

  if (characterId === "wraith" || characterId === "reaper") {
    add(scores, "void", 1);
  } else if (characterId === "celestial" || characterId === "zenith") {
    add(scores, "celestial", 1.1);
  }

  const ordered = EQUIPMENT_VISUAL_AFFINITIES
    .map((id) => ({ id, score: scores[id] }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  const first = ordered[0]!;
  const second = ordered[1]!;
  const secondary =
    second.score >= Math.max(0.8, first.score * 0.58)
      ? second.id
      : null;

  const averagePower =
    equippedCount === 0 ? 0 : visualPower / equippedCount;
  const intensity = Math.max(
    0.22,
    Math.min(
      1,
      0.22 +
        averagePower * 0.55 +
        Math.min(0.18, equippedCount * 0.02),
    ),
  );

  return {
    primary: first.id,
    secondary,
    intensity,
    equippedCount,
  };
}

export const EQUIPMENT_AURA_COLORS: Record<
  EquipmentVisualAffinity,
  { primary: string; secondary: string }
> = {
  tech: { primary: "#62e9ff", secondary: "#d8fbff" },
  guard: { primary: "#63efc5", secondary: "#9fffe6" },
  storm: { primary: "#53dfff", secondary: "#6b7dff" },
  flame: { primary: "#ff7b56", secondary: "#ffd069" },
  precision: { primary: "#d287ff", secondary: "#ff8be8" },
  fortune: { primary: "#ffd95b", secondary: "#fff2a1" },
  void: { primary: "#ff557f", secondary: "#9e67ff" },
  celestial: { primary: "#a9d6ff", secondary: "#ffe69a" },
};
