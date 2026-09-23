import { describe, expect, it } from "vitest";
import { NOVA_PULSE_VISUAL_SECONDS, novaBossDamage, typedRageGain } from "../src/combat/rage-pulse";
describe("longer Rage charge and bounded Nova Pulse", () => {
  it("takes >2x as much typed progress to fill the same 100 Power bar", () => {
    expect(typedRageGain(1.8)).toBeCloseTo(0.756);
    expect(typedRageGain(7)).toBeCloseTo(2.94);
    expect(typedRageGain(0)).toBe(0);
    expect(typedRageGain(Infinity)).toBe(0);
  });
  it("keeps the boss shield meaningful and uses finite capped pulse damage", () => {
    expect(novaBossDamage(1000, true)).toBe(0);
    expect(novaBossDamage(1000, false)).toBe(120);
    expect(novaBossDamage(-10, false)).toBe(0);
    expect(NOVA_PULSE_VISUAL_SECONDS).toBeGreaterThan(0.5);
  });
});
