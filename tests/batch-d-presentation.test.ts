import { describe, expect, it } from "vitest";
import {
  EQUIPMENT_IDS,
  EQUIPMENT_REGISTRY,
  EQUIPMENT_SLOTS,
} from "../src/equipment/registry";
import {
  ITEM_IDS,
  ITEM_REGISTRY,
} from "../src/items/registry";
import {
  GRADE_IDS,
  GRADE_PRESENTATION,
} from "../src/grades";

describe("Batch D icon/card content contracts", () => {
  it("gives every equipment definition a distinct local icon and real stat profile", () => {
    const definitions = EQUIPMENT_IDS.map((id) => EQUIPMENT_REGISTRY[id]);
    expect(definitions.length).toBeGreaterThanOrEqual(20);
    expect(new Set(definitions.map((definition) => definition.icon)).size)
      .toBe(definitions.length);

    for (const definition of definitions) {
      const values = Object.values(definition.stats).filter(
        (value): value is number => typeof value === "number",
      );
      expect(values.length, definition.id).toBeGreaterThan(0);
      expect(values.every((value) => Number.isFinite(value) && value > 0))
        .toBe(true);
    }
  });

  it("provides multiple actual equipment choices for every loadout slot", () => {
    for (const slot of EQUIPMENT_SLOTS) {
      const options = EQUIPMENT_IDS.filter(
        (id) => EQUIPMENT_REGISTRY[id].slot === slot,
      );
      expect(options.length, slot).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps existing item icon identities distinct without inventing new no-op items", () => {
    const icons = ITEM_IDS.map((id) => ITEM_REGISTRY[id].icon);
    expect(new Set(icons).size).toBe(ITEM_IDS.length);
    expect(ITEM_IDS).toEqual([
      "repair-kit",
      "shield-cell",
      "energy-cell",
      "nova-bomb",
      "emp-charge",
      "time-crystal",
      "word-bomb",
      "supply-beacon",
      "lucky-dice",
      "salvage-anchor",
      "stage-revival-core",
      "phoenix-core",
    ]);
  });

  it("defines icon and frame identity for every real equipment grade", () => {
    for (const grade of GRADE_IDS) {
      const presentation = GRADE_PRESENTATION[grade];
      expect(presentation.label.length).toBeGreaterThan(0);
      expect(presentation.icon.length).toBeGreaterThan(0);
      expect(presentation.cssClass).toBe("grade-" + grade);
    }
  });
});
