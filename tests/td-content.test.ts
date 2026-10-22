import { describe, expect, it } from "vitest";
import { compile, contentHash, waveSchedule } from "../src/td/content/compile";
import { AURA_ATTACK, CAP, EXPECTED, LENGTH_BY_E, TEMPO, TIERS } from "../src/td/content/rules";
import { validateContent } from "../src/td/content/schema";
import { SLICE_1A } from "../src/td/content/slice-1a";
import type { Content, Difficulty } from "../src/td/content/types";
import { availableLetters, bandWords, streamCap } from "../src/td/typing/decks";
import { lifeSeconds, typeSeconds } from "../src/td/typing/scorer";
import { lengthBand } from "../src/td/typing/tempo";
import { realDeck } from "./td/typing";

/** Typing Defense content (docs/td/TYPING_DEFENSE_DESIGN.md 25.4, BUILD_NOW §3, §6.1). */
const copy = (): Content => JSON.parse(JSON.stringify(SLICE_1A)) as Content;

describe("1A content", () => {
  it("passes the schema and compiles with every reference resolved", () => {
    expect(validateContent(SLICE_1A)).toEqual([]);
    const c = compile(SLICE_1A);
    expect(c.buildings.map((building) => building.id)).toEqual(["keep", "archer", "cannon", "barracks", "gold-mine"]);
    expect(c.enemies.map((enemy) => enemy.id)).toEqual(["cuong-thi", "ma-troi", "thuong-luong"]);
    for (const wave of SLICE_1A.waves.list) for (const entry of wave) expect(c.enemyIndex(entry.enemy)).toBeGreaterThanOrEqual(0);
    expect(c.content.hero.affinity.every((id) => c.buildingIndex(id) > 0)).toBe(true);
  });

  it("compiles seconds to ticks and percentages to fractions once", () => {
    const c = compile(SLICE_1A);
    const archer = c.buildings[c.buildingIndex("archer")]!;
    expect(archer.attack!.levels.map((level) => level.period)).toEqual([54, 48, 42]);
    expect(archer.attack!.crit).toBe(0.1);
    expect(archer.radius).toBe(2.0);
    expect(archer.buildTicks).toBe(90);
    const cannon = c.buildings[c.buildingIndex("cannon")]!;
    expect(cannon.attack!.edge).toBe(0.5);
    expect(cannon.attack!.hits).toEqual([true, false, false]);
    expect(c.buildings[c.buildingIndex("gold-mine")]!.mine!.levels.map((level) => [level.amount, level.every, level.pile])).toEqual([[3, 480, 60], [5, 480, 90], [7, 480, 120]]);
    const serpent = c.enemies[c.enemyIndex("thuong-luong")]!;
    expect([serpent.armor, serpent.resist, serpent.weight, serpent.melee?.period]).toEqual([0.6, 0, 2, 72]);
    expect(serpent.speed).toBeCloseTo(1.9 / 60, 12);
    expect(c.buildings[0]!.attack!.levels.map((level) => level.targets)).toEqual([1, 1, 2, 2]);
  });

  it("denser tempos never lower T_N or k_N and never allow longer words (TK 25.4)", () => {
    const tempos = TEMPO.slice(1);
    for (let index = 1; index < tempos.length; index += 1) {
      const slower = tempos[index - 1]!;
      const denser = tempos[index]!;
      expect(denser.periodS).toBeLessThan(slower.periodS);
      expect(denser.tAttack).toBeGreaterThanOrEqual(slower.tAttack);
      expect(denser.tEconomy).toBeGreaterThanOrEqual(slower.tEconomy);
      expect(denser.auraK).toBeGreaterThanOrEqual(slower.auraK);
      const maxLen = (tempo: (typeof TEMPO)[number]) => ("maxLen" in tempo ? tempo.maxLen : Infinity);
      expect(maxLen(denser)).toBeLessThanOrEqual(maxLen(slower));
      expect(denser.minLevel).toBeGreaterThanOrEqual(slower.minLevel);
    }
    expect(TEMPO.map((tempo) => [tempo.periodS, tempo.minLevel])).toEqual([[0, 1], [8, 1], [6, 1], [4, 1], [3, 1], [2, 2], [1, 3]]);
    expect(TEMPO.filter((tempo) => "easyOnly" in tempo).map((tempo) => tempo.periodS)).toEqual([8]);
  });

  it("keeps the word caps readable: 16 live, 12 per stream, 4 per building", () => {
    expect(CAP.liveWords).toBeLessThanOrEqual(16);
    expect(CAP.streamLiveMax).toBeLessThanOrEqual(12);
    expect(CAP.streamLiveMin).toBe(4);
    expect(CAP.wordsPerBuilding).toBeLessThanOrEqual(4);
  });

  it("gives every enemy gold and leak inside its tier's range (TK 14.2)", () => {
    for (const enemy of SLICE_1A.enemies) {
      const tier = TIERS[enemy.tier];
      expect(enemy.gold, enemy.id).toBeGreaterThanOrEqual(tier.gold[0]);
      expect(enemy.gold, enemy.id).toBeLessThanOrEqual(tier.gold[1]);
      expect(enemy.leak, enemy.id).toBeGreaterThanOrEqual(tier.leak[0]);
      expect(enemy.leak, enemy.id).toBeLessThanOrEqual(tier.leak[1]);
    }
  });

  it("fixes the aura caps (TK 6.10): ×1.5 rate, ×1.4 damage, ×1.5 area, +2 targets", () => {
    expect(AURA_ATTACK.caps).toEqual({ rate: 1.5, dmg: 1.4, area: 1.5, targets: 2 });
  });

  it("reports data mistakes, all at once", () => {
    const broken = copy() as unknown as { enemies: { id: string; gold: number }[]; waves: { list: { enemy: string; count: number }[][] }; buildings: { id: string }[] };
    broken.enemies[0]!.gold = 9;
    broken.waves.list[0]![0]!.enemy = "nobody";
    broken.buildings[2]!.id = "archer";
    const problems = validateContent(broken as unknown as Content);
    expect(problems.some((problem) => problem.startsWith("cuong-thi: gold 9"))).toBe(true);
    expect(problems).toContain("wave 1: unknown enemy nobody");
    expect(problems).toContain("archer: id used twice");
  });

  it("hashes the rules and the slice but not the view blocks", () => {
    const hash = contentHash(SLICE_1A);
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
    expect(contentHash(copy())).toBe(hash);
    const recoloured = copy() as unknown as { buildings: { view: { color: string } }[] };
    recoloured.buildings[1]!.view.color = "#000000";
    expect(contentHash(recoloured as unknown as Content)).toBe(hash);
    const retuned = copy() as unknown as { enemies: { hp: number }[] };
    retuned.enemies[0]!.hp = 36;
    expect(contentHash(retuned as unknown as Content)).not.toBe(hash);
  });

  it("cuts waves into packs that take the two ground routes in turn; past wave 6 the last wave grows 15 % a wave", () => {
    const c = compile(SLICE_1A);
    const first = waveSchedule(c, 1);
    expect(first.map((spawn) => spawn.lane)).toEqual([0, 0, 0, 0, 0, 1, 1, 1]);
    expect(first.map((spawn) => spawn.at)).toEqual([0, 27, 54, 81, 108, 258, 285, 312]);
    const second = waveSchedule(c, 2);
    expect(second.filter((spawn) => spawn.lane < 0).map((spawn) => c.enemies[spawn.enemy]!.id)).toEqual(["ma-troi"]);
    const count = (wave: number, id: string) => waveSchedule(c, wave).filter((spawn) => c.enemies[spawn.enemy]!.id === id).length;
    expect([count(6, "thuong-luong"), count(6, "cuong-thi"), count(6, "ma-troi")]).toEqual([4, 20, 4]);
    expect([count(7, "thuong-luong"), count(7, "cuong-thi"), count(7, "ma-troi")]).toEqual([5, 23, 5]);
    expect([count(10, "thuong-luong"), count(10, "cuong-thi"), count(10, "ma-troi")]).toEqual([6, 32, 6]);
  });

  it("A and the stream cap on the real vocabulary, levels 1, 1–3, 1–5, match TK 6.5's table", () => {
    const deck = realDeck();
    const measured = [1, 3, 5].map((level) => LENGTH_BY_E.map(({ len }) => {
      const words = bandWords(deck, level, len[0], len[1]);
      const a = availableLetters(deck, words);
      return [words.length, a, streamCap(a)];
    }));
    // TK 6.5's 4–8 column was measured on 5–8 letters (58 / 237 / 453 words); the real 4–8 band is wider.
    expect(measured).toEqual([
      [[122, 16, 10], [140, 16, 10], [123, 15, 9], [124, 15, 9]],
      [[291, 19, 12], [362, 20, 12], [355, 21, 12], [375, 21, 12]],
      [[499, 22, 12], [626, 22, 12], [635, 23, 12], [676, 23, 12]],
    ]);
    expect([1, 3, 5].map((level) => bandWords(deck, level, 5, 8).length)).toEqual([58, 237, 453]);
  });

  it("every word can be typed in its life (TK 25.4): L_w ≥ 1.2 + 12·(len + 1)/(E·d) at every E and tempo, easy and normal", () => {
    const clamped: string[] = [];
    for (const difficulty of ["easy", "normal", "hard"] as Difficulty[]) {
      for (let E = EXPECTED.floor[difficulty]; E <= EXPECTED.max; E += 1) {
        for (let tempo = 1; tempo < TEMPO.length; tempo += 1) {
          const [lo, hi] = lengthBand(E, tempo);
          for (let len = lo; len <= hi; len += 1) {
            const life = lifeSeconds(len, E, 1, difficulty);
            if (life >= 1.2 + typeSeconds(len, E, 1)) continue;
            clamped.push(difficulty + " E" + E + " " + len + " letters: " + life.toFixed(2) + " s");
            // Hard trims life by 10 %: the typing alone still fits.
            expect(difficulty, clamped[clamped.length - 1]).toBe("hard");
            expect(life).toBeGreaterThanOrEqual(typeSeconds(len, E, 1));
          }
        }
      }
    }
    console.log("td life: " + clamped.length + " (difficulty, E, length) cells below 1.2 s + typing time, all on hard; first: " + clamped.slice(0, 3).join(", "));
  });
});
