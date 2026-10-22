import { describe, expect, it } from "vitest";
import { COMBAT, FIVE_GOOD, REWARD, RICHNESS, TEMPO } from "../src/td/content/rules";
import type { WordReward } from "../src/td/content/types";
import { STAT } from "../src/td/sim/stats";
import { PROJECTILE } from "../src/td/sim/stores/projectiles";
import { rewardValue } from "../src/td/sim/systems/rewards";
import { spawnWord } from "../src/td/sim/systems/words";
import type { World } from "../src/td/sim/world";
import { wordText } from "../src/td/typing/decks";
import { scoreWord, type Score } from "../src/td/typing/scorer";
import { tempoIndex } from "../src/td/typing/tempo";
import { build, enemyAt, ready, run, world } from "./td/fixtures";
import { smallDeck, type } from "./td/typing";

/** Word rewards (docs/td/TYPING_DEFENSE_DESIGN.md 6.11; BUILD_NOW §6.1 td-rewards). */
const deck = smallDeck(["apple", "bread", "cider", "dream", "eagle", "fable", "grape", "house", "ivory", "lemon", "mango"]);
const id = (text: string) => [...Array(deck.count).keys()].find((word) => wordText(deck, word) === text)!;
const lenF = (len: number) => Math.max(0.8, Math.min(1.2, (len + 1) / 6));

function field(): World {
  const w = world({ deck, gold: 5000 });
  return w;
}

/** Deals `text` at b as agent `agent` would, types it at once with `errors` wrong keys; returns its score. */
function play(w: World, b: number, text: string, errors = 0, agent = -1): Score {
  w.buildings.assist[b] = agent;
  spawnWord(w, b, id(text), 1);
  const s = w.words.top - 1;
  const life = w.words.life[s]!;
  type(w, text[0]! + "z".repeat(errors) + text.slice(1), 100, true);
  return scoreWord(text.length, errors, life, 0, w.expected, 1);
}

/** An enemy on the ground route point nearest (x, z): it walks on from there. */
function enemyNear(w: World, id: string, x: number, z: number): number {
  let best = { route: 0, dist: 0, d2: Infinity };
  for (let route = 0; route < w.lanes.length - 1; route += 1) {
    for (let dist = 0; dist < w.lanes[route]!.length; dist += 0.5) {
      const point = w.lanes[route]!.point(dist, 0, { x: 0, z: 0 });
      const d2 = (point.x - x) ** 2 + (point.z - z) ** 2;
      if (d2 < best.d2) best = { route, dist, d2 };
    }
  }
  return enemyAt(w, id, best.route, best.dist);
}

const shots = (w: World) => w.projectiles.live().filter((p) => w.projectiles.kind[p] === PROJECTILE.wordShot);

describe("Word Shots (towers)", () => {
  it("power = D̄ × (0.8 + 1.2·Q) × T_N × lenF, fired at once; Perfect and Flash always crit, with no draw", () => {
    const w = field();
    const archer = build(w, "archer", -16, -4);
    ready(w);
    w.phase = "battle";
    const target = enemyNear(w, "thuong-luong", -16, -4);
    w.buildings.atkCd[archer] = 1e6; // the tower's own arrows (and their crit draws) wait
    const crits = w.rng.crit.state;
    const score = play(w, archer, "apple");
    expect(score.grade).toBe("flash");
    const fired = shots(w);
    expect(fired.length).toBeGreaterThanOrEqual(1);
    const p = fired[0]!;
    const power = 7.5 * (0.8 + 1.2 * score.quality) * TEMPO[tempoIndex(4)]!.tAttack * lenF(5);
    expect(w.projectiles.power[p]).toBeCloseTo(power * COMBAT.critMul, 9);
    expect(w.projectiles.crit[p]).toBe(1);
    expect(w.rng.crit.state).toBe(crits);
    expect(w.projectiles.target[p]).toBe(w.enemies.id(target));
    expect(w.stats[STAT.wordShots]).toBe(1);
  });

  it("with no enemy in range a Word Shot fizzles; the word still warms the building and adds to the chain", () => {
    const w = field();
    const archer = build(w, "archer", -16, -4);
    ready(w);
    w.phase = "battle";
    play(w, archer, "bread");
    expect(shots(w).length).toBe(0);
    expect(w.stats[STAT.fizzles]).toBe(1);
    expect(w.buildings.heat[archer]).toBeGreaterThan(0);
    expect(w.typing.chain).toBe(1);
  });

  it("the cannon's blast is ×1.15 wider; Draconis on a cannon sets the enemies it hurts burning", () => {
    const w = field();
    const cannon = build(w, "cannon", 10, -16);
    ready(w);
    w.phase = "battle";
    const target = enemyNear(w, "thuong-luong", 10, -16);
    w.enemies.hp[target] = 10000;
    w.buildings.atkCd[cannon] = 1e6; // only the Word Shot fires
    const area = w.buildings.areaMul[cannon]!; // the aura of the tick before (TK 25.6 step 6)
    play(w, cannon, "cider", 0, 0);
    const p = shots(w)[0]!;
    expect(w.projectiles.splash[p]).toBeCloseTo(2.2 * area * 1.15, 9);
    expect(w.projectiles.burn[p]).toBe(1);
    while (w.enemies.burnUntil[target] === 0) run(w, 1);
    const hp = w.enemies.hp[target]!;
    run(w, 130);
    // 3 a second for 2 s (Thuồng Luồng has no magic resist), paid in whole points.
    expect(hp - w.enemies.hp[target]!).toBeGreaterThanOrEqual(5);
    expect(hp - w.enemies.hp[target]!).toBeLessThanOrEqual(6);
  });
});

