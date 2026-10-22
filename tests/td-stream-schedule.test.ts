import { describe, expect, it } from "vitest";
import { EMIT, HEAT } from "../src/td/content/rules";
import { STAT } from "../src/td/sim/stats";
import { step, type World } from "../src/td/sim/world";
import { densestFor } from "../src/td/sim/systems/stream";
import { capacity, defaultTempo, densestPeriod, lengthBand, stepTempo, tempoHint, tempoIndex, tempoOpen, wordsPerMinute } from "../src/td/typing/tempo";
import { spawnWord } from "../src/td/sim/systems/words";
import { build, ready, run, send, world } from "./td/fixtures";
import { assisted, letter, realDeck, smallDeck, SPOTS, steps, type } from "./td/typing";

/** The stream's schedule (docs/td/TYPING_DEFENSE_DESIGN.md 6.2, 6.4, 6.7, 25.8; BUILD_NOW §6.1 td-stream-schedule). */
const deck = realDeck();
const T = (seconds: number) => Math.round(seconds * 60);

/** Ticks of each deal, by building slot. */
function deals(w: World, ticks: number): Map<number, number[]> {
  const out = new Map<number, number[]>();
  steps(w, ticks, () => {
    for (const event of w.events.rare.splice(0)) if (event.t === "wordSpawn") out.set(event.building & 1023, [...(out.get(event.building & 1023) ?? []), event.tick]);
  });
  return out;
}

