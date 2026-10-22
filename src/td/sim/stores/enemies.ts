import { Slots } from "./slots";

/** Enemies walking a lane (or the flying route): TK 14, 25.5. */
export class EnemyStore extends Slots {
  readonly def = new Uint8Array(this.cap);
  readonly wave = new Uint16Array(this.cap);
  /** Index into the world's lanes; the last one is the flying route. */
  readonly route = new Uint8Array(this.cap);
  readonly altitude = new Uint8Array(this.cap);
  readonly hp = new Int32Array(this.cap);
  readonly dist = new Float64Array(this.cap);
  readonly lateral = new Float64Array(this.cap);
  readonly x = new Float64Array(this.cap);
  readonly z = new Float64Array(this.cap);
  /** Blocking places soldiers hold on it this tick, and how many soldiers chose it. */
  readonly block = new Uint8Array(this.cap);
  readonly engaged = new Uint8Array(this.cap);
  /** The lowest soldier slot in contact: the one it strikes. */
  readonly blocker = new Int16Array(this.cap);
  readonly meleeCd = new Float64Array(this.cap);
  /** Hit points ran out this tick; removed by the deaths system. */
  readonly dying = new Uint8Array(this.cap);
  readonly killer = new Uint8Array(this.cap);
  /** Burning until this tick (TK 10.3); damage not yet whole. */
  readonly burnUntil = new Int32Array(this.cap);
  readonly burnAcc = new Float64Array(this.cap);

  add(def: number, hp: number, altitude: number, route: number, wave: number, lateral: number): number {
    const slot = this.take();
    if (slot < 0) return -1;
    this.def[slot] = def;
    this.wave[slot] = wave;
    this.route[slot] = route;
    this.altitude[slot] = altitude;
    this.hp[slot] = hp;
    this.lateral[slot] = lateral;
    this.blocker[slot] = -1;
    return slot;
  }
}
