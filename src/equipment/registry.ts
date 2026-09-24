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
  "ion-cannon-mk1",
  "plated-armor-mk1",
  "adaptive-armor-mk1",
  "kinetic-shell-mk1",
  "deflector-shield-mk1",
  "prism-shield-mk1",
  "capacitor-shield-mk1",
  "compact-reactor-mk1",
  "overclock-reactor-mk1",
  "fusion-reactor-mk1",
  "targeting-module-mk1",
  "salvage-module-mk1",
  "fortune-module-mk1",
  "support-drone-mk1",
  "assault-drone-mk1",
  "ward-drone-mk1",
  "overdrive-core-mk1",
  "salvage-core-mk1",
  "balanced-core-mk1",
] as const;

export type EquipmentId = (typeof EQUIPMENT_IDS)[number];

export type EquipmentDefinition = {
  id: EquipmentId;
  name: string;
  slot: EquipmentSlot;
  icon: string;
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
    icon: "⌁",
    description: "Balanced starter weapon with steady typing damage.",
    stats: { firepower: 8, focus: 2 },
  },
  "precision-laser-mk1": {
    id: "precision-laser-mk1",
    name: "Precision Laser Mk.I",
    slot: "weapon",
    icon: "⌖",
    description: "Lower raw damage, stronger precision and Power gain.",
    stats: { firepower: 4, focus: 7 },
  },
  "ion-cannon-mk1": {
    id: "ion-cannon-mk1",
    name: "Ion Cannon Mk.I",
    slot: "weapon",
    icon: "ϟ",
    description: "Heavy typing weapon tuned for raw Firepower with light Reactor support.",
    stats: { firepower: 11, reactor: 1 },
  },
  "plated-armor-mk1": {
    id: "plated-armor-mk1",
    name: "Plated Armor Mk.I",
    slot: "armor",
    icon: "▣",
    description: "Starter Hull plating for sustained pressure.",
    stats: { hull: 18, armor: 8 },
  },
  "adaptive-armor-mk1": {
    id: "adaptive-armor-mk1",
    name: "Adaptive Armor Mk.I",
    slot: "armor",
    icon: "⬒",
    description: "Balanced Hull, Armor and Ward package for mixed threats.",
    stats: { hull: 12, armor: 5, ward: 4 },
  },
  "kinetic-shell-mk1": {
    id: "kinetic-shell-mk1",
    name: "Kinetic Shell Mk.I",
    slot: "armor",
    icon: "⬛",
    description: "Large Hull reserve with lighter mitigation.",
    stats: { hull: 24, armor: 4 },
  },
  "deflector-shield-mk1": {
    id: "deflector-shield-mk1",
    name: "Deflector Shield Mk.I",
    slot: "shield",
    icon: "◈",
    description: "Renewable protection with light status resistance.",
    stats: { shield: 18, ward: 3 },
  },
  "prism-shield-mk1": {
    id: "prism-shield-mk1",
    name: "Prism Shield Mk.I",
    slot: "shield",
    icon: "◇",
    description: "Precision-focused Shield with extra Ward and Focus.",
    stats: { shield: 12, ward: 4, focus: 4 },
  },
  "capacitor-shield-mk1": {
    id: "capacitor-shield-mk1",
    name: "Capacitor Shield Mk.I",
    slot: "shield",
    icon: "⬡",
    description: "Large Shield bank with a small Reactor boost.",
    stats: { shield: 24, reactor: 2 },
  },
  "compact-reactor-mk1": {
    id: "compact-reactor-mk1",
    name: "Compact Reactor Mk.I",
    slot: "reactor",
    icon: "⚡",
    description: "Raises Energy capacity and passive regeneration.",
    stats: { energy: 20, reactor: 4 },
  },
  "overclock-reactor-mk1": {
    id: "overclock-reactor-mk1",
    name: "Overclock Reactor Mk.I",
    slot: "reactor",
    icon: "↯",
    description: "Faster Reactor output for skill-heavy builds.",
    stats: { energy: 16, reactor: 7 },
  },
  "fusion-reactor-mk1": {
    id: "fusion-reactor-mk1",
    name: "Fusion Reactor Mk.I",
    slot: "reactor",
    icon: "◎",
    description: "Large Energy reserve with modest regeneration.",
    stats: { energy: 28, reactor: 2 },
  },
  "targeting-module-mk1": {
    id: "targeting-module-mk1",
    name: "Targeting Module Mk.I",
    slot: "utility",
    icon: "⊙",
    description: "Improves precision-oriented combat output.",
    stats: { firepower: 2, focus: 5 },
  },
  "salvage-module-mk1": {
    id: "salvage-module-mk1",
    name: "Salvage Module Mk.I",
    slot: "utility",
    icon: "⛭",
    description: "Raises Salvage efficiency with a small Luck bonus.",
    stats: { salvage: 7, luck: 2 },
  },
  "fortune-module-mk1": {
    id: "fortune-module-mk1",
    name: "Fortune Module Mk.I",
    slot: "utility",
    icon: "✧",
    description: "Luck-focused utility package with extra Focus.",
    stats: { luck: 7, focus: 2 },
  },
  "support-drone-mk1": {
    id: "support-drone-mk1",
    name: "Support Drone Mk.I",
    slot: "drone",
    icon: "◌",
    description: "Small recovery and salvage support package.",
    stats: { reactor: 2, salvage: 4 },
  },
  "assault-drone-mk1": {
    id: "assault-drone-mk1",
    name: "Assault Drone Mk.I",
    slot: "drone",
    icon: "◒",
    description: "Offensive drone that supports Firepower and Focus.",
    stats: { firepower: 5, focus: 3 },
  },
  "ward-drone-mk1": {
    id: "ward-drone-mk1",
    name: "Ward Drone Mk.I",
    slot: "drone",
    icon: "◐",
    description: "Defensive drone that improves Ward and Reactor.",
    stats: { ward: 5, reactor: 3 },
  },
  "overdrive-core-mk1": {
    id: "overdrive-core-mk1",
    name: "Overdrive Core Mk.I",
    slot: "core",
    icon: "✹",
    description: "Power-oriented core with Focus and Energy capacity.",
    stats: { focus: 6, energy: 8 },
  },
  "salvage-core-mk1": {
    id: "salvage-core-mk1",
    name: "Salvage Core Mk.I",
    slot: "core",
    icon: "⬢",
    description: "Reward-oriented core combining Salvage and Luck.",
    stats: { salvage: 5, luck: 5 },
  },
  "balanced-core-mk1": {
    id: "balanced-core-mk1",
    name: "Balanced Core Mk.I",
    slot: "core",
    icon: "◉",
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