describe("stream schedule", () => {
  it("settles 0.4 s, deals the first word 0.6 s later, then one every N with no drift", () => {
    const { w, slots } = assisted({ deck }, [SPOTS.archer]);
    const assignedAt = w.tick - 1;
    w.events.rare.length = 0;
    const archer = slots[0]!;
    expect(w.buildings.tempo[archer]).toBe(tempoIndex(4)); // E = 35: 4 s
    const ticks = deals(w, T(30)).get(archer)!;
    const first = assignedAt + T(EMIT.settleS + EMIT.firstDelayS);
    expect(ticks).toEqual(Array.from({ length: ticks.length }, (_, k) => first + k * T(4)));
    expect(ticks.length).toBe(8);
  });

  it("keeps deals across the map ≥ 0.2 s apart, unless put back the full 0.6 s (4 buildings at 1 s)", () => {
    const { w, slots } = assisted({ deck, vocab: 3 }, [SPOTS.keep, SPOTS.archer, SPOTS.cannon, SPOTS.mine]);
    for (const b of slots) send(w, { t: "setTempo", building: w.buildings.id(b), idx: tempoIndex(1) });
    let last = -1e6;
    let gaps = 0;
    let forced = 0;
    for (let tick = 0; tick < T(120); tick += 1) {
      const shifts = slots.map((b) => w.buildings.shift[b]!);
      const from = w.events.rare.length;
      step(w);
      for (const event of w.events.rare.slice(from)) {
        if (event.t !== "wordSpawn") continue;
        const gap = event.tick - last;
        last = event.tick;
        gaps += 1;
        if (gap >= T(EMIT.staggerS)) continue;
        forced += 1;
        expect(shifts[slots.indexOf(event.building & 1023)], "a deal " + gap + " ticks after the last was not put back 0.6 s").toBe(T(EMIT.staggerMaxS));
      }
    }
    expect(gaps).toBeGreaterThan(300);
    expect(forced / gaps).toBeLessThan(0.05);
  });

  it("waits while full and gives the deal up at the next mark, with no miss for it", () => {
    // E = 12 makes every word live 6 s: four words fill the building at 1 s.
    const { w, slots } = assisted({ deck, expected: 12, vocab: 3 }, [SPOTS.archer]);
    send(w, { t: "setTempo", building: w.buildings.id(slots[0]!), idx: tempoIndex(1) });
    let waited = false;
    steps(w, T(12), () => (waited ||= w.buildings.waiting[slots[0]!] === 1));
    expect(waited).toBe(true);
    expect(w.stats[STAT.fullDrops]).toBeGreaterThan(0);
    expect(w.buildings.liveWords[slots[0]!]).toBeLessThanOrEqual(4);
    expect(w.stats[STAT.streamMissed]).toBe(w.stats[STAT.streamSpawned]! - w.words.count);
  });

  it("a tempo change restarts the count at the new period: no word at once", () => {
    const { w, slots } = assisted({ deck }, [SPOTS.archer]);
    steps(w, T(5));
    w.events.rare.length = 0;
    send(w, { t: "setTempo", building: w.buildings.id(slots[0]!), idx: tempoIndex(2) });
    const changedAt = w.tick - 1;
    const ticks = deals(w, T(7)).get(slots[0]!)!;
    expect(ticks[0]).toBe(changedAt + T(2));
    expect(ticks[1]).toBe(changedAt + T(4));
  });

  it("stop all puts every building at Dừng and back to its own tempo; a closed tempo is refused", () => {
    const { w, slots } = assisted({ deck, vocab: 3 }, [SPOTS.archer, SPOTS.cannon]);
    send(w, { t: "setTempo", building: w.buildings.id(slots[1]!), idx: tempoIndex(3) });
    send(w, { t: "setAllTempo", stop: true });
    expect(slots.map((b) => w.buildings.tempo[b])).toEqual([0, 0]);
    w.events.rare.length = 0;
    expect(deals(w, T(10)).size).toBe(0);
    send(w, { t: "setAllTempo", stop: false });
    expect(slots.map((b) => w.buildings.tempo[b])).toEqual([tempoIndex(4), tempoIndex(3)]);
    expect(deals(w, T(5)).size).toBe(2);
    // Outside the sandbox an L1 building cannot pick 2 s; nobody picks 8 s on normal.
    const plain = assisted({ deck, sandbox: false }, [SPOTS.archer], 1);
    const refused = send(plain.w, { t: "setTempo", building: plain.w.buildings.id(plain.slots[0]!), idx: tempoIndex(2) }, { t: "setTempo", building: plain.w.buildings.id(plain.slots[0]!), idx: tempoIndex(8) });
    expect(refused.filter((event) => event.t === "rejected").length).toBe(2);
  });

  it("deals all through the wait between waves and the preparation, where heat stops at 2.5", () => {
    const { w, slots } = assisted({ deck, expected: 20 }, [SPOTS.archer]);
    const archer = slots[0]!;
    // Preparation: every word typed perfectly still only warms to 2.5.
    for (let round = 0; round < 12; round += 1) {
      steps(w, T(4));
      const word = w.words.live().find((s) => w.words.building[s] === archer);
      if (word !== undefined) type(w, [...w.typing.deck.letters.subarray(w.typing.deck.start[w.words.word[word]!]!, w.typing.deck.start[w.words.word[word]!]! + w.typing.deck.len[w.words.word[word]!]!)].map((c) => String.fromCharCode(97 + c)).join(""), 120);
    }
    expect(w.phase).toBe("prep");
    expect(w.stats[STAT.streamDone]).toBeGreaterThan(5);
    expect(w.buildings.heat[archer]).toBe(HEAT.prepCap * 1000);
    // Wave 1 ends at once (no enemies queued): the count to wave 2 runs and words keep coming.
    send(w, { t: "callWave" });
    w.spawnQueue.length = 0;
    for (const e of w.enemies.live()) w.enemies.release(e);
    w.waveLeft[1] = 0;
    w.waveAlive[1] = 0;
    w.nextWaveAt = w.tick + T(30);
    const before = w.stats[STAT.streamSpawned]!;
    steps(w, T(20));
    expect(w.waveEnded[1]).toBe(1);
    expect(w.stats[STAT.streamSpawned]! - before).toBeGreaterThanOrEqual(4);
  });
});

