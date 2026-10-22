import { describe, expect, it } from "vitest";
import { createRng } from "../src/platform/rng";
import { CHAIN, FARM, MODES, TREE } from "../src/td/content/rules";
import type { Command, CommandBody } from "../src/td/sim/commands";
import { hashHex } from "../src/td/sim/hash";
import { STAT } from "../src/td/sim/stats";
import { PLOT } from "../src/td/sim/stores/buildings";
import { CALL_KIND, CALL_STATE } from "../src/td/sim/stores/calls";
import { closeCall, makeCall } from "../src/td/sim/systems/calls";
import { createWorld, runLog, step, type World } from "../src/td/sim/world";
import { wordText } from "../src/td/typing/decks";
import { KEY } from "../src/td/typing/router";
import { built, goTo, q, run, send, world } from "./td/fixtures";
import { live, realDeck, smallDeck, type } from "./td/typing";

/** Calls for help (docs/td/BUILD_1A6.md §5): lifecycle, the AttentionDirector, words, the chain, the bonus, the invariants of §12. */
const T = (seconds: number) => Math.round(seconds * 60);
const deck = smallDeck(["apple", "bread", "cider", "dream", "eagle", "fable", "grape", "house", "ivory", "lemon", "mango", "olive", "peach", "river", "stone", "tiger"]);
const N1 = [26, -30] as const;

/** A world with a ready mine on N1 whose pile is over half full: its call is made and opened on the next tick. */
function mineCall(options: Parameters<typeof world>[0] = {}) {
  const w = world({ deck, gold: 1000, ...options });
  const mine = built(w, "gold-mine", N1[0], N1[1]);
  w.buildings.haulAt[mine] = 1e9; // the miner waits: the pile is the test's
  w.buildings.pile[mine] = 31000;
  run(w, 1);
  return { w, mine, c: w.buildings.call[mine]! };
}

const textOf = (w: World, s: number): string => wordText(w.typing.deck, w.words.word[s]!);
const wordOfCall = (w: World, c: number): string => textOf(w, w.calls.word[c]!);

