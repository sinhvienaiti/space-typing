import { activeEquipmentRuntimeOverride } from "../admin/equipment-runtime-policy";
import {
  EQUIPMENT_IDS,
  EQUIPMENT_REGISTRY,
  type EquipmentDefinition,
} from "./registry-core";
import type { EquipmentPerkId } from "./perks";

for (const id of EQUIPMENT_IDS) {
  const override = activeEquipmentRuntimeOverride(id);
  if (override === undefined) continue;

  const base = EQUIPMENT_REGISTRY[id];
  const merged: EquipmentDefinition = {
    ...base,
    ...override,
    id,
    slot: base.slot,
    tier: base.tier,
    icon: base.icon,
    stats: {
      ...base.stats,
      ...(override.stats ?? {}),
    },
  };

  if (override.perk === null) {
    delete merged.perk;
  } else if (override.perk !== undefined) {
    merged.perk = override.perk as EquipmentPerkId;
  }

  EQUIPMENT_REGISTRY[id] = merged;
}

export * from "./registry-core";
