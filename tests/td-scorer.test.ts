import { describe, expect, it } from "vitest";
import { STAT } from "../src/td/sim/stats";
import { lifeSeconds, lifeTicks, rawWpm, scoreWord, typeSeconds } from "../src/td/typing/scorer";
import { build, ready, send, world } from "./td/fixtures";
import { smallDeck } from "./td/typing";
import { spawnWord } from "../src/td/sim/systems/words";

/** Scoring a word (docs/td/TYPING_DEFENSE_DESIGN.md 6.4, 6.6; BUILD_NOW §6.1 td-scorer). */
const E = 35;

describe("word life", () => {
  it("L_w = clamp(1.2 + 12·(len + 1)/(E·d); 3; 6) × k_L: TK 6.4's examples", () => {
    expect(lifeSeconds(5, 20, 1, "normal")).toBeCloseTo(4.8, 10);
    expect(lifeSeconds(5, 35, 1, "normal")).toBeCloseTo(3.257, 3);
    expect(lifeSeconds(5, 60, 1, "normal")).toBe(3);
    expect(lifeSeconds(8, 12, 1, "easy")).toBe(7.5);
    expect(lifeSeconds(3, 140, 1, "hard")).toBeCloseTo(2.7, 10);
    expect(lifeTicks(5, 35, 1, "normal")).toBe(195);
  });
});

describe("scoring by errors, with slack for long words (TK 6.6)", () => {
  const A = (len: number, errors: number) => scoreWord(len, errors, lifeTicks(len, E, 1, "normal"), 60, E, 1);
  it("matches TK 6.6's table of A_w and grade for lengths 3, 5, 8, 12", () => {
    const table: [number, number, number, string][] = [
      [3, 0, 1, "clean"], [3, 1, 0.6, "ok"], [3, 2, 0.2, "sloppy"], [3, 3, 0, "sloppy"],
      [5, 0, 1, "clean"], [5, 1, 0.7, "ok"], [5, 2, 0.4, "sloppy"], [5, 3, 0.1, "sloppy"],
      [8, 0, 1, "clean"], [8, 1, 0.8125, "good"], [8, 2, 0.625, "sloppy"], [8, 3, 0.4375, "sloppy"],
      [12, 0, 1, "clean"], [12, 1, 0.85, "good"], [12, 2, 0.7, "good"], [12, 3, 0.55, "sloppy"],
    ];
    for (const [len, errors, accuracy, grade] of table) {
      const score = A(len, errors);
      expect(score.accuracy, len + "/" + errors).toBeCloseTo(accuracy, 10);
      // No error: Flash or Perfect by speed (the next test); otherwise the table's grade.
      if (grade === "clean") expect(["flash", "perfect"]).toContain(score.grade);
      else expect(score.grade, len + "/" + errors).toBe(grade);
    }
  });

  it("measures speed from the moment the word appeared: Flash at S_w ≥ 0.7, Perfect slower, 0 at the end of life", () => {
    const life = lifeTicks(5, E, 1, "normal");
    const fast = Math.floor((0.35 + 0.8 * typeSeconds(5, E, 1)) * 60);
    expect(scoreWord(5, 0, life, fast, E, 1).speed).toBe(1);
    expect(scoreWord(5, 0, life, fast, E, 1).grade).toBe("flash");
    const at = (speed: number) => Math.round(life - speed * (life - fast));
    expect(scoreWord(5, 0, life, at(0.75), E, 1).grade).toBe("flash");
    expect(scoreWord(5, 0, life, at(0.6), E, 1).grade).toBe("perfect");
    expect(scoreWord(5, 0, life, life, E, 1).speed).toBe(0);
    const score = scoreWord(5, 1, life, at(0.5), E, 1);
    expect(score.speedEff).toBeCloseTo(score.speed * (0.4 + 0.6 * 0.7), 10);
    expect(score.quality).toBeCloseTo(0.6 * 0.7 + 0.4 * score.speedEff, 10);
  });

  it("keeps the raw typing speed (first key to last) apart from scoring", () => {
    expect(rawWpm(6, 1000, 2000)).toBeCloseTo(60, 10);
    expect(rawWpm(6, 1000, 1000)).toBe(0);
  });

  it("scores keys sent in one tick like keys a tick apart (only the tick of the last counts)", () => {
    const deck = smallDeck(["apple"]);
    const scores = [true, false].map((sameTick) => {
      const w = world({ deck });
      const archer = build(w, "archer", -16, -4);
      ready(w);
      spawnWord(w, archer, 0, 1);
      const born = w.tick;
      const keys = [..."apple"].map((ch, index) => ({ t: "key" as const, letter: ch.charCodeAt(0) - 97, atMs: index * 30 }));
      if (sameTick) {
        while (w.tick < born + 64) send(w);
        send(w, ...keys);
      } else {
        while (w.tick < born + 60) send(w);
        for (const key of keys) send(w, key);
      }
      expect(w.stats[STAT.streamDone]).toBe(1);
      return w.events.rare.find((event) => event.t === "wordHit");
    });
    expect(scores[0]).toEqual(scores[1]);
  });
});
