import { Slots } from "./slots";

/**
 * Live words (TK 6.4, 25.8): a deck index, never a string. A word belongs to
 * the building that dealt it until it is typed, expires or is cancelled,
 * even after its assistant has left; `agent` and `tempo` are kept from the
 * moment it was dealt, for the reward.
 */
export class WordStore extends Slots {
  readonly word = new Int32Array(this.cap);
  readonly building = new Int16Array(this.cap);
  readonly kind = new Uint8Array(this.cap);
  readonly tier = new Uint8Array(this.cap);
  readonly agent = new Int8Array(this.cap);
  readonly tempo = new Uint8Array(this.cap);
  readonly born = new Int32Array(this.cap);
  /** Base life in ticks (speed is measured against it) and the tick it expires (extension included). */
  readonly life = new Int32Array(this.cap);
  readonly expire = new Int32Array(this.cap);
  readonly typed = new Uint8Array(this.cap);
  readonly errors = new Uint8Array(this.cap);
  /** A letter was typed on it (a soft switch away takes this back). */
  readonly touched = new Uint8Array(this.cap);
  readonly extended = new Uint8Array(this.cap);
  /** Key times (ms) of its first and last letter, for the raw typing speed. */
  readonly firstMs = new Float64Array(this.cap);
  readonly lastMs = new Float64Array(this.cap);

  add(word: number, building: number, kind: number, tier: number, agent: number, tempo: number, tick: number, life: number): number {
    const slot = this.take();
    if (slot < 0) return -1;
    this.word[slot] = word;
    this.building[slot] = building;
    this.kind[slot] = kind;
    this.tier[slot] = tier;
    this.agent[slot] = agent;
    this.tempo[slot] = tempo;
    this.born[slot] = tick;
    this.life[slot] = life;
    this.expire[slot] = tick + life;
    return slot;
  }
}