describe("a call's life (§5.2)", () => {
  it("is made queued and opened under the cap; bright in a help ring it holds one word and its first letter; dim outside it gives them back, at no loss", () => {
    const { w, mine, c } = mineCall();
    expect(c).toBeGreaterThanOrEqual(0);
    expect([w.calls.kind[c], w.calls.state[c], w.calls.bright[c], w.calls.word[c], w.calls.words[c]]).toEqual([CALL_KIND.mine, CALL_STATE.open, 0, -1, 2]);
    goTo(w, 0, N1[0], N1[1] + 6);
    expect(w.calls.bright[c]).toBe(1);
    const s = w.calls.word[c]!;
    expect(s).toBeGreaterThanOrEqual(0);
    const first = w.typing.deck.letters[w.typing.deck.start[w.words.word[s]!]!]!;
    expect(w.typing.letters.owner[first]).toBe(s);
    const [chain, gold] = [w.typing.chain, w.gold];
    goTo(w, 0, 0, 30);
    expect([w.calls.bright[c], w.calls.word[c], w.typing.letters.owner[first], w.words.count]).toEqual([0, -1, -1, 0]);
    expect(w.typing.chain).toBe(chain);
    expect(w.gold).toBeGreaterThanOrEqual(gold);
    expect(w.buildings.call[mine]).toBe(c); // still open, waiting
  });

  it("a locked call keeps its word out of every ring, gets its next word locked, and lets go only when done or on Esc", () => {
    const { w, mine, c } = mineCall();
    goTo(w, 0, N1[0], N1[1] + 6);
    const word = wordOfCall(w, c);
    type(w, word[0]!);
    send(w, { t: "move", agent: 0, qx: q(0), qz: q(30) });
    run(w, T(8)); // far away now
    expect(Math.hypot(w.agents.x[0]! - N1[0], w.agents.z[0]! - N1[1])).toBeGreaterThan(10);
    expect([w.calls.bright[c], textOf(w, w.typing.router.lock)]).toEqual([1, word]);
    w.typing.typed.fill(0); // the 8 s held locked leave the 20 s window: room for the next word (the budget has its own test)
    w.typing.typedSum = 0;
    const gold = w.gold;
    const pile = w.buildings.pile[mine]!;
    type(w, word.slice(1));
    // The word hauled the pile and paid 1 gold; the call's second word came at once, locked.
    expect(w.gold - gold).toBe(pile + 1000);
    expect(w.calls.done[c]).toBe(1);
    const next = w.calls.word[c]!;
    expect([next >= 0, w.typing.router.lock]).toEqual([true, next]);
    run(w, 30);
    expect(w.calls.bright[c]).toBe(1);
    send(w, { t: "unlock" });
    run(w, 1);
    expect([w.calls.bright[c], w.calls.word[c], w.typing.router.lock]).toEqual([0, -1, -1]);
  });

  it("scores a word from the tick its call got it, not from when the call was made", () => {
    const { w, c } = mineCall();
    run(w, T(5)); // open but dim
    goTo(w, 0, N1[0], N1[1] + 6);
    const s = w.calls.word[c]!;
    expect(w.words.born[s]).toBeGreaterThan(w.calls.born[c]! + T(5));
    const hit = type(w, textOf(w, s), 60, true).find((event) => event.t === "wordHit");
    expect(hit).toMatchObject({ grade: "flash" });
  });

  it("a whole Perfect call pays its bonus, by the chain's tier (at most ×1.3); a sloppy word loses it", () => {
    for (const [chain, bonus] of [[0, 5], [CHAIN.tiers[4]!.from, 6.5]] as const) {
      const { w, mine, c } = mineCall();
      goTo(w, 0, N1[0], N1[1] + 6);
      w.typing.chain = chain;
      const [gold, pile] = [w.gold, w.buildings.pile[mine]!];
      type(w, wordOfCall(w, c), 60, true);
      type(w, wordOfCall(w, c), 60, true);
      expect(w.calls.used[c]).toBe(0);
      expect(w.events.rare.find((event) => event.t === "callEnd")).toMatchObject({ perfect: true, finished: true });
      expect((w.gold - gold - pile) / 1000).toBeCloseTo(2 + bonus, 9); // the pile hauled, 1 gold a word, the bonus
      expect(w.buildings.pile[mine]).toBe(0);
    }
    const { w, mine, c } = mineCall();
    goTo(w, 0, N1[0], N1[1] + 6);
    w.typing.chain = 8;
    const [gold, pile] = [w.gold, w.buildings.pile[mine]!];
    const word = wordOfCall(w, c);
    type(w, word[0] + "zzzz" + word.slice(1), 60, true); // sloppy: the chain halves, the word's gold ×0.6
    expect(w.typing.chain).toBe(4);
    type(w, wordOfCall(w, c), 60, true);
    expect(w.typing.chain).toBe(5);
    expect(w.events.rare.find((event) => event.t === "callEnd")).toMatchObject({ perfect: false });
    expect((w.gold - gold - pile) / 1000).toBeCloseTo(0.6 + 1, 9);
  });
});

describe("the chain (§5.4)", () => {
  it("+1 for every word that is not sloppy (Ok included), ÷2 for a sloppy one, and nothing else moves it", () => {
    const { w, c } = mineCall();
    goTo(w, 0, N1[0], N1[1] + 6);
    const word = wordOfCall(w, c);
    type(w, word[0] + "z" + word.slice(1), 60, true); // one error on a 5-letter word: Ok
    expect(w.typing.chain).toBe(1);
    // The call dims, a new one is made and closed, a power call runs out: none of it moves the chain.
    goTo(w, 0, 0, 30);
    closeCall(w, makeCall(w, CALL_KIND.build, 3, -1, 0, -1, -1));
    w.phase = "night";
    makeCall(w, CALL_KIND.power, 1, -1, 0, -1, -1, T(6));
    run(w, T(8));
    expect(w.typing.chain).toBe(1);
  });
});

