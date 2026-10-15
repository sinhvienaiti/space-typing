import { describe, expect, it } from "vitest";
import {
  DUEL_COMBO_RECIPES,
  DuelStrategySystem,
  duelComboEffect,
  duelStrategyCategoryMultiplier,
  DUEL_TRAP_INITIATIVE_COST,
  duelTrapEffect,
} from "../src/duel/strategy";
import { DUEL_ACTIONS_BY_ID } from "../src/duel/actions";

function action(id: string) {
  const found = DUEL_ACTIONS_BY_ID.get(id);
  if (found === undefined) throw new Error("Missing action " + id);
  return found;
}

describe("Duel M-DUEL-08 strategy core", () => {
  it("builds HOMING BARRAGE only from the approved ordered recipe", () => {
    const strategy = new DuelStrategySystem();
    expect(
      strategy.recordAction("player-1", action("energy"), 1),
    ).toBeNull();
    expect(
      strategy.recordAction("player-1", action("missile"), 2),
    ).toBeNull();
    expect(
      strategy.recordAction("player-1", action("lock-on"), 3),
    ).toEqual({
      id: "homing-barrage",
      createdAtTick: 3,
    });
    expect(
      strategy.snapshot()["player-1"].readyCombos,
    ).toHaveLength(1);
  });

  it("keeps every FINAL V3 combo recipe reachable from real ActionDefinitions", () => {
    for (const recipe of DUEL_COMBO_RECIPES) {
      const strategy = new DuelStrategySystem();
      let ready = null;
      for (const [index, ingredient] of recipe.ingredients.entries()) {
        const definition = DUEL_ACTIONS_BY_ID.get(ingredient);
        expect(
          definition,
          recipe.id + " missing " + ingredient,
        ).toBeDefined();
        ready = strategy.recordAction(
          "player-1",
          definition!,
          index + 1,
        );
      }
      expect(ready).toEqual({
        id: recipe.id,
        createdAtTick: recipe.ingredients.length,
      });
    }
  });

  it("keeps combo power independent from raw WPM", () => {
    expect(duelComboEffect("homing-barrage").damage).toBe(26);
    expect(duelComboEffect("overcharged-railgun").damage).toBe(32);
  });

  it("caps traps, preserves generic hints and consumes them FIFO", () => {
    const strategy = new DuelStrategySystem();
    expect(
      strategy.armTrap("player-1", "minefield", 1),
    ).not.toBeNull();
    expect(
      strategy.armTrap("player-1", "counter-battery", 2),
    ).not.toBeNull();
    expect(
      strategy.armTrap("player-1", "decoy", 3),
    ).toBeNull();
    expect(strategy.publicTrapHintsFor("player-2")).toEqual([
      "TRAP ARMED",
      "TRAP ARMED",
    ]);
    expect(strategy.consumeOldestTrap("player-1")?.trapId).toBe(
      "minefield",
    );
    expect(strategy.consumeOldestTrap("player-1")?.trapId).toBe(
      "counter-battery",
    );
    expect(strategy.consumeOldestTrap("player-1")).toBeNull();
    expect(DUEL_TRAP_INITIATIVE_COST).toBe(8);
    expect(duelTrapEffect("minefield").damageToTrigger).toBe(6);
    expect(
      duelTrapEffect("static-snare").tacticalEffect?.effectId,
    ).toBe("projectile-drag");
  });

  it("turns saved Initiative into only a light projectile tempo edge", () => {
    const strategy = new DuelStrategySystem();
    expect(strategy.projectileTempoScale("player-1")).toBe(1);
    for (let index = 0; index < 20; index += 1) {
      strategy.gainInitiative("player-1", "counter");
    }
    expect(strategy.projectileTempoScale("player-1")).toBeCloseTo(1.06);
  });

  it("uses bounded Initiative gains rather than raw damage bonuses", () => {
    const strategy = new DuelStrategySystem();
    for (let index = 0; index < 20; index += 1) {
      strategy.gainInitiative("player-1", "counter");
    }
    expect(strategy.snapshot()["player-1"].initiative).toBe(100);
    expect(strategy.spendInitiative("player-1", 35)).toBe(true);
    expect(strategy.snapshot()["player-1"].initiative).toBe(65);
  });

  it("implements conversion as explicit tradeoffs", () => {
    const strategy = new DuelStrategySystem();
    expect(
      strategy.applyConversion("player-1", "sacrifice"),
    ).toEqual(
      expect.objectContaining({
        hullCost: 12,
        energyGain: 22,
      }),
    );
    expect(
      strategy.applyConversion("player-1", "reactor-dump"),
    ).toEqual(
      expect.objectContaining({
        energyCost: 20,
        shieldGain: 18,
      }),
    );
    strategy.applyConversion("player-1", "berserk");
    expect(strategy.attackScale("player-1")).toBeCloseTo(1.2);
    expect(strategy.defenseScale("player-1")).toBeCloseTo(0.88);
    strategy.update(8.1);
    expect(strategy.attackScale("player-1")).toBe(1);
    expect(strategy.defenseScale("player-1")).toBe(1);
  });

  it("turns adaptive paths into bounded draft affinity instead of a hard lock", () => {
    expect(duelStrategyCategoryMultiplier("balanced")).toEqual({});
    expect(
      duelStrategyCategoryMultiplier("arsenal").attack,
    ).toBeGreaterThan(1);
    expect(
      duelStrategyCategoryMultiplier("fortress").defense,
    ).toBeGreaterThan(1);
    expect(
      duelStrategyCategoryMultiplier("tactician").tactical,
    ).toBeGreaterThan(1);
    expect(
      duelStrategyCategoryMultiplier("chaos").mystery,
    ).toBeGreaterThan(1);
    expect(
      duelStrategyCategoryMultiplier("chaos").mystery,
    ).toBeLessThan(1.5);
  });

  it("derives adaptive strategy paths from actual action choices", () => {
    const arsenal = new DuelStrategySystem();
    arsenal.recordAction("player-1", action("laser"), 1);
    arsenal.recordAction("player-1", action("missile"), 2);
    arsenal.recordAction("player-1", action("siege-lance"), 3);
    expect(arsenal.strategyPath("player-1")).toBe("arsenal");

    const fortress = new DuelStrategySystem();
    fortress.recordAction("player-1", action("barrier"), 1);
    fortress.recordAction("player-1", action("repair"), 2);
    fortress.recordAction("player-1", action("energy"), 3);
    expect(fortress.strategyPath("player-1")).toBe("fortress");

    const tactician = new DuelStrategySystem();
    tactician.recordAction("player-1", action("scan"), 1);
    tactician.recordAction("player-1", action("disrupt"), 2);
    tactician.recordAction("player-1", action("scan"), 3);
    expect(tactician.strategyPath("player-1")).toBe("tactician");
  });
});
