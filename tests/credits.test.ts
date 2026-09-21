import { describe, expect, it } from "vitest";
import {
  addCredits,
  MAX_CREDITS,
  sanitizeCredits,
  spendCredits,
  stageClearCreditReward,
} from "../src/economy/credits";

describe("credits economy", () => {
  it("sanitizes and caps persisted Credits", () => {
    expect(sanitizeCredits(-10)).toBe(0);
    expect(sanitizeCredits(12.9)).toBe(12);
    expect(sanitizeCredits(Number.NaN)).toBe(0);
    expect(addCredits(MAX_CREDITS - 2, 50)).toBe(MAX_CREDITS);
  });

  it("never spends below zero", () => {
    expect(spendCredits(30, 31)).toEqual({
      credits: 30,
      spent: false,
    });
    expect(spendCredits(30, 12)).toEqual({
      credits: 18,
      spent: true,
    });
  });

  it("rewards accuracy and Salvage without reducing base reward", () => {
    const base = stageClearCreditReward({
      stage: 100,
      accuracy: 90,
      salvage: 0,
    });
    const accurate = stageClearCreditReward({
      stage: 100,
      accuracy: 99,
      salvage: 0,
    });
    const salvaged = stageClearCreditReward({
      stage: 100,
      accuracy: 99,
      salvage: 50,
    });

    expect(accurate).toBeGreaterThan(base);
    expect(salvaged).toBeGreaterThan(accurate);
  });
});
