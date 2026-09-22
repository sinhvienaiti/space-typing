import { describe, expect, it } from "vitest";
import { createExpansionCurrencyState } from "../src/economy/currencies";
import { createStarterEquipmentState } from "../src/equipment/loadout";
import { createEmptyInventory } from "../src/items/inventory";
import { createUpgradeState } from "../src/progression/upgrades";
import {
  buyEquipmentUpgrade,
  buyRepairPack,
  equipmentUpgradeAlloyCost,
  equipmentUpgradeCost,
  REPAIR_PACK_ALLOY_COST,
  REPAIR_PACK_COST,
} from "../src/shops/service-shop";

describe("Repair / Upgrade Shop", () => {
  it("scales enhancement cost by level and grade", () => {
    const equipment = createStarterEquipmentState();
    const aluminum = equipment.items[0]!;
    const levelOne = { ...aluminum, enhancement: 1 };
    const copper = { ...aluminum, grade: "copper" as const };

    expect(equipmentUpgradeCost(levelOne)).toBeGreaterThan(
      equipmentUpgradeCost(aluminum) ?? 0,
    );
    expect(equipmentUpgradeCost(copper)).toBeGreaterThan(
      equipmentUpgradeCost(aluminum) ?? 0,
    );
    expect(equipmentUpgradeAlloyCost(copper)).toBeGreaterThan(
      equipmentUpgradeAlloyCost(aluminum) ?? 0,
    );
    expect(
      equipmentUpgradeCost({ ...aluminum, enhancement: 5 }),
    ).toBeNull();
  });

  it("atomically upgrades equipment and spends Credits plus Alloy", () => {
    const equipment = createStarterEquipmentState();
    const item = equipment.items[0]!;
    const cost = equipmentUpgradeCost(item)!;
    const alloyCost = equipmentUpgradeAlloyCost(item)!;

    const result = buyEquipmentUpgrade(
      {
        credits: cost,
        expansionCurrencies: {
          ...createExpansionCurrencyState(),
          alloy: alloyCost,
        },
        inventory: createEmptyInventory(),
        equipment,
        upgrades: createUpgradeState(),
      },
      item.instanceId,
    );

    expect(result.applied).toBe(true);
    expect(result.state.credits).toBe(0);
    expect(result.state.expansionCurrencies.alloy).toBe(0);
    expect(
      result.state.equipment.items.find(
        (candidate) => candidate.instanceId === item.instanceId,
      )?.enhancement,
    ).toBe(1);
  });

  it("does not charge when Credits or Alloy are insufficient", () => {
    const equipment = createStarterEquipmentState();
    const item = equipment.items[0]!;

    const poorCredits = buyEquipmentUpgrade(
      {
        credits: 0,
        expansionCurrencies: {
          ...createExpansionCurrencyState(),
          alloy: 999,
        },
        inventory: createEmptyInventory(),
        equipment,
        upgrades: createUpgradeState(),
      },
      item.instanceId,
    );
    expect(poorCredits.applied).toBe(false);
    expect(poorCredits.reason).toBe("credits");
    expect(poorCredits.state.expansionCurrencies.alloy).toBe(999);

    const poorAlloy = buyEquipmentUpgrade(
      {
        credits: 9999,
        expansionCurrencies: createExpansionCurrencyState(),
        inventory: createEmptyInventory(),
        equipment,
        upgrades: createUpgradeState(),
      },
      item.instanceId,
    );
    expect(poorAlloy.applied).toBe(false);
    expect(poorAlloy.reason).toBe("alloy");
    expect(poorAlloy.state.credits).toBe(9999);
  });

  it("never charges a max-level upgrade", () => {
    const equipment = createStarterEquipmentState();
    const item = equipment.items[0]!;
    const maxed = {
      ...equipment,
      items: equipment.items.map((candidate) =>
        candidate.instanceId === item.instanceId
          ? { ...candidate, enhancement: 5 }
          : candidate,
      ),
    };
    const maxResult = buyEquipmentUpgrade(
      {
        credits: 9999,
        expansionCurrencies: {
          ...createExpansionCurrencyState(),
          alloy: 999,
        },
        inventory: createEmptyInventory(),
        equipment: maxed,
        upgrades: createUpgradeState(),
      },
      item.instanceId,
    );
    expect(maxResult.applied).toBe(false);
    expect(maxResult.reason).toBe("max");
    expect(maxResult.state.credits).toBe(9999);
    expect(maxResult.state.expansionCurrencies.alloy).toBe(999);
  });

  it("buys the repair pack atomically with Credits plus Alloy", () => {
    const equipment = createStarterEquipmentState();
    const result = buyRepairPack({
      credits: REPAIR_PACK_COST,
      expansionCurrencies: {
        ...createExpansionCurrencyState(),
        alloy: REPAIR_PACK_ALLOY_COST,
      },
      inventory: createEmptyInventory(),
      equipment,
      upgrades: createUpgradeState(),
    });

    expect(result.applied).toBe(true);
    expect(result.state.credits).toBe(0);
    expect(result.state.expansionCurrencies.alloy).toBe(0);
    expect(result.state.inventory).toEqual({
      "repair-kit": 1,
      "shield-cell": 1,
    });
  });

  it("does not charge when either repair-pack stack is full", () => {
    const result = buyRepairPack({
      credits: 999,
      expansionCurrencies: {
        ...createExpansionCurrencyState(),
        alloy: 999,
      },
      inventory: { "repair-kit": 20 },
      equipment: createStarterEquipmentState(),
      upgrades: createUpgradeState(),
    });

    expect(result.applied).toBe(false);
    expect(result.reason).toBe("full");
    expect(result.state.credits).toBe(999);
    expect(result.state.expansionCurrencies.alloy).toBe(999);
    expect(result.state.inventory).toEqual({ "repair-kit": 20 });
  });
});
