import { describe, expect, it } from "vitest";
import { createRng } from "../src/platform/rng";
import { CAP, LETTERS } from "../src/td/content/rules";
import type { CommandBody } from "../src/td/sim/commands";
import { STAT } from "../src/td/sim/stats";
import { step, type World } from "../src/td/sim/world";
import { bandWords, compileDeck, wordText, type Deck } from "../src/td/typing/decks";
import { withinOneEdit } from "../src/td/typing/distance";
import { KIND, Letters, type LiveWords } from "../src/td/typing/letters";
import { createBag, pickWord } from "../src/td/typing/picker";
import { tempoIndex } from "../src/td/typing/tempo";
import { build, send } from "./td/fixtures";
import { assisted, letter, realDeck, smallDeck, SPOTS } from "./td/typing";

/** First letters (docs/td/TYPING_DEFENSE_DESIGN.md 6.5, 25.8; BUILD_NOW §6.1 td-letters). */

/** A typist at ~60 WPM: finishes the most urgent stream word, one key every 12 ticks, a wrong key now and then. */
function typist(w: World, rng: ReturnType<typeof createRng>["ai"]): CommandBody[] {
  if (w.tick % 12 !== 0) return [];
  const { router } = w.typing;
  const W = w.words;
  const atMs = w.tick * (1000 / 60);
  if (rng.chance(0.05)) return [{ t: "key", letter: rng.int(0, 25), atMs }];
  if (router.lock >= 0) {
    const word = W.word[router.lock]!;
    return [{ t: "key", letter: w.typing.deck.letters[w.typing.deck.start[word]! + W.typed[router.lock]!]!, atMs }];
  }
  let urgent = -1;
  for (const s of W.live()) if (W.kind[s] === KIND.stream && (urgent < 0 || W.expire[s]! < W.expire[urgent]!)) urgent = s;
  if (urgent < 0) return [];
  const start = w.typing.deck.start[W.word[urgent]!]!;
  return [{ t: "key", letter: w.typing.deck.letters[start + (router.group >= 0 ? 1 : 0)]!, atMs }];
}

type Run = {
  spawned: number; jams: number; tier2: number; tier2MaxFree: number; done: number; maxLive: number; minFree: number;
  /** Stream deals (or jams) asked for with ≤ 3 free letters; tier-1 stream words taken then (must be none); tier-2 ones dealt then. */
  atReserve: number; reserveTaken: number; tier2AtFloor: number; problems: string[];
};

/**
 * A higher kind (direct words, 1B) dealt by the test through the same letters,
 * held by an unassisted barracks and never typed: whenever a word may go live
 * and more than the reserve is free, it takes a letter of its own (tier 1)
 * with a word of levels 1–5, rare first letters included, up to 8 live for
 * 6 s each. That is far above the real cap of 2 (TK Phụ lục A,
 * CAP.liveDirect), on purpose: it keeps the stream asking at the reserve.
 * Without it, early tier 2 and rarely used letters (u, y, i start 1–2 words
 * of the 3–5 band up to level 3) keep 4 or more letters free.
 */
function dealDirect(w: World, host: number, words: Int32Array, vocab: number): void {
  const W = w.words;
  const { deck, letters } = w.typing;
  let direct = 0;
  for (const s of W.live()) if (W.kind[s] === KIND.direct) direct += 1;
  const free = letters.free(w.tick, vocab);
  if (direct >= 8 || W.count >= CAP.liveWords || free <= LETTERS.reserve) return;
  const from = w.rng.ai.int(0, words.length - 1);
  for (let k = 0; k < words.length; k += 1) {
    const word = words[(from + k) % words.length]!;
    if (letters.claim(deck, W, word, KIND.direct, w.tick, vocab, -1, free) !== 1) continue;
    const s = W.add(word, host, KIND.direct, 1, -1, 3, w.tick, 360);
    letters.take(s, deck.letters[deck.start[word]!]!, 1);
    w.buildings.liveWords[host] = w.buildings.liveWords[host]! + 1;
    w.events.rare.push({ t: "wordSpawn", tick: w.tick, word: W.id(s), building: -1 });
    return;
  }
}

