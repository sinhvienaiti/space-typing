import { Slots } from "./slots";

/**
 * Buildings, the Bastion in slot 0 (TK 11). The aura columns are the
 * multipliers the typing systems compute each tick (TK 6.10) and combat and
 * production read; with nobody assisting they stay at 1 and 0.
 */
export class BuildingStore extends Slots {
  readonly def = new Uint8Array(this.cap);
  readonly level = new Uint8Array(this.cap);
  readonly x = new Float64Array(this.cap);
  readonly z = new Float64Array(this.cap);
  readonly hp = new Int32Array(this.cap);
  /** Construction ends at this tick; nothing runs before. */
  readonly readyTick = new Int32Array(this.cap);
  readonly builtTick = new Int32Array(this.cap);
  /** Gold spent on it (an undo refunds exactly this). */
  readonly paid = new Int32Array(this.cap);
  /** Ore node it stands on, −1 none. */
  readonly node = new Int8Array(this.cap);
  readonly atkCd = new Float64Array(this.cap);
  /** Ticks of production done toward the next yield. */
  readonly progress = new Float64Array(this.cap);
  /** Mine pile, thousandths of gold. */
  readonly pile = new Int32Array(this.cap);
  /** Agent slot assisting it, −1 none; its pile next goes to the treasury at `collectAt`. */
  readonly assist = new Int8Array(this.cap);
  readonly collectAt = new Int32Array(this.cap);
  readonly rallyX = new Float64Array(this.cap);
  readonly rallyZ = new Float64Array(this.cap);
  readonly rateMul = new Float64Array(this.cap);
  readonly dmgMul = new Float64Array(this.cap);
  readonly areaMul = new Float64Array(this.cap);
  readonly critAdd = new Float64Array(this.cap);
  readonly outMul = new Float64Array(this.cap);
  readonly extraTargets = new Uint8Array(this.cap);

  add(def: number, x: number, z: number, hp: number, tick: number, readyTick: number, paid: number, node: number): number {
    const slot = this.take();
    if (slot < 0) return -1;
    this.def[slot] = def;
    this.level[slot] = 1;
    this.x[slot] = x;
    this.z[slot] = z;
    this.hp[slot] = hp;
    this.readyTick[slot] = readyTick;
    this.builtTick[slot] = tick;
    this.paid[slot] = paid;
    this.node[slot] = node;
    this.atkCd[slot] = 0;
    this.progress[slot] = 0;
    this.pile[slot] = 0;
    this.assist[slot] = -1;
    this.collectAt[slot] = 0;
    this.rallyX[slot] = x;
    this.rallyZ[slot] = z;
    this.rateMul[slot] = 1;
    this.dmgMul[slot] = 1;
    this.areaMul[slot] = 1;
    this.critAdd[slot] = 0;
    this.outMul[slot] = 1;
    this.extraTargets[slot] = 0;
    return slot;
  }
}
