import { describe, expect, it } from "vitest";
import { createStarterEquipmentState } from "../src/equipment/loadout";
import { createEmptyInventory } from "../src/items/inventory";
import {
  buyEquipmentUpgrade,
  buyRepairPack,
  equipmentUpgradeCost,
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
    expect(
      equipmentUpgradeCost({ ...aluminum, enhancement: 5 }),
    ).toBeNull();
  });

  it("atomically upgrades equipment and spends Credits", () => {
    const equipment = createStarterEquipmentState();
    const item = equipment.items[0]!;
    const cost = equipmentUpgradeCost(item)!;

    const result = buyEquipmentUpgrade(
      {
        credits: cost,
        inventory: createEmptyInventory(),
        equipment,
      },
      item.instanceId,
    );

    expect(result.applied).toBe(true);
    expect(result.state.credits).toBe(0);
    expect(
      result.state.equipment.items.find(
        (candidate) => candidate.instanceId === item.instanceId,
      )?.enhancement,
    ).toBe(1);
  });

  it("never charges an unaffordable or max-level upgrade", () => {
    const equipment = createStarterEquipmentState();
    const item = equipment.items[0]!;
    const poor = buyEquipmentUpgrade(
      {
        credits: 0,
        inventory: createEmptyInventory(),
        equipment,
      },
      item.instanceId,
    );
    expect(poor.applied).toBe(false);
    expect(poor.state.credits).toBe(0);

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
        inventory: createEmptyInventory(),
        equipment: maxed,
      },
      item.instanceId,
    );
    expect(maxResult.applied).toBe(false);
    expect(maxResult.reason).toBe("max");
    expect(maxResult.state.credits).toBe(9999);
  });

  it("buys the repair pack atomically", () => {
    const equipment = createStarterEquipmentState();
    const result = buyRepairPack({
      credits: REPAIR_PACK_COST,
      inventory: createEmptyInventory(),
      equipment,
    });

    expect(result.applied).toBe(true);
    expect(result.state.credits).toBe(0);
    expect(result.state.inventory).toEqual({
      "repair-kit": 1,
      "shield-cell": 1,
    });
  });

  it("does not charge when either repair-pack stack is full", () => {
    const result = buyRepairPack({
      credits: 999,
      inventory: { "repair-kit": 20 },
      equipment: createStarterEquipmentState(),
    });

    expect(result.applied).toBe(false);
    expect(result.reason).toBe("full");
    expect(result.state.credits).toBe(999);
    expect(result.state.inventory).toEqual({ "repair-kit": 20 });
  });
});
