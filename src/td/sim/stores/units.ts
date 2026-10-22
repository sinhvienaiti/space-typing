import { Slots } from "./slots";

/**
 * Soldiers of the barracks (TK 13). A fallen soldier keeps its slot with
 * 0 hit points until it respawns at its barracks.
 */
export class UnitStore extends Slots {
  readonly barracks = new Int16Array(this.cap);
  /** Its corner of the triangle around the rally flag. */
  readonly post = new Uint8Array(this.cap);
  readonly hp = new Int32Array(this.cap);
  readonly x = new Float64Array(this.cap);
  readonly z = new Float64Array(this.cap);
  /** Enemy slot it is fighting, −1 none. */
  readonly target = new Int16Array(this.cap);
  readonly contact = new Uint8Array(this.cap);
  readonly atkCd = new Float64Array(this.cap);
  /** Tick it stands up again; −1 while alive. */
  readonly respawnAt = new Int32Array(this.cap);
  readonly lastFight = new Int32Array(this.cap);
  /** Fraction of a hit point regained but not yet added. */
  readonly regen = new Float64Array(this.cap);
  /** Its respawn found no food and waits twice as long (BUILD_1A6 §4.6). */
  readonly hungry = new Uint8Array(this.cap);

  add(barracks: number, post: number, hp: number, x: number, z: number): number {
    const slot = this.take();
    if (slot < 0) return -1;
    this.barracks[slot] = barracks;
    this.post[slot] = post;
    this.stand(slot, hp, x, z, 0);
    return slot;
  }

  /** Back on its feet (spawned or respawned) at (x, z). */
  stand(slot: number, hp: number, x: number, z: number, tick: number): void {
    this.hp[slot] = hp;
    this.x[slot] = x;
    this.z[slot] = z;
    this.target[slot] = -1;
    this.contact[slot] = 0;
    this.atkCd[slot] = 0;
    this.respawnAt[slot] = -1;
    this.lastFight[slot] = tick;
    this.regen[slot] = 0;
    this.hungry[slot] = 0;
  }
}
