import { Walkers } from "./walkers";

/** BUILD_1A6 §4: a farm's farmer, a villager who chops, the Bastion's builders. */
export const NPC_KIND = { farmer: 0, villager: 1, builder: 2 } as const;
/** Idle; on the way to its job; working it. */
export const TASK = { idle: 0, going: 1, working: 2 } as const;

/**
 * NPC workers. `home`: a farmer's farm (building slot); `job`: the plot, the tree (map index) or the site (building
 * slot) it works, −1 none; `call`: the call it made while working, −1 none.
 */
export class NpcStore extends Walkers {
  readonly kind = new Uint8Array(this.cap);
  readonly task = new Uint8Array(this.cap);
  readonly home = new Int16Array(this.cap);
  readonly job = new Int16Array(this.cap);
  readonly call = new Int16Array(this.cap);

  add(kind: number, x: number, z: number, home: number): number {
    const slot = this.place(x, z);
    if (slot < 0) return -1;
    this.kind[slot] = kind;
    this.home[slot] = home;
    this.job[slot] = this.call[slot] = -1;
    return slot;
  }
}
