import { describe, expect, it } from "vitest";
import {
  applyIncomingDamage,
  armorDamage,
  createPlayerResources,
  DEFAULT_PLAYER_BASE_STATS,
  firepowerDamage,
  focusPowerGain,
  luckFactor,
  regenerateResources,
  salvageFactor,
  wardDuration,
} from "../src/stats/player";
import { createCoreStats } from "../src/stats/core";

describe("player core attributes", () => {
  it("creates Hull, Shield and Energy resources from effective stats", () => {
    expect(createPlayerResources(DEFAULT_PLAYER_BASE_STATS)).toEqual({
      hull: 100,
      shield: 40,
      energy: 100,
    });
  });

  it("uses Armor before Shield and Hull damage", () => {
    const stats = createCoreStats({
      hull: 100,
      shield: 20,
      armor: 25,
      energy: 50,
    });

    expect(armorDamage(50, stats.armor)).toBeCloseTo(40);

    const result = applyIncomingDamage(
      { hull: 100, shield: 20, energy: 50 },
      stats,
      50,
    );

    expect(result.absorbedByShield).toBeCloseTo(20);
    expect(result.hullDamage).toBeCloseTo(20);
    expect(result.resources.hull).toBeCloseTo(80);
    expect(result.resources.shield).toBe(0);
  });

  it("regenerates Shield only when allowed and Energy through Reactor", () => {
    const stats = createCoreStats({
      hull: 100,
      shield: 50,
      energy: 100,
      reactor: 10,
    });

    const blocked = regenerateResources(
      { hull: 80, shield: 10, energy: 20 },
      stats,
      1,
      false,
    );
    expect(blocked.shield).toBe(10);
    expect(blocked.energy).toBe(30);

    const active = regenerateResources(blocked, stats, 2, true);
    expect(active.shield).toBe(18);
    expect(active.energy).toBe(50);
  });

  it("maps offensive and utility attributes to stable factors", () => {
    const stats = createCoreStats({
      firepower: 25,
      focus: 20,
      ward: 25,
      luck: 15,
      salvage: 30,
    });

    expect(firepowerDamage(100, stats)).toBe(125);
    expect(focusPowerGain(10, stats)).toBeCloseTo(12);
    expect(wardDuration(5, stats)).toBeCloseTo(4);
    expect(luckFactor(stats)).toBeCloseTo(1.15);
    expect(salvageFactor(stats)).toBeCloseTo(1.3);
  });
});
