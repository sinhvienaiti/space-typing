import { describe, expect, it } from "vitest";
import { characterStatBonus } from "../src/characters/stats";

describe("character stat bonuses", () => {
  it("gives Fortune higher Luck and Salvage", () => {
    const bonus = characterStatBonus("fortune");
    expect(bonus.luck).toBeGreaterThan(0);
    expect(bonus.salvage).toBeGreaterThan(0);
  });

  it("gives Arsenal additional Firepower", () => {
    expect(characterStatBonus("arsenal").firepower).toBeGreaterThan(0);
  });

  it("returns a fresh object", () => {
    const a = characterStatBonus("fortune");
    const b = characterStatBonus("fortune");
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});
