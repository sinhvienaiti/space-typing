/**
 * Helpers for the Typing Defense typing tests: the real vocabulary read from
 * shared/vocabulary (BUILD_NOW §3.5), small decks of chosen words, a call
 * made bright with a chosen word, and keys sent the way the input sends them.
 */
import { readFileSync } from "node:fs";
import { deckFromLevels, VOCAB_LEVELS } from "../../src/td/app/vocab";
import { WORD_D } from "../../src/td/content/rules";
import type { CommandBody } from "../../src/td/sim/commands";
import type { RareEvent } from "../../src/td/sim/events";
import { CALL_KIND, CALL_STATE } from "../../src/td/sim/stores/calls";
import { expectedE, makeCall } from "../../src/td/sim/systems/calls";
import { step, type World } from "../../src/td/sim/world";
import { compileDeck, wordText, type Deck } from "../../src/td/typing/decks";
import { KIND } from "../../src/td/typing/letters";
import { lifeTicks } from "../../src/td/typing/scorer";
import { send } from "./fixtures";

const levels = new Map<number, { id: string; en: string }[]>();
const level = (n: number) => {
  if (!levels.has(n)) levels.set(n, JSON.parse(readFileSync(new URL("../../../../shared/vocabulary/levels/" + String(n).padStart(3, "0") + ".json", import.meta.url), "utf8")).entries);
  return levels.get(n)!;
};

/** Shared vocabulary levels 1–5 in one deck, as the page compiles it. */
export const realDeck = (): Deck => deckFromLevels(Array.from({ length: VOCAB_LEVELS }, (_, index) => level(index + 1)));

/** The real words of levels 1..max, a–z only, as typingText leaves them. */
export const realWords = (max: number): { text: string; level: number }[] =>
  Array.from({ length: max }, (_, index) => level(index + 1).map((entry) => ({ text: entry.en.trim().toLowerCase().replace(/[^a-z]/g, ""), level: index + 1 }))).flat();

export const smallDeck = (words: readonly string[]): Deck => compileDeck(words.map((text, index) => ({ id: "w" + index, text, level: 1 })));

export const letter = (ch: string): number => ch.charCodeAt(0) - 97;

/** Live words: slot, text, call slot, typed. */
export function live(w: World): { s: number; text: string; c: number; typed: number }[] {
  return w.words.live().map((s) => ({ s, text: wordText(w.typing.deck, w.words.word[s]!), c: w.words.call[s]!, typed: w.words.typed[s]! }));
}

export const wordOf = (deck: Deck, text: string): number => [...Array(deck.count).keys()].find((word) => wordText(deck, word) === text)!;

/**
 * Puts deck word `word` live (at `tier`) on a new call of `kind` (`words` long) at building b, opened and bright as
 * the director would make it, with this word: returns the word slot. Its call is `w.words.call[slot]`.
 */
export function callWord(w: World, word: number, tier = 1, kind: number = CALL_KIND.mine, b = 0, words = 1): number {
  const c = makeCall(w, kind, words, -1, b, -1, -1);
  w.calls.state[c] = CALL_STATE.open;
  w.calls.bright[c] = 1;
  const s = w.words.add(word, c, KIND.call, tier, w.tick, lifeTicks(w.typing.deck.len[word]!, expectedE(w), WORD_D.known, w.mode));
  const first = w.typing.deck.letters[w.typing.deck.start[word]!]!;
  w.typing.letters.take(s, first, tier);
  w.calls.word[c] = s;
  w.calls.last[c] = first;
  return s;
}

/** Sends `text` one key a tick (or all in one tick with `sameTick`), `ms` apart on the key clock; returns the rare events. */
export function type(w: World, text: string, ms = 150, sameTick = false): RareEvent[] {
  const from = w.events.rare.length;
  const keys: CommandBody[] = [...text].map((ch, index) => ({ t: "key", letter: letter(ch), atMs: w.tick * 16 + index * ms }));
  if (sameTick) send(w, ...keys);
  else for (const key of keys) send(w, key);
  return w.events.rare.slice(from);
}

export function steps(w: World, ticks: number, each?: (w: World) => void): void {
  for (let index = 0; index < ticks; index += 1) {
    step(w);
    each?.(w);
  }
}

/** Spots where the 1A buildings stand clear of roads, water, trees and each other. */
export const SPOTS = { archer: ["archer", -16, -4], archer2: ["archer", 10, -6], cannon: ["cannon", 10, -16], barracks: ["barracks", 2, 18], mine: ["gold-mine", 26, -30], farm: ["farm", -17, 40], keep: ["keep", 0, 40] } as const;
