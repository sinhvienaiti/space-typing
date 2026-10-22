import { describe, expect, it } from "vitest";
import { STAT } from "../src/td/sim/stats";
import type { World } from "../src/td/sim/world";
import { KEY } from "../src/td/typing/router";
import { send, world } from "./td/fixtures";
import { callWord, live, smallDeck, type, wordOf } from "./td/typing";

/** The key router (docs/td/TYPING_DEFENSE_DESIGN.md 6.15; BUILD_NOW §6.1 td-router). */
const deck = smallDeck(["cat", "dog", "fish", "frog", "bird", "duck", "flame", "fresh"]);
/** A world with `words` live, each on a bright call of its own at the Bastion (tier 2 when the letter is taken). */
function withWords(...words: string[]): { w: World; slot: (text: string) => number } {
  const w = world({ deck });
  for (const text of words) callWord(w, wordOf(deck, text), w.typing.letters.owner[text.charCodeAt(0) - 97]! >= 0 ? 2 : 1);
  return { w, slot: (text) => live(w).find((word) => word.text === text)!.s };
}

const results = (events: ReturnType<typeof type>) => events.flatMap((event) => (event.t === "wordKey" ? [event.result] : []));

describe("key router", () => {
  it("a tier-1 first letter locks its word; right letters move it on, a wrong one is an error that does not", () => {
    const { w, slot } = withWords("cat", "dog");
    expect(results(type(w, "cx"))).toEqual([KEY.lock, KEY.wrong]);
    expect(w.typing.router.lock).toBe(slot("cat"));
    expect([w.words.typed[slot("cat")], w.words.errors[slot("cat")]]).toEqual([1, 1]);
    const events = type(w, "at");
    expect(results(events)).toEqual([KEY.advance, KEY.done]);
    expect(events.some((event) => event.t === "wordHit" && event.grade === "ok" && event.errors === 1)).toBe(true);
    expect(w.typing.router.lock).toBe(-1);
  });

  it("soft switch: one letter in, no error yet, a key that starts another word moves the lock; one shared error, none on the old word", () => {
    const { w, slot } = withWords("cat", "dog");
    expect(results(type(w, "cd"))).toEqual([KEY.lock, KEY.switch]);
    expect(w.typing.router.lock).toBe(slot("dog"));
    expect([w.words.typed[slot("cat")], w.words.errors[slot("cat")], w.words.touched[slot("cat")]]).toEqual([0, 0, 0]);
    expect(w.words.typed[slot("dog")]).toBe(1);
    expect(w.stats[STAT.keyErrors]).toBe(1);
    // Two letters in, the same key is an error on the locked word.
    const late = withWords("cat", "dog");
    expect(results(type(late.w, "cad"))).toEqual([KEY.lock, KEY.advance, KEY.wrong]);
    expect(late.w.words.errors[late.slot("cat")]).toBe(1);
  });

  it("a tier-2 pair opens on its letter; the second key picks the word, a miss is an error on the older one", () => {
    const { w, slot } = withWords("fish", "frog");
    expect(w.words.tier[slot("frog")]).toBe(2);
    expect(results(type(w, "fr"))).toEqual([KEY.group, KEY.advance]);
    expect([w.typing.router.lock, w.words.typed[slot("frog")]]).toEqual([slot("frog"), 2]);
    const miss = withWords("fish", "frog");
    expect(results(type(miss.w, "fx"))).toEqual([KEY.group, KEY.wrong]);
    expect([miss.w.typing.router.lock, miss.w.words.typed[miss.slot("fish")], miss.w.words.errors[miss.slot("fish")]]).toEqual([miss.slot("fish"), 1, 1]);
  });

  it("when a pair's first word ends, the other one is told by its first letter alone (tier 1)", () => {
    const { w, slot } = withWords("fish", "frog");
    const frog = slot("frog");
    type(w, "fish");
    expect(w.words.tier[frog]).toBe(1);
    expect(results(type(w, "f"))).toEqual([KEY.lock]);
    expect(w.typing.router.lock).toBe(frog);
  });

  it("errors stop at 255: a flood of wrong keys in one tick never wraps a word back to clean", () => {
    const { w } = withWords("cat");
    const hit = type(w, "c" + "x".repeat(300) + "at", 1, true).find((event) => event.t === "wordHit");
    expect(hit).toMatchObject({ grade: "sloppy", errors: 255 });
  });

  it("Backspace takes a letter back (errors stay) and at 0 lets go; it never touches buildings", () => {
    const { w, slot } = withWords("bird");
    type(w, "bix");
    send(w, { t: "backspace", atMs: 0 });
    expect([w.words.typed[slot("bird")], w.words.errors[slot("bird")], w.typing.router.lock]).toEqual([1, 1, slot("bird")]);
    send(w, { t: "backspace", atMs: 0 });
    expect(w.typing.router.lock).toBe(-1);
    expect(w.words.touched[slot("bird")]).toBe(1);
    const buildings = w.buildings.count;
    send(w, { t: "backspace", atMs: 0 });
    expect(w.buildings.count).toBe(buildings);
  });

  it("a lock with no letter in (a call's next word, BUILD_1A6 §5.2): another word's first letter switches, Backspace lets go, never wrapping (review R1)", () => {
    const { w, slot } = withWords("cat", "dog");
    w.typing.router.lock = slot("cat"); // what a call does with its next word
    expect(results(type(w, "d"))).toEqual([KEY.switch]);
    expect([w.typing.router.lock, w.words.typed[slot("dog")], w.words.errors[slot("cat")]]).toEqual([slot("dog"), 1, 0]);
    const back = withWords("cat");
    back.w.typing.router.lock = back.slot("cat");
    send(back.w, { t: "backspace", atMs: 0 });
    expect([back.w.typing.router.lock, back.w.words.typed[back.slot("cat")]]).toEqual([-1, 0]);
    // A wrong key that starts nothing is still an error on the locked word; after it, no switch.
    const typo = withWords("cat", "dog");
    typo.w.typing.router.lock = typo.slot("cat");
    expect(results(type(typo.w, "xd"))).toEqual([KEY.wrong, KEY.wrong]);
  });

  it("unlock (Escape) lets go of the word and drops what was typed, errors uncounted; a key that starts nothing is a stray, counted against accuracy", () => {
    const { w, slot } = withWords("duck");
    type(w, "dux");
    send(w, { t: "unlock" });
    expect([w.typing.router.lock, w.words.typed[slot("duck")], w.words.errors[slot("duck")]]).toEqual([-1, 0, 0]);
    expect(type(w, "duck", 50, true).find((event) => event.t === "wordHit")).toMatchObject({ errors: 0 });
    const again = withWords("duck");
    expect(results(type(again.w, "z"))).toEqual([KEY.stray]);
    expect(again.w.stats[STAT.strays]).toBe(1);
  });

  it("several keys in one tick route in order", () => {
    const { w } = withWords("flame");
    expect(results(type(w, "flame", 50, true))).toEqual([KEY.lock, KEY.advance, KEY.advance, KEY.advance, KEY.done]);
    expect(w.stats[STAT.callWords]).toBe(1);
  });
});