/** The reserve broken on purpose: the stream asks for letters as if it were a higher kind. The property run must catch it. */
class StreamAsHigherKind extends Letters {
  override tierOf(deck: Deck, live: LiveWords, c: number, second: number, kind: number, tick: number, vocab: number, free: number): number {
    return super.tierOf(deck, live, c, second, kind === KIND.stream ? KIND.rare : kind, tick, vocab, free);
  }
}

/** BUILD_NOW §6.1: 4 slots at 1 s for 10,000 ticks on the real vocabulary, every invariant checked every tick. */
function propertyRun(vocab: number, ticks = 10000, letters?: Letters): Run {
  // Another Letters takes over before any word holds a letter; the Bastion deals while the helpers still walk.
  const { w, slots } = assisted({ deck: realDeck(), vocab, expected: 35 }, [SPOTS.keep, SPOTS.archer, SPOTS.cannon, SPOTS.mine], 4, (fresh) => {
    if (letters !== undefined) fresh.typing.letters = letters;
  });
  for (const b of slots) send(w, { t: "setTempo", building: w.buildings.id(b), idx: tempoIndex(1) });
  const host = build(w, SPOTS.barracks[0], SPOTS.barracks[1], SPOTS.barracks[2]);
  const directWords = bandWords(w.typing.deck, 5, 3, 8);
  const rng = createRng(vocab).ai;
  const L = w.typing.letters;
  const W = w.words;
  const problems: string[] = [];
  const fail = (what: string) => problems.length < 20 && problems.push("tick " + w.tick + ": " + what);
  const texts = new Map<number, string>(W.live().map((s) => [W.id(s), wordText(w.typing.deck, W.word[s]!)]));
  const released = new Int32Array(26).fill(-1e6);
  const lastAt = new Map<number, number>(slots.map((b) => [w.buildings.id(b), w.buildings.lastLetter[b]!]));
  const out: Run = { spawned: 0, jams: 0, tier2: 0, tier2MaxFree: 0, done: 0, maxLive: 0, minFree: 26, atReserve: 0, reserveTaken: 0, tier2AtFloor: 0, problems };
  for (let tick = 0; tick < ticks; tick += 1) {
    const from = w.events.rare.length;
    // Free letters at the start of the tick; every tier-1 deal in it (the higher kind's first) takes one.
    const freeBefore = L.free(w.tick, vocab);
    dealDirect(w, host, directWords, vocab);
    let taken = 0;
    step(w, typist(w, rng).map((body) => ({ ...body, tick: w.tick }) as never));
    for (const event of w.events.rare.slice(from)) {
      if (event.t === "wordSpawn") {
        const s = W.slotOf(event.word);
        // Free letters when this word was dealt: the tick's count less the tier-1 deals before it.
        const free = freeBefore - taken;
        if (W.tier[s] === 1) taken += 1;
        if (event.building >= 0 && free <= LETTERS.reserve) {
          out.atReserve += 1;
          if (W.tier[s] === 1) out.reserveTaken += 1;
          else out.tier2AtFloor += 1;
        }
        const text = wordText(w.typing.deck, W.word[s]!);
        texts.set(event.word, text);
        const c = letter(text[0]!);
        if (event.tick - released[c]! < LETTERS.cooldownS * 60) fail(text + " reuses " + text[0] + " " + (event.tick - released[c]!) + " ticks after release");
        if (event.building < 0) continue;
        if (lastAt.get(event.building) === c) fail(text + " starts like its building's last word");
        lastAt.set(event.building, c);
        out.spawned += 1;
        if (W.tier[s] === 2) {
          out.tier2 += 1;
          out.tier2MaxFree = Math.max(out.tier2MaxFree, free);
        }
      } else if (event.t === "wordHit" || event.t === "wordMiss" || event.t === "wordCancel") {
        released[letter(texts.get(event.word)![0]!)] = event.tick;
        if (event.t === "wordHit") out.done += 1;
      } else if (event.t === "streamDeferred" && event.reason === "jam") {
        out.jams += 1;
        if (freeBefore - taken <= LETTERS.reserve) out.atReserve += 1;
      }
    }
    // Every tick: unambiguous first letters, no repeat, no pair one edit apart, every cap.
    const words = W.live();
    out.maxLive = Math.max(out.maxLive, words.length);
    const byLetter = new Map<number, number[]>();
    for (const s of words) {
      const c = w.typing.deck.letters[w.typing.deck.start[W.word[s]!]!]!;
      byLetter.set(c, [...(byLetter.get(c) ?? []), s]);
    }
    for (const [c, list] of byLetter) {
      if (list.length > 2) fail(list.length + " words start with " + String.fromCharCode(97 + c));
      if (L.owner[c] !== list[0] && L.owner[c] !== list[1]) fail("letter " + c + " owner out of step");
      if (list.length === 2) {
        const [a, b] = list.map((s) => wordText(w.typing.deck, W.word[s]!));
        if (a![1] === b![1]) fail(a + " and " + b + " share two first letters");
        if (L.partner[c]! < 0) fail("pair on " + c + " has no partner");
      }
    }
    for (let i = 0; i < words.length; i += 1) {
      for (let j = i + 1; j < words.length; j += 1) {
        const a = W.word[words[i]!]!;
        const b = W.word[words[j]!]!;
        const deck = w.typing.deck;
        if (a === b) fail("the same word twice");
        else if (withinOneEdit(deck.letters, deck.start[a]!, deck.len[a]!, deck.start[b]!, deck.len[b]!)) fail(wordText(deck, a) + " is one edit from " + wordText(deck, b));
      }
    }
    if (w.typing.streamLive > w.typing.cap) fail("stream " + w.typing.streamLive + " over its cap " + w.typing.cap);
    if (words.length > CAP.liveWords) fail(words.length + " live words");
    for (const b of slots) if (w.buildings.liveWords[b]! > CAP.wordsPerBuilding) fail("building " + b + " has " + w.buildings.liveWords[b] + " words");
    out.minFree = Math.min(out.minFree, L.free(w.tick, vocab));
  }
  expect(w.stats[STAT.jams]).toBe(out.jams);
  return out;
}

