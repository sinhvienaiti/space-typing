import { describe, expect, it } from "vitest";
import { compile, contentHash, waveSchedule } from "../src/td/content/compile";
import { CALL, CAP, EXPECTED, LENGTH_BY_E, MODES, TIERS, TREE } from "../src/td/content/rules";
import { validateContent } from "../src/td/content/schema";
import { SLICE_1A } from "../src/td/content/slice-1a";
import type { Content, Mode } from "../src/td/content/types";
import { groundLanes } from "../src/td/sim/lanes";
import { canPlace } from "../src/td/sim/placement";
import { lengthBand } from "../src/td/sim/systems/calls";
import { availableLetters, bandWords, streamCap } from "../src/td/typing/decks";
import { lifeSeconds, typeSeconds } from "../src/td/typing/scorer";
import { def, q, world } from "./td/fixtures";
import { realDeck } from "./td/typing";

/** Typing Defense content (docs/td/TYPING_DEFENSE_DESIGN.md 25.4, BUILD_NOW §3, §6.1; BUILD_1A6 §2–§5). */
const copy = (): Content => JSON.parse(JSON.stringify(SLICE_1A)) as Content;

describe("1A content", () => {
  it("passes the schema and compiles with every reference resolved", () => {
    expect(validateContent(SLICE_1A)).toEqual([]);
    const c = compile(SLICE_1A);
    expect(c.buildings.map((building) => building.id)).toEqual(["keep", "archer", "cannon", "barracks", "gold-mine", "farm"]);
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
    expect(archer.buildTicks).toBe(480); // §4.3: S 8 s, M 14 s, L 18 s
    expect([c.buildings[c.buildingIndex("cannon")]!.buildTicks, c.buildings[c.buildingIndex("farm")]!.buildTicks]).toEqual([840, 1080]);
    const cannon = c.buildings[c.buildingIndex("cannon")]!;
    expect(cannon.attack!.edge).toBe(0.5);
    expect(cannon.attack!.hits).toEqual([true, false, false]);
    expect(c.buildings[c.buildingIndex("gold-mine")]!.mine!.levels.map((level) => [level.amount, level.every, level.pile])).toEqual([[3, 480, 60], [5, 480, 90], [7, 480, 120]]);
    const serpent = c.enemies[c.enemyIndex("thuong-luong")]!;
    expect([serpent.armor, serpent.resist, serpent.weight, serpent.melee?.period]).toEqual([0.6, 0, 2, 72]);
    expect(serpent.speed).toBeCloseTo(1.9 / 60, 12);
    expect(c.buildings[0]!.attack!.levels.map((level) => level.targets)).toEqual([1, 1, 2, 2]);
  });

  it("prices every building in gold and wood: wood = round(0.3 G), gold the rest, per level reached (BUILD_1A6 §3)", () => {
    const c = compile(SLICE_1A);
    for (const building of c.buildings) {
      building.def.costs.forEach((total, k) => {
        expect(building.wood[k]).toBe(Math.round(0.3 * total));
        expect(building.gold[k]! + building.wood[k]!).toBe(total);
      });
    }
    const farm = c.buildings[c.buildingIndex("farm")]!;
    expect([farm.gold[0], farm.wood[0], farm.radius, farm.placement]).toEqual([42, 18, 2.7, "free"]);
    expect([c.buildings[c.buildingIndex("archer")]!.gold[0], c.buildings[c.buildingIndex("archer")]!.wood[0]]).toEqual([49, 21]);
  });

  it("holds §2's mode table and §5.1's words a call", () => {
    expect(Object.entries(MODES).map(([mode, m]) => [mode, m.dayS, m.open, m.typeS, m.hpMul, m.floorE, m.pause, m.powerCdS])).toEqual([
      ["relax", 120, 2, 6, 0.75, 12, true, 12], ["balanced", 75, 3, 8, 1, 20, false, 8], ["challenge", 50, 4, 11, 1.15, 35, false, 6], ["learn", 120, 2, 6, 0.75, 12, true, 12],
    ]);
    expect(CALL.words).toEqual({ harvest: 3, chop: 4, mine: 2, power: 1, quiz: 1, upgrade: 3, build: { S: 2, M: 3, L: 4, XL: 4 } });
    const c = compile(SLICE_1A);
    expect(["archer", "cannon", "barracks", "gold-mine", "farm"].map((id) => c.buildings[c.buildingIndex(id)]!.words)).toEqual([2, 3, 3, 4, 4]);
    // §4.5: a powered shot.
    expect(["keep", "archer", "cannon"].map((id) => c.buildings[c.buildingIndex(id)]!.power)).toEqual([
      { dmg: 1, targets: 1, area: 1 }, { dmg: 1.6, targets: 1, area: 1 }, { dmg: 1.4, targets: 0, area: 1.3 },
    ]);
  });

  it("keeps the stream cap decks.ts still computes readable: 12 at most, 4 at least", () => {
    expect(CAP.streamLiveMax).toBeLessThanOrEqual(12);
    expect(CAP.streamLiveMin).toBe(4);
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

  it("puts about 36 trees in five clusters off roads, water, bridges and nodes, 11 m and more from the Bastion, the nearest 14–22 m (BUILD_1A6 §4.2)", () => {
    const { map } = SLICE_1A;
    expect(map.trees.length).toBeGreaterThanOrEqual(34);
    expect(map.trees.length).toBeLessThanOrEqual(38);
    const lanes = groundLanes(map.routes);
    const [kx, kz] = map.keep;
    for (const [x, z] of map.trees) {
      const where = x + ", " + z;
      expect(Math.min(...lanes.map((lane) => Math.sqrt(lane.gap2(x, z)))), where).toBeGreaterThanOrEqual(map.roadHalfM + TREE.radiusM);
      for (const rect of [...map.water, ...map.bridges]) {
        const nx = Math.max(rect.x0, Math.min(rect.x1, x)) - x;
        const nz = Math.max(rect.z0, Math.min(rect.z1, z)) - z;
        expect(nx * nx + nz * nz, where).toBeGreaterThanOrEqual(TREE.radiusM * TREE.radiusM);
      }
      for (const node of map.nodes) expect(Math.hypot(node.x - x, node.z - z), where).toBeGreaterThan(2.7 + TREE.radiusM + 1);
      expect(Math.hypot(x - kx, z - kz), where).toBeGreaterThanOrEqual(11 + TREE.radiusM);
      expect(Math.abs(x) + TREE.radiusM <= map.buildHalfM && Math.abs(z) + TREE.radiusM <= map.buildHalfM, where).toBe(true);
    }
    // Clusters: trees within 6 m of each other join; five of them, the nearest to the Bastion 14–22 m from it.
    const cluster = map.trees.map((_, t) => t);
    const root = (t: number): number => (cluster[t] === t ? t : (cluster[t] = root(cluster[t]!)));
    map.trees.forEach(([x, z], a) => map.trees.forEach(([u, v], b) => Math.hypot(x - u, z - v) <= 6 && (cluster[root(a)] = root(b))));
    const groups = [...new Set(map.trees.map((_, t) => root(t)))].map((r) => map.trees.filter((_, t) => root(t) === r));
    expect(groups.length).toBeGreaterThanOrEqual(4);
    expect(groups.length).toBeLessThanOrEqual(6);
    const nearest = Math.min(...groups.map((group) => Math.min(...group.map(([x, z]) => Math.hypot(x - kx, z - kz)))));
    expect(nearest).toBeGreaterThanOrEqual(14);
    expect(nearest).toBeLessThanOrEqual(22);
  });

  it("a standing tree blocks a building within 1.5 m of its trunk; its stump does not", () => {
    const w = world({ gold: 5000 });
    const [x, z] = w.map.trees[28]!; // the north-east corner's last, alone on its side
    const archer = def(w, "archer");
    expect(canPlace(w, archer, q(x), q(z + 3))).toEqual({ ok: false, reason: "tree" });
    w.trees.standing[28] = 0;
    expect(canPlace(w, archer, q(x), q(z + 3)).ok).toBe(true);
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

  it("every word can be typed in its scoring clock (TK 25.4): L_w ≥ 1.2 + 12·(len + 1)/(E·d) at every E, mode and band", () => {
    const clamped: string[] = [];
    for (const mode of Object.keys(MODES) as Mode[]) {
      for (let E = MODES[mode].floorE; E <= EXPECTED.max; E += 1) {
        for (const power of [false, true]) {
          const [lo, hi] = lengthBand(E, power);
          for (let len = lo; len <= hi; len += 1) {
            const life = lifeSeconds(len, E, 1, mode);
            if (life >= 1.2 + typeSeconds(len, E, 1)) continue;
            clamped.push(mode + " E" + E + " " + len + " letters: " + life.toFixed(2) + " s");
            // Challenge trims life by 10 %: the typing alone still fits.
            expect(mode, clamped[clamped.length - 1]).toBe("challenge");
            expect(life).toBeGreaterThanOrEqual(typeSeconds(len, E, 1));
          }
        }
      }
    }
    console.log("td life: " + clamped.length + " (mode, E, length) cells below 1.2 s + typing time, all in challenge; first: " + clamped.slice(0, 3).join(", "));
  });
});
