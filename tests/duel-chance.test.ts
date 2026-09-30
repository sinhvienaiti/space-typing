import { describe, expect, it } from "vitest";
import { DuelChanceSystem } from "../src/duel/chance";

describe("Duel M-DUEL-05 Fate + Mystery", () => {
  it("replays Fate and Mystery deterministically from the same match seed", () => {
    const a = new DuelChanceSystem(9001, "duel-final-v3");
    const b = new DuelChanceSystem(9001, "duel-final-v3");

    const fateA = Array.from({ length: 12 }, () =>
      a.rollFate("player-1").outcome.id,
    );
    const fateB = Array.from({ length: 12 }, () =>
      b.rollFate("player-1").outcome.id,
    );
    const mysteryA = Array.from({ length: 8 }, () =>
      a.createMystery("crisis"),
    );
    const mysteryB = Array.from({ length: 8 }, () =>
      b.createMystery("crisis"),
    );

    expect(fateA).toEqual(fateB);
    expect(mysteryA).toEqual(mysteryB);
  });

  it("uses separate RNG domains so Fate calls do not advance Mystery outcomes", () => {
    const baseline = new DuelChanceSystem(77, "v3");
    const shifted = new DuelChanceSystem(77, "v3");

    baseline.rollFate("player-1");
    baseline.rollFate("player-2");
    const mysteryAfterFate = baseline.createMystery("crisis");

    const mysteryWithoutFate = shifted.createMystery("crisis");
    expect(mysteryAfterFate).toEqual(mysteryWithoutFate);
  });

  it("keeps bounded round-local pity and resets it after stronger outcomes", () => {
    const system = new DuelChanceSystem(123, "v3");
    let maxPity = 0;
    let sawReset = false;
    let previous = 0;

    for (let index = 0; index < 200; index += 1) {
      const result = system.rollFate("player-1");
      maxPity = Math.max(maxPity, result.pityAfter);
      if (previous > 0 && result.pityAfter === 0) sawReset = true;
      previous = result.pityAfter;
    }

    expect(maxPity).toBeLessThanOrEqual(6);
    expect(sawReset).toBe(true);
    system.resetRound();
    expect(system.pitySnapshot()["player-1"]).toBe(0);
  });

  it("never exposes exact hidden Mystery outcome through the public snapshot", () => {
    const system = new DuelChanceSystem(42, "v3");
    const mystery = system.createMystery("crisis");
    const publicState = system.publicMysteries()[0]!;

    expect(publicState.id).toBe(mystery.id);
    expect(publicState.riskTag).toBeDefined();
    expect("outcomeId" in publicState).toBe(false);
    expect("category" in publicState).toBe(false);
  });

  it("supports layered reveal tools without revealing more than requested", () => {
    const system = new DuelChanceSystem(45, "v3");
    const mystery = system.createMystery("crisis");

    const risk = system.revealMystery(mystery.id, "risk")!;
    expect(risk.riskTag).toBeDefined();
    expect(risk.category).toBeUndefined();
    expect(risk.outcomeId).toBeUndefined();

    const category = system.revealMystery(
      mystery.id,
      "category",
    )!;
    expect(category.category).toBeDefined();
    expect(category.outcomeId).toBeUndefined();

    const exact = system.revealMystery(mystery.id, "exact")!;
    expect(exact.category).toBeDefined();
    expect(exact.outcomeId).toBeDefined();
  });

  it("bounds Mystery pools by phase and excludes Cataclysm outcomes early", () => {
    const early = new DuelChanceSystem(101, "v3");
    for (let index = 0; index < 100; index += 1) {
      const mystery = early.createMystery("build");
      expect(mystery.rarity).toBe("minor");
    }

    const late = new DuelChanceSystem(101, "v3");
    const rarities = new Set(
      Array.from({ length: 120 }, () =>
        late.createMystery("cataclysm").rarity,
      ),
    );
    expect(rarities.has("minor")).toBe(true);
    expect(rarities.has("chaotic")).toBe(true);
    expect(rarities.has("cataclysm")).toBe(true);
  });

  it("keeps Fate outcome budgets bounded and non-lethal by direct luck", () => {
    const system = new DuelChanceSystem(8080, "v3");
    for (let index = 0; index < 500; index += 1) {
      const outcome = system.rollFate("player-1").outcome;
      expect(outcome.opponentDamage).toBeLessThanOrEqual(14);
      expect(outcome.selfShield).toBeLessThanOrEqual(22);
      expect(outcome.selfEnergy).toBeLessThanOrEqual(22);
    }
  });

  it("resolves each Mystery once and keeps public state marked resolved", () => {
    const system = new DuelChanceSystem(2121, "v3");
    const mystery = system.createMystery("war");

    expect(system.resolveMystery(mystery.id)).not.toBeNull();
    expect(system.resolveMystery(mystery.id)).toBeNull();
    expect(
      system.publicMysteries().find(
        (entry) => entry.id === mystery.id,
      )?.resolved,
    ).toBe(true);
  });
});