describe("the AttentionDirector (§5.3)", () => {
  /** Calls of the given kinds at the Bastion, made in that order on successive ticks (older first). */
  function calls(w: World, kinds: readonly number[]): number[] {
    return kinds.map((kind) => {
      const c = makeCall(w, kind, 1, -1, 0, -1, -1);
      w.tick += 1;
      return c;
    });
  }
  const open = (w: World, list: readonly number[]) => list.map((c) => (w.calls.used[c] === 1 ? w.calls.state[c] : -1));

  it("opens at most the mode's cap, by priority: power, build, then harvest = chop = mine (older first), then quiz", () => {
    const w = world({ deck });
    const list = calls(w, [CALL_KIND.quiz, CALL_KIND.mine, CALL_KIND.harvest, CALL_KIND.build, CALL_KIND.power]);
    step(w);
    expect(open(w, list)).toEqual([0, 1, 0, 1, 1]);
    closeCall(w, list[4]!);
    step(w);
    expect(open(w, list)).toEqual([0, 1, 1, 1, -1]);
    closeCall(w, list[1]!);
    closeCall(w, list[2]!);
    step(w);
    expect(open(w, list)).toEqual([1, -1, -1, 1, -1]);
    for (const [mode, cap] of [["relax", 2], ["challenge", 4]] as const) {
      const other = world({ deck, mode });
      const many = calls(other, [CALL_KIND.mine, CALL_KIND.chop, CALL_KIND.mine, CALL_KIND.chop, CALL_KIND.mine]);
      step(other);
      expect(open(other, many).filter((state) => state === 1).length).toBe(cap);
      expect(cap).toBe(MODES[mode].open);
    }
  });

  it("counts a tick with a lock as typing; a word starts only if every 20 s window stays within the mode's seconds (review R3)", () => {
    const w = world({ deck });
    const c = makeCall(w, CALL_KIND.mine, 1, -1, 0, -1, -1);
    step(w);
    type(w, wordOfCall(w, c)[0]!);
    run(w, T(2));
    expect(w.typing.typedSum).toBe(T(2) + 1);
    send(w, { t: "unlock" });
    // A full window: nothing lights or opens, power and build included; a bright word not begun dims, at no loss.
    w.typing.typed.fill(1);
    w.typing.typedSum = w.typing.typed.length;
    const chain = w.typing.chain;
    const [mine, build, power] = calls(w, [CALL_KIND.mine, CALL_KIND.build, CALL_KIND.power]);
    step(w);
    expect(open(w, [c, mine!, build!, power!])).toEqual([1, 0, 0, 0]);
    expect([w.calls.bright[c], w.calls.word[c], w.words.count, w.typing.chain]).toEqual([0, -1, 0, chain]);
    // An empty one: they light by priority, power and build first, then the older mine call, to the cap of 3.
    w.typing.typed.fill(0);
    w.typing.typedSum = 0;
    step(w);
    expect(open(w, [c, mine!, build!, power!])).toEqual([1, 0, 1, 1]);
    expect([power!, build!, c].map((k) => w.calls.bright[k])).toEqual([1, 1, 1]);
  });

  it("looks ahead: 8 s typed long ago leave the window as a word is typed, 8 s typed just now do not (review R3)", () => {
    for (const [past, lights] of [[true, 1], [false, 0]] as const) {
      const w = world({ deck });
      const len = w.typing.typed.length;
      const at = w.tick % len; // the slot the next step writes; the oldest tick is the one after it
      for (let j = 1; j <= T(MODES.balanced.typeS); j += 1) w.typing.typed[(at + (past ? j : len - j)) % len] = 1;
      w.typing.typedSum = T(MODES.balanced.typeS);
      const c = makeCall(w, CALL_KIND.mine, 1, -1, 0, -1, -1);
      step(w);
      expect(w.calls.bright[c], past ? "typed long ago" : "typed just now").toBe(lights);
    }
  });

  it("at night opens one economy call at a time, and a quiz ends with its day (§7)", () => {
    const w = world({ deck, mode: "challenge" });
    w.phase = "night";
    const list = calls(w, [CALL_KIND.quiz, CALL_KIND.chop, CALL_KIND.harvest, CALL_KIND.build]);
    step(w);
    expect(open(w, list)).toEqual([-1, 1, 0, 1]);
    w.phase = "day";
    step(w);
    expect(open(w, list)).toEqual([-1, 1, 1, 1]);
  });

  it("the cap counts bright calls only: dim calls nobody answers never keep a call in a ring waiting (review R1)", () => {
    for (const mode of ["relax", "balanced"] as const) {
      const w = world({ deck, gold: 3000, mode });
      // A mine call never ends by itself: three ignored far away, dim.
      const mines = [[26, -30], [-12, 32], [-34, 8]].map(([x, z]) => built(w, "gold-mine", x!, z!));
      for (const m of mines) [w.buildings.haulAt[m], w.buildings.pile[m]] = [1e9, 50000];
      goTo(w, 0, 0, 34); // by the Bastion, 12 m and more from every mine
      const far = mines.map((m) => w.buildings.call[m]!);
      expect(far.map((c) => w.calls.bright[c])).toEqual([0, 0, 0]);
      const near = makeCall(w, CALL_KIND.build, 2, -1, 0, -1, -1); // the Bastion's, in the hero's ring
      step(w);
      expect([w.calls.state[near], w.calls.bright[near], w.calls.word[near]! >= 0], mode).toEqual([CALL_STATE.open, 1, true]);
    }
  });

  it("calls in a ring past the cap wait dim or queued, and light by priority as places free", () => {
    const w = world({ deck, mode: "relax" });
    const list = calls(w, [CALL_KIND.chop, CALL_KIND.mine, CALL_KIND.harvest]);
    step(w);
    const bright = () => list.map((c) => (w.calls.used[c] === 1 ? w.calls.bright[c] : -1));
    expect(bright()).toEqual([1, 1, 0]);
    expect(w.calls.state[list[2]!]).toBe(CALL_STATE.queued);
    closeCall(w, list[0]!);
    step(w);
    expect(bright()).toEqual([-1, 1, 1]);
  });
});

