import { describe, expect, it } from "vitest";
import {
  applySupplyReward,
  rollSupplyReward,
  supplyRewardLabel,
} from "../src/supply/pod";

describe("Supply Pod", () => {
  it("rolls each starter combat reward deterministically", () => {
    expect(rollSupplyReward(0)).toBe("hull");
    expect(rollSupplyReward(0.3)).toBe("shield");
    expect(rollSupplyReward(0.6)).toBe("energy");
    expect(rollSupplyReward(0.9)).toBe("power");
  });

  it("restores resources without exceeding their caps", () => {
    const result = applySupplyReward(
      "shield",
      { hull: 80, shield: 90, energy: 50 },
      { hull: 100, shield: 100, energy: 100 },
      40,
    );

    expect(result.resources.shield).toBe(100);
    expect(result.power).toBe(40);
  });

  it("charges Power without exceeding 100", () => {
    expect(
      applySupplyReward(
        "power",
        { hull: 100, shield: 100, energy: 100 },
        { hull: 100, shield: 100, energy: 100 },
        90,
      ).power,
    ).toBe(100);
  });

  it("provides compact HUD reward labels", () => {
    expect(supplyRewardLabel("hull")).toBe("REPAIR");
    expect(supplyRewardLabel("power")).toBe("OVERDRIVE");
  });
});
