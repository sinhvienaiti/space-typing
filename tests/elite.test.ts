import { describe, expect, it } from "vitest";
import {
  applyEliteModifiers,
  eliteModifierCount,
  pickEliteModifiers,
  rollElite,
} from "../src/enemies/elite";

describe("Elite modifier framework", () => {
  it("keeps modifier count between one and three", () => {
    expect(eliteModifierCount(0)).toBe(1);
    expect(eliteModifierCount(1)).toBe(1);
    expect(eliteModifierCount(2)).toBe(2);
    expect(eliteModifierCount(9)).toBe(3);
  });

  it("picks unique modifiers deterministically", () => {
    const values = [0, 0, 0];
    let index = 0;
    const modifiers = pickEliteModifiers(
      3,
      () => values[index++] ?? 0,
    );

    expect(modifiers).toEqual(["swift", "armored", "frenzy"]);
    expect(new Set(modifiers).size).toBe(3);
  });

  it("bounds elite roll chance", () => {
    expect(rollElite(-1, 0)).toBe(false);
    expect(rollElite(0.2, 0.19)).toBe(true);
    expect(rollElite(0.2, 0.2)).toBe(false);
    expect(rollElite(10, 0.84)).toBe(true);
    expect(rollElite(10, 0.9)).toBe(false);
  });

  it("applies Swift, Armored and Frenzy without touching Volatile stats", () => {
    const result = applyEliteModifiers(
      {
        speed: 100,
        layers: 1,
        actionCooldown: 4,
      },
      ["swift", "armored", "frenzy", "volatile"],
    );

    expect(result.speed).toBeCloseTo(122);
    expect(result.layers).toBe(2);
    expect(result.actionCooldown).toBeCloseTo(2.88);
  });

  it("uses Frenzy as a speed modifier when an enemy has no active action", () => {
    const result = applyEliteModifiers(
      {
        speed: 100,
        layers: 3,
        actionCooldown: null,
      },
      ["armored", "frenzy"],
    );

    expect(result.layers).toBe(3);
    expect(result.speed).toBeCloseTo(110);
    expect(result.actionCooldown).toBeNull();
  });
});
