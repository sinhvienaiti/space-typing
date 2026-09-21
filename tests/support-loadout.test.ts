import { describe, expect, it } from "vitest";
import {
  createStarterSupportSpellState,
  equipSupportSpell,
  isValidSupportSpellState,
  sanitizeSupportSpellState,
} from "../src/skills/support-loadout";

describe("support spell loadout", () => {
  it("starts with two equipped spells and four unlocked choices", () => {
    const state = createStarterSupportSpellState();

    expect(state.unlocked).toHaveLength(4);
    expect(state.loadout).toEqual(["sanctuary", "gravity-well"]);
    expect(isValidSupportSpellState(state)).toBe(true);
  });

  it("keeps the two loadout slots unique", () => {
    const state = createStarterSupportSpellState();
    const changed = equipSupportSpell(state, 1, "sanctuary");

    expect(changed.loadout).toEqual([null, "sanctuary"]);
    expect(state.loadout).toEqual(["sanctuary", "gravity-well"]);
  });

  it("allows an empty support slot", () => {
    const state = createStarterSupportSpellState();
    expect(equipSupportSpell(state, 0, null).loadout).toEqual([
      null,
      "gravity-well",
    ]);
  });

  it("rejects locked or duplicate-invalid strict save data", () => {
    expect(
      isValidSupportSpellState({
        unlocked: ["sanctuary"],
        loadout: ["sanctuary", "gravity-well"],
      }),
    ).toBe(false);

    expect(
      isValidSupportSpellState({
        unlocked: ["sanctuary", "gravity-well"],
        loadout: ["sanctuary", "sanctuary"],
      }),
    ).toBe(false);
  });

  it("sanitizes malformed state back to a playable starter loadout", () => {
    expect(sanitizeSupportSpellState(null)).toEqual(
      createStarterSupportSpellState(),
    );
  });
});
