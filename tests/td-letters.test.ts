import { describe, expect, it } from "vitest";
import { createRng } from "../src/platform/rng";
import { LETTERS } from "../src/td/content/rules";
import { compileDeck, wordText } from "../src/td/typing/decks";
import { withinOneEdit } from "../src/td/typing/distance";
import { KIND, Letters, type LiveWords } from "../src/td/typing/letters";
import { createBag, pickWord } from "../src/td/typing/picker";
import { letter, smallDeck } from "./td/typing";

/**
 * First letters (docs/td/TYPING_DEFENSE_DESIGN.md 6.5, 25.8; BUILD_NOW §6.1 td-letters). Since 1A.6 at most a
 * mode's cap of calls hold a word at once, so the world never comes near the reserve; td-calls checks first letters
 * on the real vocabulary every tick, these check the letters on their own.
 */

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
    expect(letters.claim(deck, live, id("form"), KIND.call, 0, 1, -1, free)).toBe(0);
    expect(letters.claim(deck, live, id("from"), KIND.call, 0, 1, -1, free)).toBe(0);
    expect(letters.claim(deck, live, id("bread"), KIND.call, 0, 1, -1, free)).toBe(1);
    expect(letters.claim(deck, live, id("bread"), KIND.call, 0, 1, letter("b"), free)).toBe(0);
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
    expect(letters.claim(deck, live, id("apple"), KIND.call, 159, 1, -1, letters.free(159, 1))).toBe(0);
    expect(letters.claim(deck, live, id("apple"), KIND.call, 160, 1, -1, letters.free(160, 1))).toBe(1);
    letters.take(4, letter("b"), 1);
    letters.take(5, letter("b"), 2);
    letters.release(4, letter("b"), 200);
    expect([letters.owner[letter("b")], letters.partner[letter("b")]]).toEqual([5, -1]);
  });

  it("avoids q, x, z, j up to vocabulary level 10", () => {
    const letters = new Letters();
    const live = liveOf(deck, []);
    for (const word of ["quiet", "zebra", "joker", "xenon"]) {
      expect(letters.claim(deck, live, id(word), KIND.call, 0, 10, -1, letters.free(0, 10))).toBe(0);
      expect(letters.claim(deck, live, id(word), KIND.call, 0, 11, -1, letters.free(0, 11))).toBe(1);
    }
  });

  it("keeps 3 free letters for higher kinds: a stream word may not take them, a higher (fake) kind may", () => {
    const letters = new Letters();
    const live = liveOf(deck, []);
    holdAll(letters, live, "absqxzj"); // 3 usable letters free: a, b, s
    expect(letters.free(0, 1)).toBe(3);
    expect(letters.claim(deck, live, id("apple"), KIND.call, 0, 1, -1, 3)).toBe(0);
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
    expect(letters.claim(deck2, live, at("form"), KIND.call, 0, 3, -1, letters.free(0, 3))).toBe(2);
    // From level 4, tier 2 waits until the stream's floor (3 free): 2 free is under it, so still 2.
    expect(letters.claim(deck2, live, at("form"), KIND.call, 0, 4, -1, letters.free(0, 4))).toBe(2);
    letters.owner[letter("c")] = -1;
    letters.owner[letter("d")] = -1;
    letters.owner[letter("e")] = -1;
    letters.owner[letter("g")] = -1;
    // 5 free (a c d e g): level 4 has no tier 2 above its floor of 3; level 3 still pairs early (≤ 5).
    expect(letters.free(0, 3)).toBe(5);
    expect(letters.claim(deck2, live, at("form"), KIND.call, 0, 4, -1, letters.free(0, 4))).toBe(0);
    expect(letters.claim(deck2, live, at("form"), KIND.call, 0, 3, -1, letters.free(0, 3))).toBe(2);
    const touched = liveOf(deck2, ["frame"], [1]);
    expect(letters.claim(deck2, touched, at("form"), KIND.call, 0, 3, -1, letters.free(0, 3))).toBe(0);
    // The same second letter could never be told apart: "frame" and "fr…" never pair.
    const deck3 = smallDeck(["frame", "fresh"]);
    const live3: LiveWords = { top: 1, used: Uint8Array.of(1), word: Int32Array.of(0), touched: Uint8Array.of(0) };
    expect(letters.claim(deck3, live3, 1, KIND.call, 0, 3, -1, 0)).toBe(0);
  });

  it("deals no word twice in a round of the bag; a jam returns −1 and is not a miss", () => {
    const deck4 = compileDeck("apple bread cider dream eagle fable grape house ivory lemon".split(" ").map((text, index) => ({ id: "x" + index, text, level: 1 })));
    const bag = createBag(Int32Array.from(deck4.ids.keys()));
    const letters = new Letters();
    const rng = createRng(7).words;
    const seen = new Set<number>();
    const live: LiveWords = { top: 0, used: new Uint8Array(0), word: new Int32Array(0), touched: new Uint8Array(0) };
    for (let k = 0; k < deck4.count; k += 1) {
      const pick = pickWord(bag, deck4, letters, live, KIND.call, 1000 + k * 100, 1, -1, rng);
      expect(pick).toBeGreaterThanOrEqual(0);
      seen.add(pick >> 2);
    }
    expect(seen.size).toBe(deck4.count);
    holdAll(letters, live, "qxzj");
    expect(pickWord(bag, deck4, letters, live, KIND.call, 1e6, 1, -1, rng)).toBe(-1);
  });

  it("a round's rest that fits nowhere now opens the next round: it comes before any other word repeats (TK 25.8)", () => {
    const deck4 = compileDeck("apple bread cider dream eagle fable grape house ivory lemon".split(" ").map((text, index) => ({ id: "x" + index, text, level: 1 })));
    const bag = createBag(Int32Array.from(deck4.ids.keys()));
    const letters = new Letters();
    const rng = createRng(7).words;
    const live: LiveWords = { top: 0, used: new Uint8Array(0), word: new Int32Array(0), touched: new Uint8Array(0) };
    const pick = () => pickWord(bag, deck4, letters, live, KIND.call, 1e6, 1, -1, rng) >> 2;
    const dealt = Array.from({ length: 7 }, pick);
    const rest = [...deck4.ids.keys()].filter((word) => !dealt.includes(word));
    const hold = (on: boolean) => rest.forEach((word) => (letters.owner[deck4.letters[deck4.start[word]!]!] = letters.partner[deck4.letters[deck4.start[word]!]!] = on ? 99 : -1));
    hold(true); // the rest's letters are all taken: this deal can only repeat a word
    expect(dealt).toContain(pick());
    hold(false);
    expect(Array.from({ length: rest.length }, pick).sort()).toEqual(rest);
  });
});
