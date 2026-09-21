import { describe, expect, it } from "vitest";
import {
  fortunePower,
  FORTUNE_ACTIVE_SKILL,
  FORTUNE_JACKPOT_DURATION,
} from "../src/characters/fortune";

describe("Fortune", () => {
  it("charges extra Power without exceeding 100", () => {
    expect(fortunePower(40)).toBeGreaterThan(40);
    expect(fortunePower(95)).toBe(100);
  });

  it("uses accuracy-gated Lucky Star", () => {
    expect(FORTUNE_ACTIVE_SKILL.id).toBe("fortune-lucky-star");
    expect(FORTUNE_ACTIVE_SKILL.typingCondition?.minAccuracy).toBe(92);
  });

  it("keeps Jackpot as a timed ultimate", () => {
    expect(FORTUNE_JACKPOT_DURATION).toBeGreaterThan(4);
  });
});