describe("first letters on the real vocabulary (property, 10,000 ticks, 4 slots at 1 s)", () => {
  for (const vocab of [1, 3, 5]) {
    it("vocabulary 1–" + vocab + ": unambiguous, no repeat, no OSA ≤ 1 pair, caps kept, letters rest 1 s, the reserve kept", () => {
      const run = propertyRun(vocab);
      const jam = run.jams / (run.jams + run.spawned);
      console.log(
        "td letters, vocabulary 1–" + vocab + ": " + run.spawned + " stream words, " + run.done + " typed, " + run.tier2 + " tier 2 (" + run.tier2AtFloor + " at the reserve), letter jams " + (jam * 100).toFixed(1) +
          " %, most live " + run.maxLive + ", fewest free letters " + run.minFree + ", " + run.atReserve + " deals asked at ≤ " + LETTERS.reserve + " free",
      );
      expect(run.problems).toEqual([]);
      // The run reached the reserve (else "none taken" proves nothing), took none of it, and paired up there instead.
      expect(run.minFree).toBeLessThanOrEqual(LETTERS.reserve);
      expect(run.atReserve).toBeGreaterThanOrEqual(20);
      expect(run.reserveTaken).toBe(0);
      expect(run.tier2AtFloor).toBeGreaterThanOrEqual(20);
      expect(run.spawned).toBeGreaterThan(300);
      expect(run.done).toBeGreaterThan(100);
      // Tier 2 starts early (≤ 5 free letters) only up to level 3; from level 4 only at the stream's own floor.
      expect(run.tier2MaxFree).toBeLessThanOrEqual(vocab <= LETTERS.tier2EarlyMaxLevel ? LETTERS.tier2EarlyFree : LETTERS.reserve);
    });
  }

  it("catches a broken reserve: a stream that asks like a higher kind takes reserved letters", () => {
    const run = propertyRun(5, 4000, new StreamAsHigherKind());
    expect(run.reserveTaken).toBeGreaterThan(0);
  });
});

/** A live-words view over plain arrays, for the letters on their own. */
function liveOf(deck: ReturnType<typeof smallDeck>, words: string[], touched: number[] = []): LiveWords {
  const index = (text: string) => [...Array(deck.count).keys()].find((word) => wordText(deck, word) === text)!;
  return { top: words.length, used: new Uint8Array(words.length).fill(1), word: Int32Array.from(words.map(index)), touched: Uint8Array.from(words.map((_, s) => touched[s] ?? 0)) };
}

