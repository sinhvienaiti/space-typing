/**
 * A typist's hands for the Typing Defense bots (docs/td/BUILD_NOW.md §6.3):
 * keys at a set WPM (5 letters a word) with an even spread, a slip onto a
 * neighbouring key by the per-key accuracy, and after a slip a Backspace out
 * of habit by chance. The router does not move on after a wrong key, so that
 * Backspace takes a right letter back and costs a retype, as it costs a real
 * player. The hands draw on a stream of their own: the world's never move.
 */
import type { RngStream } from "../../src/platform/rng";

/** wpm: keys a minute / 5; accuracy: the share of keys that land right; backspace: the chance of a Backspace after a slip. */
export type HandsSpec = { wpm: number; accuracy: number; backspace: number };

const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

/** For each letter (a = 0), the letters beside it on its QWERTY row: where a slip lands. */
export const NEIGHBOURS: readonly (readonly number[])[] = Array.from({ length: 26 }, (_, letter) => {
  const ch = String.fromCharCode(97 + letter);
  const row = ROWS.find((keys) => keys.includes(ch))!;
  const at = row.indexOf(ch);
  return [row[at - 1], row[at + 1]].filter((key): key is string => key !== undefined).map((key) => key.charCodeAt(0) - 97);
});

export class Keystrokes {
  /** Mean milliseconds from one key to the next: 60 000 / (5 × WPM). */
  readonly meanMs: number;

  constructor(readonly spec: HandsSpec, private readonly rng: RngStream) {
    this.meanMs = 12000 / spec.wpm;
  }

  /** Milliseconds to the next key: the mean, ±50 %, even (the evenness C of TK 6.14 stays high). */
  gap(): number {
    return this.meanMs * (0.5 + this.rng.float());
  }

  /** The letter the hand presses aiming at `letter` (0–25): it, or by 1 − accuracy a key beside it. */
  hit(letter: number): number {
    if (!this.rng.chance(1 - this.spec.accuracy)) return letter;
    const near = NEIGHBOURS[letter]!;
    return near[this.rng.int(0, near.length - 1)]!;
  }

  /** A Backspace right after a slip, out of habit? */
  backspaceAfterSlip(): boolean {
    return this.rng.chance(this.spec.backspace);
  }
}
