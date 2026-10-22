import { describe, expect, it } from "vitest";
import { STAT } from "../src/td/sim/stats";
import { lifeSeconds, lifeTicks, rawWpm, scoreWord, typeSeconds } from "../src/td/typing/scorer";
import { run, send, world } from "./td/fixtures";
import { callWord, smallDeck, type } from "./td/typing";
import { expectedE, lengthBand } from "../src/td/sim/systems/calls";

/** Scoring a word (docs/td/TYPING_DEFENSE_DESIGN.md 6.4, 6.6; BUILD_NOW §6.1 td-scorer; BUILD_1A6 §2, §5.4). */
const E = 35;

describe("word life, the clock a call's word is scored against", () => {
  it("L_w = clamp(1.2 + 12·(len + 1)/(E·d); 3; 6) × k_L of the mode: TK 6.4's examples", () => {
    expect(lifeSeconds(5, 20, 1, "balanced")).toBeCloseTo(4.8, 10);
    expect(lifeSeconds(5, 35, 1, "balanced")).toBeCloseTo(3.257, 3);
    expect(lifeSeconds(5, 60, 1, "balanced")).toBe(3);
    expect(lifeSeconds(8, 12, 1, "relax")).toBe(7.5);
    expect(lifeSeconds(8, 12, 1, "learn")).toBe(7.5);
    expect(lifeSeconds(3, 140, 1, "challenge")).toBeCloseTo(2.7, 10);
    expect(lifeTicks(5, 35, 1, "balanced")).toBe(195);
  });
});

describe("E = max(B, the mode's floor): relax and learn 12, balanced 20, challenge 35 (TK 6.6, BUILD_1A6 §2)", () => {
  const deck = smallDeck(["apple", "bread", "cider", "garden"]);
  const field = (mode: "relax" | "balanced" | "challenge" | "learn", expected: number) => {
    const w = world({ deck, mode, expected });
    const s = callWord(w, 0);
    return { w, life: w.words.life[s]! };
  };

  it("lifts B under the floor: the scoring clock reads E", () => {
    expect(expectedE(field("relax", 12).w)).toBe(12);
    expect(expectedE(field("learn", 12).w)).toBe(12);
    const balanced = field("balanced", 12);
    expect(expectedE(balanced.w)).toBe(20);
    expect(balanced.life).toBe(Math.round(4.8 * 60)); // a 5-letter word at E = 20, not 6.0 s at 12
    const challenge = field("challenge", 20);
    expect(expectedE(challenge.w)).toBe(35);
    expect(challenge.life).toBe(lifeTicks(5, 35, 1, "challenge")); // 2.93 s, not 4.32 s at 20
    run(challenge.w, 100);
    const hit = type(challenge.w, "apple", 50, true).find((event) => event.t === "wordHit");
    expect(hit).toMatchObject({ quality: scoreWord(5, 0, challenge.life, 100, 35, 1).quality });
  });

  it("word length follows E (TK 6.3); a power word takes the band's lower half; a sandbox mode change moves the floor and the band", () => {
    expect(lengthBand(20)).toEqual([3, 5]);
    expect(lengthBand(35)).toEqual([3, 6]);
    expect(lengthBand(35, true)).toEqual([3, 4]);
    expect(lengthBand(70)).toEqual([4, 8]);
    expect(lengthBand(70, true)).toEqual([4, 6]);
    const w = world({ deck, expected: 20 });
    expect(lengthBand(expectedE(w))).toEqual([3, 5]);
    send(w, { t: "sandbox", op: { op: "mode", value: "challenge" } });
    expect(lengthBand(expectedE(w))).toEqual([3, 6]); // E = 35: "garden" joins
    send(w, { t: "sandbox", op: { op: "mode", value: "relax" } });
    expect(lengthBand(expectedE(w))).toEqual([3, 5]);
  });
});

describe("scoring by errors, with slack for long words (TK 6.6)", () => {
  const A = (len: number, errors: number) => scoreWord(len, errors, lifeTicks(len, E, 1, "balanced"), 60, E, 1);
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
    const life = lifeTicks(5, E, 1, "balanced");
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
      callWord(w, 0);
      const born = w.tick;
      const keys = [..."apple"].map((ch, index) => ({ t: "key" as const, letter: ch.charCodeAt(0) - 97, atMs: index * 30 }));
      if (sameTick) {
        while (w.tick < born + 64) send(w);
        send(w, ...keys);
      } else {
        while (w.tick < born + 60) send(w);
        for (const key of keys) send(w, key);
      }
      expect(w.stats[STAT.callWords]).toBe(1);
      return w.events.rare.find((event) => event.t === "wordHit");
    });
    expect(scores[0]).toEqual(scores[1]);
  });
});
