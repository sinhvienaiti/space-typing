import {
  enhanceInstance,
  type EquipmentInstance,
  type EquipmentState,
} from "../equipment/loadout";
import type { GradeId } from "../grades";
import {
  addItem,
  itemCount,
  type Inventory,
} from "../items/inventory";
import { getItemDefinition } from "../items/registry";
import {
  sanitizeCredits,
  spendCredits,
} from "../economy/credits";

export type ServiceShopState = {
  credits: number;
  inventory: Inventory;
  equipment: EquipmentState;
};

export type ServiceShopResult = {
  state: ServiceShopState;
  applied: boolean;
  reason: "credits" | "full" | "max" | "missing" | null;
};

const GRADE_COST_MULTIPLIER: Record<GradeId, number> = {
  aluminum: 1,
  copper: 1.25,
  silver: 1.6,
  gold: 2.1,
  diamond: 2.8,
};

export const REPAIR_PACK_COST = 64;

export function equipmentUpgradeCost(
  item: EquipmentInstance,
): number | null {
  if (item.enhancement >= 5) return null;
  const base = 70 + item.enhancement * 55;
  return Math.floor(base * GRADE_COST_MULTIPLIER[item.grade]);
}

export function buyEquipmentUpgrade(
  current: ServiceShopState,
  instanceId: string,
): ServiceShopResult {
  const credits = sanitizeCredits(current.credits);
  const item = current.equipment.items.find(
    (candidate) => candidate.instanceId === instanceId,
  );

  if (item === undefined) {
    return {
      state: { ...current, credits },
      applied: false,
      reason: "missing",
    };
  }

  const cost = equipmentUpgradeCost(item);
  if (cost === null) {
    return {
      state: { ...current, credits },
      applied: false,
      reason: "max",
    };
  }

  const payment = spendCredits(credits, cost);
  if (!payment.spent) {
    return {
      state: { ...current, credits },
      applied: false,
      reason: "credits",
    };
  }

  const upgrade = enhanceInstance(current.equipment, instanceId);
  if (!upgrade.changed) {
    return {
      state: { ...current, credits },
      applied: false,
      reason: "max",
    };
  }

  return {
    state: {
      credits: payment.credits,
      inventory: current.inventory,
      equipment: upgrade.state,
    },
    applied: true,
    reason: null,
  };
}

export function buyRepairPack(
  current: ServiceShopState,
): ServiceShopResult {
  const credits = sanitizeCredits(current.credits);
  const repairMax = getItemDefinition("repair-kit").maxStack;
  const shieldMax = getItemDefinition("shield-cell").maxStack;

  if (
    itemCount(current.inventory, "repair-kit") >= repairMax ||
    itemCount(current.inventory, "shield-cell") >= shieldMax
  ) {
    return {
      state: { ...current, credits },
      applied: false,
      reason: "full",
    };
  }

  const payment = spendCredits(credits, REPAIR_PACK_COST);
  if (!payment.spent) {
    return {
      state: { ...current, credits },
      applied: false,
      reason: "credits",
    };
  }

  const repaired = addItem(current.inventory, "repair-kit", 1);
  const shielded = addItem(repaired.inventory, "shield-cell", 1);

  return {
    state: {
      credits: payment.credits,
      inventory: shielded.inventory,
      equipment: current.equipment,
    },
    applied: true,
    reason: null,
  };
}
