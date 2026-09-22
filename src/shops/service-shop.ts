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
import {
  sanitizeExpansionCurrencyState,
  type ExpansionCurrencyState,
} from "../economy/currencies";

export type ServiceShopState = {
  credits: number;
  expansionCurrencies: ExpansionCurrencyState;
  inventory: Inventory;
  equipment: EquipmentState;
};

export type ServiceShopResult = {
  state: ServiceShopState;
  applied: boolean;
  reason:
    | "credits"
    | "alloy"
    | "full"
    | "max"
    | "missing"
    | null;
};

const GRADE_COST_MULTIPLIER: Record<GradeId, number> = {
  aluminum: 1,
  copper: 1.25,
  silver: 1.6,
  gold: 2.1,
  diamond: 2.8,
};

const GRADE_ALLOY_COST: Record<GradeId, number> = {
  aluminum: 1,
  copper: 2,
  silver: 4,
  gold: 7,
  diamond: 12,
};

export const REPAIR_PACK_COST = 64;
export const REPAIR_PACK_ALLOY_COST = 1;

export function equipmentUpgradeCost(
  item: EquipmentInstance,
): number | null {
  if (item.enhancement >= 5) return null;
  const base = 70 + item.enhancement * 55;
  return Math.floor(base * GRADE_COST_MULTIPLIER[item.grade]);
}

export function equipmentUpgradeAlloyCost(
  item: EquipmentInstance,
): number | null {
  if (item.enhancement >= 5) return null;
  return GRADE_ALLOY_COST[item.grade] + item.enhancement;
}

export function buyEquipmentUpgrade(
  current: ServiceShopState,
  instanceId: string,
): ServiceShopResult {
  const credits = sanitizeCredits(current.credits);
  const expansionCurrencies = sanitizeExpansionCurrencyState(
    current.expansionCurrencies,
  );
  const item = current.equipment.items.find(
    (candidate) => candidate.instanceId === instanceId,
  );

  if (item === undefined) {
    return {
      state: { ...current, credits, expansionCurrencies },
      applied: false,
      reason: "missing",
    };
  }

  const cost = equipmentUpgradeCost(item);
  const alloyCost = equipmentUpgradeAlloyCost(item);
  if (cost === null || alloyCost === null) {
    return {
      state: { ...current, credits, expansionCurrencies },
      applied: false,
      reason: "max",
    };
  }

  if (expansionCurrencies.alloy < alloyCost) {
    return {
      state: { ...current, credits, expansionCurrencies },
      applied: false,
      reason: "alloy",
    };
  }

  const payment = spendCredits(credits, cost);
  if (!payment.spent) {
    return {
      state: { ...current, credits, expansionCurrencies },
      applied: false,
      reason: "credits",
    };
  }

  const upgrade = enhanceInstance(current.equipment, instanceId);
  if (!upgrade.changed) {
    return {
      state: { ...current, credits, expansionCurrencies },
      applied: false,
      reason: "max",
    };
  }

  return {
    state: {
      credits: payment.credits,
      expansionCurrencies: {
        ...expansionCurrencies,
        alloy: expansionCurrencies.alloy - alloyCost,
      },
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
  const expansionCurrencies = sanitizeExpansionCurrencyState(
    current.expansionCurrencies,
  );
  const repairMax = getItemDefinition("repair-kit").maxStack;
  const shieldMax = getItemDefinition("shield-cell").maxStack;

  if (
    itemCount(current.inventory, "repair-kit") >= repairMax ||
    itemCount(current.inventory, "shield-cell") >= shieldMax
  ) {
    return {
      state: { ...current, credits, expansionCurrencies },
      applied: false,
      reason: "full",
    };
  }

  if (expansionCurrencies.alloy < REPAIR_PACK_ALLOY_COST) {
    return {
      state: { ...current, credits, expansionCurrencies },
      applied: false,
      reason: "alloy",
    };
  }

  const payment = spendCredits(credits, REPAIR_PACK_COST);
  if (!payment.spent) {
    return {
      state: { ...current, credits, expansionCurrencies },
      applied: false,
      reason: "credits",
    };
  }

  const repaired = addItem(current.inventory, "repair-kit", 1);
  const shielded = addItem(repaired.inventory, "shield-cell", 1);

  return {
    state: {
      credits: payment.credits,
      expansionCurrencies: {
        ...expansionCurrencies,
        alloy: expansionCurrencies.alloy - REPAIR_PACK_ALLOY_COST,
      },
      inventory: shielded.inventory,
      equipment: current.equipment,
    },
    applied: true,
    reason: null,
  };
}
