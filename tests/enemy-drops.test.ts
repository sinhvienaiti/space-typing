import { describe, expect, it } from "vitest";
import {
  equipmentDropChance,
  rollEquipmentDrop,
} from "../src/loot/equipment-loot";
import {
  addEquipmentInstance,
  createStarterEquipmentState,
} from "../src/equipment/loadout";

function sequence(values: number[]): () => number {
  let index = 0;
  return () => values[index++] ?? 0;
}

describe("enemy equipment drops", () => {
  it("gives Elite and Boss sources better drop rates", () => {
    expect(equipmentDropChance("elite", 0)).toBeGreaterThan(
      equipmentDropChance("normal", 0),
    );
    expect(equipmentDropChance("boss", 0)).toBe(1);
  });

  it("lets Salvage improve chance without exceeding 100%", () => {
    expect(equipmentDropChance("normal", 50)).toBeGreaterThan(
      equipmentDropChance("normal", 0),
    );
    expect(equipmentDropChance("boss", 999)).toBe(1);
  });

  it("rolls a deterministic drop descriptor", () => {
    const drop = rollEquipmentDrop(
      "elite",
      0,
      0,
      sequence([0, 0.6, 0.2]),
    );
    expect(drop).not.toBeNull();
    expect(drop?.source).toBe("elite");
    expect(drop?.definitionId).toBeDefined();
  });

  it("adds drops without changing the current loadout", () => {
    const state = createStarterEquipmentState();
    const changed = addEquipmentInstance(state, {
      instanceId: "drop-test",
      definitionId: "balanced-core-mk1",
      grade: "copper",
      enhancement: 0,
    });

    expect(changed.items).toHaveLength(state.items.length + 1);
    expect(changed.loadout).toEqual(state.loadout);
  });
});
