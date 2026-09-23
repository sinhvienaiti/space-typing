import { describe, expect, it } from "vitest";
import {
  impactFeedback,
  telegraphPulse,
  telegraphStrength,
} from "../src/vfx/polish";

describe("VFX polish helpers", () => {
  it("keeps hit-stop short and stronger for boss impacts", () => {
    expect(impactFeedback("key").hitStopSeconds).toBe(0);
    // Ordinary kills must not freeze the entire enemy/projectile simulation.
    expect(impactFeedback("word").hitStopSeconds).toBe(0);
    expect(impactFeedback("word").shake).toBeGreaterThan(0);
    expect(impactFeedback("boss-word").hitStopSeconds).toBeLessThanOrEqual(0.02);
    expect(impactFeedback("boss-word").hitStopSeconds).toBeGreaterThan(
      impactFeedback("word").hitStopSeconds,
    );
    expect(impactFeedback("boss-defeat").hitStopSeconds).toBeLessThan(0.1);
  });

  it("only shows attack telegraph inside the warning window", () => {
    expect(telegraphStrength(null)).toBe(0);
    expect(telegraphStrength(2)).toBe(0);
    expect(telegraphStrength(0.45, 0.9)).toBeCloseTo(0.5);
    expect(telegraphStrength(0, 0.9)).toBe(1);
  });

  it("keeps pulsing telegraph alpha bounded", () => {
    for (const time of [0, 0.2, 1, 9]) {
      const pulse = telegraphPulse(0.8, time);
      expect(pulse).toBeGreaterThanOrEqual(0);
      expect(pulse).toBeLessThanOrEqual(1);
    }
  });
});