describe("a call's next word comes locked, and never holds the keyboard (§5.2, plan 4.6; review R1)", () => {
  /** A bright 2-word mine call with its first word typed (the next one locked, no letter in), and a bright build call by it. */
  function chained() {
    const { w, mine, c } = mineCall({ mode: "challenge" });
    goTo(w, 0, N1[0], N1[1] + 6);
    const other = makeCall(w, CALL_KIND.build, 2, -1, mine, -1, -1);
    step(w);
    type(w, wordOfCall(w, c), 60, true);
    const next = w.calls.word[c]!;
    expect([w.typing.router.lock, w.words.typed[next]]).toEqual([next, 0]);
    return { w, c, next, other };
  }

  it("another call's first letter moves the lock there, at no error to the next word", () => {
    const { w, next, other } = chained();
    const word = wordOfCall(w, other);
    const hit = type(w, word[0]!, 60, true).find((event) => event.t === "wordKey");
    expect(hit).toMatchObject({ result: KEY.switch });
    expect([w.typing.router.lock, w.words.typed[w.calls.word[other]!], w.words.errors[next]]).toEqual([w.calls.word[other], 1, 0]);
    expect(type(w, word.slice(1), 60, true).find((event) => event.t === "wordHit")).toMatchObject({ grade: "flash" });
  });

  it("its raw speed counts from its own first key", () => {
    const { w, next } = chained();
    send(w, { t: "key", letter: textOf(w, next).charCodeAt(0) - 97, atMs: 5000 });
    expect(w.words.firstMs[next]).toBe(5000);
  });

  it("Backspace lets the lock go (no letter to take back) and the word stays whole", () => {
    const { w, c, next } = chained();
    send(w, { t: "backspace", atMs: 0 });
    expect([w.typing.router.lock, w.words.typed[next]]).toEqual([-1, 0]);
    const chain = w.typing.chain;
    expect(type(w, wordOfCall(w, c), 60, true).find((event) => event.t === "wordHit")).toMatchObject({ errors: 0, grade: "flash" });
    expect(w.typing.chain).toBe(chain + 1);
  });
});

