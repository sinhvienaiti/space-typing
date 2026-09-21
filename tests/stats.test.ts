import { describe, expect, it } from "vitest";
import {
  calculateEffectiveStats,
  CORE_STAT_KEYS,
  createCoreStats,
  ZERO_CORE_STATS,
} from "../src/stats/core";

describe("effective stat pipeline", () => {
  it("defines the ten project core stats exactly once", () => {
    expect(CORE_STAT_KEYS).toEqual([
      "hull",
      "shield",
      "firepower",
      "armor",
      "energy",
      "reactor",
      "focus",
      "ward",
      "luck",
      "salvage",
    ]);
    expect(Object.keys(ZERO_CORE_STATS)).toEqual([...CORE_STAT_KEYS]);
  });

  it("adds every pipeline layer into one effective result", () => {
    const result = calculateEffectiveStats({
      base: createCoreStats({
        hull: 100,
        shield: 40,
        firepower: 10,
        luck: 5,
      }),
      level: {
        hull: 10,
        firepower: 2,
      },
      equipment: {
        shield: 20,
        armor: 4,
      },
      talent: {
        firepower: 3,
        focus: 5,
      },
      temporary: {
        firepower: 6,
        luck: 10,
      },
      stage: {
        shield: -15,
        ward: 8,
      },
    });

    expect(result).toEqual({
      hull: 110,
      shield: 45,
      firepower: 21,
      armor: 4,
      energy: 0,
      reactor: 0,
      focus: 5,
      ward: 8,
      luck: 15,
      salvage: 0,
    });
  });

  it("clamps final effective stats at zero after negative stage effects", () => {
    const result = calculateEffectiveStats({
      base: createCoreStats({
        shield: 10,
        energy: 5,
      }),
      stage: {
        shield: -50,
        energy: -10,
      },
    });

    expect(result.shield).toBe(0);
    expect(result.energy).toBe(0);
  });

  it("ignores non-finite bonus values and does not mutate base stats", () => {
    const base = createCoreStats({
      hull: 100,
      firepower: 12,
    });
    const before = { ...base };

    const result = calculateEffectiveStats({
      base,
      equipment: {
        hull: Number.NaN,
        firepower: Number.POSITIVE_INFINITY,
      },
    });

    expect(result).toEqual(before);
    expect(base).toEqual(before);
  });
});
