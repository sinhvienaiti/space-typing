import { describe, expect, it } from "vitest";
import { CHAIN, HEAT } from "../src/td/content/rules";
import { auraStep } from "../src/td/sim/systems/aura";
import { chainRc, chainStep, chainTier } from "../src/td/sim/systems/chain";
import { evenness } from "../src/td/sim/systems/heat";
import { spawnWord } from "../src/td/sim/systems/words";
import type { World } from "../src/td/sim/world";
import { compileDeck, wordText } from "../src/td/typing/decks";
import { tempoIndex } from "../src/td/typing/tempo";
import { build, ready, run, send, world } from "./td/fixtures";
import { smallDeck, type } from "./td/typing";

/** Heat, afterglow, chain, per-building Flow (docs/td/TYPING_DEFENSE_DESIGN.md 6.7–6.9, 6.14; BUILD_NOW §6.1 td-heat-chain). */
const deck = smallDeck(["apple", "bread", "cider", "dream", "eagle", "fable", "grape", "house", "ivory", "lemon", "mango", "night", "ocean", "piano", "river"]);
const id = (text: string) => [...Array(deck.count).keys()].find((word) => wordText(deck, word) === text)!;

function field(): { w: World; archer: number; cannon: number; mine: number } {
  const w = world({ deck, gold: 5000 });
  const archer = build(w, "archer", -16, -4);
  const cannon = build(w, "cannon", 10, -16);
  const mine = build(w, "gold-mine", 26, -30);
  ready(w);
  w.phase = "battle";
  return { w, archer, cannon, mine };
}

/** Deals `text` at building b and types it: `errors` wrong keys first, `wait` ticks before the first key. */
function play(w: World, b: number, text: string, errors = 0, wait = 0): void {
  spawnWord(w, b, id(text), 1);
  run(w, wait);
  type(w, text[0]! + "z".repeat(errors) + text.slice(1), 100, true);
}

describe("heat (TK 6.7)", () => {
  it("moves by grade: Flash +1.5, Perfect and Good +1, Ok +0.5, Sloppy −1, expired −1; 0–5", () => {
    const { w, archer } = field();
    play(w, archer, "apple");
    expect(w.buildings.heat[archer]).toBe(1500); // fast: Flash
    play(w, archer, "bread", 0, 150);
    expect(w.buildings.heat[archer]).toBe(2500); // slow: Perfect
    play(w, archer, "cider", 1);
    expect(w.buildings.heat[archer]).toBe(3000); // one error, 5 letters: Ok
    play(w, archer, "dream", 2);
    expect(w.buildings.heat[archer]).toBe(2000); // Sloppy
    spawnWord(w, archer, id("eagle"), 1);
    w.words.expire[w.words.top - 1] = w.tick; // runs out on the next step (the whole test stays inside the 4 s afterglow hold)
    run(w, 1);
    expect(w.buildings.heat[archer]).toBe(1000); // expired
    for (const word of ["fable", "grape", "house", "ivory", "lemon"]) play(w, archer, word);
    expect(w.buildings.heat[archer]).toBe(HEAT.max * 1000);
  });

  it("never cools while someone assists and the building deals", () => {
    const w = world({ deck: compileDeck([]) });
    const archer = build(w, "archer", -16, -4);
    ready(w);
    send(w, { t: "assignUnit", agent: 0, building: w.buildings.id(archer) });
    w.buildings.heat[archer] = 3500;
    run(w, 3000);
    expect(w.buildings.heat[archer]).toBe(3500);
  });

  it("afterglow: once left, holds 4 + 2·C s, then cools 0.25 a second", () => {
    for (const even of [false, true]) {
      const w = world({ deck: compileDeck([]) });
      const archer = build(w, "archer", -16, -4);
      ready(w);
      send(w, { t: "assignUnit", agent: 0, building: w.buildings.id(archer) });
      // Even keys (every 200 ms) make C = 1; none leave C = 0.
      if (even) for (let k = 0; k < 31; k += 1) send(w, { t: "key", letter: 25, atMs: 1000 + k * 200 });
      expect(evenness(w.typing)).toBe(even ? 1 : 0);
      w.phase = "battle"; // the preparation phase caps heat at 2.5
      w.buildings.heat[archer] = 3000;
      send(w, { t: "recall", agent: 0 });
      const hold = (HEAT.holdBase + (even ? HEAT.holdC : 0)) * 60;
      run(w, hold);
      expect(w.buildings.heat[archer]).toBe(3000);
      run(w, 60);
      expect(w.buildings.heat[archer]).toBe(2750);
      run(w, 600);
      expect(w.buildings.heat[archer]).toBe(250);
    }
  });

  it("stop all between waves freezes heat and chain; words running out then cost nothing", () => {
    const { w, archer } = field();
    w.phase = "prep";
    send(w, { t: "assignUnit", agent: 0, building: w.buildings.id(archer) });
    w.buildings.heat[archer] = 2000;
    w.typing.chain = 12;
    spawnWord(w, archer, id("apple"), 1);
    send(w, { t: "setAllTempo", stop: true });
    run(w, 3000);
    expect([w.buildings.heat[archer], w.typing.chain]).toEqual([2000, 12]);
    // During a wave, stop all is a plain pause: afterglow runs.
    w.phase = "battle";
    w.wave = 1;
    w.waveLeft[1] = 1; // wave 1 still has an enemy to come
    w.waveAlive[1] = 0;
    w.waveEnded[1] = 0;
    run(w, 600);
    expect(w.buildings.heat[archer]).toBeLessThan(2000);
  });

  it("a building put down under stop all waits at Dừng with its tempo put aside: the freeze holds", () => {
    const { w, archer } = field();
    w.phase = "prep";
    send(w, { t: "assignUnit", agent: 0, building: w.buildings.id(archer) });
    w.buildings.heat[archer] = 2000;
    send(w, { t: "setAllTempo", stop: true });
    const tower = build(w, "archer", 10, -6);
    expect([w.typing.allStopped, w.buildings.tempo[tower]]).toEqual([true, 0]);
    run(w, 12 * 60);
    expect(w.buildings.heat[archer]).toBe(2000);
    send(w, { t: "setAllTempo", stop: false });
    expect(w.buildings.tempo[tower]).toBe(tempoIndex(4)); // E = 35: the default 4 s, given back with the rest
  });
});

