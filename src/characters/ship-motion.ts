/**
 * Player ship motion layered on the idle flight pose: the ship turns its nose
 * toward the target of each shot, kicks back a little on recoil and throttles
 * its engines up while the player keeps typing. Numbers only, no drawing, so
 * Game.ts and the shot gallery share one behaviour.
 *
 * Angles are canvas rotations: radians, clockwise, 0 = nose straight up.
 */

/** Largest turn either way (≈ 55°), so the hull always stays readable. */
export const SHIP_AIM_LIMIT = 0.96;
/** Share of the turn made at once on the key press; the rest eases in. */
export const SHIP_AIM_SNAP = 0.55;
/** Seconds the ship keeps facing its last target after a shot. */
export const SHIP_AIM_HOLD_SECONDS = 0.8;
/** Follow speed toward a live target, and the ease back to nose-up (1/s). */
const AIM_FOLLOW_RATE = 18;
const AIM_RETURN_RATE = 3.4;
const RECOIL_DECAY_RATE = 14;
const BOOST_DECAY_RATE = 2.2;
/** Engine throttle added per shot: ~3 keys/s idles low, 8+ keys/s runs hot. */
const BOOST_PER_SHOT = 0.28;
/** Shots at or above this power (word finishers) kick back fully. */
const HEAVY_SHOT_POWER = 1.3;

export type ShipAimPoint = { x: number; y: number };

/** Turn that points the nose from the ship centre at (x, y), clamped. */
export function shipAimAngle(
  originX: number,
  originY: number,
  x: number,
  y: number,
): number {
  const angle = Math.atan2(x - originX, originY - y);
  if (!Number.isFinite(angle)) return 0;
  return angle < -SHIP_AIM_LIMIT
    ? -SHIP_AIM_LIMIT
    : angle > SHIP_AIM_LIMIT
      ? SHIP_AIM_LIMIT
      : angle;
}

export class ShipMotion {
  /** Current turn toward the target. */
  aim = 0;
  /** 0–1: pushes the hull back along its axis and flashes the nozzles. */
  recoil = 0;
  /** 0–1: engine throttle, rises with typing speed. */
  boost = 0;
  private goal = 0;
  private hold = 0;
  private readonly scratch: ShipAimPoint = { x: 0, y: 0 };

  /** Every shot: face its target at once (mostly), add recoil and throttle. */
  fire(
    originX: number,
    originY: number,
    targetX: number,
    targetY: number,
    power: number,
  ): void {
    this.goal = shipAimAngle(originX, originY, targetX, targetY);
    this.hold = SHIP_AIM_HOLD_SECONDS;
    this.aim += (this.goal - this.aim) * SHIP_AIM_SNAP;
    this.recoil = Math.min(1, this.recoil + (power >= HEAVY_SHOT_POWER ? 1 : 0.55));
    this.boost = Math.min(1, this.boost + BOOST_PER_SHOT);
  }

  /**
   * `track` refreshes the last target's position while the hold lasts
   * (return false when it is gone); afterwards the nose eases back up.
   */
  update(
    dt: number,
    originX: number,
    originY: number,
    track: ((out: ShipAimPoint) => boolean) | null,
  ): void {
    const step = Number.isFinite(dt) && dt > 0 ? dt : 0;
    let rate = AIM_RETURN_RATE;
    if (this.hold > 0) {
      this.hold -= step;
      rate = AIM_FOLLOW_RATE;
      if (track !== null && track(this.scratch)) {
        this.goal = shipAimAngle(originX, originY, this.scratch.x, this.scratch.y);
      }
    } else {
      this.goal = 0;
    }
    this.aim += (this.goal - this.aim) * (1 - Math.exp(-rate * step));
    this.recoil *= Math.exp(-RECOIL_DECAY_RATE * step);
    this.boost *= Math.exp(-BOOST_DECAY_RATE * step);
  }

  reset(): void {
    this.aim = 0;
    this.recoil = 0;
    this.boost = 0;
    this.goal = 0;
    this.hold = 0;
  }
}
