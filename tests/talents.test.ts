import { describe, expect, it } from "vitest";
import {
  createEmptyTalentRanks,
  spendTalentPoint,
  talentPointsForLevel,
  talentStatBonus,
  totalTalentPoints,
} from "../src/characters/talents";

describe("character talents", () => {
  it("unlocks three small talent points across character levels", () => {
    expect(talentPointsForLevel(9)).toBe(0);
    expect(talentPointsForLevel(10)).toBe(1);
    expect(talentPointsForLevel(25)).toBe(2);
    expect(talentPointsForLevel(40)).toBe(3);
  });

  it("prevents spending more points than the level grants", () => {
    const empty = createEmptyTalentRanks();
    const first = spendTalentPoint(empty, "assault", 10);
    const blocked = spendTalentPoint(first, "bulwark", 10);

    expect(totalTalentPoints(first)).toBe(1);
    expect(blocked).toBe(first);
  });

  it("forces the third point to branch because each path caps at rank two", () => {
    let ranks = createEmptyTalentRanks();
    ranks = spendTalentPoint(ranks, "assault", 40);
    ranks = spendTalentPoint(ranks, "assault", 40);
    const capped = spendTalentPoint(ranks, "assault", 40);
    const branched = spendTalentPoint(capped, "reactor", 40);

    expect(capped).toBe(ranks);
    expect(branched).toEqual({
      assault: 2,
      bulwark: 0,
      reactor: 1,
    });
  });

  it("turns talent choices into distinct stat bonuses", () => {
    expect(
      talentStatBonus({ assault: 1, bulwark: 0, reactor: 0 }).firepower,
    ).toBeGreaterThan(0);
    expect(
      talentStatBonus({ assault: 0, bulwark: 1, reactor: 0 }).shield,
    ).toBeGreaterThan(0);
    expect(
      talentStatBonus({ assault: 0, bulwark: 0, reactor: 1 }).energy,
    ).toBeGreaterThan(0);
  });
});
