import { describe, expect, it } from "vitest";
import { CALL } from "../src/td/content/rules";
import { hashHex } from "../src/td/sim/hash";
import { CALL_KIND, CALL_STATE } from "../src/td/sim/stores/calls";
import { makeCall, review } from "../src/td/sim/systems/calls";
import { createWorld, type World } from "../src/td/sim/world";
import { compileDeck, gloss, wordText } from "../src/td/typing/decks";
import { run, send, world } from "./td/fixtures";
import { callWord, realDeck, smallDeck, type, wordOf } from "./td/typing";

/** Learning (docs/td/BUILD_1A6.md §6–§7): meanings for the view, the review book, the helpers' quizzes. */
const T = (seconds: number) => Math.round(seconds * 60);
const WORDS = ["apple", "bread", "cider", "dream", "eagle", "fable", "grape", "house", "ivory", "lemon", "mango", "night", "olive", "peach", "river", "stone", "tiger", "uncle", "vivid", "water", "yacht", "kitten"];
const deck = smallDeck(WORDS);
const book = (w: World): string[] => Array.from(w.typing.review.subarray(0, w.typing.reviewN), (word) => wordText(w.typing.deck, word));
const quizzes = (w: World): number[] => w.calls.live().filter((c) => w.calls.kind[c] === CALL_KIND.quiz);

/** A world whose Bastion lets `helpers` Thư Đồng out (they wait west of it), in the relax mode unless asked. */
function school(helpers = 1, options: Parameters<typeof world>[0] = {}): World {
  const w = world({ deck, mode: "relax", ...options });
  send(w, { t: "sandbox", op: { op: "keepLevel", value: helpers + 1 } });
  return w;
}

describe("decks carry meanings for the view (§7)", () => {
  it("take vi and ipa from the vocabulary; the deck's hash, and so the world's, ignore them", () => {
    const plain = compileDeck([{ id: "a", text: "good", level: 1 }, { id: "b", text: "cold", level: 1 }]);
    const rich = compileDeck([{ id: "a", text: "good", level: 1, vi: "tốt; hay", ipa: "/ɡʊd/" }, { id: "b", text: "cold", level: 1, vi: "lạnh; rét", ipa: "/koʊld/" }]);
    expect(rich.hash).toBe(plain.hash);
    expect([rich.vi[0], rich.ipa[1], plain.vi[0], plain.ipa[0]]).toEqual(["tốt; hay", "/koʊld/", "", ""]);
    expect(hashHex(createWorld({ seed: 1, deck: rich }))).toBe(hashHex(createWorld({ seed: 1, deck: plain })));
    const real = realDeck();
    expect([real.vi[wordOf(real, "good")], real.ipa[wordOf(real, "good")]]).toEqual(["tốt; hay", "/ɡʊd/"]);
    expect(real.vi.filter((vi) => vi !== "").length).toBe(real.count);
  });

  it("a card's gloss leaves notes in brackets out, keeps the first sense, then more while within 22 letters; a long one is cut", () => {
    const long = "một nghĩa rất dài không có dấu chấm phẩy nào";
    const d = compileDeck([
      { id: "a", text: "sad", level: 1, vi: "buồn; buồn bả; buồn rầu" }, { id: "b", text: "good", level: 1, vi: "tốt; hay" }, { id: "c", text: "long", level: 1, vi: long },
      { id: "d", text: "none", level: 1 }, { id: "e", text: "lot", level: 1, vi: "nhiều, vô số (theo sau bởi of)" },
    ]);
    expect([0, 1, 2, 3, 4].map((word) => gloss(d, word))).toEqual(["buồn; buồn bả", "tốt; hay", long.slice(0, 25) + "…", "", "nhiều, vô số"]);
  });
});

describe("the review book (§7)", () => {
  it("takes a word typed sloppy, never a clean one or one with a single error", () => {
    const w = world({ deck });
    callWord(w, wordOf(deck, "apple"));
    type(w, "azzpple");
    callWord(w, wordOf(deck, "bread"));
    type(w, "bzread");
    callWord(w, wordOf(deck, "cider"));
    type(w, "cider");
    expect(book(w)).toEqual(["apple"]);
    expect(CALL.reviewErrors).toBe(2); // ≥ 2 errors: on a word of 3–8 letters always sloppy too
  });

  it("holds 20 words, oldest first: a 21st pushes the oldest out, a word again moves to the end, a quiz typed right takes it out", () => {
    const w = world({ deck });
    for (let word = 0; word < 21; word += 1) review(w, word, true);
    expect(book(w)).toEqual(WORDS.slice(1, 21));
    review(w, 5, true);
    expect(book(w)).toEqual([...WORDS.slice(1, 5), ...WORDS.slice(6, 21), WORDS[5]]);
    review(w, 7, false);
    review(w, 0, false); // not in it: nothing changes
    expect(book(w)).toEqual([...WORDS.slice(1, 5), ...WORDS.slice(6, 7), ...WORDS.slice(8, 21), WORDS[5]]);
  });

  it("is in the hash", () => {
    const [a, b] = [world({ deck }), world({ deck })];
    review(b, 3, true);
    expect(hashHex(a)).not.toBe(hashHex(b));
  });
});

