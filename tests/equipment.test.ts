import { describe, expect, it } from "vitest";
import {
  createStarterEquipmentState,
  equipmentForSlot,
  equipmentStatBonus,
  equipInstance,
  isValidEquipmentState,
  sanitizeEquipmentState,
  unequipSlot,
} from "../src/equipment/loadout";

describe("equipment and loadout", () => {
  it("creates seven equipped slots and keeps an alternate starter weapon", () => {
    const state = createStarterEquipmentState();

    expect(state.items).toHaveLength(8);
    expect(Object.values(state.loadout).filter(Boolean)).toHaveLength(7);
    expect(equipmentForSlot(state, "weapon")).toHaveLength(2);
    expect(state.loadout.weapon).toBe("starter-pulse");
  });

  it("switches equipment without mutating the previous loadout", () => {
    const state = createStarterEquipmentState();
    const changed = equipInstance(state, "starter-precision");

    expect(changed.loadout.weapon).toBe("starter-precision");
    expect(state.loadout.weapon).toBe("starter-pulse");
  });

  it("can unequip a slot and removes its stats from the total", () => {
    const state = createStarterEquipmentState();
    const full = equipmentStatBonus(state);
    const withoutArmor = equipmentStatBonus(
      unequipSlot(state, "armor"),
    );

    expect(full.hull).toBe(18);
    expect(full.armor).toBe(8);
    expect(withoutArmor.hull).toBeUndefined();
    expect(withoutArmor.armor).toBeUndefined();
  });

  it("changes effective weapon bonus when selecting precision laser", () => {
    const state = createStarterEquipmentState();
    const pulse = equipmentStatBonus(state);
    const precision = equipmentStatBonus(
      equipInstance(state, "starter-precision"),
    );

    expect(pulse.firepower).toBeGreaterThan(precision.firepower ?? 0);
    expect(precision.focus).toBeGreaterThan(pulse.focus ?? 0);
  });

  it("strict validation rejects cross-slot loadout references", () => {
    const valid = createStarterEquipmentState();
    expect(isValidEquipmentState(valid)).toBe(true);

    expect(
      isValidEquipmentState({
        ...valid,
        loadout: {
          ...valid.loadout,
          armor: "starter-pulse",
        },
      }),
    ).toBe(false);
  });

  it("sanitizes malformed equipment back to a playable starter state", () => {
    const sanitized = sanitizeEquipmentState({
      items: [],
      loadout: {},
    });

    expect(sanitized.items).toHaveLength(8);
    expect(sanitized.loadout.weapon).toBe("starter-pulse");
  });
});
