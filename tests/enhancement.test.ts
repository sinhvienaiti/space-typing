import { describe, expect, it } from "vitest";
import {
  enhancementStatMultiplier,
  MAX_ENHANCEMENT_LEVEL,
  sanitizeEnhancementLevel,
} from "../src/equipment/enhancement";

describe("equipment enhancement", () => {
  it("supports enhancement levels from +0 through +5", () => {
    expect(MAX_ENHANCEMENT_LEVEL).toBe(5);
    expect(sanitizeEnhancementLevel(-10)).toBe(0);
    expect(sanitizeEnhancementLevel(3.8)).toBe(3);
    expect(sanitizeEnhancementLevel(99)).toBe(5);
  });

  it("adds six percent stat scaling per enhancement level", () => {
    expect(enhancementStatMultiplier(0)).toBe(1);
    expect(enhancementStatMultiplier(1)).toBeCloseTo(1.06);
    expect(enhancementStatMultiplier(5)).toBeCloseTo(1.3);
  });
});
