import { describe, expect, it } from "vitest";
import {
  createStarterEquipmentState,
  unequipSlot,
} from "../src/equipment/loadout";
import { createStarterSupportSpellState } from "../src/skills/support-loadout";
import {
  buildSynergyStatBonus,
  resolveBuildSynergies,
} from "../src/synergy/build";

describe("build synergy", () => {
  it("activates Arc Circuit only for Volt with Compact Reactor equipped", () => {
    const equipment = createStarterEquipmentState();
    expect(
      resolveBuildSynergies({
        character: "volt",
        equipment,
        supportSpells: createStarterSupportSpellState(),
      }),
    ).toContain("arc-circuit");

    expect(
      resolveBuildSynergies({
        character: "vanguard",
        equipment,
        supportSpells: createStarterSupportSpellState(),
      }),
    ).not.toContain("arc-circuit");
  });

  it("requires Sanctuary in the support loadout for Sanctuary Matrix", () => {
    const equipment = createStarterEquipmentState();
    const spells = createStarterSupportSpellState();

    expect(
      resolveBuildSynergies({
        character: "bastion",
        equipment,
        supportSpells: spells,
      }),
    ).toContain("sanctuary-matrix");

    const withoutSanctuary = {
      ...spells,
      loadout: ["gravity-well", "cleanse"] as const,
    };
    expect(
      resolveBuildSynergies({
        character: "bastion",
        equipment,
        supportSpells: withoutSanctuary,
      }),
    ).not.toContain("sanctuary-matrix");
  });

  it("does not activate a synergy when its equipment is owned but unequipped", () => {
    const starter = createStarterEquipmentState();
    const withoutUtility = unequipSlot(starter, "utility");

    expect(
      resolveBuildSynergies({
        character: "oracle",
        equipment: withoutUtility,
        supportSpells: createStarterSupportSpellState(),
      }),
    ).not.toContain("oracle-lens");
  });

  it("combines only small bounded stat bonuses", () => {
    expect(
      buildSynergyStatBonus([
        "arc-circuit",
        "oracle-lens",
        "sanctuary-matrix",
      ]),
    ).toEqual({
      firepower: 5,
      reactor: 3,
      focus: 5,
      shield: 10,
      ward: 4,
    });
  });
});
