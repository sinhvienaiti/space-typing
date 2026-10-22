import { Slots } from "./slots";

export const PROJECTILE = { arrow: 0, shell: 1, bolt: 2, fireball: 3, wordShot: 4 } as const;

/**
 * Shots in flight (TK 10). Damage is rolled when the shot leaves; armour
 * is applied on impact, per enemy hit. A shot whose target died flies on to
 * the last point it saw and bursts there.
 */
export class ProjectileStore extends Slots {
  readonly kind = new Uint8Array(this.cap);
  readonly x = new Float64Array(this.cap);
  readonly z = new Float64Array(this.cap);
  readonly tx = new Float64Array(this.cap);
  readonly tz = new Float64Array(this.cap);
  /** Stable id of the enemy it follows. */
  readonly target = new Int32Array(this.cap);
  /** Metres per tick. */
  readonly speed = new Float64Array(this.cap);
  /** Base × aura × crit, before armour. */
  readonly power = new Float64Array(this.cap);
  readonly damageType = new Uint8Array(this.cap);
  readonly crit = new Uint8Array(this.cap);
  readonly splash = new Float64Array(this.cap);
  readonly edge = new Float64Array(this.cap);
  readonly source = new Uint8Array(this.cap);

  add(kind: number, x: number, z: number, target: number, tx: number, tz: number, speed: number, source: number): number {
    const slot = this.take();
    if (slot < 0) return -1;
    this.kind[slot] = kind;
    this.x[slot] = x;
    this.z[slot] = z;
    this.target[slot] = target;
    this.tx[slot] = tx;
    this.tz[slot] = tz;
    this.speed[slot] = speed;
    this.source[slot] = source;
    this.power[slot] = 0;
    this.damageType[slot] = 0;
    this.crit[slot] = 0;
    this.splash[slot] = 0;
    this.edge[slot] = 1;
    return slot;
  }
}
