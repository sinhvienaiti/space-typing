import { describe, expect, it } from "vitest";
import { installTypingInput } from "../src/td/app/input";
import type { CommandBody } from "../src/td/sim/commands";
import { STAT } from "../src/td/sim/stats";
import { spawnWord } from "../src/td/sim/systems/words";
import type { World } from "../src/td/sim/world";
import { wordText } from "../src/td/typing/decks";
import { KEY } from "../src/td/typing/router";
import { build, ready, run, send, world } from "./td/fixtures";
import { live, smallDeck, type } from "./td/typing";

/** The key router (docs/td/TYPING_DEFENSE_DESIGN.md 6.15; BUILD_NOW §6.1 td-router). */
const deck = smallDeck(["cat", "dog", "fish", "frog", "bird", "duck", "flame", "fresh"]);
const id = (text: string) => [...Array(deck.count).keys()].find((word) => wordText(deck, word) === text)!;

/** A world with an archer and `words` live on it (tier 2 when the letter is taken). */
function withWords(...words: string[]): { w: World; slot: (text: string) => number } {
  const w = world({ deck });
  const archer = build(w, "archer", -16, -4);
  ready(w);
  for (const text of words) spawnWord(w, archer, id(text), w.typing.letters.owner[text.charCodeAt(0) - 97]! >= 0 ? 2 : 1);
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

  it("unlock (Escape) lets go of the word; a key that starts nothing is a stray, counted against accuracy", () => {
    const { w } = withWords("duck");
    type(w, "du");
    send(w, { t: "unlock" });
    expect(w.typing.router.lock).toBe(-1);
    expect(results(type(w, "z"))).toEqual([KEY.stray]);
    expect(w.stats[STAT.strays]).toBe(1);
  });

  it("several keys in one tick route in order; a locked word that runs out lets go of the lock", () => {
    const { w } = withWords("flame");
    expect(results(type(w, "flame", 50, true))).toEqual([KEY.lock, KEY.advance, KEY.advance, KEY.advance, KEY.done]);
    expect(w.stats[STAT.streamDone]).toBe(1);
    const late = withWords("duck");
    type(late.w, "d");
    run(late.w, 600);
    expect(late.w.typing.router.lock).toBe(-1);
    expect(late.w.stats[STAT.streamMissed]).toBe(1);
  });
});

describe("typing input (app/input.ts)", () => {
  type Fake = { key: string; code: string; isTrusted?: boolean; ctrlKey?: boolean; repeat?: boolean; isComposing?: boolean; timeStamp?: number };
  function harness(locked = false, allowUntrusted = false) {
    const sent: CommandBody[] = [];
    let handler: (event: KeyboardEvent) => void = () => undefined;
    const target = { addEventListener: (_: string, fn: typeof handler) => (handler = fn), removeEventListener: () => undefined } as unknown as Window;
    installTypingInput(target, { send: (command) => sent.push(command), locked: () => locked, onVietnamese: () => undefined, allowUntrusted });
    const press = (event: Fake) => {
      let prevented = false;
      handler({ isTrusted: true, timeStamp: 10, preventDefault: () => (prevented = true), ...event } as unknown as KeyboardEvent);
      return prevented;
    };
    return { sent, press };
  }

  it("letters become keys; Backspace and Space are taken from the page; Escape unlocks only a locked word", () => {
    const { sent, press } = harness(true);
    expect(press({ key: "A", code: "KeyA" })).toBe(true);
    expect(press({ key: "Backspace", code: "Backspace" })).toBe(true);
    expect(press({ key: " ", code: "Space" })).toBe(true);
    press({ key: "Escape", code: "Escape" });
    expect(sent).toEqual([{ t: "key", letter: 0, atMs: 10 }, { t: "backspace", atMs: 10 }, { t: "unlock" }]);
    const free = harness(false);
    expect(free.press({ key: "Escape", code: "Escape" })).toBe(false);
    expect(free.sent).toEqual([]);
  });

  it("ignores composing, held, Ctrl and synthetic presses (unless the dev flag allows them)", () => {
    const { sent, press } = harness();
    press({ key: "a", code: "KeyA", ctrlKey: true });
    press({ key: "a", code: "KeyA", repeat: true });
    press({ key: "Process", code: "KeyA", isComposing: true });
    press({ key: "a", code: "KeyA", isTrusted: false });
    expect(sent).toEqual([]);
    const dev = harness(false, true);
    dev.press({ key: "a", code: "KeyA", isTrusted: false });
    expect(dev.sent.length).toBe(1);
  });
});