describe("gold words (mines, the Bastion)", () => {
  it("a mine pays G × lenF × qA × qS × T_N × richness straight to the treasury, in thousandths", () => {
    const w = field();
    const mine = build(w, "gold-mine", 26, -30); // ★★★
    ready(w);
    w.phase = "battle";
    const gold = w.gold;
    const score = play(w, mine, "dream", 1);
    const expected = 2.0 * lenF(5) * (0.4 + 0.6 * score.accuracy) * (0.8 + 0.4 * score.speed) * TEMPO[tempoIndex(4)]!.tEconomy * RICHNESS[2];
    expect(w.gold - gold).toBe(Math.round(expected * 1000));
    expect(w.buildings.pile[mine]).toBe(0);
    expect(w.stats[STAT.goldWord]).toBe(w.gold - gold);
  });

  it("the Bastion pays 1.5 × qA × T_N × lenF and its crossbow fires one more bolt", () => {
    const w = field();
    w.phase = "battle";
    enemyAt(w, "cuong-thi", 0, w.lanes[0]!.length - 6);
    w.buildings.atkCd[0] = 1e6; // the crossbow's own shot is not ready: any bolt is the word's
    const gold = w.gold;
    const score = play(w, 0, "eagle");
    expect(w.gold - gold).toBe(Math.round(1.5 * (0.4 + 0.6 * score.accuracy) * TEMPO[tempoIndex(4)]!.tEconomy * lenF(5) * 1000));
    expect(w.projectiles.live().some((p) => w.projectiles.kind[p] === PROJECTILE.bolt)).toBe(true);
  });

  it("a helper on its specialty adds its share (Gạch at a mine: +10 %)", () => {
    const plain = field();
    const mine = build(plain, "gold-mine", 26, -30);
    ready(plain);
    plain.phase = "battle";
    const start = plain.gold;
    play(plain, mine, "fable");
    const base = plain.gold - start;
    const helped = field();
    const mine2 = build(helped, "gold-mine", 26, -30);
    ready(helped);
    helped.phase = "battle";
    const start2 = helped.gold;
    play(helped, mine2, "fable", 0, 3);
    expect(Math.abs(helped.gold - start2 - base * 1.1)).toBeLessThanOrEqual(1);
  });

  it("five good words in a row at a mine pay +5 × richness; a sloppy word starts the count again", () => {
    const w = field();
    const mine = build(w, "gold-mine", 26, -30);
    ready(w);
    w.phase = "battle";
    play(w, mine, "apple");
    play(w, mine, "bread", 3);
    const paid: number[] = [];
    for (const word of ["cider", "dream", "eagle", "fable", "grape"]) {
      const gold = w.gold;
      play(w, mine, word);
      paid.push(w.gold - gold);
    }
    expect(paid[4]! - paid[3]!).toBeGreaterThanOrEqual(FIVE_GOOD.mineGold * RICHNESS[2] * 1000 - 50);
    expect(w.buildings.streak[mine]).toBe(0);
  });

  it("pays nothing while preparing (TK 11.2)", () => {
    const w = field();
    const mine = build(w, "gold-mine", 26, -30);
    ready(w);
    const gold = w.gold;
    play(w, mine, "house");
    expect(w.gold).toBe(gold);
    expect(w.buildings.heat[mine]).toBeGreaterThan(0);
  });
});

