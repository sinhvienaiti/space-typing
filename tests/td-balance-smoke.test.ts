import { describe, expect, it } from "vitest";
import { createRng } from "../src/platform/rng";
import type { CommandBody } from "../src/td/sim/commands";
import { STATS } from "../src/td/sim/stats";
import { step } from "../src/td/sim/world";
import { tempoIndex } from "../src/td/typing/tempo";
import { balanceReport, createReport, hands, totalsOf } from "./td/balance";
import { runBot } from "./td/bot";
import { enemyPoint } from "./td/fixtures";
import { Keystrokes, NEIGHBOURS } from "./td/keystrokes";
import { BALANCED, slotsLayout } from "./td/policies/layouts";
import { pendulum } from "./td/policies/hero";
import { Plan } from "./td/policies/stand";
import { hintTempo, loadTempo } from "./td/policies/tempo";
import { Reader } from "./td/reader";
import { assisted, realDeck, SPOTS } from "./td/typing";

const MS = 1000 / 60;

/**
 * The bots behind `pnpm td:balance` (docs/td/BUILD_NOW.md §6.1, §6.3): hands
 * and eyes do what they claim, the hint policy follows the game's hint,
 * three fast bots (25, 35, 70 WPM) play three waves through commands the
 * world takes with every word invariant holding, their numbers sit in rough
 * ranges (not the balance targets, which are only printed), a report line's
 * seeds play as if each ran alone, and the report still runs.
 */
