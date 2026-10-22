import { describe, expect, it } from "vitest";
import { createRng } from "../src/platform/rng";
import { STATS } from "../src/td/sim/stats";
import { step } from "../src/td/sim/world";
import { balanceReport } from "./td/balance";
import { runBot } from "./td/bot";
import { Keystrokes, NEIGHBOURS } from "./td/keystrokes";
import { BALANCED } from "./td/policies/layouts";
import { pendulum } from "./td/policies/hero";
import { Plan } from "./td/policies/stand";
import { loadTempo } from "./td/policies/tempo";
import { Reader } from "./td/reader";
import { assisted, realDeck, SPOTS } from "./td/typing";

/**
 * The bots behind `pnpm td:balance` (docs/td/BUILD_NOW.md §6.1, §6.3): hands
 * and eyes do what they claim, three fast bots (25, 35, 70 WPM) play three
 * waves through commands the world takes with every word invariant holding,
 * their numbers sit in rough ranges (not the balance targets, which are only
 * printed), and the report still runs.
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

  it("sees a word 0.35–0.6 s after it appears and picks the one with least time left that it can still finish", () => {
    const { w } = assisted({ deck: realDeck(), expected: 35 }, [SPOTS.archer, SPOTS.cannon], 2);
    for (const b of w.buildings.live(1)) step(w, [{ t: "setTempo", building: w.buildings.id(b), idx: 6, tick: w.tick }]);
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
        // No seen, finishable word of a building with nothing in reach has less time left by more than the 1 s head start.
        for (const s of w.words.live()) {
          if (s === pick || !eyes.seen(w, s) || (w.words.expire[s]! - w.tick) * (1000 / 60) < w.typing.deck.len[w.words.word[s]!]! * 300) continue;
          const head = (b: number) => (eyes.busy(w, b) ? 60 : 0);
          expect(w.words.expire[s]! - head(w.words.building[s]!)).toBeGreaterThanOrEqual(w.words.expire[pick]! - head(w.words.building[pick]!));
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

  it("prints the whole report (one seed, one wave): every section, no NaN", () => {
    const lines: string[] = [];
    balanceReport({ seeds: 1, waves: 1 }, (text) => lines.push(text));
    const text = lines.join("\n");
    for (const heading of ["## 1.", "## 2.", "## 3.", "## 4.", "## 5.", "## 6.", "## 7.", "## 8."]) expect(text).toContain(heading);
    expect(text).not.toMatch(/NaN|Infinity|undefined/);
    expect(text).toContain("không lệnh bị từ chối hay bất biến chữ bị vỡ");
  });
});