describe("quizzes (§6, §7)", () => {
  it("none while the book is empty; then by day a helper asks one, at the helper, lit by its ring, the book's word under the meaning", () => {
    const w = school();
    run(w, T(30));
    expect(quizzes(w)).toEqual([]);
    review(w, wordOf(deck, "grape"), true);
    run(w, 1);
    const [c] = quizzes(w);
    const C = w.calls;
    expect([C.agent[c!], C.state[c!], C.bright[c!], C.words[c!], C.x[c!], C.z[c!]]).toEqual([1, CALL_STATE.open, 1, 1, w.agents.x[1], w.agents.z[1]]);
    expect(wordText(deck, w.words.word[C.word[c!]!]!)).toBe("grape");
  });

  it("typed right: the word leaves the book, +1 knowledge and +1 for the whole Perfect call; typed sloppy it stays, +1 only", () => {
    const w = school();
    review(w, wordOf(deck, "grape"), true);
    run(w, 1);
    type(w, "grape", 60, true);
    expect([book(w), w.knowledge, quizzes(w)]).toEqual([[], 2, []]);
    const other = school();
    review(other, wordOf(deck, "lemon"), true);
    run(other, 1);
    type(other, "lzzemon", 60, true);
    expect([book(other), other.knowledge, quizzes(other)]).toEqual([["lemon"], 1, []]);
  });

  it("a helper asks every 25 s at most, one live quiz each; never more quizzes than words in the book", () => {
    const w = school(3);
    review(w, wordOf(deck, "grape"), true);
    run(w, 1);
    expect(quizzes(w).length).toBe(1); // three helpers, one word
    review(w, wordOf(deck, "lemon"), true);
    review(w, wordOf(deck, "river"), true);
    run(w, 1);
    expect(quizzes(w).map((c) => w.calls.agent[c])).toEqual([1, 2, 3]);
    const asked = w.tick;
    type(w, wordText(deck, w.words.word[w.calls.word[quizzes(w)[0]!]!]!), 60, true);
    review(w, wordOf(deck, "stone"), true);
    for (; w.tick < asked + T(CALL.quizEveryS) - 2; ) run(w, 1);
    expect(quizzes(w).map((c) => w.calls.agent[c])).toEqual([2, 3]); // helper 1 waits its 25 s
    run(w, 3);
    expect(quizzes(w).map((c) => w.calls.agent[c]).sort()).toEqual([1, 2, 3]);
  });

  it("never hold the cap: at the cap a quiz nobody is typing dims for another call in a ring; the one being typed stays", () => {
    const w = school(2); // relax: 2 bright at most
    review(w, wordOf(deck, "grape"), true);
    review(w, wordOf(deck, "lemon"), true);
    run(w, 1);
    const [first, second] = quizzes(w);
    expect([w.calls.bright[first!], w.calls.bright[second!]]).toEqual([1, 1]);
    type(w, wordText(deck, w.words.word[w.calls.word[first!]!]!)[0]!, 60, true);
    const build = makeCall(w, CALL_KIND.build, 2, -1, 0, -1, -1); // the Bastion's, in the hero's ring
    run(w, 1);
    expect([w.calls.bright[first!], w.calls.bright[second!], w.calls.bright[build], w.calls.word[second!]]).toEqual([1, 0, 1, -1]);
    const mine = makeCall(w, CALL_KIND.mine, 2, -1, 0, -1, -1);
    run(w, 1);
    expect([w.calls.bright[first!], w.calls.bright[mine]]).toEqual([1, 0]); // nothing left to give way
  });

  it("end with their day (a locked one waits for its word); none are asked at night", () => {
    const w = school(2);
    review(w, wordOf(deck, "grape"), true);
    review(w, wordOf(deck, "lemon"), true);
    run(w, 1);
    const [first] = quizzes(w);
    const word = wordText(deck, w.words.word[w.calls.word[first!]!]!);
    type(w, word[0]!, 60, true);
    send(w, { t: "callNight" });
    expect(quizzes(w)).toEqual([first]); // the locked one stays
    type(w, word.slice(1), 60, true);
    run(w, T(30));
    expect([quizzes(w), w.knowledge]).toEqual([[], 2]);
  });
});