describe("work by hand and by typing (§5.1)", () => {
  /** A world whose villagers chop the trees nearest the Bastion, the hero standing among them. */
  function chopping() {
    const w = world({ deck });
    goTo(w, 0, 15, 34);
    for (let k = 0; k < T(30) && w.calls.live().every((c) => w.calls.kind[c] !== CALL_KIND.chop || w.calls.word[c]! < 0); k += 1) step(w);
    const c = w.calls.live().find((k) => w.calls.kind[k] === CALL_KIND.chop && w.calls.word[k]! >= 0)!;
    return { w, c, tree: w.calls.tree[c]! };
  }

  it("self-work and typed words add up: one Perfect word of four takes a quarter off the chop; a call the worker ends costs nothing and pays no bonus (review R1)", () => {
    const { w, c, tree } = chopping();
    const started = w.calls.born[c]!;
    const [chain, wood] = [w.typing.chain, w.wood];
    type(w, wordOfCall(w, c), 60, true);
    expect(w.typing.chain).toBe(chain + 1);
    let felled = -1;
    for (let k = 0; k < T(TREE.chopS) && felled < 0; k += 1) {
      step(w);
      if (w.trees.standing[tree] === 0) felled = w.tick - 1;
    }
    expect(felled - started).toBeGreaterThanOrEqual(T(TREE.chopS) * 0.75 - 2);
    expect(felled - started).toBeLessThanOrEqual(T(TREE.chopS) * 0.75 + 2);
    expect(w.calls.used[c]).toBe(0); // closed with the tree, three words untyped
    expect(w.wood).toBe(wood + TREE.wood); // one Perfect word is not a whole Perfect call
    expect(w.events.rare.find((event) => event.t === "callEnd")).toMatchObject({ perfect: false, finished: false });
    expect(w.typing.chain).toBe(chain + 1);
  });

  it("answered to the end, every word Perfect: the word that fells the tree earns the bonus, though self-work spared the last one", () => {
    const { w, c, tree } = chopping();
    const wood = w.wood;
    run(w, T(TREE.chopS * 0.28)); // over a quarter of the chop done alone: three Perfect words of four finish it
    for (let k = 0; k < 3; k += 1) type(w, wordOfCall(w, c), 60, true);
    expect([w.trees.standing[tree], w.calls.used[c], w.calls.done[c]]).toEqual([0, 0, 3]);
    expect(w.wood).toBe(wood + TREE.wood + TREE.perfectWood);
    expect(w.events.rare.find((event) => event.t === "callEnd")).toMatchObject({ perfect: true, finished: true });
  });

  it("a sloppy word pushes the work ×0.6", () => {
    const { w, c, tree } = chopping();
    const before = w.trees.progress[tree]!;
    const word = wordOfCall(w, c);
    type(w, word[0] + "zzzz" + word.slice(1), 60, true);
    expect(w.trees.progress[tree]! - before).toBeCloseTo(0.6 / 4 + 1 / T(TREE.chopS), 9);
  });

  it("a harvest typed whole and Perfect brings 5 food and 3 more", () => {
    const w = world({ deck, gold: 1000 });
    const farm = built(w, "farm", -17, 40);
    for (let p = 0; p < FARM.plots; p += 1) w.buildings.plot[farm * FARM.plots + p] = PLOT.ripe;
    goTo(w, 0, -12, 40);
    for (let k = 0; k < T(10) && w.calls.live().every((c) => w.calls.word[c]! < 0); k += 1) step(w);
    const c = w.calls.live().find((k) => w.calls.kind[k] === CALL_KIND.harvest)!;
    expect(w.calls.word[c]).toBeGreaterThanOrEqual(0);
    const food = w.food;
    for (let k = 0; k < 3; k += 1) type(w, wordOfCall(w, c), 60, true);
    run(w, 1);
    expect(w.food - food).toBe(FARM.food + FARM.perfectFood);
    expect(w.events.rare.filter((event) => event.t === "harvested").length).toBe(1);
  });
});

