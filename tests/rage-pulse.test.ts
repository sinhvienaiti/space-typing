import { describe, expect, it } from "vitest";
import {
  NOVA_PULSE_VISUAL_SECONDS,
  availableRageSegments,
  novaBossDamage,
  rageScaledCount,
  rageScaledValue,
  spendRage,
  typedRageGain,
} from "../src/combat/rage-pulse";

describe("five-segment Rage and bounded Nova Bomb pulse", () => {
  it("takes >2x as much typed progress to fill the same 100 Power bar", () => {
    expect(typedRageGain(1.8)).toBeCloseTo(0.756);
    expect(typedRageGain(7)).toBeCloseTo(2.94);
    expect(typedRageGain(0)).toBe(0);
    expect(typedRageGain(Infinity)).toBe(0);
  });

  it("unlocks one Rage segment per complete 20 Power", () => {
    expect(availableRageSegments(0)).toBe(0);
    expect(availableRageSegments(19.99)).toBe(0);
    expect(availableRageSegments(20)).toBe(1);
    expect(availableRageSegments(79.99)).toBe(3);
    expect(availableRageSegments(100)).toBe(5);
    expect(availableRageSegments(999)).toBe(5);
  });

  it("spends all currently full segments but preserves partial charge", () => {
    expect(spendRage(19)).toEqual({
      segments: 0,
      powerSpent: 0,
      remainingPower: 19,
      scale: 0,
      full: false,
    });
    expect(spendRage(67)).toEqual({
      segments: 3,
      powerSpent: 60,
      remainingPower: 7,
      scale: 0.6,
      full: false,
    });
    expect(spendRage(100)).toEqual({
      segments: 5,
      powerSpent: 100,
      remainingPower: 0,
      scale: 1,
      full: true,
    });
  });

  it("scales target counts and effect values by consumed segments", () => {
    expect(rageScaledCount(5, 1)).toBe(1);
    expect(rageScaledCount(5, 3)).toBe(3);
    expect(rageScaledCount(5, 5)).toBe(5);
    expect(rageScaledValue(10, 1)).toBeCloseTo(2);
    expect(rageScaledValue(10, 5)).toBeCloseTo(10);
  });

  it("keeps Nova Bomb boss shield meaningful and pulse damage finite", () => {
    expect(novaBossDamage(1000, true)).toBe(0);
    expect(novaBossDamage(1000, false)).toBe(120);
    expect(novaBossDamage(-10, false)).toBe(0);
    expect(NOVA_PULSE_VISUAL_SECONDS).toBeGreaterThan(0.5);
  });
});