describe("tempo options (TK 6.2, 6.3, 6.13)", () => {
  it("opens tempos by building level (sandbox: all), 8 s only on easy, the Bastion's densest 2 s from its level 2", () => {
    expect(densestPeriod(1, false)).toBe(3);
    expect(densestPeriod(2, false)).toBe(2);
    expect(densestPeriod(3, false)).toBe(1);
    expect(densestPeriod(1, true)).toBe(1);
    expect(tempoOpen(tempoIndex(8), 3, "normal")).toBe(false);
    expect(tempoOpen(tempoIndex(8), 3, "easy")).toBe(true);
    expect(tempoOpen(tempoIndex(2), 3, "easy")).toBe(false);
    expect(tempoOpen(0, 99, "hard")).toBe(true);
    const { w } = assisted({ deck }, [SPOTS.archer], 1);
    expect(densestFor(w, 0)).toBe(3);
    send(w, { t: "sandbox", op: { op: "keepLevel", value: 2 } });
    expect(densestFor(w, 0)).toBe(2);
    send(w, { t: "sandbox", op: { op: "keepLevel", value: 4 } });
    expect(densestFor(w, 0)).toBe(2);
  });

  it("steps one open tempo denser (Equal) or slower (Minus, Dừng last); new buildings start at 6 s below 30 WPM, 4 s above", () => {
    expect(stepTempo(tempoIndex(4), 1, 3, "normal")).toBe(tempoIndex(3));
    expect(stepTempo(tempoIndex(3), 1, 3, "normal")).toBe(tempoIndex(3));
    expect(stepTempo(tempoIndex(6), -1, 3, "normal")).toBe(0);
    expect(stepTempo(tempoIndex(6), -1, 3, "easy")).toBe(tempoIndex(8));
    expect([defaultTempo(20), defaultTempo(29), defaultTempo(30)]).toEqual([tempoIndex(6), tempoIndex(6), tempoIndex(4)]);
  });

  it("lengths follow E; 2 s cuts at 6 letters, 1 s at 5; load = words a minute over capacity", () => {
    expect([lengthBand(20, tempoIndex(4)), lengthBand(35, tempoIndex(4)), lengthBand(50, tempoIndex(4)), lengthBand(70, tempoIndex(4))]).toEqual([[3, 5], [3, 6], [4, 7], [4, 8]]);
    expect([lengthBand(70, tempoIndex(2)), lengthBand(70, tempoIndex(1)), lengthBand(20, tempoIndex(1))]).toEqual([[4, 6], [4, 5], [3, 5]]);
    expect(capacity(35, 4.5)).toBeCloseTo(23.86, 2);
    expect(wordsPerMinute([tempoIndex(3), tempoIndex(6), 0])).toBe(30);
    expect(wordsPerMinute([tempoIndex(3)]) / capacity(35, 4.5)).toBeCloseTo(0.84, 2);
  });

  it("suggests, never sets: denser after 10 words caught at ≥ 95 %, slower under 70 %", () => {
    expect(tempoHint(9, 9, tempoIndex(4), 3, "normal")).toBe(0);
    expect(tempoHint(10, 10, tempoIndex(4), 3, "normal")).toBe(1);
    expect(tempoHint(10, 10, tempoIndex(3), 3, "normal")).toBe(0);
    expect(tempoHint(10, 6, tempoIndex(4), 3, "normal")).toBe(-1);
    expect(tempoHint(10, 6, tempoIndex(6), 3, "normal")).toBe(0);
  });
});

describe("word end (TK 6.4)", () => {
  const small = smallDeck(["garden", "planet"]);

  it("a locked word typed at least half way gets 0.6 s more, once; untouched it simply runs out", () => {
    const w = world({ deck: small });
    const archer = build(w, "archer", -16, -4);
    ready(w);
    spawnWord(w, archer, 0, 1);
    spawnWord(w, archer, 1, 1);
    const garden = w.words.live().find((s) => w.words.word[s] === 0)!;
    const planet = w.words.live().find((s) => w.words.word[s] === 1)!;
    const expire = w.words.expire[garden]!;
    type(w, "gar");
    while (w.tick <= expire) run(w, 1);
    expect(w.words.used[planet]).toBe(0); // ran out, untouched
    expect(w.words.used[garden]).toBe(1);
    expect(w.words.expire[garden]).toBe(expire + T(0.6));
    while (w.tick <= expire + T(0.6)) run(w, 1);
    expect(w.words.used[garden]).toBe(0);
    expect(w.stats[STAT.streamMissed]).toBe(2);
  });

  it("undoing a building cancels its words: no heat, chain or miss lost", () => {
    const w = world({ deck: small });
    const archer = build(w, "archer", -16, -4);
    spawnWord(w, archer, 0, 1);
    w.typing.chain = 7;
    const events = send(w, { t: "sell", building: w.buildings.id(archer) });
    expect(events.some((event) => event.t === "wordCancel")).toBe(true);
    expect([w.typing.chain, w.stats[STAT.streamMissed], w.words.count, w.typing.letters.owner[letter("g")]]).toEqual([7, 0, 0, -1]);
  });
});
