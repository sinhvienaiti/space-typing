import {
  addEquipmentAffix,
  enhanceInstance,
  evolveEquipmentInstance,
  isEquipmentEquipped,
  removeEquipmentInstance,
  rerollEquipmentAffix,
  type EquipmentInstance,
  type EquipmentState,
} from "../equipment/loadout";
import type { GradeId } from "../grades";
import type { CoreStatKey } from "../stats/core";
import type { UpgradeableSkillId } from "../skills/progression";
import {
  attributeUpgradeCost,
  sanitizeUpgradeState,
  skillUpgradeCost,
  upgradeAttributeLevel,
  upgradeSkillLevel,
  type UpgradeCost,
  type UpgradeState,
} from "../progression/upgrades";
import {
  maxAffixesForGrade,
} from "../equipment/affixes";
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
  upgrades: UpgradeState;
};

export type ServiceShopResult = {
  state: ServiceShopState;
  applied: boolean;
  reason:
    | "credits"
    | "alloy"
    | "star-crystal"
    | "quantum-core"
    | "stage"
    | "full"
    | "max"
    | "missing"
    | "equipped"
    | "grade"
    | "affix"
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


function normalizedState(
  current: ServiceShopState,
): ServiceShopState {
  return {
    credits: sanitizeCredits(current.credits),
    expansionCurrencies:
      sanitizeExpansionCurrencyState(
        current.expansionCurrencies,
      ),
    inventory: current.inventory,
    equipment: current.equipment,
    upgrades: sanitizeUpgradeState(current.upgrades),
  };
}

function canPayUpgradeCost(
  state: ServiceShopState,
  cost: UpgradeCost,
  highestUnlockedStage: number,
): ServiceShopResult["reason"] {
  if (highestUnlockedStage < cost.requiredStage) return "stage";
  if (state.expansionCurrencies.alloy < cost.alloy) return "alloy";
  if (
    state.expansionCurrencies.starCrystal <
    cost.starCrystal
  ) {
    return "star-crystal";
  }
  if (
    state.expansionCurrencies.quantumCore <
    cost.quantumCore
  ) {
    return "quantum-core";
  }
  if (state.credits < cost.credits) return "credits";
  return null;
}

function payUpgradeCost(
  current: ServiceShopState,
  cost: UpgradeCost,
): ServiceShopState {
  const payment = spendCredits(
    current.credits,
    cost.credits,
  );
  return {
    ...current,
    credits: payment.credits,
    expansionCurrencies: {
      alloy:
        current.expansionCurrencies.alloy - cost.alloy,
      starCrystal:
        current.expansionCurrencies.starCrystal -
        cost.starCrystal,
      quantumCore:
        current.expansionCurrencies.quantumCore -
        cost.quantumCore,
    },
  };
}

const DISMANTLE_ALLOY: Record<GradeId, number> = {
  aluminum: 1,
  copper: 2,
  silver: 5,
  gold: 9,
  diamond: 16,
};

export function equipmentEvolutionCost(
  item: EquipmentInstance,
): UpgradeCost | null {
  if (item.enhancement < 5) return null;

  if (item.grade === "silver") {
    return {
      credits: 850,
      alloy: 16,
      starCrystal: 3,
      quantumCore: 0,
      requiredStage: 301,
    };
  }

  if (item.grade === "gold") {
    return {
      credits: 1800,
      alloy: 28,
      starCrystal: 7,
      quantumCore: 1,
      requiredStage: 601,
    };
  }

  return null;
}

export function equipmentAffixRollCost(
  item: EquipmentInstance,
  reroll = false,
): UpgradeCost | null {
  if (maxAffixesForGrade(item.grade) <= 0) return null;

  const gradeFactor =
    item.grade === "silver"
      ? 1
      : item.grade === "gold"
        ? 1.6
        : 2.4;

  return {
    credits: Math.round(
      (reroll ? 360 : 260) * gradeFactor,
    ),
    alloy: Math.round(
      (reroll ? 6 : 4) * gradeFactor,
    ),
    starCrystal:
      item.grade === "diamond"
        ? reroll
          ? 3
          : 2
        : item.grade === "gold"
          ? 1
          : 0,
    quantumCore: 0,
    requiredStage:
      item.grade === "silver"
        ? 201
        : item.grade === "gold"
          ? 401
          : 701,
  };
}

export function dismantleReward(
  item: EquipmentInstance,
): ExpansionCurrencyState {
  return {
    alloy:
      DISMANTLE_ALLOY[item.grade] +
      Math.floor(item.enhancement / 2),
    starCrystal:
      item.grade === "diamond"
        ? 2
        : item.grade === "gold"
          ? 1
          : 0,
    quantumCore: 0,
  };
}


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
  currentInput: ServiceShopState,
  instanceId: string,
): ServiceShopResult {
  const current = normalizedState(currentInput);
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
      upgrades: current.upgrades,
    },
    applied: true,
    reason: null,
  };
}

