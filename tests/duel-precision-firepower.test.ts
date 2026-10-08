import { describe, expect, it } from "vitest";
import {
  duelPrecisionAccuracyTier,
  duelPrecisionDamageScale,
  duelPrecisionMilestone,
} from "../src/duel/precision-firepower";

describe("Duel precision firepower", () => {
  it("maps deterministic correct-character milestones", () => {
    expect(duelPrecisionMilestone(9)).toBeNull();
    expect(duelPrecisionMilestone(10)?.ordnance).toBe(
      "laser-burst",
    );
    expect(duelPrecisionMilestone(20)?.ordnance).toBe(
      "micro-missile",
    );
    expect(duelPrecisionMilestone(35)?.ordnance).toBe(
      "missile-salvo",
    );
    expect(duelPrecisionMilestone(50)?.ordnance).toBe(
      "heavy-bomb",
    );
    expect(duelPrecisionMilestone(75)?.ordnance).toBe(
      "precision-barrage",
    );
    expect(duelPrecisionMilestone(100)?.ordnance).toBe(
      "major-ordnance",
    );
  });

  it("rewards cleaner total accuracy with stronger bonus damage", () => {
    expect(duelPrecisionAccuracyTier(90, 10)).toBe(1);
    expect(duelPrecisionAccuracyTier(97, 3)).toBe(2);
    expect(duelPrecisionAccuracyTier(99, 1)).toBe(3);
    expect(duelPrecisionDamageScale(3)).toBeGreaterThan(
      duelPrecisionDamageScale(1),
    );
  });
});
