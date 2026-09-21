import type { StatBonus } from "../stats/core";

export const EQUIPMENT_SLOTS = [
  "weapon",
  "armor",
  "shield",
  "reactor",
  "utility",
  "drone",
  "core",
] as const;

export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];

export const EQUIPMENT_IDS = [
  "pulse-laser-mk1",
  "precision-laser-mk1",
  "plated-armor-mk1",
  "deflector-shield-mk1",
  "compact-reactor-mk1",
  "targeting-module-mk1",
  "support-drone-mk1",
  "balanced-core-mk1",
] as const;

export type EquipmentId = (typeof EQUIPMENT_IDS)[number];

export type EquipmentDefinition = {
  id: EquipmentId;
  name: string;
  slot: EquipmentSlot;
  description: string;
  stats: StatBonus;
};

export const EQUIPMENT_REGISTRY: Record<
  EquipmentId,
  EquipmentDefinition
> = {
  "pulse-laser-mk1": {
    id: "pulse-laser-mk1",
    name: "Pulse Laser Mk.I",
    slot: "weapon",
    description: "Balanced starter weapon with steady typing damage.",
    stats: { firepower: 8, focus: 2 },
  },
  "precision-laser-mk1": {
    id: "precision-laser-mk1",
    name: "Precision Laser Mk.I",
    slot: "weapon",
    description: "Lower raw damage, stronger precision and Power gain.",
    stats: { firepower: 4, focus: 7 },
  },
  "plated-armor-mk1": {
    id: "plated-armor-mk1",
    name: "Plated Armor Mk.I",
    slot: "armor",
    description: "Starter Hull plating for sustained pressure.",
    stats: { hull: 18, armor: 8 },
  },
  "deflector-shield-mk1": {
    id: "deflector-shield-mk1",
    name: "Deflector Shield Mk.I",
    slot: "shield",
    description: "Renewable protection with light status resistance.",
    stats: { shield: 18, ward: 3 },
  },
  "compact-reactor-mk1": {
    id: "compact-reactor-mk1",
    name: "Compact Reactor Mk.I",
    slot: "reactor",
    description: "Raises Energy capacity and passive regeneration.",
    stats: { energy: 20, reactor: 4 },
  },
  "targeting-module-mk1": {
    id: "targeting-module-mk1",
    name: "Targeting Module Mk.I",
    slot: "utility",
    description: "Improves precision-oriented combat output.",
    stats: { firepower: 2, focus: 5 },
  },
  "support-drone-mk1": {
    id: "support-drone-mk1",
    name: "Support Drone Mk.I",
    slot: "drone",
    description: "Small recovery and salvage support package.",
    stats: { reactor: 2, salvage: 4 },
  },
  "balanced-core-mk1": {
    id: "balanced-core-mk1",
    name: "Balanced Core Mk.I",
    slot: "core",
    description: "General-purpose core with Luck and defensive Ward.",
    stats: { luck: 4, ward: 3 },
  },
};

export function isEquipmentId(value: string): value is EquipmentId {
  return Object.hasOwn(EQUIPMENT_REGISTRY, value);
}

export function getEquipmentDefinition(
  id: EquipmentId,
): EquipmentDefinition {
  return EQUIPMENT_REGISTRY[id];
}