describe("bot hands and eyes", () => {
  it("presses keys at the WPM, slips onto a neighbouring key by the accuracy, the same for the same seed", () => {
    const hands = new Keystrokes({ wpm: 40, accuracy: 0.9, backspace: 0.5 }, createRng(7).ai);
    const gaps = Array.from({ length: 4000 }, () => hands.gap());
    const mean = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    expect(mean).toBeGreaterThan(300 * 0.97);
    expect(mean).toBeLessThan(300 * 1.03);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(150);
    expect(Math.max(...gaps)).toBeLessThan(450);
    const aimed = Array.from({ length: 4000 }, (_, k) => k % 26);
    const hit = aimed.map((letter) => hands.hit(letter));
    const slips = hit.filter((letter, k) => letter !== aimed[k]);
    expect(slips.length / aimed.length).toBeGreaterThan(0.08);
    expect(slips.length / aimed.length).toBeLessThan(0.12);
    hit.forEach((letter, k) => letter !== aimed[k] && expect(NEIGHBOURS[aimed[k]!]).toContain(letter));
    expect(NEIGHBOURS["a".charCodeAt(0) - 97]!.map((c) => String.fromCharCode(97 + c))).toEqual(["s"]);
    expect(NEIGHBOURS["g".charCodeAt(0) - 97]!.map((c) => String.fromCharCode(97 + c))).toEqual(["f", "h"]);
    const again = new Keystrokes({ wpm: 40, accuracy: 0.9, backspace: 0.5 }, createRng(7).ai);
    expect(Array.from({ length: 50 }, () => again.gap())).toEqual(gaps.slice(0, 50));
  });

  it("sees a word 0.35–0.6 s after it appears and, with no enemy anywhere, picks the one with least time left that it can still finish", () => {
    const { w } = assisted({ deck: realDeck(), expected: 35 }, [SPOTS.archer, SPOTS.cannon], 2);
    for (const b of w.buildings.live(1)) step(w, [{ t: "setTempo", building: w.buildings.id(b), idx: 6, tick: w.tick }]);
    expect(w.enemies.count).toBe(0);
    const eyes = new Reader(createRng(3).props);
    const delays: number[] = [];
    const firstSeen = new Map<number, number>();
    const start = w.tick;
    for (let tick = 0; tick < 60 * 40; tick += 1) {
      eyes.look(w);
      for (const s of w.words.live()) if (w.words.born[s]! >= start && eyes.seen(w, s) && !firstSeen.has(w.words.id(s))) firstSeen.set(w.words.id(s), w.tick - w.words.born[s]!);
      const pick = eyes.pick(w, 300);
      if (pick >= 0) {
        expect(eyes.seen(w, pick)).toBe(true);
        const len = w.typing.deck.len[w.words.word[pick]!]!;
        expect((w.words.expire[pick]! - w.tick) * (1000 / 60)).toBeGreaterThanOrEqual(len * 300);
        // No other seen word it could still finish has less time left.
        for (const s of w.words.live()) {
          if (s === pick || !eyes.seen(w, s) || (w.words.expire[s]! - w.tick) * MS < w.typing.deck.len[w.words.word[s]!]! * 300) continue;
          expect(w.words.expire[s]).toBeGreaterThanOrEqual(w.words.expire[pick]!);
        }
      }
      step(w);
      w.events.rare.length = 0;
    }
    delays.push(...firstSeen.values());
    expect(delays.length).toBeGreaterThan(40);
    expect(Math.min(...delays)).toBeGreaterThanOrEqual(21);
    expect(Math.max(...delays)).toBeLessThanOrEqual(36);
  });

  it("takes a word of a building with an enemy in reach first while it has under 1 s more left, not when it has more", () => {
    const { w, slots: [archer, cannon] } = assisted({ deck: realDeck(), expected: 35 }, [SPOTS.archer, SPOTS.cannon], 2);
    for (const b of [archer!, cannon!]) step(w, [{ t: "setTempo", building: w.buildings.id(b), idx: tempoIndex(1), tick: w.tick }]);
    const eyes = new Reader(createRng(5).props);
    const B = w.buildings;
    const W = w.words;
    const wordAt = (b: number) => W.live().find((s) => W.building[s] === b && eyes.seen(w, s)) ?? -1;
    for (let tick = 0; tick < 600 && (wordAt(archer!) < 0 || wordAt(cannon!) < 0); tick += 1) {
      step(w);
      eyes.look(w);
    }
    const [a, c] = [wordAt(archer!), wordAt(cannon!)];
    expect(a).toBeGreaterThanOrEqual(0);
    expect(c).toBeGreaterThanOrEqual(0);

    // A Cương Thi 3 m from the archer: in its 10 m (BUILD_NOW §3.2), out of the cannon's 9 m.
    const near = (b: number, e: number, metres: number) => Math.hypot(B.x[b]! - w.enemies.x[e]!, B.z[b]! - w.enemies.z[e]!) <= metres;
    expect(eyes.busy(w, archer!)).toBe(false);
    const enemy = enemyPoint(w, "cuong-thi", B.x[archer!]!, B.z[archer!]! + 3);
    expect(near(archer!, enemy, 10)).toBe(true);
    expect(near(cannon!, enemy, 9)).toBe(false);
    expect(eyes.busy(w, archer!)).toBe(true);
    expect(eyes.busy(w, cannon!)).toBe(false);

    // Only a and c are urgent; the archer's word has 2 s left, the cannon's a little under or over 1 s less.
    for (const s of W.live()) W.expire[s] = w.tick + 6000;
    W.expire[a] = w.tick + 120;
    W.expire[c] = w.tick + 120 - 50;
    expect(eyes.pick(w, 10)).toBe(a);
    W.expire[c] = w.tick + 120 - 70;
    expect(eyes.pick(w, 10)).toBe(c);
    // With the enemy gone the cannon's word, the one with less time left, comes first again.
    w.enemies.release(enemy);
    W.expire[c] = w.tick + 120 - 10;
    expect(eyes.pick(w, 10)).toBe(c);
  });

  it("follows the game's hint (TK 6.2): one step denser after 10 words at ≥ 95 % caught, one slower under 70 %, nothing before 10", () => {
    const { w, slots: [archer] } = assisted({ deck: realDeck(), expected: 35 }, [SPOTS.archer], 2);
    const B = w.buildings;
    const at = B.tempo[archer!]!;
    expect(at).toBe(tempoIndex(4));
    const turn = (resolved: number, hits: number): CommandBody[] => {
      B.resolved[archer!] = resolved;
      B.hits[archer!] = hits;
      const sent: CommandBody[] = [];
      hintTempo()({ w, send: (body) => void sent.push(body) }, new Plan(slotsLayout(1)));
      return sent;
    };
    const set = (idx: number) => [{ t: "setTempo", building: B.id(archer!), idx }];
    expect(turn(9, 9)).toEqual([]);
    expect(turn(10, 10)).toEqual(set(tempoIndex(3)));
    expect(turn(20, 19)).toEqual(set(tempoIndex(3)));
    expect(turn(20, 18)).toEqual([]);
    expect(turn(10, 7)).toEqual([]);
    expect(turn(10, 6)).toEqual(set(tempoIndex(6)));
    expect(turn(30, 20)).toEqual(set(tempoIndex(6)));
  });
});

