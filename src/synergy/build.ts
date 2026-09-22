import type { CharacterId } from "../characters/registry";
import {
  getEquipmentDefinition,
  type EquipmentId,
} from "../equipment/registry";
import type { EquipmentState } from "../equipment/loadout";
import type { StatBonus } from "../stats/core";
import type { SupportSpellId } from "../skills/support";
import type { SupportSpellState } from "../skills/support-loadout";

export const BUILD_SYNERGY_IDS = [
  "arc-circuit",
  "oracle-lens",
  "sanctuary-matrix",
] as const;

export type BuildSynergyId = (typeof BUILD_SYNERGY_IDS)[number];

export type BuildSynergyDefinition = {
  id: BuildSynergyId;
  name: string;
  description: string;
  character: CharacterId;
  equipment: EquipmentId;
  supportSpell?: SupportSpellId;
  triggerSkill: string;
  stats: StatBonus;
};

export const BUILD_SYNERGIES: Record<
  BuildSynergyId,
  BuildSynergyDefinition
> = {
  "arc-circuit": {
    id: "arc-circuit",
    name: "Arc Circuit",
    description:
      "Volt and Compact Reactor route more Energy through Chain Lightning.",
    character: "volt",
    equipment: "compact-reactor-mk1",
    triggerSkill: "chain-lightning",
    stats: { firepower: 3, reactor: 3 },
  },
  "oracle-lens": {
    id: "oracle-lens",
    name: "Oracle Lens",
    description:
      "Oracle and Targeting Module extend Mark of Weakness precision windows.",
    character: "oracle",
    equipment: "targeting-module-mk1",
    triggerSkill: "mark-of-weakness",
    stats: { firepower: 2, focus: 5 },
  },
  "sanctuary-matrix": {
    id: "sanctuary-matrix",
    name: "Sanctuary Matrix",
    description:
      "Bastion, Deflector Shield and Sanctuary reinforce the defensive field.",
    character: "bastion",
    equipment: "deflector-shield-mk1",
    supportSpell: "sanctuary",
    triggerSkill: "sanctuary",
    stats: { shield: 10, ward: 4 },
  },
};

export type BuildSynergyInput = {
  character: CharacterId;
  equipment: EquipmentState;
  supportSpells: SupportSpellState;
};

function equippedDefinitionIds(
  equipment: EquipmentState,
): Set<EquipmentId> {
  const ids = new Set<EquipmentId>();

  for (const instanceId of Object.values(equipment.loadout)) {
    if (instanceId === null) continue;
    const instance = equipment.items.find(
      (item) => item.instanceId === instanceId,
    );
    if (instance !== undefined) ids.add(instance.definitionId);
  }

  return ids;
}

export function resolveBuildSynergies(
  input: BuildSynergyInput,
): BuildSynergyId[] {
  const equipped = equippedDefinitionIds(input.equipment);

  return BUILD_SYNERGY_IDS.filter((id) => {
    const synergy = BUILD_SYNERGIES[id];
    if (synergy.character !== input.character) return false;
    if (!equipped.has(synergy.equipment)) return false;
    if (
      synergy.supportSpell !== undefined &&
      !input.supportSpells.loadout.includes(synergy.supportSpell)
    ) {
      return false;
    }
    return true;
  });
}

export function buildSynergyStatBonus(
  ids: readonly BuildSynergyId[],
): StatBonus {
  const result: StatBonus = {};

  for (const id of ids) {
    for (const [key, value] of Object.entries(
      BUILD_SYNERGIES[id].stats,
    )) {
      if (typeof value !== "number") continue;
      const stat = key as keyof StatBonus;
      result[stat] = (result[stat] ?? 0) + value;
    }
  }

  return result;
}

export function buildSynergySummary(
  ids: readonly BuildSynergyId[],
): string {
  if (ids.length === 0) return "none";
  return ids.map((id) => BUILD_SYNERGIES[id].name).join(" · ");
}