export function buySkillUpgrade(
  currentInput: ServiceShopState,
  id: UpgradeableSkillId,
  highestUnlockedStage: number,
): ServiceShopResult {
  const current = normalizedState(currentInput);
  const cost = skillUpgradeCost(
    current.upgrades.skillLevels[id],
  );
  if (cost === null) {
    return { state: current, applied: false, reason: "max" };
  }

  const blocked = canPayUpgradeCost(
    current,
    cost,
    highestUnlockedStage,
  );
  if (blocked !== null) {
    return { state: current, applied: false, reason: blocked };
  }

  const upgraded = upgradeSkillLevel(
    current.upgrades,
    id,
  );
  if (!upgraded.changed) {
    return { state: current, applied: false, reason: "max" };
  }

  const paid = payUpgradeCost(current, cost);
  return {
    state: {
      ...paid,
      upgrades: upgraded.state,
    },
    applied: true,
    reason: null,
  };
}

export function buyAttributeUpgrade(
  currentInput: ServiceShopState,
  key: CoreStatKey,
  highestUnlockedStage: number,
): ServiceShopResult {
  const current = normalizedState(currentInput);
  const cost = attributeUpgradeCost(
    key,
    current.upgrades.attributeLevels[key],
  );
  if (cost === null) {
    return { state: current, applied: false, reason: "max" };
  }

  const blocked = canPayUpgradeCost(
    current,
    cost,
    highestUnlockedStage,
  );
  if (blocked !== null) {
    return { state: current, applied: false, reason: blocked };
  }

  const upgraded = upgradeAttributeLevel(
    current.upgrades,
    key,
  );
  if (!upgraded.changed) {
    return { state: current, applied: false, reason: "max" };
  }

  const paid = payUpgradeCost(current, cost);
  return {
    state: {
      ...paid,
      upgrades: upgraded.state,
    },
    applied: true,
    reason: null,
  };
}

export function buyEquipmentEvolution(
  currentInput: ServiceShopState,
  instanceId: string,
  highestUnlockedStage: number,
): ServiceShopResult {
  const current = normalizedState(currentInput);
  const item = current.equipment.items.find(
    (candidate) => candidate.instanceId === instanceId,
  );
  if (item === undefined) {
    return { state: current, applied: false, reason: "missing" };
  }

  const cost = equipmentEvolutionCost(item);
  if (cost === null) {
    return { state: current, applied: false, reason: "grade" };
  }

  const blocked = canPayUpgradeCost(
    current,
    cost,
    highestUnlockedStage,
  );
  if (blocked !== null) {
    return { state: current, applied: false, reason: blocked };
  }

  const evolved = evolveEquipmentInstance(
    current.equipment,
    instanceId,
  );
  if (!evolved.changed) {
    return { state: current, applied: false, reason: "grade" };
  }

  const paid = payUpgradeCost(current, cost);
  return {
    state: {
      ...paid,
      equipment: evolved.state,
    },
    applied: true,
    reason: null,
  };
}

