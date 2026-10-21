import { describe, expect, it } from "vitest";
import { createRandom } from "../src/background/math";
import { createRng, restoreRng, RNG_STREAMS, rngState, RngStream, type Rng, type RngStreamName } from "../src/platform/rng";

const draws = (rng: Rng, name: RngStreamName, count: number) => Array.from({ length: count }, () => rng[name].next());

describe("platform rng (docs/td/TYPING_DEFENSE_DESIGN.md 25.5)", () => {
  it("is mulberry32", () => {
    const reference = createRandom(1234);
    const stream = new RngStream(1234);
    for (let index = 0; index < 100; index += 1) expect(stream.next()).toBe(reference() * 4294967296);
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
