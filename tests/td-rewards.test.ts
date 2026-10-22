import { describe, expect, it } from "vitest";
import { COMBAT, MODES, POWER } from "../src/td/content/rules";
import { STAT } from "../src/td/sim/stats";
import { CALL_KIND, CALL_STATE } from "../src/td/sim/stores/calls";
import { PROJECTILE } from "../src/td/sim/stores/projectiles";
import { towersAttack } from "../src/td/sim/systems/combat";
import { shotPower } from "../src/td/sim/systems/rewards";
import type { World } from "../src/td/sim/world";
import { wordText } from "../src/td/typing/decks";
import { scoreWord } from "../src/td/typing/scorer";
import { built, enemyAt, goTo, run, send, world } from "./td/fixtures";
import { callWord, smallDeck, type, wordOf } from "./td/typing";

/** Power charges and power words (docs/td/BUILD_1A6.md §4.5; TK 6.11's Word Shot). */
const deck = smallDeck(["apple", "bread", "cider", "dream", "eagle", "fable", "grape", "house", "ivory", "lemon", "mango"]);
const lenF = (len: number) => Math.max(0.8, Math.min(1.2, (len + 1) / 6));
const T = (seconds: number) => Math.round(seconds * 60);

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

/** A power word `text` on building b, typed at once with `errors` wrong keys; returns its score. */
function power(w: World, b: number, text: string, errors = 0) {
  const s = callWord(w, wordOf(deck, text), 1, CALL_KIND.power, b);
  const life = w.words.life[s]!;
  type(w, text[0]! + "z".repeat(errors) + text.slice(1), 100, true);
  return scoreWord(text.length, errors, life, 0, w.expected, 1);
}

describe("power words (§4.5)", () => {
  it("fire a Word Shot at once, D̄ × (0.8 + 1.2·Q) × lenF; Perfect and Flash always crit, with no draw; +2 charges, +1 for a whole Perfect call", () => {
    const w = world({ deck, gold: 1000 });
    const archer = built(w, "archer", -16, -4);
    const target = enemyNear(w, "thuong-luong", -16, -4);
    w.buildings.atkCd[archer] = 1e6; // the tower's own arrows (and their crit draws) wait
    const crits = w.rng.crit.state;
    const score = power(w, archer, "apple");
    expect(score.grade).toBe("flash");
    const fired = shots(w);
    expect(fired.length).toBe(1); // one target in reach (it could pierce to a second)
    const p = fired[0]!;
    expect(w.projectiles.power[p]).toBeCloseTo(shotPower(7.5, 5, score.quality) * COMBAT.critMul, 9);
    expect(shotPower(7.5, 5, score.quality)).toBeCloseTo(7.5 * (0.8 + 1.2 * score.quality) * lenF(5), 12);
    expect([w.projectiles.crit[p], w.rng.crit.state, w.projectiles.target[p]]).toEqual([1, crits, w.enemies.id(target)]);
    expect(w.stats[STAT.wordShots]).toBe(1);
    expect(w.buildings.charges[archer]).toBe(POWER.perWord + POWER.perfect);
  });

  it("with no enemy in reach a Word Shot fizzles; the charges still come, and the chain grows", () => {
    const w = world({ deck, gold: 1000 });
    const archer = built(w, "archer", -16, -4);
    power(w, archer, "bread", 1); // one error: not Perfect, no bonus charge
    expect(shots(w).length).toBe(0);
    expect(w.stats[STAT.fizzles]).toBe(1);
    expect([w.buildings.charges[archer], w.typing.chain]).toEqual([POWER.perWord, 1]);
    w.buildings.charges[archer] = 4;
    power(w, archer, "cider");
    expect(w.buildings.charges[archer]).toBe(POWER.max);
  });

  it("the cannon's Word Shot blasts ×1.15 wider; with Draconis within his ring it sets what it hurts burning", () => {
    const w = world({ deck, gold: 1000 });
    const cannon = built(w, "cannon", 10, -16);
    goTo(w, 0, 10, -10);
    const target = enemyNear(w, "thuong-luong", 10, -16);
    w.enemies.hp[target] = 10000;
    w.buildings.atkCd[cannon] = 1e6; // only the Word Shot fires
    w.agents.atkCd[0] = 1e9; // and Draconis throws no fireball of his own
    power(w, cannon, "cider");
    const p = shots(w)[0]!;
    expect(w.projectiles.splash[p]).toBeCloseTo(2.2 * 1.15, 9);
    expect(w.projectiles.burn[p]).toBe(1);
    while (w.enemies.burnUntil[target] === 0) run(w, 1);
    const hp = w.enemies.hp[target]!;
    run(w, 130);
    expect(hp - w.enemies.hp[target]!).toBeGreaterThanOrEqual(5);
    expect(hp - w.enemies.hp[target]!).toBeLessThanOrEqual(6);
  });

  it("the Bastion's power word is a crossbow volley at one target more", () => {
    const w = world({ deck });
    const lane = w.lanes[0]!;
    enemyAt(w, "thuong-luong", 0, lane.length - 4);
    enemyAt(w, "thuong-luong", 1, w.lanes[1]!.length - 5);
    w.buildings.atkCd[0] = 1e6;
    power(w, 0, "dream");
    expect(w.projectiles.live().filter((p) => w.projectiles.kind[p] === PROJECTILE.bolt).length).toBe(2);
  });
});

