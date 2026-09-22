import { describe, expect, it } from "vitest";
import {
  createStarterEquipmentState,
  unequipSlot,
} from "../src/equipment/loadout";
import { createEmptyInventory } from "../src/items/inventory";
import { createExpansionCurrencyState } from "../src/economy/currencies";
import { createUpgradeState } from "../src/progression/upgrades";
import {
  buyAttributeUpgrade,
  buyEquipmentAffix,
  buyEquipmentEvolution,
  buySkillUpgrade,
  dismantleEquipment,
  equipmentEvolutionCost,
} from "../src/shops/service-shop";

function richState() {
  return {
    credits: 999_999,
    expansionCurrencies: {
      ...createExpansionCurrencyState(),
      alloy: 999,
      starCrystal: 99,
      quantumCore: 9,
    },
    inventory: createEmptyInventory(),
    equipment: createStarterEquipmentState(),
    upgrades: createUpgradeState(),
  };
}

describe("M17 Station progression services", () => {
  it("buys one gated skill level atomically", () => {
    const state = richState();
    const result = buySkillUpgrade(
      state,
      "barrier",
      1000,
    );

    expect(result.applied).toBe(true);
    expect(result.state.upgrades.skillLevels.barrier).toBe(2);
    expect(result.state.credits).toBeLessThan(state.credits);
    expect(result.state.expansionCurrencies.alloy).toBeLessThan(
      state.expansionCurrencies.alloy,
    );
  });

  it("blocks a high-level skill upgrade before its Campaign gate", () => {
    const state = richState();
    state.upgrades.skillLevels.barrier = 2;

    const result = buySkillUpgrade(
      state,
      "barrier",
      50,
    );

    expect(result.applied).toBe(false);
    expect(result.reason).toBe("stage");
    expect(result.state.upgrades.skillLevels.barrier).toBe(2);
  });

  it("buys permanent attributes through the same economy", () => {
    const state = richState();
    const result = buyAttributeUpgrade(
      state,
      "firepower",
      1000,
    );

    expect(result.applied).toBe(true);
    expect(result.state.upgrades.attributeLevels.firepower).toBe(1);
  });

  it("evolves Silver +5 to Gold +0 with a rare-currency cost", () => {
    const state = richState();
    const target = state.equipment.items[0]!;
    state.equipment = {
      ...state.equipment,
      items: state.equipment.items.map((item) =>
        item.instanceId === target.instanceId
          ? {
              ...item,
              grade: "silver" as const,
              enhancement: 5,
            }
          : item,
      ),
    };
    const evolvedTarget = state.equipment.items.find(
      (item) => item.instanceId === target.instanceId,
    )!;
    expect(equipmentEvolutionCost(evolvedTarget)).not.toBeNull();

    const result = buyEquipmentEvolution(
      state,
      target.instanceId,
      1000,
    );

    expect(result.applied).toBe(true);
    expect(
      result.state.equipment.items.find(
        (item) => item.instanceId === target.instanceId,
      ),
    ).toMatchObject({
      grade: "gold",
      enhancement: 0,
    });
  });

  it("rolls affixes only on eligible grades", () => {
    const state = richState();
    const target = state.equipment.items[0]!;

    const blocked = buyEquipmentAffix(
      state,
      target.instanceId,
      1000,
      () => 0,
    );
    expect(blocked.applied).toBe(false);
    expect(blocked.reason).toBe("grade");

    state.equipment = {
      ...state.equipment,
      items: state.equipment.items.map((item) =>
        item.instanceId === target.instanceId
          ? { ...item, grade: "silver" as const }
          : item,
      ),
    };
    const rolled = buyEquipmentAffix(
      state,
      target.instanceId,
      1000,
      () => 0,
    );
    expect(rolled.applied).toBe(true);
    expect(
      rolled.state.equipment.items.find(
        (item) => item.instanceId === target.instanceId,
      )?.affixes,
    ).toEqual(["fortified"]);
  });

  it("blocks dismantling equipped gear and salvages unequipped gear", () => {
    const state = richState();
    const equippedId = state.equipment.loadout.weapon!;
    const blocked = dismantleEquipment(state, equippedId);
    expect(blocked.applied).toBe(false);
    expect(blocked.reason).toBe("equipped");

    const unequipped = {
      ...state,
      equipment: unequipSlot(state.equipment, "weapon"),
    };
    const alloyBefore = unequipped.expansionCurrencies.alloy;
    const result = dismantleEquipment(
      unequipped,
      equippedId,
    );

    expect(result.applied).toBe(true);
    expect(
      result.state.equipment.items.some(
        (item) => item.instanceId === equippedId,
      ),
    ).toBe(false);
    expect(result.state.expansionCurrencies.alloy).toBeGreaterThan(
      alloyBefore,
    );
  });
});
