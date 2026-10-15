import { describe, expect, it } from "vitest";
import {
  createStarterSupportSpellState,
  equipSupportSpell,
  isValidSupportSpellState,
  sanitizeSupportSpellState,
} from "../src/skills/support-loadout";
import {
  LATER_TACTICAL_SYSTEM_IDS,
  SUPPORT_SPELL_IDS,
  getSupportSpell,
  strikeTypingAdvance,
} from "../src/skills/support";

describe("support spell loadout", () => {
  it("starts with two fitted systems and every tactical system unlocked", () => {
    const state = createStarterSupportSpellState();

    expect(state.unlocked).toEqual([...SUPPORT_SPELL_IDS]);
    expect(state.unlocked).toHaveLength(7);
    expect(state.loadout).toEqual(["sanctuary", "gravity-well"]);
    expect(isValidSupportSpellState(state)).toBe(true);
  });

  it("gives saves from before Missile Swarm, Railgun and Tractor Beam the new systems", () => {
    const old = sanitizeSupportSpellState({
      unlocked: ["sanctuary", "gravity-well", "cleanse", "meteor"],
      loadout: ["meteor", "cleanse"],
    });

    expect(old.unlocked).toEqual([
      "sanctuary",
      "gravity-well",
      "cleanse",
      "meteor",
      ...LATER_TACTICAL_SYSTEM_IDS,
    ]);
    expect(old.loadout).toEqual(["meteor", "cleanse"]);
    expect(isValidSupportSpellState(old)).toBe(true);
  });

  it("describes every tactical system with its cost", () => {
    for (const id of SUPPORT_SPELL_IDS) {
      const spell = getSupportSpell(id);
      expect(spell.description.length).toBeGreaterThan(40);
      expect(spell.energyCost).toBeGreaterThan(0);
      expect(spell.cooldown).toBeGreaterThan(0);
    }
  });

  it("types letters for the player but always leaves the last one", () => {
    expect(strikeTypingAdvance(0, 6, 2)).toBe(2);
    expect(strikeTypingAdvance(4, 6, 3)).toBe(5);
    expect(strikeTypingAdvance(5, 6, 3)).toBe(5);
    expect(strikeTypingAdvance(0, 1, 3)).toBe(0);
    expect(strikeTypingAdvance(-2, 4, 1)).toBe(1);
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
