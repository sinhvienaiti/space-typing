import { Slots } from "./slots";

/** Points a walker's pulled path keeps (TK 25.9: at most 64). */
export const PATH_MAX = 64;
/** On the ground (standing, perched, assisting); walking; the flyer's takeoff, flight and landing. */
export const MODE = { stand: 0, walk: 1, takeoff: 2, fly: 3, land: 4 } as const;

/**
 * The hero (slot 0) and the helpers (slots 1–3, content order), there from the start (TK 5, 8). `goal`:
 * the building it is sent to (−1: just the point gx, gz); `at`: the one it assists (−1: none), sent elsewhere until 4.5 m off or stopped.
 */
export class AgentStore extends Slots {
  readonly x = new Float64Array(this.cap);
  readonly z = new Float64Array(this.cap);
  readonly goal = new Int16Array(this.cap);
  readonly gx = new Float64Array(this.cap);
  readonly gz = new Float64Array(this.cap);
  readonly at = new Int16Array(this.cap);
  readonly mode = new Uint8Array(this.cap);
  /** A takeoff or a landing ends at this tick. */
  readonly until = new Int32Array(this.cap);
  /** Points left to walk, (x, z) pairs, PATH_MAX a slot; the next one is `next`. */
  readonly path = new Float64Array(this.cap * PATH_MAX * 2);
  readonly pathN = new Uint8Array(this.cap);
  readonly next = new Uint8Array(this.cap);
  readonly atkCd = new Float64Array(this.cap);

  add(point: { x: number; z: number }): number {
    const slot = this.take();
    if (slot < 0) return -1;
    this.x[slot] = this.gx[slot] = point.x;
    this.z[slot] = this.gz[slot] = point.z;
    this.goal[slot] = this.at[slot] = -1;
    return slot;
  }
}
