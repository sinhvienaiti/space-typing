import { Slots } from "./slots";

/** Points a walker's pulled path keeps (TK 25.9: at most 64). */
export const PATH_MAX = 64;
/** On the ground; walking; the flyer's takeoff, flight and landing. */
export const MODE = { stand: 0, walk: 1, takeoff: 2, fly: 3, land: 4 } as const;

/** Whoever walks the A* grid toward (gx, gz): the helpers, the NPC workers (TK 25.9); the hero flies the same columns. */
export class Walkers extends Slots {
  readonly x = new Float64Array(this.cap);
  readonly z = new Float64Array(this.cap);
  readonly gx = new Float64Array(this.cap);
  readonly gz = new Float64Array(this.cap);
  readonly mode = new Uint8Array(this.cap);
  /** Points left to walk, (x, z) pairs, PATH_MAX a slot; the next one is `next`. */
  readonly path = new Float64Array(this.cap * PATH_MAX * 2);
  readonly pathN = new Uint8Array(this.cap);
  readonly next = new Uint8Array(this.cap);

  /** A new walker standing at (x, z). */
  place(x: number, z: number): number {
    const slot = this.take();
    if (slot < 0) return -1;
    this.x[slot] = this.gx[slot] = x;
    this.z[slot] = this.gz[slot] = z;
    return slot;
  }
}
