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
  description: string;
  grade?: GradeId;
};

export const ITEM_REGISTRY: Record<ItemId, ItemDefinition> = {
  "repair-kit": {
    id: "repair-kit",
    name: "Repair Kit",
    category: "consumable",
    maxStack: 20,
    combatUsable: true,
    description: "Repairs Hull during a stage.",
    grade: "aluminum",
  },
  "shield-cell": {
    id: "shield-cell",
    name: "Shield Cell",
    category: "consumable",
    maxStack: 20,
    combatUsable: true,
    description: "Restores Shield during a stage.",
    grade: "aluminum",
  },
  "energy-cell": {
    id: "energy-cell",
    name: "Energy Cell",
    category: "consumable",
    maxStack: 20,
    combatUsable: true,
    description: "Restores Energy during a stage.",
    grade: "aluminum",
  },
  "nova-bomb": {
    id: "nova-bomb",
    name: "Nova Bomb",
    category: "consumable",
    maxStack: 10,
    combatUsable: true,
    description: "High-impact emergency combat consumable.",
    grade: "copper",
  },
  "emp-charge": {
    id: "emp-charge",
    name: "EMP Charge",
    category: "consumable",
    maxStack: 10,
    combatUsable: true,
    description: "Disrupts hostile projectile pressure.",
    grade: "copper",
  },
  "time-crystal": {
    id: "time-crystal",
    name: "Time Crystal",
    category: "special",
    maxStack: 10,
    combatUsable: true,
    description: "Creates a short tactical time-control window.",
    grade: "silver",
  },
  "word-bomb": {
    id: "word-bomb",
    name: "Word Bomb",
    category: "consumable",
    maxStack: 10,
    combatUsable: true,
    description: "Typing-focused offensive consumable.",
    grade: "copper",
  },
  "supply-beacon": {
    id: "supply-beacon",
    name: "Supply Beacon",
    category: "supply",
    maxStack: 10,
    combatUsable: true,
    description: "Requests an extra supply opportunity.",
    grade: "copper",
  },
  "lucky-dice": {
    id: "lucky-dice",
    name: "Lucky Dice",
    category: "special",
    maxStack: 10,
    combatUsable: true,
    description: "Influences a future luck-based reward roll.",
    grade: "silver",
  },
  "salvage-anchor": {
    id: "salvage-anchor",
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