/** Random play on the real vocabulary: every invariant of §12 gate 6, every tick. */
function randomPlay(seed: number, ticks: number, typing: boolean) {
  const w = createWorld({ seed, deck: realDeck(), vocab: 3, expected: 40 });
  const rng = createRng(seed * 7 + 1).ai;
  const log: Command[] = [];
  const problems: string[] = [];
  const fail = (what: string) => problems.length < 10 && problems.push("tick " + w.tick + ": " + what);
  const sendNow: CommandBody[] = [{ t: "sandbox", op: { op: "preset" } }];
  const seen = { words: 0, bright: 0, maxBright: 0, dimOpen: 0, typedTicks: 0 };
  const deckOf = w.typing.deck;
  for (let tick = 0; tick < ticks; tick += 1) {
    const C = w.calls;
    if (tick % 90 === 0) {
      const lit = C.live();
      const pick = rng.int(0, 3);
      if (pick === 0 && lit.length > 0) {
        const c = lit[rng.int(0, lit.length - 1)]!;
        sendNow.push({ t: "move", agent: rng.int(0, 2), qx: q(Math.round(C.x[c]!) + 3), qz: q(Math.round(C.z[c]!) + 2) });
      } else if (pick === 1) sendNow.push({ t: "move", agent: 0, qx: q(rng.int(-40, 40)), qz: q(rng.int(-40, 40)) });
      else if (pick === 2) sendNow.push({ t: "markTree", tree: rng.int(0, w.trees.count - 1) });
      else if (w.phase === "day" && rng.chance(0.3)) sendNow.push({ t: "callNight" });
    }
    if (typing && tick % 9 === 0) {
      const at = tick * (1000 / 60);
      const lock = w.typing.router.lock;
      if (rng.chance(0.03)) sendNow.push({ t: "unlock" });
      else if (lock >= 0) {
        const right = deckOf.letters[deckOf.start[w.words.word[lock]!]! + w.words.typed[lock]!]!;
        sendNow.push({ t: "key", letter: rng.chance(0.06) ? rng.int(0, 25) : right, atMs: at });
      } else {
        const words = w.words.live();
        if (words.length > 0) sendNow.push({ t: "key", letter: deckOf.letters[deckOf.start[w.words.word[words[rng.int(0, words.length - 1)]!]!]!]!, atMs: at });
      }
    }
    const commands = sendNow.splice(0).map((body) => ({ ...body, tick: w.tick }) as Command);
    log.push(...commands);
    step(w, commands);
    w.events.rare.length = 0;
    // Gate 6: bright ≤ cap; only bright calls hold a word, each its own; one lock, on a bright call; distinct first letters.
    let bright = 0;
    for (const c of C.live()) {
      if (C.bright[c] === 1) bright += 1;
      else if (C.state[c] === CALL_STATE.open) seen.dimOpen += 1;
      if (C.bright[c] === 1 && C.state[c] !== CALL_STATE.open) fail("a queued call is bright");
      const s = C.word[c]!;
      if (s >= 0 && (C.bright[c] !== 1 || w.words.used[s] !== 1 || w.words.call[s] !== c)) fail("call " + c + " holds a word it should not");
    }
    if (bright > MODES[w.mode].open) fail(bright + " bright calls");
    seen.bright += bright;
    seen.maxBright = Math.max(seen.maxBright, bright);
    const firsts = new Set<number>();
    for (const s of w.words.live()) {
      const c = w.words.call[s]!;
      if (C.used[c] !== 1 || C.word[c] !== s) fail("word " + textOf(w, s) + " without its call");
      const first = deckOf.letters[deckOf.start[w.words.word[s]!]!]!;
      if (firsts.has(first)) fail("two live words start with " + String.fromCharCode(97 + first));
      if (w.typing.letters.owner[first] !== s) fail("letter " + first + " owner out of step");
      firsts.add(first);
    }
    seen.words = Math.max(seen.words, firsts.size);
    const lock = w.typing.router.lock;
    if (lock >= 0) {
      seen.typedTicks += 1;
      if (w.words.used[lock] !== 1 || C.bright[w.words.call[lock]!] !== 1) fail("the lock is on a word of no bright call");
    }
  }
  return { w, log, problems, seen };
}

