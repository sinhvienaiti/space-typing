import { describe, expect, it } from "vitest";
import { useRecoveryItem } from "../src/items/consumables";

const caps = {
  hull: 100,
  shield: 40,
  energy: 100,
};

describe("recovery consumables", () => {
  it("repairs 35% max Hull without exceeding the cap", () => {
    const result = useRecoveryItem(
      "repair-kit",
      { hull: 80, shield: 10, energy: 50 },
      caps,
    );

    expect(result.applied).toBe(true);
    expect(result.resources.hull).toBe(100);
    expect(result.restored).toBe(20);
  });

  it("restores 50% max Shield", () => {
    const result = useRecoveryItem(
      "shield-cell",
      { hull: 80, shield: 5, energy: 50 },
      caps,
    );

    expect(result.resources.shield).toBe(25);
    expect(result.restored).toBe(20);
  });

  it("restores 50% max Energy", () => {
    const result = useRecoveryItem(
      "energy-cell",
      { hull: 80, shield: 5, energy: 20 },
      caps,
    );

    expect(result.resources.energy).toBe(70);
    expect(result.restored).toBe(50);
  });

  it("does not consume a recovery item when its resource is already full", () => {
    for (const id of [
      "repair-kit",
      "shield-cell",
      "energy-cell",
    ] as const) {
      const result = useRecoveryItem(
        id,
        { hull: 100, shield: 40, energy: 100 },
        caps,
      );
      expect(result.applied).toBe(false);
      expect(result.restored).toBe(0);
    }
  });
});
