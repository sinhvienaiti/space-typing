import { describe, expect, it } from "vitest";
import { SHOP_POLICY_ADMIN_CONTRACT } from "../src/admin/shop-policy-contract";
import { EQUIPMENT_IDS, EQUIPMENT_REGISTRY } from "../src/equipment/registry";
import type { EquipmentInstance } from "../src/equipment/loadout";
import { GRADE_IDS } from "../src/grades";
import { ITEM_IDS } from "../src/items/registry";
import {
  REPAIR_PACK_ALLOY_COST,
  REPAIR_PACK_COST,
  dismantleReward,
  equipmentAffixRollCost,
  equipmentEvolutionCost,
  equipmentUpgradeAlloyCost,
  equipmentUpgradeCost,
} from "../src/shops/service-shop";
import {
  BUNDLED_SHOP_POLICY,
  SHOP_POLICY_TYPES,
  resolveShopAvailability,
  resolveShopEquipmentGrade,
  resolveShopEquipmentPrice,
  resolveShopGenerationRule,
  resolveShopItemPrice,
  resolveShopRareItemChance,
} from "../src/shops/policy";

function equipment(grade: EquipmentInstance["grade"], enhancement = 0): EquipmentInstance {
  return {
    instanceId: `test-${grade}-${enhancement}`,
    definitionId: "pulse-laser-mk1",
    grade,
    enhancement,
    affixes: [],
  };
}

