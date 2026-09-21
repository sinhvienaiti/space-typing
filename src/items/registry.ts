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
  description: string;
};

export const ITEM_REGISTRY: Record<ItemId, ItemDefinition> = {
  "repair-kit": {
    id: "repair-kit",
    name: "Repair Kit",
    category: "consumable",
    maxStack: 20,
    combatUsable: true,
    description: "Repairs Hull during a stage.",
  },
  "shield-cell": {
    id: "shield-cell",
    name: "Shield Cell",
    category: "consumable",
    maxStack: 20,
    combatUsable: true,
    description: "Restores Shield during a stage.",
  },
  "energy-cell": {
    id: "energy-cell",
    name: "Energy Cell",
    category: "consumable",
    maxStack: 20,
    combatUsable: true,
    description: "Restores Energy during a stage.",
  },
  "nova-bomb": {
    id: "nova-bomb",
    name: "Nova Bomb",
    category: "consumable",
    maxStack: 10,
    combatUsable: true,
    description: "High-impact emergency combat consumable.",
  },
  "emp-charge": {
    id: "emp-charge",
    name: "EMP Charge",
    category: "consumable",
    maxStack: 10,
    combatUsable: true,
    description: "Disrupts hostile projectile pressure.",
  },
  "time-crystal": {
    id: "time-crystal",
    name: "Time Crystal",
    category: "special",
    maxStack: 10,
    combatUsable: true,
    description: "Creates a short tactical time-control window.",
  },
  "word-bomb": {
    id: "word-bomb",
    name: "Word Bomb",
    category: "consumable",
    maxStack: 10,
    combatUsable: true,
    description: "Typing-focused offensive consumable.",
  },
  "supply-beacon": {
    id: "supply-beacon",
    name: "Supply Beacon",
    category: "supply",
    maxStack: 10,
    combatUsable: true,
    description: "Requests an extra supply opportunity.",
  },
  "lucky-dice": {
    id: "lucky-dice",
    name: "Lucky Dice",
    category: "special",
    maxStack: 10,
    combatUsable: true,
    description: "Influences a future luck-based reward roll.",
  },
};

export function isItemId(value: string): value is ItemId {
  return Object.hasOwn(ITEM_REGISTRY, value);
}

export function getItemDefinition(id: ItemId): ItemDefinition {
  return ITEM_REGISTRY[id];
}
