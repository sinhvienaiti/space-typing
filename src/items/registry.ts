import type { GradeId } from "../grades";

export const UNBOUNDED_ITEM_STACK = Number.MAX_SAFE_INTEGER;

export const ITEM_IDS = [
  "repair-kit",
  "shield-cell",
  "energy-cell",
  "nova-bomb",
  "emp-charge",
  "time-crystal",
  "word-bomb",
  "supply-beacon",
  "lucky-dice",
  "salvage-anchor",
  "stage-revival-core",
  "phoenix-core",
] as const;

export type ItemId = (typeof ITEM_IDS)[number];

export type ItemCategory =
  | "consumable"
  | "supply"
  | "special";

export type ItemDefinition = {
  id: ItemId;
  name: string;
  category: ItemCategory;
  maxStack: number;
  combatUsable: boolean;
  icon: string;
  description: string;
  grade?: GradeId;
};

export const ITEM_REGISTRY: Record<ItemId, ItemDefinition> = {
  "repair-kit": {
    id: "repair-kit",
    icon: "✚",
    name: "Repair Kit",
    category: "consumable",
    maxStack: 20,
    combatUsable: true,
    description: "Repairs Hull during a stage.",
    grade: "aluminum",
  },
  "shield-cell": {
    id: "shield-cell",
    icon: "◈",
    name: "Shield Cell",
    category: "consumable",
    maxStack: 20,
    combatUsable: true,
    description: "Restores Shield during a stage.",
    grade: "aluminum",
  },
  "energy-cell": {
    id: "energy-cell",
    icon: "⚡",
    name: "Energy Cell",
    category: "consumable",
    maxStack: 20,
    combatUsable: true,
    description: "Restores Energy during a stage.",
    grade: "aluminum",
  },
  "nova-bomb": {
    id: "nova-bomb",
    icon: "✹",
    name: "Nova Bomb",
    category: "consumable",
    maxStack: 10,
    combatUsable: true,
    description: "Clears current hostile bullets and detonates a Nova pulse against active enemies and the boss.",
    grade: "copper",
  },
  "emp-charge": {
    id: "emp-charge",
    icon: "⌁",
    name: "EMP Charge",
    category: "consumable",
    maxStack: 10,
    combatUsable: true,
    description: "Clears hostile bullets and delays enemy and boss attack timers.",
    grade: "copper",
  },
  "time-crystal": {
    id: "time-crystal",
    icon: "◷",
    name: "Time Crystal",
    category: "special",
    maxStack: 10,
    combatUsable: true,
    description: "Slows hostile simulation for a 5-second tactical window.",
    grade: "silver",
  },
  "word-bomb": {
    id: "word-bomb",
    icon: "Aa",
    name: "Word Bomb",
    category: "consumable",
    maxStack: 10,
    combatUsable: true,
    description: "Destroys one active enemy without counting its word as typed or learned.",
    grade: "copper",
  },
  "supply-beacon": {
    id: "supply-beacon",
    icon: "⇧",
    name: "Supply Beacon",
    category: "supply",
    maxStack: 10,
    combatUsable: true,
    description: "Immediately calls one Supply Pod when the battlefield allows it.",
    grade: "copper",
  },
  "lucky-dice": {
    id: "lucky-dice",
    icon: "◇",
    name: "Lucky Dice",
    category: "special",
    maxStack: 10,
    combatUsable: true,
    description: "Raises pity for future Golden, Treasure, Choice and Anomaly reward rolls.",
    grade: "silver",
  },
  "salvage-anchor": {
    id: "salvage-anchor",
    icon: "⚓",
    name: "Salvage Anchor",
    category: "special",
    maxStack: UNBOUNDED_ITEM_STACK,
    combatUsable: false,
    description:
      "Death-protection contract: preserve segment gains while returning to the checkpoint.",
    grade: "silver",
  },
  "stage-revival-core": {
    id: "stage-revival-core",
    icon: "↻",
    name: "Stage Revival Core",
    category: "special",
    maxStack: UNBOUNDED_ITEM_STACK,
    combatUsable: false,
    description:
      "Death-protection contract: restart the failed stage while preserving segment gains.",
    grade: "gold",
  },
  "phoenix-core": {
    id: "phoenix-core",
    icon: "♨",
    name: "Phoenix Core",
    category: "special",
    maxStack: UNBOUNDED_ITEM_STACK,
    combatUsable: true,
    description:
      "Death-protection contract: revive inside the current encounter.",
    grade: "diamond",
  },
};

export function isItemId(value: string): value is ItemId {
  return Object.hasOwn(ITEM_REGISTRY, value);
}

export function getItemDefinition(id: ItemId): ItemDefinition {
  return ITEM_REGISTRY[id];
}