describe("bundled Shop policy parity", () => {
  it("preserves current generation counts, stock and equipment tier admission", () => {
    expect(resolveShopGenerationRule(BUNDLED_SHOP_POLICY, "normal")).toMatchObject({
      itemCount: 3,
      itemStock: 2,
      equipmentCount: 3,
      allowedEquipmentTiers: [1, 2],
    });
    expect(resolveShopGenerationRule(BUNDLED_SHOP_POLICY, "traveling")).toMatchObject({
      itemCount: 3,
      itemStock: 2,
      equipmentCount: 2,
      allowedEquipmentTiers: [1, 2],
    });
    expect(resolveShopGenerationRule(BUNDLED_SHOP_POLICY, "hidden")).toMatchObject({
      itemCount: 2,
      itemStock: 1,
      equipmentCount: 3,
      allowedEquipmentTiers: [1, 2, 3],
    });
    expect(resolveShopGenerationRule(BUNDLED_SHOP_POLICY, "black-market").allowedEquipmentTiers).toEqual([1, 2, 3]);
    expect(resolveShopGenerationRule(BUNDLED_SHOP_POLICY, "event")).toMatchObject({
      itemCount: 4,
      itemStock: 1,
      equipmentCount: 0,
    });
    expect(resolveShopGenerationRule(BUNDLED_SHOP_POLICY, "normal").itemPool).toEqual([
      "repair-kit",
      "shield-cell",
      "energy-cell",
      "nova-bomb",
      "emp-charge",
    ]);
  });

  it("preserves grade-roll thresholds including exact legacy boundaries", () => {
    expect(resolveShopEquipmentGrade(BUNDLED_SHOP_POLICY, "normal", 99, 0.999)).toBe("aluminum");
    expect(resolveShopEquipmentGrade(BUNDLED_SHOP_POLICY, "normal", 100, 0.72)).toBe("aluminum");
    expect(resolveShopEquipmentGrade(BUNDLED_SHOP_POLICY, "normal", 100, 0.720001)).toBe("copper");

    expect(resolveShopEquipmentGrade(BUNDLED_SHOP_POLICY, "station", 250, 0.8)).toBe("copper");
    expect(resolveShopEquipmentGrade(BUNDLED_SHOP_POLICY, "station", 250, 0.800001)).toBe("silver");

    expect(resolveShopEquipmentGrade(BUNDLED_SHOP_POLICY, "traveling", 500, 0.55)).toBe("copper");
    expect(resolveShopEquipmentGrade(BUNDLED_SHOP_POLICY, "traveling", 500, 0.550001)).toBe("silver");
    expect(resolveShopEquipmentGrade(BUNDLED_SHOP_POLICY, "traveling", 500, 0.9)).toBe("silver");
    expect(resolveShopEquipmentGrade(BUNDLED_SHOP_POLICY, "traveling", 500, 0.900001)).toBe("gold");

    expect(resolveShopEquipmentGrade(BUNDLED_SHOP_POLICY, "black-market", 800, 0.7)).toBe("silver");
    expect(resolveShopEquipmentGrade(BUNDLED_SHOP_POLICY, "black-market", 800, 0.700001)).toBe("gold");
    expect(resolveShopEquipmentGrade(BUNDLED_SHOP_POLICY, "black-market", 800, 0.96)).toBe("gold");
    expect(resolveShopEquipmentGrade(BUNDLED_SHOP_POLICY, "black-market", 800, 0.960001)).toBe("diamond");

    expect(resolveShopEquipmentGrade(BUNDLED_SHOP_POLICY, "hidden", 700, 0.6)).toBe("silver");
    expect(resolveShopEquipmentGrade(BUNDLED_SHOP_POLICY, "hidden", 700, 0.600001)).toBe("gold");
    expect(resolveShopEquipmentGrade(BUNDLED_SHOP_POLICY, "hidden", 700, 0.94)).toBe("gold");
    expect(resolveShopEquipmentGrade(BUNDLED_SHOP_POLICY, "hidden", 700, 0.940001)).toBe("diamond");

    expect(resolveShopEquipmentGrade(BUNDLED_SHOP_POLICY, "event", 300, 0.85)).toBe("silver");
    expect(resolveShopEquipmentGrade(BUNDLED_SHOP_POLICY, "event", 300, 0.850001)).toBe("gold");
  });

  it("preserves current item multi-currency prices", () => {
    expect(resolveShopItemPrice(BUNDLED_SHOP_POLICY, "normal", "repair-kit", "aluminum")).toEqual({
      credits: 45,
      alloy: 0,
      starCrystal: 0,
      quantumCore: 0,
    });
    expect(resolveShopItemPrice(BUNDLED_SHOP_POLICY, "station", "nova-bomb", "copper")).toEqual({
      credits: 88,
      alloy: 2,
      starCrystal: 0,
      quantumCore: 0,
    });
    expect(resolveShopItemPrice(BUNDLED_SHOP_POLICY, "hidden", "phoenix-core", "diamond")).toEqual({
      credits: 0,
      alloy: 0,
      starCrystal: 6,
      quantumCore: 1,
    });
    expect(resolveShopItemPrice(BUNDLED_SHOP_POLICY, "black-market", "phoenix-core", "diamond")).toEqual({
      credits: 1275,
      alloy: 0,
      starCrystal: 5,
      quantumCore: 1,
    });
    expect(resolveShopItemPrice(BUNDLED_SHOP_POLICY, "event", "nova-bomb", "copper")).toEqual({
      credits: 0,
      alloy: 0,
      starCrystal: 1,
      quantumCore: 0,
    });
  });

  it("preserves current equipment pricing and tier adjustments", () => {
    expect(resolveShopEquipmentPrice(BUNDLED_SHOP_POLICY, "station", "pulse-laser-mk1", "silver", 1)).toEqual({
      credits: 487,
      alloy: 7,
      starCrystal: 0,
      quantumCore: 0,
    });
    expect(resolveShopEquipmentPrice(BUNDLED_SHOP_POLICY, "black-market", "pulse-laser-mk1", "gold", 1)).toEqual({
      credits: 1125,
      alloy: 0,
      starCrystal: 3,
      quantumCore: 0,
    });
    expect(resolveShopEquipmentPrice(BUNDLED_SHOP_POLICY, "hidden", "pulse-laser-mk1", "diamond", 1)).toEqual({
      credits: 0,
      alloy: 0,
      starCrystal: 7,
      quantumCore: 1,
    });
    expect(resolveShopEquipmentPrice(BUNDLED_SHOP_POLICY, "station", "arc-projector-mk2", "silver", 2)).toEqual({
      credits: 730,
      alloy: 11,
      starCrystal: 0,
      quantumCore: 0,
    });
    expect(resolveShopEquipmentPrice(BUNDLED_SHOP_POLICY, "hidden", "plasma-lance-mk3", "gold", 3)).toEqual({
      credits: 0,
      alloy: 0,
      starCrystal: 5,
      quantumCore: 0,
    });
  });

  it("preserves availability and Phoenix Core chance rules", () => {
    expect(resolveShopAvailability(BUNDLED_SHOP_POLICY, "normal", { luck: 0, roll: 0.99, discovered: [] })).toBe(true);
    expect(resolveShopAvailability(BUNDLED_SHOP_POLICY, "black-market", { luck: 0, roll: 0, discovered: [] })).toBe(false);
    expect(resolveShopAvailability(BUNDLED_SHOP_POLICY, "black-market", { luck: 0, roll: 0, discovered: ["black-market-signal"] })).toBe(true);
    expect(resolveShopAvailability(BUNDLED_SHOP_POLICY, "hidden", { luck: 0, roll: 0, discovered: ["echo-rift"] })).toBe(true);
    expect(resolveShopAvailability(BUNDLED_SHOP_POLICY, "event", { luck: 0, roll: 0, discovered: [] })).toBe(false);

    expect(resolveShopAvailability(BUNDLED_SHOP_POLICY, "traveling", { luck: 0, roll: 0.279999, discovered: [] })).toBe(true);
    expect(resolveShopAvailability(BUNDLED_SHOP_POLICY, "traveling", { luck: 0, roll: 0.28, discovered: [] })).toBe(false);
    expect(resolveShopAvailability(BUNDLED_SHOP_POLICY, "traveling", { luck: 100, roll: 0.429999, discovered: [] })).toBe(true);
    expect(resolveShopAvailability(BUNDLED_SHOP_POLICY, "traveling", { luck: 100, roll: 0.43, discovered: [] })).toBe(false);

    expect(resolveShopRareItemChance(BUNDLED_SHOP_POLICY, "hidden", "phoenix-core", 0)).toBeCloseTo(0.025);
    expect(resolveShopRareItemChance(BUNDLED_SHOP_POLICY, "hidden", "phoenix-core", 100)).toBeCloseTo(0.035);
    expect(resolveShopRareItemChance(BUNDLED_SHOP_POLICY, "black-market", "phoenix-core", 100)).toBeCloseTo(0.0112);
    expect(resolveShopRareItemChance(BUNDLED_SHOP_POLICY, "traveling", "phoenix-core", 100)).toBe(0);
  });

  it("captures current Shop-owned service costs while retaining progression ownership", () => {
    expect(BUNDLED_SHOP_POLICY.services.repairPack).toEqual({
      credits: REPAIR_PACK_COST,
      alloy: REPAIR_PACK_ALLOY_COST,
    });

    for (const grade of GRADE_IDS) {
      const item = equipment(grade, 0);
      expect(BUNDLED_SHOP_POLICY.services.equipmentEnhancement.gradeCreditMultiplier[grade]).toBeGreaterThan(0);
      expect(BUNDLED_SHOP_POLICY.services.equipmentEnhancement.gradeAlloyBase[grade]).toBe(equipmentUpgradeAlloyCost(item));
      expect(equipmentUpgradeCost(item)).toBe(
        Math.floor(BUNDLED_SHOP_POLICY.services.equipmentEnhancement.creditBase * BUNDLED_SHOP_POLICY.services.equipmentEnhancement.gradeCreditMultiplier[grade]),
      );
      expect(BUNDLED_SHOP_POLICY.services.dismantle.alloyByGrade[grade]).toBe(dismantleReward(item).alloy);
    }

    expect(BUNDLED_SHOP_POLICY.services.equipmentEvolution.silver).toEqual(equipmentEvolutionCost(equipment("silver", 5)));
    expect(BUNDLED_SHOP_POLICY.services.equipmentEvolution.gold).toEqual(equipmentEvolutionCost(equipment("gold", 5)));
    expect(equipmentAffixRollCost(equipment("silver"), false)).toEqual({
      credits: 260,
      alloy: 4,
      starCrystal: 0,
      quantumCore: 0,
      requiredStage: 201,
    });
    expect(equipmentAffixRollCost(equipment("diamond"), true)).toEqual({
      credits: 864,
      alloy: 14,
      starCrystal: 3,
      quantumCore: 0,
      requiredStage: 701,
    });
    expect(BUNDLED_SHOP_POLICY.services.progressionOwner).toBe("progression/upgrades");
  });
});