describe("three fast bots", () => {
  const deck = realDeck();
  for (const [wpm, accuracy] of [[25, 0.95], [35, 0.95], [70, 0.97]] as const) {
    it(`${wpm} WPM, ${accuracy * 100} %: three waves, no command refused, every invariant every tick, rough numbers`, () => {
      const run = runBot({ seed: wpm, deck, hands: { wpm, accuracy, backspace: 0.3 }, plan: () => new Plan(BALANCED, [pendulum(0, 2), loadTempo(1.1)]), waves: 3, check: true });
      expect(run.rejected).toEqual([]);
      expect(run.problems).toEqual([]);
      expect(run.defeat).toBe(false);
      expect(run.stats.wavesCleared).toBe(3);
      for (const name of STATS) expect(Number.isFinite(run.stats[name]), name).toBe(true);
      const s = run.stats;
      expect(s.kills).toBeGreaterThan(20);
      expect(s.streamDone).toBeGreaterThan(15);
      const hit = s.streamDone / (s.streamDone + s.streamMissed);
      expect(hit).toBeGreaterThan(0.5);
      expect(s.keys).toBeGreaterThanOrEqual(s.streamDone * 3);
      expect(s.keyErrors).toBeLessThan(s.keys * 0.2);
      const load = run.loadSum / run.battleTicks;
      expect(load).toBeGreaterThan(0.2);
      expect(load).toBeLessThan(1.6);
      expect(s.damageWordShot).toBeGreaterThan(0);
      expect(s.goldKill).toBeGreaterThan(0);
      expect(s.goldProduce).toBeGreaterThan(0);
      expect(run.world.lives).toBeGreaterThan(0);
      expect(run.doneByTempo.reduce((sum, n) => sum + (n ?? 0), 0)).toBe(s.streamDone);
    });
  }

  it("plays every seed of a report line on rules of its own: two seeds in a row are two runs alone", () => {
    const report = createReport({ seeds: 2, waves: 2 });
    const line = report.balanced(hands(35));
    const inRow = report.runs(line);
    const alone = [1, 2].map((seed) => runBot({ ...report.balanced(hands(35)), seed, deck: report.deck, check: true }));
    inRow.forEach((run, k) => {
      expect(run.log, "seed " + (k + 1)).toEqual(alone[k]!.log);
      expect(run.stats, "seed " + (k + 1)).toEqual(alone[k]!.stats);
    });
    expect(inRow[1]!.log.some((command) => command.t === "setTempo" && command.tick < 1000)).toBe(true);
    expect(report.play("balanced", line)).toEqual(totalsOf(alone));
  });

  it("prints the whole report (one seed, one wave): every section, no NaN", () => {
    const lines: string[] = [];
    balanceReport({ seeds: 1, waves: 1 }, (text) => lines.push(text));
    const text = lines.join("\n");
    for (const heading of ["## 1.", "## 2.", "## 3.", "## 4.", "## 5.", "## 6.", "## 7.", "## 8."]) expect(text).toContain(heading);
    expect(text).not.toMatch(/NaN|Infinity|undefined/);
    expect(text).toContain("không lệnh bị từ chối hay bất biến chữ bị vỡ");
  });
});
