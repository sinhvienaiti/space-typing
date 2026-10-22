import { Slots } from "./slots";

/** BUILD_1A6 §5.1, in the director's priority order (§5.3): power, build, then harvest = chop = mine, then quiz. */
export const CALL_KIND = { power: 0, build: 1, harvest: 2, chop: 3, mine: 4, quiz: 5 } as const;
/** Rank of each kind for the director: the economy three share one. */
export const CALL_RANK = [0, 1, 2, 2, 2, 3] as const;
export const CALL_STATE = { queued: 0, open: 1 } as const;

/**
 * Calls for help (§5): an NPC (`npc`) or a building (`b`) asks for `words` words; `done` are typed. A call is
 * queued, then open: bright in someone's help ring (it holds `word`, a live word slot) or dim (−1). Its target is
 * the farm `b` and `plot`, the tree, or the building `b`. `perfect` stays 1 while every typed word is Flash or
 * Perfect; `finished` is set when a typed word finishes its work (the Perfect bonus needs it). `expire`: −1 never.
 */
export class CallStore extends Slots {
  readonly kind = new Uint8Array(this.cap);
  readonly state = new Uint8Array(this.cap);
  readonly bright = new Uint8Array(this.cap);
  readonly npc = new Int16Array(this.cap);
  readonly b = new Int16Array(this.cap);
  readonly tree = new Int16Array(this.cap);
  readonly plot = new Int8Array(this.cap);
  readonly x = new Float64Array(this.cap);
  readonly z = new Float64Array(this.cap);
  readonly words = new Uint8Array(this.cap);
  readonly done = new Uint8Array(this.cap);
  readonly word = new Int16Array(this.cap);
  /** First letter of its last word (−1 none): the next may not share it. */
  readonly last = new Int8Array(this.cap);
  readonly born = new Int32Array(this.cap);
  readonly expire = new Int32Array(this.cap);
  readonly perfect = new Uint8Array(this.cap);
  readonly finished = new Uint8Array(this.cap);

  add(kind: number, words: number, npc: number, b: number, tree: number, plot: number, tick: number, expire: number): number {
    const slot = this.take();
    if (slot < 0) return -1;
    this.kind[slot] = kind;
    this.words[slot] = words;
    this.npc[slot] = npc;
    this.b[slot] = b;
    this.tree[slot] = tree;
    this.plot[slot] = plot;
    this.born[slot] = tick;
    this.expire[slot] = expire;
    this.word[slot] = this.last[slot] = -1;
    this.perfect[slot] = 1;
    return slot;
  }
}
