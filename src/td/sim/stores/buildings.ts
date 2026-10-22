import { HEAT } from "../../content/rules";
import { Slots } from "./slots";

const RECENT = HEAT.recentWords;

/**
 * Buildings, the Bastion in slot 0 (TK 11). The aura columns are the
 * multipliers the typing systems compute each tick (TK 6.10) and combat and
 * production read; with nobody assisting they stay at 1 and 0. The stream
 * columns follow TK 25.8: a deal at anchor + k × period, `shift` ticks put
 * back for the 0.2 s spacing.
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
  /** Soldiers' armour added; a blast's rim share added (cannon). */
  readonly armorAdd = new Float64Array(this.cap);
  readonly edgeAdd = new Float64Array(this.cap);
  /** Tempo index (0: Dừng) and the one "stop all" put aside. */
  readonly tempo = new Uint8Array(this.cap);
  readonly tempoPrev = new Uint8Array(this.cap);
  /** The assistant settles (and the building starts to count as assisted) at this tick. */
  readonly assistAt = new Int32Array(this.cap);
  readonly anchor = new Int32Array(this.cap);
  readonly anchorK = new Int32Array(this.cap);
  readonly nextEmit = new Int32Array(this.cap);
  readonly shift = new Uint8Array(this.cap);
  /** A deal is due but the caps are full ("…" on the roof). */
  readonly waiting = new Uint8Array(this.cap);
  readonly liveWords = new Uint8Array(this.cap);
  /** First letter of its last word, −1 none: the next may not share it. */
  readonly lastLetter = new Int8Array(this.cap);
  /** Heat 0–5000 (thousandths); afterglow cools from `glowAt` (−1: not cooling). */
  readonly heat = new Int32Array(this.cap);
  readonly glowAt = new Int32Array(this.cap);
  /** S_w and A_w of its last 5 finished words (a ring of RECENT per slot), and their means. */
  readonly recentS = new Float64Array(this.cap * RECENT);
  readonly recentA = new Float64Array(this.cap * RECENT);
  readonly recentN = new Uint8Array(this.cap);
  readonly recentHead = new Uint8Array(this.cap);
  readonly speedAvg = new Float64Array(this.cap);
  readonly accAvg = new Float64Array(this.cap);
  /** Good words in a row here; words ended and caught since its tempo was set (the tempo hint). */
  readonly streak = new Uint8Array(this.cap);
  readonly resolved = new Uint16Array(this.cap);
  readonly hits = new Uint16Array(this.cap);

  add(def: number, x: number, z: number, hp: number, tick: number, readyTick: number, paid: number, node: number): number {
    const slot = this.take();
    if (slot < 0) return -1;
    this.def[slot] = def;
    this.level[slot] = 1;
    this.x[slot] = this.rallyX[slot] = x;
    this.z[slot] = this.rallyZ[slot] = z;
    this.hp[slot] = hp;
    this.readyTick[slot] = readyTick;
    this.builtTick[slot] = tick;
    this.paid[slot] = paid;
    this.node[slot] = node;
    this.assist[slot] = this.lastLetter[slot] = this.glowAt[slot] = -1;
    this.rateMul[slot] = this.dmgMul[slot] = this.areaMul[slot] = this.outMul[slot] = 1;
    return slot;
  }
}
