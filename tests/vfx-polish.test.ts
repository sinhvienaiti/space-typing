import { describe, expect, it } from "vitest";
import {
  cameraShakeOffset,
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

  it("keeps camera shake smooth, deterministic and inside the requested amplitude", () => {
    const amplitude = 4;
    const a = cameraShakeOffset(amplitude, 1.25);
    const b = cameraShakeOffset(amplitude, 1.25);
    const next = cameraShakeOffset(amplitude, 1.251);

    expect(a).toEqual(b);
    expect(Math.abs(a.x)).toBeLessThanOrEqual(amplitude);
    expect(Math.abs(a.y)).toBeLessThanOrEqual(amplitude);
    expect(Math.abs(next.x - a.x)).toBeLessThan(0.25);
    expect(Math.abs(next.y - a.y)).toBeLessThan(0.25);
    expect(cameraShakeOffset(0, 99)).toEqual({ x: 0, y: 0 });
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
