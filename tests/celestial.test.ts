import { describe, expect, it } from "vitest";
import {
  addCelestialCharge,
  CELESTIAL_ACTIVE_SKILL,
  spendCelestialCharge,
} from "../src/characters/celestial";

describe("Celestial", () => {
  it("builds charge only from perfect words", () => {
    expect(addCelestialCharge(20, false)).toBe(20);
    expect(addCelestialCharge(20, true)).toBeGreaterThan(20);
    expect(addCelestialCharge(98, true)).toBe(100);
  });

  it("spends charge without going negative", () => {
    expect(spendCelestialCharge(20, 30)).toBe(0);
  });

  it("uses accuracy-gated Celestial Stance", () => {
    expect(CELESTIAL_ACTIVE_SKILL.id).toBe("celestial-stance");
    expect(CELESTIAL_ACTIVE_SKILL.typingCondition?.minAccuracy).toBe(94);
  });
});
