import { FARM } from "../../content/rules";
import { Slots } from "./slots";

/** A plot is empty (to sow), growing, or ripe (to harvest): BUILD_1A6 §4.1. */
export const PLOT = { empty: 0, growing: 1, ripe: 2 } as const;
const NEVER = -0x40000000;

/**
 * Buildings, the Bastion in slot 0 (TK 11). A new one is a site (BUILD_1A6
 * §4.3): `upTo` is the level being built (0: none), `progress` 0–1 of that
 * work, and nothing runs before `ready`; an upgrade keeps the building
 * running at its level meanwhile. `builtTick` and `paidGold`/`paidWood` are
 * the last site or upgrade and its price: what an undo within 5 s refunds.
 */
export class BuildingStore extends Slots {
  readonly def = new Uint8Array(this.cap);
  readonly level = new Uint8Array(this.cap);
  readonly x = new Float64Array(this.cap);
  readonly z = new Float64Array(this.cap);
  readonly hp = new Int32Array(this.cap);
  readonly ready = new Uint8Array(this.cap);
  readonly upTo = new Uint8Array(this.cap);
  readonly progress = new Float64Array(this.cap);
  readonly builtTick = new Int32Array(this.cap);
  readonly paidGold = new Int32Array(this.cap);
  readonly paidWood = new Int32Array(this.cap);
  /** Builder NPC on the site, −1 none; a whole Perfect build call left it sturdy (+10 % hit points). */
  readonly builder = new Int16Array(this.cap);
  readonly sturdy = new Uint8Array(this.cap);
  /** Ore node it stands on, −1 none. */
  readonly node = new Int8Array(this.cap);
  readonly atkCd = new Float64Array(this.cap);
  /** Mine: ticks of production toward the next yield; the pile (thousandths of gold); the miner's next haul. */
  readonly prod = new Float64Array(this.cap);
  readonly pile = new Int32Array(this.cap);
  readonly haulAt = new Int32Array(this.cap);
  /** Towers and the Bastion: power charges 0–5, the tick of the last power call (§4.5). */
  readonly charges = new Uint8Array(this.cap);
  readonly powerAt = new Int32Array(this.cap);
  /** The building's own call (mine, power), −1 none. */
  readonly call = new Int16Array(this.cap);
  readonly rallyX = new Float64Array(this.cap);
  readonly rallyZ = new Float64Array(this.cap);
  /** Farm: each plot's stage and its work 0–1 (sowing, growth or harvest by stage), its farmer, the plot to harvest first (−1). */
  readonly plot = new Uint8Array(this.cap * FARM.plots);
  readonly plotWork = new Float64Array(this.cap * FARM.plots);
  readonly farmer = new Int16Array(this.cap);
  readonly prio = new Int8Array(this.cap);

  add(def: number, x: number, z: number, hp: number, tick: number, node: number): number {
    const slot = this.take();
    if (slot < 0) return -1;
    this.def[slot] = def;
    this.level[slot] = 1;
    this.x[slot] = this.rallyX[slot] = x;
    this.z[slot] = this.rallyZ[slot] = z;
    this.hp[slot] = hp;
    this.builtTick[slot] = tick;
    this.node[slot] = node;
    this.builder[slot] = this.call[slot] = this.farmer[slot] = this.prio[slot] = -1;
    this.powerAt[slot] = NEVER;
    return slot;
  }
}
