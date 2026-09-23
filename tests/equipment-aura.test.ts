import { describe, expect, it } from "vitest";
import {
  deriveEquipmentAura,
  EQUIPMENT_VISUAL_AFFINITIES,
} from "../src/characters/equipment-aura";
import { createStarterEquipmentState } from "../src/equipment/loadout";

describe("equipment aura derivation", () => {
  it("derives a visual affinity without storing separate aura state", () => {
    const aura = deriveEquipmentAura(
      createStarterEquipmentState(),
      "vanguard",
    );
    expect(EQUIPMENT_VISUAL_AFFINITIES).toContain(aura.primary);
    expect(aura.equippedCount).toBe(7);
    expect(aura.intensity).toBeGreaterThan(0);
    expect(aura.intensity).toBeLessThanOrEqual(1);
  });

  it("lets defensive characters bias equivalent builds toward guard", () => {
    const state = createStarterEquipmentState();
    const aegis = deriveEquipmentAura(state, "aegis");
    expect(
      aegis.primary === "guard" || aegis.secondary === "guard",
    ).toBe(true);
  });

  it("gives apex characters a celestial identity tie-break", () => {
    const state = createStarterEquipmentState();
    const zenith = deriveEquipmentAura(state, "zenith");
    expect(
      zenith.primary === "celestial" ||
      zenith.secondary === "celestial",
    ).toBe(true);
  });

  it("increases visual intensity with higher Grade and enhancement", () => {
    const base = createStarterEquipmentState();
    const boosted = createStarterEquipmentState();
    boosted.items = boosted.items.map((item) => ({
      ...item,
      grade: "diamond",
      enhancement: 10,
    }));

    expect(
      deriveEquipmentAura(boosted, "vanguard").intensity,
    ).toBeGreaterThan(
      deriveEquipmentAura(base, "vanguard").intensity,
    );
  });
});