export function buyEquipmentAffix(
  currentInput: ServiceShopState,
  instanceId: string,
  highestUnlockedStage: number,
  random: () => number = Math.random,
): ServiceShopResult {
  const current = normalizedState(currentInput);
  const item = current.equipment.items.find(
    (candidate) => candidate.instanceId === instanceId,
  );
  if (item === undefined) {
    return { state: current, applied: false, reason: "missing" };
  }

  const cost = equipmentAffixRollCost(item, false);
  if (cost === null) {
    return { state: current, applied: false, reason: "grade" };
  }
  if (
    (item.affixes ?? []).length >=
    maxAffixesForGrade(item.grade)
  ) {
    return { state: current, applied: false, reason: "affix" };
  }

  const blocked = canPayUpgradeCost(
    current,
    cost,
    highestUnlockedStage,
  );
  if (blocked !== null) {
    return { state: current, applied: false, reason: blocked };
  }

  const rolled = addEquipmentAffix(
    current.equipment,
    instanceId,
    random,
  );
  if (!rolled.changed) {
    return { state: current, applied: false, reason: "affix" };
  }

  const paid = payUpgradeCost(current, cost);
  return {
    state: {
      ...paid,
      equipment: rolled.state,
    },
    applied: true,
    reason: null,
  };
}

export function buyEquipmentAffixReroll(
  currentInput: ServiceShopState,
  instanceId: string,
  affixIndex: number,
  highestUnlockedStage: number,
  random: () => number = Math.random,
): ServiceShopResult {
  const current = normalizedState(currentInput);
  const item = current.equipment.items.find(
    (candidate) => candidate.instanceId === instanceId,
  );
  if (item === undefined) {
    return { state: current, applied: false, reason: "missing" };
  }

  const cost = equipmentAffixRollCost(item, true);
  if (
    cost === null ||
    affixIndex < 0 ||
    affixIndex >= (item.affixes ?? []).length
  ) {
    return { state: current, applied: false, reason: "affix" };
  }

  const blocked = canPayUpgradeCost(
    current,
    cost,
    highestUnlockedStage,
  );
  if (blocked !== null) {
    return { state: current, applied: false, reason: blocked };
  }

  const rolled = rerollEquipmentAffix(
    current.equipment,
    instanceId,
    affixIndex,
    random,
  );
  if (!rolled.changed) {
    return { state: current, applied: false, reason: "affix" };
  }

  const paid = payUpgradeCost(current, cost);
  return {
    state: {
      ...paid,
      equipment: rolled.state,
    },
    applied: true,
    reason: null,
  };
}

export function dismantleEquipment(
  currentInput: ServiceShopState,
  instanceId: string,
): ServiceShopResult {
  const current = normalizedState(currentInput);
  const item = current.equipment.items.find(
    (candidate) => candidate.instanceId === instanceId,
  );
  if (item === undefined) {
    return { state: current, applied: false, reason: "missing" };
  }
  if (isEquipmentEquipped(current.equipment, instanceId)) {
    return { state: current, applied: false, reason: "equipped" };
  }

  const removed = removeEquipmentInstance(
    current.equipment,
    instanceId,
  );
  if (!removed.changed) {
    return { state: current, applied: false, reason: "missing" };
  }

  const reward = dismantleReward(item);
  return {
    state: {
      ...current,
      equipment: removed.state,
      expansionCurrencies: {
        alloy:
          current.expansionCurrencies.alloy +
          reward.alloy,
        starCrystal:
          current.expansionCurrencies.starCrystal +
          reward.starCrystal,
        quantumCore:
          current.expansionCurrencies.quantumCore +
          reward.quantumCore,
      },
    },
    applied: true,
    reason: null,
  };
}

export function buyRepairPack(
  currentInput: ServiceShopState,
): ServiceShopResult {
  const current = normalizedState(currentInput);
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
      upgrades: current.upgrades,
    },
    applied: true,
    reason: null,
  };
}