describe("barracks words", () => {
  it("bring the longest-dead soldier back 3 s × qQ × T_N × lenF sooner; with none dead, heal 8 % × the same", () => {
    const w = field();
    const barracks = build(w, "barracks", 2, 18);
    ready(w);
    w.phase = "battle";
    const squad = w.units.live().filter((s) => w.units.barracks[s] === barracks);
    w.units.hp[squad[0]!] = 0;
    w.units.respawnAt[squad[0]!] = w.tick + 400;
    w.units.hp[squad[1]!] = 0;
    w.units.respawnAt[squad[1]!] = w.tick + 500;
    const before = w.units.respawnAt[squad[0]!]!;
    const score = play(w, barracks, "ivory");
    const share = (0.5 + 0.5 * score.quality) * TEMPO[tempoIndex(4)]!.tAttack * lenF(5);
    expect(before - w.units.respawnAt[squad[0]!]!).toBe(Math.round(3 * 60 * share));
    const healthy = field();
    const b2 = build(healthy, "barracks", 2, 18);
    ready(healthy);
    healthy.phase = "battle";
    const soldiers = healthy.units.live().filter((s) => healthy.units.barracks[s] === b2);
    for (const s of soldiers) healthy.units.hp[s] = 20;
    const score2 = play(healthy, b2, "lemon");
    const heal = Math.round(60 * 0.08 * (0.5 + 0.5 * score2.quality) * TEMPO[tempoIndex(4)]!.tAttack * lenF(5));
    for (const s of soldiers) expect(healthy.units.hp[s]).toBe(20 + heal);
  });

  it("five good words in a row add a soldier for 15 s, at most 2 a barracks", () => {
    const w = field();
    const barracks = build(w, "barracks", 2, 18);
    ready(w);
    w.phase = "battle";
    const count = () => w.units.live().filter((s) => w.units.barracks[s] === barracks && w.units.temp[s] === 2).length;
    for (const word of ["apple", "bread", "cider", "dream", "eagle"]) play(w, barracks, word);
    expect(count()).toBe(1);
    for (const word of ["fable", "grape", "house", "ivory", "lemon"]) play(w, barracks, word);
    expect(count()).toBe(2);
    for (const word of ["mango", "apple", "bread", "cider", "dream"]) play(w, barracks, word);
    expect(count()).toBe(2);
    run(w, 15 * 60);
    expect(count()).toBe(0);
  });
});

describe("no cap on a word's reward (TK 0.2 rule 5)", () => {
  it("grows in proportion to tempo, level, richness and specialty, however large", () => {
    const score: Score = { grade: "perfect", accuracy: 1, speed: 1, speedEff: 1, quality: 1 };
    const rewards: WordReward[] = [
      { kind: "shot", dBar: [7.5, 11, 15.5], pierce: 1 },
      { kind: "resource", resource: "gold", perLevel: [2, 2.4, 2.8], richness: true },
      { kind: "keep", goldPerWord: 1.5, crossbowShot: true },
      { kind: "soldiers", respawnCutS: 3, healPct: 0.08 },
    ];
    for (const reward of rewards) {
      const one = rewardValue(reward, 3, 8, score, 1, 1.25, 1);
      expect(rewardValue(reward, 3, 8, score, 1000, 1.25, 1)).toBeCloseTo(one * 1000, 6);
      expect(rewardValue(reward, 3, 8, score, 1, 1.25, 50)).toBeCloseTo(one * 50, 6);
    }
    expect(rewardValue(rewards[0]!, 3, 8, score, 1, 1, 1)).toBeCloseTo(15.5 * (REWARD.shotQ[0] + REWARD.shotQ[1]) * 1.2, 9);
  });
});
