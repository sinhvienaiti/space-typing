import { Walkers } from "./walkers";

export { MODE, PATH_MAX } from "./walkers";

/** The hero (slot 0) and the helpers (slots 1–3, content order), there from the start (TK 5, 8). `goal`: the building it was sent to (−1: a point). */
export class AgentStore extends Walkers {
  readonly goal = new Int16Array(this.cap);
  /** A takeoff or a landing ends at this tick. */
  readonly until = new Int32Array(this.cap);
  readonly atkCd = new Float64Array(this.cap);
  /** A helper's next quiz may come from this tick (BUILD_1A6 §6). */
  readonly quizAt = new Int32Array(this.cap);

  add(point: { x: number; z: number }): number {
    const slot = this.place(point.x, point.z);
    if (slot >= 0) this.goal[slot] = -1;
    return slot;
  }
}