describe("Shop Admin policy contract", () => {
  it("derives canonical IDs from the child registries and locks the safe apply boundary", () => {
    expect(SHOP_POLICY_ADMIN_CONTRACT.schemaVersion).toBe(1);
    expect(SHOP_POLICY_ADMIN_CONTRACT.configNamespace).toBe("economy.shop");
    expect(SHOP_POLICY_ADMIN_CONTRACT.runtime.endpoint).toBe("/api/runtime/space-typing/shop");
    expect(SHOP_POLICY_ADMIN_CONTRACT.runtime.applyBoundary).toBe("new-session+new-shop-instance");
    expect(SHOP_POLICY_ADMIN_CONTRACT.runtime.fallback).toBe("bundled-policy");
    expect(SHOP_POLICY_ADMIN_CONTRACT.ids.shopTypes).toEqual([...SHOP_POLICY_TYPES]);
    expect(SHOP_POLICY_ADMIN_CONTRACT.ids.itemIds).toEqual([...ITEM_IDS]);
    expect(SHOP_POLICY_ADMIN_CONTRACT.ids.equipmentIds).toEqual([...EQUIPMENT_IDS]);
    expect(SHOP_POLICY_ADMIN_CONTRACT.ids.gradeIds).toEqual([...GRADE_IDS]);
    expect(SHOP_POLICY_ADMIN_CONTRACT.ids.equipmentTiers).toEqual(
      [...new Set(EQUIPMENT_IDS.map((id) => EQUIPMENT_REGISTRY[id].tier))].sort((a, b) => a - b),
    );
    expect(SHOP_POLICY_ADMIN_CONTRACT.ids.discoveryIds).toEqual(["black-market-signal", "echo-rift"]);
  });

  it("keeps unsupported Live Ops concepts explicitly deferred", () => {
    expect(SHOP_POLICY_ADMIN_CONTRACT.deferredCapabilities).toEqual(expect.arrayContaining([
      "schedule-window",
      "daily-purchase-limit",
      "weekly-purchase-limit",
      "bundle-transaction",
      "remote-player-availability",
    ]));
    expect(SHOP_POLICY_ADMIN_CONTRACT.ownership).toEqual({
      itemIdentity: "items.registry",
      equipmentIdentity: "equipment.registry",
      generatedInstances: "PlayerSave.shopState",
      shopPolicy: "economy.shop",
      progressionCosts: "progression/upgrades",
    });
  });
});
