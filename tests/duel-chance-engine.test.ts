import { describe, expect, it } from "vitest";
import { DuelEngine } from "../src/duel/engine";

describe("DuelEngine M-DUEL-05 chance integration", () => {
  it("keeps Fate deterministic inside the authoritative engine", () => {
    const a = new DuelEngine({
      matchSeed: 1234,
      maxShield: 100,
      startingShield: 0,
      startingEnergy: 0,
    });
    const b = new DuelEngine({
      matchSeed: 1234,
      maxShield: 100,
      startingShield: 0,
      startingEnergy: 0,
    });

    const left = Array.from({ length: 12 }, () =>
      a.resolveFate("player-1"),
    );
    const right = Array.from({ length: 12 }, () =>
      b.resolveFate("player-1"),
    );

    expect(left).toEqual(right);
    expect(a.snapshot().chance.pity).toEqual(
      b.snapshot().chance.pity,
    );
  });

  it("does not leak exact Mystery outcome through the engine snapshot", () => {
    const engine = new DuelEngine({ matchSeed: 55 });
    const created = engine.createMystery();
    const event = created[0];
    expect(event?.type).toBe("mystery-created");
    if (event?.type !== "mystery-created") return;

    const publicMystery = engine.snapshot().chance.mysteries[0]!;
    expect(publicMystery.id).toBe(event.mystery.id);
    expect(publicMystery.riskTag).toBeDefined();
    expect("category" in publicMystery).toBe(false);
    expect("outcomeId" in publicMystery).toBe(false);
  });

  it("reveals only the requested Mystery information tier", () => {
    const engine = new DuelEngine({ matchSeed: 77 });
    const created = engine.createMystery()[0];
    if (created?.type !== "mystery-created") {
      throw new Error("Missing mystery-created event.");
    }

    const risk = engine.revealMystery(
      "player-1",
      created.mystery.id,
      "risk",
    )[0];
    const category = engine.revealMystery(
      "player-1",
      created.mystery.id,
      "category",
    )[0];
    const exact = engine.revealMystery(
      "player-1",
      created.mystery.id,
      "exact",
    )[0];

    expect(risk).toEqual(
      expect.objectContaining({
        type: "mystery-revealed",
        reveal: expect.not.objectContaining({
          category: expect.anything(),
          outcomeId: expect.anything(),
        }),
      }),
    );
    if (category?.type !== "mystery-revealed") {
      throw new Error("Missing category reveal.");
    }
    expect(category.reveal.category).toBeDefined();
    expect(category.reveal.outcomeId).toBeUndefined();

    if (exact?.type !== "mystery-revealed") {
      throw new Error("Missing exact reveal.");
    }
    expect(exact.reveal.category).toBeDefined();
    expect(exact.reveal.outcomeId).toBeDefined();
  });

  it("resolves a Mystery exactly once through bounded engine effects", () => {
    const engine = new DuelEngine({
      matchSeed: 901,
      maxHull: 100,
      maxShield: 100,
      maxEnergy: 100,
      startingShield: 50,
      startingEnergy: 50,
    });
    const created = engine.createMystery()[0];
    if (created?.type !== "mystery-created") {
      throw new Error("Missing mystery-created event.");
    }

    const before = engine.snapshot().players["player-1"];
    const events = engine.resolveMystery(
      "player-1",
      created.mystery.id,
    );
    const after = engine.snapshot().players["player-1"];

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("mystery-resolved");
    expect(
      engine.resolveMystery("player-1", created.mystery.id),
    ).toEqual([]);
    expect(after.hull).toBeGreaterThanOrEqual(90);
    expect(after.hull).toBeLessThanOrEqual(100);
    expect(after.shield).toBeGreaterThanOrEqual(40);
    expect(after.shield).toBeLessThanOrEqual(100);
    expect(after.energy).toBeGreaterThanOrEqual(34);
    expect(after.energy).toBeLessThanOrEqual(100);
    expect(before.hull).toBe(100);
  });

  it("never lets a direct Fate roll delete a healthy player", () => {
    const engine = new DuelEngine({
      matchSeed: 991,
      maxHull: 100,
      maxShield: 0,
      startingShield: 0,
    });

    for (let index = 0; index < 20; index += 1) {
      engine.resolveFate("player-1");
      expect(
        engine.snapshot().players["player-2"].hull,
      ).toBeGreaterThan(0);
    }
  });

  it("resetRound clears round-local pity and unresolved Mystery state", () => {
    const engine = new DuelEngine({ matchSeed: 31337 });
    engine.resolveFate("player-1");
    engine.createMystery();
    expect(engine.snapshot().chance.mysteries).toHaveLength(1);

    engine.resetRound();

    expect(engine.snapshot().chance.mysteries).toEqual([]);
    expect(engine.snapshot().chance.pity).toEqual({
      "player-1": 0,
      "player-2": 0,
    });
  });
});
