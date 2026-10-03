import { describe, expect, it } from "vitest";
import {
  DUEL_MOMENTUM_TIERS,
  DuelMomentum,
  duelMomentumProgress,
  duelMomentumTier,
} from "../src/duel/momentum";
import { DUEL_PRECISION_MILESTONES } from "../src/duel/precision-firepower";

describe("Duel typing momentum (presentation only)", () => {
  it("puts tiers on the engine's precision milestones", () => {
    const tierStreaks = DUEL_MOMENTUM_TIERS.slice(1).map((tier) => tier.streak);
    expect(tierStreaks).toEqual(DUEL_PRECISION_MILESTONES.map((milestone) => milestone.streak));
    expect(duelMomentumTier(9)).toBe(0);
    expect(duelMomentumTier(10)).toBe(1);
    expect(duelMomentumTier(100)).toBe(6);
    expect(duelMomentumProgress(15)).toBeCloseTo(0.5);
    expect(duelMomentumProgress(250)).toBe(1);
  });

  it("uses the first view of a round as a baseline, then counts correct keys", () => {
    const momentum = new DuelMomentum();
    expect(momentum.observe("r1", 40, 3)).toEqual([]);
    expect(momentum.streak).toBe(0);
    const events = momentum.observe("r1", 41, 3);
    expect(events).toEqual([{ type: "tick", streak: 1, tier: 0 }]);
  });

  it("announces a tier-up exactly once and caps key ticks per update", () => {
    const momentum = new DuelMomentum();
    momentum.observe("r1", 0, 0);
    const burst = momentum.observe("r1", 12, 0);
    expect(burst.filter((event) => event.type === "tier-up")).toEqual([{ type: "tier-up", streak: 10, tier: 1 }]);
    expect(burst.filter((event) => event.type === "tick").length).toBeLessThanOrEqual(4);
    expect(momentum.streak).toBe(12);
    expect(momentum.tier).toBe(1);
    expect(momentum.observe("r1", 12, 0)).toEqual([]);
  });

  it("breaks on a miss, keeps the best streak, and resets per round", () => {
    const momentum = new DuelMomentum();
    momentum.observe("r1", 0, 0);
    momentum.observe("r1", 22, 0);
    expect(momentum.observe("r1", 22, 1)).toEqual([{ type: "break", lost: 22, tier: 2 }]);
    expect(momentum.streak).toBe(0);
    expect(momentum.best).toBe(22);
    momentum.observe("r1", 25, 1);
    expect(momentum.streak).toBe(3);
    expect(momentum.observe("r2", 0, 0)).toEqual([]);
    expect(momentum.best).toBe(0);
    expect(momentum.heat).toBe(0);
  });
});
