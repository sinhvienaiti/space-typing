import { describe, expect, it } from "vitest";
import {
  createLuckPityState,
  luckAdjustedChance,
  rollLuckPity,
  sanitizeLuckPityState,
} from "../src/loot/pity";

describe("Luck soft pity", () => {
  it("starts all drought counters at zero", () => {
    expect(createLuckPityState()).toEqual({
      golden: 0,
      treasure: 0,
      choice: 0,
      anomaly: 0,
    });
  });

  it("raises chance with Luck and pity but respects the cap", () => {
    const base = luckAdjustedChance(0.05, 0, 0, 0.25);
    const lucky = luckAdjustedChance(0.05, 50, 0, 0.25);
    const pity = luckAdjustedChance(0.05, 50, 20, 0.25);

    expect(lucky).toBeGreaterThan(base);
    expect(pity).toBeGreaterThan(lucky);
    expect(luckAdjustedChance(0.05, 100, 50, 0.25)).toBeLessThanOrEqual(0.25);
  });

  it("increments drought on misses and resets on trigger", () => {
    const miss = rollLuckPity(0.05, 0, 3, 0.25, 0.99);
    expect(miss.triggered).toBe(false);
    expect(miss.nextPity).toBe(4);

    const hit = rollLuckPity(0.05, 100, 20, 0.25, 0);
    expect(hit.triggered).toBe(true);
    expect(hit.nextPity).toBe(0);
  });

  it("does not build pity before an event is introduced", () => {
    expect(rollLuckPity(0, 100, 9, 0.25, 0)).toEqual({
      triggered: false,
      chance: 0,
      nextPity: 9,
    });
  });

  it("sanitizes corrupted counters", () => {
    expect(
      sanitizeLuckPityState({
        golden: 999,
        treasure: -10,
        choice: 2.8,
        anomaly: "bad",
      }),
    ).toEqual({
      golden: 50,
      treasure: 0,
      choice: 2,
      anomaly: 0,
    });
  });
});
