import { describe, expect, it } from "vitest";
import {
  addEquipmentAffix,
  createStarterEquipmentState,
  equipmentStatBonus,
  evolveEquipmentInstance,
  rerollEquipmentAffix,
  type EquipmentState,
} from "../src/equipment/loadout";

describe("M17 equipment affix/evolution runtime", () => {
  it("adds affix stats through the existing equipment bonus aggregator", () => {
    const starter = createStarterEquipmentState();
    const weaponId = starter.loadout.weapon!;
    const silver = {
      ...starter,
      items: starter.items.map((item) =>
        item.instanceId === weaponId
          ? { ...item, grade: "silver" as const }
          : item,
      ),
    };

    const rolled = addEquipmentAffix(
      silver,
      weaponId,
      () => 0,
    );
    expect(rolled.changed).toBe(true);
    expect(rolled.affix).toBe("fortified");
    expect(equipmentStatBonus(rolled.state).hull).toBeGreaterThan(
      equipmentStatBonus(silver).hull ?? 0,
    );
  });

  it("rerolls one affix while keeping other affixes locked", () => {
    const starter = createStarterEquipmentState();
    const weaponId = starter.loadout.weapon!;
    const gold: EquipmentState = {
      ...starter,
      items: starter.items.map((item) =>
        item.instanceId === weaponId
          ? {
              ...item,
              grade: "gold" as const,
              affixes: ["fortified", "charged"],
            }
          : item,
      ),
    };

    const result = rerollEquipmentAffix(
      gold,
      weaponId,
      0,
      () => 0,
    );

    expect(result.changed).toBe(true);
    const affixes = result.state.items.find(
      (item) => item.instanceId === weaponId,
    )?.affixes;
    expect(affixes?.[1]).toBe("charged");
    expect(affixes?.[0]).not.toBe("charged");
  });

  it("evolves only +5 Silver/Gold and resets enhancement", () => {
    const starter = createStarterEquipmentState();
    const weaponId = starter.loadout.weapon!;
    const silver = {
      ...starter,
      items: starter.items.map((item) =>
        item.instanceId === weaponId
          ? {
              ...item,
              grade: "silver" as const,
              enhancement: 5,
            }
          : item,
      ),
    };

    const gold = evolveEquipmentInstance(
      silver,
      weaponId,
    );
    expect(gold.changed).toBe(true);
    expect(
      gold.state.items.find(
        (item) => item.instanceId === weaponId,
      ),
    ).toMatchObject({
      grade: "gold",
      enhancement: 0,
    });
  });
});