describe("chain (TK 6.8)", () => {
  it("+1 for Flash, Perfect, Good; Ok keeps it; Sloppy and a touched expiry halve; an untouched expiry costs 2", () => {
    const { w } = field();
    for (const grade of ["flash", "perfect", "good"] as const) chainStep(w, grade);
    expect(w.typing.chain).toBe(3);
    chainStep(w, "ok");
    expect(w.typing.chain).toBe(3);
    w.typing.chain = 21;
    chainStep(w, "sloppy");
    expect(w.typing.chain).toBe(10);
    chainStep(w, "expired", true);
    expect(w.typing.chain).toBe(5);
    chainStep(w, "expired", false);
    expect(w.typing.chain).toBe(3);
    chainStep(w, "expired", false);
    chainStep(w, "expired", false);
    expect(w.typing.chain).toBe(0);
  });

  it("the order grace (a menu open) spares losses for 2 s; a second opening within 3 s gets none", () => {
    const { w } = field();
    w.typing.chain = 10;
    send(w, { t: "uiFocus", on: true });
    chainStep(w, "expired", false);
    chainStep(w, "sloppy");
    expect(w.typing.chain).toBe(10);
    run(w, 120);
    chainStep(w, "expired", false);
    expect(w.typing.chain).toBe(8);
    send(w, { t: "uiFocus", on: false });
    send(w, { t: "uiFocus", on: true });
    chainStep(w, "expired", false);
    expect(w.typing.chain).toBe(6);
  });

  it("tiers give r_c 0.40 / 0.55 / 0.70 / 0.85 / 1.00 at 0 / 5 / 10 / 20 / 40, and call out 10, 25, 50, 100", () => {
    expect([0, 4, 5, 9, 10, 19, 20, 39, 40, 400].map(chainTier)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
    expect([0, 5, 10, 20, 40].map(chainRc)).toEqual(CHAIN.tiers.map((tier) => tier.rc));
    const { w } = field();
    w.typing.chain = 24;
    chainStep(w, "perfect");
    expect(w.events.rare.find((event) => event.t === "chain")).toMatchObject({ chain: 25, tier: 3, callout: true });
  });
});

describe("Flow is per building (TK 6.9)", () => {
  it("sloppy words at the mine leave the cannon's averages and blast area alone", () => {
    const { w, cannon, mine } = field();
    w.buildings.heat[cannon] = 5000;
    w.buildings.tempo[cannon] = 6; // 1 s: k_N = 1
    play(w, cannon, "apple");
    play(w, cannon, "bread");
    w.typing.chain = 3;
    auraStep(w);
    const before = [w.buildings.speedAvg[cannon], w.buildings.accAvg[cannon], w.buildings.areaMul[cannon]];
    expect(before[2]).toBeGreaterThan(1);
    play(w, mine, "cider", 3);
    play(w, mine, "dream", 3);
    expect(w.buildings.accAvg[mine]).toBeLessThan(0.5);
    expect(chainTier(w.typing.chain)).toBe(0);
    auraStep(w);
    expect([w.buildings.speedAvg[cannon], w.buildings.accAvg[cannon], w.buildings.areaMul[cannon]]).toEqual(before);
  });
});
