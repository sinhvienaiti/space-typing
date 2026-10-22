import { Slots } from "./slots";

/**
 * Live words (TK 6.4, 25.8; BUILD_1A6 §5.2): a deck index, never a string. A
 * word belongs to the bright call that holds it; it is born when the call
 * gets it (speed is scored from then) and never runs out: `life` is only the
 * clock it is scored against.
 */
export class WordStore extends Slots {
  readonly word = new Int32Array(this.cap);
  readonly call = new Int16Array(this.cap);
  readonly kind = new Uint8Array(this.cap);
  readonly tier = new Uint8Array(this.cap);
  readonly born = new Int32Array(this.cap);
  readonly life = new Int32Array(this.cap);
  readonly typed = new Uint8Array(this.cap);
  readonly errors = new Uint8Array(this.cap);
  /** A letter was typed on it (a soft switch away takes this back). */
  readonly touched = new Uint8Array(this.cap);
  /** Key times (ms) of its first and last letter, for the raw typing speed. */
  readonly firstMs = new Float64Array(this.cap);
  readonly lastMs = new Float64Array(this.cap);

  add(word: number, call: number, kind: number, tier: number, tick: number, life: number): number {
    const slot = this.take();
    if (slot < 0) return -1;
    this.word[slot] = word;
    this.call[slot] = call;
    this.kind[slot] = kind;
    this.tier[slot] = tier;
    this.born[slot] = tick;
    this.life[slot] = life;
    return slot;
  }
}