describe("letters (TK 6.5)", () => {
  const deck = smallDeck(["form", "from", "fork", "frame", "apple", "bread", "cider", "able", "bead", "beard", "quiet", "zebra", "joker", "xenon", "sand", "tree"]);
  const id = (text: string) => [...Array(deck.count).keys()].find((word) => wordText(deck, word) === text)!;
  const holdAll = (letters: Letters, live: LiveWords, except: string) => {
    for (let c = 0; c < 26; c += 1) if (!except.includes(String.fromCharCode(97 + c))) letters.owner[c] = live.top + 1;
  };

  it("bans a live word, one edit from a live word (form / from), or the building's last first letter", () => {
    const letters = new Letters();
    const live = liveOf(deck, ["form"]);
    letters.take(0, letter("f"), 1);
    const free = letters.free(0, 1);
    expect(letters.claim(deck, live, id("form"), KIND.stream, 0, 1, -1, free)).toBe(0);
    expect(letters.claim(deck, live, id("from"), KIND.stream, 0, 1, -1, free)).toBe(0);
    expect(letters.claim(deck, live, id("bread"), KIND.stream, 0, 1, -1, free)).toBe(1);
    expect(letters.claim(deck, live, id("bread"), KIND.stream, 0, 1, letter("b"), free)).toBe(0);
    expect(withinOneEdit(deck.letters, deck.start[id("bead")]!, 4, deck.start[id("beard")]!, 5)).toBe(true);
    expect(withinOneEdit(deck.letters, deck.start[id("bead")]!, 4, deck.start[id("bread")]!, 5)).toBe(true);
    expect(withinOneEdit(deck.letters, deck.start[id("form")]!, 4, deck.start[id("fork")]!, 4)).toBe(true);
    expect(withinOneEdit(deck.letters, deck.start[id("sand")]!, 4, deck.start[id("tree")]!, 4)).toBe(false);
    expect(withinOneEdit(deck.letters, deck.start[id("able")]!, 4, deck.start[id("apple")]!, 5)).toBe(false);
  });

  it("rests a released letter 1 s; a tier-2 partner keeps the letter when the owner goes", () => {
    const letters = new Letters();
    letters.take(3, letter("a"), 1);
    letters.release(3, letter("a"), 100);
    const live = liveOf(deck, []);
    expect(letters.claim(deck, live, id("apple"), KIND.stream, 159, 1, -1, letters.free(159, 1))).toBe(0);
    expect(letters.claim(deck, live, id("apple"), KIND.stream, 160, 1, -1, letters.free(160, 1))).toBe(1);
    letters.take(4, letter("b"), 1);
    letters.take(5, letter("b"), 2);
    letters.release(4, letter("b"), 200);
    expect([letters.owner[letter("b")], letters.partner[letter("b")]]).toEqual([5, -1]);
  });

  it("avoids q, x, z, j up to vocabulary level 10", () => {
    const letters = new Letters();
    const live = liveOf(deck, []);
    for (const word of ["quiet", "zebra", "joker", "xenon"]) {
      expect(letters.claim(deck, live, id(word), KIND.stream, 0, 10, -1, letters.free(0, 10))).toBe(0);
      expect(letters.claim(deck, live, id(word), KIND.stream, 0, 11, -1, letters.free(0, 11))).toBe(1);
    }
  });

  it("keeps 3 free letters for higher kinds: a stream word may not take them, a higher (fake) kind may", () => {
    const letters = new Letters();
    const live = liveOf(deck, []);
    holdAll(letters, live, "absqxzj"); // 3 usable letters free: a, b, s
    expect(letters.free(0, 1)).toBe(3);
    expect(letters.claim(deck, live, id("apple"), KIND.stream, 0, 1, -1, 3)).toBe(0);
    expect(letters.claim(deck, live, id("apple"), KIND.review, 0, 1, -1, 3)).toBe(0);
    expect(letters.claim(deck, live, id("apple"), KIND.seal, 0, 1, -1, 3)).toBe(1);
    expect(letters.claim(deck, live, id("apple"), KIND.rare, 0, 1, -1, 3)).toBe(1);
  });

  it("pairs two words on one letter (tier 2) only when letters run short, with different second letters and an untouched first word", () => {
    const deck2 = smallDeck(["frame", "form", "fork", "apple", "cider"]);
    const at = (text: string) => [...Array(deck2.count).keys()].find((word) => wordText(deck2, word) === text)!;
    const letters = new Letters();
    const live = liveOf(deck2, ["frame"]);
    letters.take(0, letter("f"), 1);
    holdAll(letters, live, "afcqxzj");
    letters.owner[letter("f")] = 0;
    // Free: a, c (2) — at level ≤ 3 that is ≤ 5: early tier 2.
    expect(letters.claim(deck2, live, at("form"), KIND.stream, 0, 3, -1, letters.free(0, 3))).toBe(2);
    // From level 4, tier 2 waits until the stream's floor (3 free): 2 free is under it, so still 2.
    expect(letters.claim(deck2, live, at("form"), KIND.stream, 0, 4, -1, letters.free(0, 4))).toBe(2);
    letters.owner[letter("c")] = -1;
    letters.owner[letter("d")] = -1;
    letters.owner[letter("e")] = -1;
    letters.owner[letter("g")] = -1;
    // 5 free (a c d e g): level 4 has no tier 2 above its floor of 3; level 3 still pairs early (≤ 5).
    expect(letters.free(0, 3)).toBe(5);
    expect(letters.claim(deck2, live, at("form"), KIND.stream, 0, 4, -1, letters.free(0, 4))).toBe(0);
    expect(letters.claim(deck2, live, at("form"), KIND.stream, 0, 3, -1, letters.free(0, 3))).toBe(2);
    const touched = liveOf(deck2, ["frame"], [1]);
    expect(letters.claim(deck2, touched, at("form"), KIND.stream, 0, 3, -1, letters.free(0, 3))).toBe(0);
    // The same second letter could never be told apart: "frame" and "fr…" never pair.
    const deck3 = smallDeck(["frame", "fresh"]);
    const live3: LiveWords = { top: 1, used: Uint8Array.of(1), word: Int32Array.of(0), touched: Uint8Array.of(0) };
    expect(letters.claim(deck3, live3, 1, KIND.stream, 0, 3, -1, 0)).toBe(0);
  });

  it("deals no word twice in a round of the bag; a jam returns −1 and is not a miss", () => {
    const deck4 = compileDeck("apple bread cider dream eagle fable grape house ivory lemon".split(" ").map((text, index) => ({ id: "x" + index, text, level: 1 })));
    const bag = createBag(Int32Array.from(deck4.ids.keys()));
    const letters = new Letters();
    const rng = createRng(7).words;
    const seen = new Set<number>();
    const live: LiveWords = { top: 0, used: new Uint8Array(0), word: new Int32Array(0), touched: new Uint8Array(0) };
    for (let k = 0; k < deck4.count; k += 1) {
      const pick = pickWord(bag, deck4, letters, live, KIND.stream, 1000 + k * 100, 1, -1, rng);
      expect(pick).toBeGreaterThanOrEqual(0);
      seen.add(pick >> 2);
    }
    expect(seen.size).toBe(deck4.count);
    holdAll(letters, live, "qxzj");
    expect(pickWord(bag, deck4, letters, live, KIND.stream, 1e6, 1, -1, rng)).toBe(-1);
  });

  it("a round's rest that fits nowhere now opens the next round: it comes before any other word repeats (TK 25.8)", () => {
    const deck4 = compileDeck("apple bread cider dream eagle fable grape house ivory lemon".split(" ").map((text, index) => ({ id: "x" + index, text, level: 1 })));
    const bag = createBag(Int32Array.from(deck4.ids.keys()));
    const letters = new Letters();
    const rng = createRng(7).words;
    const live: LiveWords = { top: 0, used: new Uint8Array(0), word: new Int32Array(0), touched: new Uint8Array(0) };
    const pick = () => pickWord(bag, deck4, letters, live, KIND.stream, 1e6, 1, -1, rng) >> 2;
    const dealt = Array.from({ length: 7 }, pick);
    const rest = [...deck4.ids.keys()].filter((word) => !dealt.includes(word));
    const hold = (on: boolean) => rest.forEach((word) => (letters.owner[deck4.letters[deck4.start[word]!]!] = letters.partner[deck4.letters[deck4.start[word]!]!] = on ? 99 : -1));
    hold(true); // the rest's letters are all taken: this deal can only repeat a word
    expect(dealt).toContain(pick());
    hold(false);
    expect(Array.from({ length: rest.length }, pick).sort()).toEqual(rest);
  });
});
