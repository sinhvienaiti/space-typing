import { describe, expect, it } from "vitest";
import {
  combineDuelCategoryMultipliers,
  duelRuntimeTuning,
} from "../src/duel/rules";

describe("Duel room runtime tuning", () => {
  const base = {
    matchLengthSeconds: 240,
    hazardLevel: "standard" as const,
    mysteryFrequency: "standard" as const,
    fateFrequency: "standard" as const,
    modifier: "standard" as const,
  };

  it("turns room frequency settings into draft multipliers", () => {
    const tuning = duelRuntimeTuning({
      ...base,
      mysteryFrequency: "off",
      fateFrequency: "high",
    });
    expect(tuning.categoryMultiplier.mystery).toBe(0);
    expect(tuning.categoryMultiplier.fate).toBe(1.65);
  });

  it("turns hazard controls into bounded director tuning", () => {
    const standard = duelRuntimeTuning(base);
    const high = duelRuntimeTuning({
      ...base,
      hazardLevel: "high",
      modifier: "high-hazard",
    });
    expect(high.hazardIntervalScale).toBeLessThan(
      standard.hazardIntervalScale,
    );
    expect(high.hazardPressureScale).toBeGreaterThan(
      standard.hazardPressureScale,
    );
  });

  it("gives every exposed custom modifier a concrete runtime effect", () => {
    expect(
      duelRuntimeTuning({
        ...base,
        modifier: "mystery-storm",
      }).categoryMultiplier.mystery,
    ).toBeGreaterThan(1);
    expect(
      duelRuntimeTuning({
        ...base,
        modifier: "weapon-frenzy",
      }).categoryMultiplier.attack,
    ).toBeGreaterThan(1);
    expect(
      duelRuntimeTuning({
        ...base,
        modifier: "support-rich",
      }).categoryMultiplier.support,
    ).toBeGreaterThan(1);

    const sudden = duelRuntimeTuning({
      ...base,
      modifier: "sudden-death",
    });
    expect(sudden.maxHull).toBe(75);
    expect(sudden.maxShield).toBe(20);

    const rush = duelRuntimeTuning({
      ...base,
      modifier: "cataclysm-rush",
    });
    expect(rush.escalationSeconds).toBeLessThan(
      base.matchLengthSeconds,
    );
  });

  it("combines map and room affinities multiplicatively", () => {
    expect(
      combineDuelCategoryMultipliers(
        { attack: 1.2, mystery: 0.8 },
        { attack: 1.5, mystery: 0 },
      ),
    ).toEqual({
      attack: 1.7999999999999998,
      mystery: 0,
    });
  });
});