describe("powered shots (§4.5)", () => {
  it("spend a charge a volley: archer ×1.6 damage and one target more; cannon ×1.4 and a blast ×1.3 wider; the Bastion one target more", () => {
    const volley = (id: string, x: number, z: number, charges: number) => {
      const w = world({ gold: 1000 });
      const b = id === "keep" ? 0 : built(w, id, x, z);
      for (let k = 0; k < 3; k += 1) enemyNear(w, "thuong-luong", x, z);
      w.buildings.charges[b] = charges;
      towersAttack(w);
      const fired = w.projectiles.live();
      return { count: fired.length, splash: w.projectiles.splash[fired[0]!]!, charges: w.buildings.charges[b]!, w };
    };
    const [plain, powered] = [volley("archer", -16, -4, 0), volley("archer", -16, -4, 2)];
    expect([plain.count, powered.count, powered.charges]).toEqual([1, 2, 1]);
    const [cannon, boom] = [volley("cannon", 10, -16, 0), volley("cannon", 10, -16, 1)];
    expect([cannon.count, boom.count, boom.charges]).toEqual([1, 1, 0]);
    expect(boom.splash).toBeCloseTo(cannon.splash * 1.3, 9);
    const [keep, crossbow] = [volley("keep", 0, 36, 0), volley("keep", 0, 36, 1)];
    expect([keep.count, crossbow.count]).toEqual([1, 2]);
    // ×1.6 before armour: the same roll on the same stream, so the same base.
    const damage = (charges: number) => {
      const { w } = volley("archer", -16, -4, charges);
      return w.projectiles.power[w.projectiles.live()[0]!]!;
    };
    expect(damage(1)).toBeCloseTo(damage(0) * 1.6, 9);
  });
});

describe("power calls (§4.5)", () => {
  /** A power word comes from the lower half of the length band (§5.2): 3–4 letters at E = 35. */
  const short = smallDeck(["cat", "dog", "sun", "map", "pen", "kite", "lamp", "frog"]);
  const night = () => {
    const w = world({ deck: short, gold: 1000 });
    const archer = built(w, "archer", -16, -4);
    send(w, { t: "sandbox", op: { op: "night" } });
    w.spawnQueue.length = 0; // the test's enemies only
    w.lives = 1e6;
    return { w, archer };
  };

  it("come only at night, with an enemy in reach, under 5 charges, past the mode's cooldown: 1 word that lives 6 s", () => {
    const day = world({ deck, gold: 1000 });
    const tower = built(day, "archer", -16, -4);
    enemyNear(day, "thuong-luong", -16, -4);
    run(day, 2);
    expect(day.buildings.call[tower]).toBe(-1);
    const { w, archer } = night();
    run(w, 2);
    expect(w.buildings.call[archer]).toBe(-1); // nothing in reach
    const e = enemyNear(w, "thuong-luong", -16, -4);
    const at = w.enemies.dist[e]!;
    const hold = (ticks: number) => {
      for (let k = 0; k < ticks; k += 1) {
        w.enemies.dist[e] = at; // it stays in reach
        run(w, 1);
      }
    };
    w.enemies.hp[e] = 1e6;
    w.buildings.atkCd[archer] = 1e9;
    hold(1);
    const c = w.buildings.call[archer]!;
    const born = w.calls.born[c]!;
    expect([w.calls.kind[c], w.calls.words[c], w.calls.expire[c]! - born, w.calls.state[c]]).toEqual([CALL_KIND.power, 1, T(6), CALL_STATE.open]);
    // Not typed: it ends at 6 s, costing nothing; the next comes once the cooldown (8 s from the last) is over.
    const chain = w.typing.chain;
    hold(T(6));
    expect([w.calls.used[c], w.buildings.call[archer], w.typing.chain]).toEqual([0, -1, chain]);
    let again = -1;
    for (let k = 0; k < T(10) && again < 0; k += 1) {
      hold(1);
      if (w.buildings.call[archer]! >= 0) again = w.calls.born[w.buildings.call[archer]!]!;
    }
    expect(again - born).toBe(T(MODES.balanced.powerCdS));
    w.buildings.charges[archer] = POWER.max;
    closeAll(w);
    hold(T(10));
    expect(w.buildings.call[archer]).toBe(-1); // full
  });

  it("a locked power word outlives the 6 s until it is typed", () => {
    const { w, archer } = night();
    goTo(w, 0, -16, 0);
    const e = enemyNear(w, "thuong-luong", -16, -4);
    w.enemies.hp[e] = 1e6;
    run(w, 1);
    const c = w.buildings.call[archer]!;
    const s = w.calls.word[c]!;
    const letters = wordText(w.typing.deck, w.words.word[s]!);
    type(w, letters[0]!);
    run(w, T(7));
    expect([w.calls.used[c], w.typing.router.lock]).toEqual([1, s]);
    type(w, letters.slice(1));
    expect(w.calls.used[c]).toBe(0);
    expect(w.buildings.charges[archer]).toBeGreaterThanOrEqual(POWER.perWord - 1);
  });
});

/** Ends every call (a test's clean slate). */
function closeAll(w: World): void {
  for (const c of w.calls.live()) w.calls.expire[c] = w.tick;
  run(w, 1);
}
