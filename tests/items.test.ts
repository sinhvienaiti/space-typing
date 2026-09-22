import { describe, expect, it } from "vitest";
import {
  addItem,
  createEmptyInventory,
  inventoryTotal,
  isValidInventory,
  itemCount,
  removeItem,
  sanitizeInventory,
} from "../src/items/inventory";
import {
  getItemDefinition,
  ITEM_IDS,
  ITEM_REGISTRY,
  UNBOUNDED_ITEM_STACK,
} from "../src/items/registry";

describe("item registry and inventory", () => {
  it("registers the existing items plus M01 resurrection contracts", () => {
    expect(ITEM_IDS).toHaveLength(12);
    expect(Object.keys(ITEM_REGISTRY)).toEqual([...ITEM_IDS]);
    expect(getItemDefinition("repair-kit").name).toBe("Repair Kit");
    expect(getItemDefinition("lucky-dice").name).toBe("Lucky Dice");
    expect(getItemDefinition("salvage-anchor")).toMatchObject({
      grade: "silver",
      maxStack: UNBOUNDED_ITEM_STACK,
    });
    expect(getItemDefinition("stage-revival-core").grade).toBe("gold");
    expect(getItemDefinition("phoenix-core").grade).toBe("diamond");
  });

  it("allows resurrection items to accumulate without a gameplay stack cap", () => {
    const amount = 1_000_000;
    const result = addItem({}, "salvage-anchor", amount);

    expect(result.changed).toBe(amount);
    expect(itemCount(result.inventory, "salvage-anchor")).toBe(amount);
    expect(isValidInventory({ "phoenix-core": amount })).toBe(true);
  });

  it("adds and removes items without mutating the previous inventory", () => {
    const empty = createEmptyInventory();
    const added = addItem(empty, "repair-kit", 3);

    expect(empty).toEqual({});
    expect(added.changed).toBe(3);
    expect(itemCount(added.inventory, "repair-kit")).toBe(3);

    const removed = removeItem(added.inventory, "repair-kit", 2);
    expect(removed.changed).toBe(2);
    expect(itemCount(removed.inventory, "repair-kit")).toBe(1);
    expect(itemCount(added.inventory, "repair-kit")).toBe(3);
  });

  it("enforces stack limits", () => {
    const result = addItem({}, "nova-bomb", 999);
    expect(result.changed).toBe(10);
    expect(itemCount(result.inventory, "nova-bomb")).toBe(10);
  });

  it("sanitizes stored inventory and rejects unknown IDs for strict import", () => {
    expect(
      sanitizeInventory({
        "repair-kit": 3.9,
        "shield-cell": -2,
        "unknown-item": 99,
      }),
    ).toEqual({
      "repair-kit": 3,
    });

    expect(isValidInventory({ "repair-kit": 3 })).toBe(true);
    expect(isValidInventory({ "unknown-item": 1 })).toBe(false);
    expect(isValidInventory({ "repair-kit": 999 })).toBe(false);
  });

  it("counts all stored items", () => {
    expect(
      inventoryTotal({
        "repair-kit": 2,
        "energy-cell": 4,
      }),
    ).toBe(6);
  });
});
