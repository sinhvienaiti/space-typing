import { describe, expect, it } from "vitest";
import { createRng, restoreRng, RNG_STREAMS, rngState, RngStream, type Rng, type RngStreamName } from "../src/platform/rng";

const draws = (rng: Rng, name: RngStreamName, count: number) => Array.from({ length: count }, () => rng[name].next());

describe("platform rng (docs/td/TYPING_DEFENSE_DESIGN.md 25.5)", () => {
  // Known answers, checked against the canonical mulberry32 (Tommy Ettinger's
  // public-domain JavaScript) when written. A change to the generator or to how
  // a stream's seed is mixed fails here, not as every replay and golden hash
  // moving at once; a browser scenario can compare the same numbers.
  it("draws mulberry32's numbers", () => {
    const stream = new RngStream(1234);
    expect(Array.from({ length: 5 }, () => stream.next())).toEqual([314799534, 3021131492, 3877737075, 4168477787, 175938938]);
    expect(new RngStream(1234).float()).toBe(314799534 / 4294967296);
  });

  it("seeds each stream from the run seed and its name", () => {
    expect(RNG_STREAMS).toEqual(["spawn", "combat", "crit", "words", "rare", "loot", "ai", "props"]);
    const firsts = (seed: number) => RNG_STREAMS.map((name) => createRng(seed)[name].next());
    expect(firsts(1)).toEqual([3369393960, 2261843904, 195783102, 1494631663, 3696443472, 644970795, 2534391830, 1379289447]);
    expect(firsts(12345)).toEqual([1081060212, 3235465048, 4267511498, 2370028694, 1606786294, 2695004905, 2162590654, 2167944389]);
  });

  it("gives the same numbers for the same seed, other numbers for another seed", () => {
    for (const name of RNG_STREAMS) {
      expect(draws(createRng(7), name, 50)).toEqual(draws(createRng(7), name, 50));
      expect(draws(createRng(7), name, 50)).not.toEqual(draws(createRng(8), name, 50));
    }
  });

  it("keeps the streams independent: extra draws on one never shift another", () => {
    const quiet = createRng(42);
    const busy = createRng(42);
    for (let index = 0; index < 1000; index += 1) {
      busy.combat.next();
      if (index % 3 === 0) busy.crit.float();
    }
    for (const name of RNG_STREAMS.filter((name) => name !== "combat" && name !== "crit")) {
      expect(draws(busy, name, 20), name).toEqual(draws(quiet, name, 20));
    }
  });

  it("starts every stream somewhere else, also for neighbouring seeds", () => {
    const firsts = [1, 2, 3].flatMap((seed) => RNG_STREAMS.map((name) => createRng(seed)[name].next()));
    expect(new Set(firsts).size).toBe(firsts.length);
  });

  it("has a state of plain integers that hashes and restores", () => {
    const rng = createRng(99);
    draws(rng, "words", 17);
    draws(rng, "spawn", 3);
    const state = rngState(rng);
    expect(state).toHaveLength(RNG_STREAMS.length);
    for (const value of state) expect(Number.isInteger(value) && value >= 0 && value < 4294967296).toBe(true);
    const ahead = RNG_STREAMS.map((name) => draws(rng, name, 5));
    const copy = createRng(1);
    restoreRng(copy, state);
    expect(rngState(copy)).toEqual(state);
    expect(RNG_STREAMS.map((name) => draws(copy, name, 5))).toEqual(ahead);
    expect(() => restoreRng(copy, state.slice(1))).toThrow();
  });

  it("draws floats in [0, 1) and integers inside the range, both ends included", () => {
    const stream = createRng(5).combat;
    const seen = new Set<number>();
    for (let index = 0; index < 5000; index += 1) {
      const value = stream.float();
      expect(value >= 0 && value < 1).toBe(true);
      const roll = stream.int(10, 14);
      expect(roll >= 10 && roll <= 14 && Number.isInteger(roll)).toBe(true);
      seen.add(roll);
    }
    expect([...seen].sort()).toEqual([10, 11, 12, 13, 14]);
    const hits = Array.from({ length: 10000 }, () => stream.chance(0.1)).filter(Boolean).length;
    expect(hits).toBeGreaterThan(850);
    expect(hits).toBeLessThan(1150);
  });
});
