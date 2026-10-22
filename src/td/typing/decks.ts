/**
 * Word decks (docs/td/TYPING_DEFENSE_DESIGN.md 25.5, 6.5). The vocabulary is
 * compiled once into letter codes (a = 0 … z = 25) in one Uint8Array with
 * each word's start, length and vocabulary level: the simulation never holds
 * a word as a string. A band is the words of a length range up to a level;
 * its A (letters that start at least 3 of its words) sets the stream cap.
 */
import { CAP, EMIT, LENGTH_BY_E, LETTERS } from "../content/rules";

/** One vocabulary word, already reduced to a–z (typingText). Order matters: it is the deck order. */
export type DeckEntry = { id: string; text: string; level: number };

export type Deck = {
  readonly count: number;
  readonly letters: Uint8Array;
  readonly start: Int32Array;
  readonly len: Uint8Array;
  readonly level: Uint8Array;
  readonly ids: readonly string[];
  /** FNV-1a of the letters and levels: a replay checks it has the same deck. */
  readonly hash: string;
};

export const WORD_MIN = LENGTH_BY_E[0].len[0];
export const WORD_MAX = LENGTH_BY_E[LENGTH_BY_E.length - 1]!.len[1];
const A = 97;

/** Keeps a–z words inside every band's reach, the first of each spelling only. */
export function compileDeck(entries: readonly DeckEntry[]): Deck {
  const seen = new Set<string>();
  const kept = entries.filter((entry) => {
    const ok = entry.text.length >= WORD_MIN && entry.text.length <= WORD_MAX && /^[a-z]+$/.test(entry.text) && !seen.has(entry.text);
    if (ok) seen.add(entry.text);
    return ok;
  });
  const letters = new Uint8Array(kept.reduce((sum, entry) => sum + entry.text.length, 0));
  const start = new Int32Array(kept.length);
  const len = new Uint8Array(kept.length);
  const level = new Uint8Array(kept.length);
  let at = 0;
  let hash = 0x811c9dc5;
  kept.forEach((entry, index) => {
    start[index] = at;
    len[index] = entry.text.length;
    level[index] = entry.level;
    for (let k = 0; k < entry.text.length; k += 1) {
      letters[at] = entry.text.charCodeAt(k) - A;
      hash = Math.imul(hash ^ letters[at]!, 0x01000193);
      at += 1;
    }
    hash = Math.imul(hash ^ (32 + entry.level), 0x01000193);
  });
  return { count: kept.length, letters, start, len, level, ids: kept.map((entry) => entry.id), hash: (hash >>> 0).toString(16).padStart(8, "0") };
}

export const wordText = (deck: Deck, word: number): string =>
  String.fromCharCode(...deck.letters.subarray(deck.start[word]!, deck.start[word]! + deck.len[word]!).map((code) => code + A));

/** Deck indices of the words of length lo..hi from vocabulary levels 1..maxLevel, in deck order. */
export function bandWords(deck: Deck, maxLevel: number, lo: number, hi: number): Int32Array {
  const out: number[] = [];
  for (let word = 0; word < deck.count; word += 1) if (deck.level[word]! <= maxLevel && deck.len[word]! >= lo && deck.len[word]! <= hi) out.push(word);
  return Int32Array.from(out);
}

/** A: how many letters start at least LETTERS.minWordsPerLetter of the band's words. */
export function availableLetters(deck: Deck, words: Int32Array): number {
  const per = new Int32Array(26);
  for (const word of words) {
    const c = deck.letters[deck.start[word]!]!;
    per[c] = per[c]! + 1;
  }
  return per.filter((count) => count >= LETTERS.minWordsPerLetter).length;
}

/** The stream cap (TK 6.5): clamp(A − 6; 4; 12). */
export const streamCap = (a: number): number => Math.max(CAP.streamLiveMin, Math.min(CAP.streamLiveMax, a - EMIT.letterSlack));