describe("invariants (§12 gate 6) and replay", () => {
  it("random play on the real vocabulary: bright ≤ cap, one lock on a bright call, one word a bright call, distinct first letters; the log replays to the same hash", () => {
    for (const seed of [1, 2, 3]) {
      const { w, log, problems, seen } = randomPlay(seed, T(240), true);
      expect(problems).toEqual([]);
      expect(seen.maxBright).toBeGreaterThanOrEqual(2);
      expect(seen.dimOpen).toBeGreaterThan(0);
      expect(seen.words).toBeGreaterThanOrEqual(2);
      expect(seen.typedTicks).toBeGreaterThan(T(10));
      expect(w.stats[STAT.callWords]).toBeGreaterThan(20);
      expect(w.day).toBeGreaterThanOrEqual(2);
      const replay = createWorld({ seed, deck: w.typing.deck, vocab: 3, expected: 40 });
      runLog(replay, log, w.tick);
      expect(hashHex(replay)).toBe(hashHex(w));
    }
  });

  it("ignoring every call never lowers the chain and loses nothing: gold falls only by seeds bought, food only by soldiers' meals, wood never", () => {
    const w = createWorld({ seed: 4, deck, expected: 40 });
    send(w, { t: "sandbox", op: { op: "preset" } });
    const rng = createRng(4).ai;
    let [gold, wood, food, seeds, eaten] = [w.gold, w.wood, w.food, w.stats[STAT.seedsBought]!, w.stats[STAT.foodEaten]!];
    let calls = 0;
    for (let tick = 0; tick < T(300); tick += 1) {
      const bodies: CommandBody[] = tick % 120 === 0 ? [{ t: "move", agent: 0, qx: q(rng.int(-30, 30)), qz: q(rng.int(-30, 40)) }] : [];
      send(w, ...bodies);
      calls = Math.max(calls, w.calls.count);
      expect(w.typing.chain).toBe(0);
      const bought = w.stats[STAT.seedsBought]! - seeds;
      expect(w.gold - gold + bought * FARM.seedGold * 1000, "gold at tick " + w.tick).toBeGreaterThanOrEqual(0);
      expect(w.wood - wood, "wood at tick " + w.tick).toBeGreaterThanOrEqual(0);
      expect(w.food - food + (w.stats[STAT.foodEaten]! - eaten), "food at tick " + w.tick).toBeGreaterThanOrEqual(0);
      [gold, wood, food, seeds, eaten] = [w.gold, w.wood, w.food, w.stats[STAT.seedsBought]!, w.stats[STAT.foodEaten]!];
    }
    expect(calls).toBeGreaterThan(2);
    expect(w.stats[STAT.calls]).toBeGreaterThan(10);
    expect(live(w).length).toBeLessThanOrEqual(MODES.balanced.open);
  });
});
