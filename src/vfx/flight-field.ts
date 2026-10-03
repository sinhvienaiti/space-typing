import type { VisualQuality } from "../types";

/**
 * Flight motion: star streaks that stream from a vanishing point toward the
 * camera, so the scene reads as flying through space (the owner: "cảm giác
 * gió, lướt"). Used by the Duel Depth View (vanishing point at the rival) and
 * the Campaign battlefield (ahead of your ship). Presentation only, additive,
 * batched (one stroke per brightness step), no per-frame allocation.
 */

const COUNT: Readonly<Record<VisualQuality, number>> = {
  low: 40,
  medium: 80,
  high: 140,
  ultra: 220,
};

/** World units: x/y lateral −1…1 around the axis, z depth NEAR…FAR. */
const FAR = 9;
const NEAR = 0.35;
const STEPS = 4;

export class FlightStreakField {
  private readonly x = new Float32Array(COUNT.ultra);
  private readonly y = new Float32Array(COUNT.ultra);
  private readonly z = new Float32Array(COUNT.ultra);
  private seed = 11;
  private seeded = false;

  private random(): number {
    this.seed = (this.seed * 48271) % 2147483647;
    return this.seed / 2147483647;
  }

  private respawn(index: number, z: number): void {
    // Keep the axis itself clear so streaks pass around the ships.
    let x = 0;
    let y = 0;
    do {
      x = this.random() * 2 - 1;
      y = this.random() * 2 - 1;
    } while (x * x + y * y < 0.05);
    this.x[index] = x;
    this.y[index] = y;
    this.z[index] = z;
  }

  /**
   * `speed` in depth units per second (≈2.4 cruise; momentum and phases
   * push it up). `dt` is the effects clock, so hit-stop and K.O. slow it.
   */
  update(dt: number, speed: number): void {
    if (!this.seeded) {
      this.seeded = true;
      for (let index = 0; index < COUNT.ultra; index += 1) {
        this.respawn(index, NEAR + this.random() * (FAR - NEAR));
      }
    }
    const step = Math.max(0, dt) * speed;
    for (let index = 0; index < COUNT.ultra; index += 1) {
      const z = this.z[index]! - step;
      if (z <= NEAR) this.respawn(index, FAR - this.random() * 0.6);
      else this.z[index] = z;
    }
  }

  /**
   * Projects around the vanishing point (vx, vy); `spread` is the screen
   * size of one world unit at depth 1. `heat` (0…1) lengthens and brightens.
   */
  draw(
    context: CanvasRenderingContext2D,
    quality: VisualQuality,
    vx: number,
    vy: number,
    spread: number,
    heat: number,
    color: string,
    /** Fold every streak below the vanishing point (it sits at the top edge). */
    fold = false,
  ): void {
    const count = COUNT[quality];
    // Short streaks with a hot head read as stars rushing past, not scratches.
    const stretch = 0.05 + heat * 0.08;
    context.save();
    context.globalCompositeOperation = "lighter";
    context.strokeStyle = color;
    context.lineCap = "round";
    for (let level = 0; level < STEPS; level += 1) {
      context.globalAlpha = ((level + 1) / STEPS) * (0.3 + heat * 0.25);
      context.lineWidth = 0.8 + level * 0.6;
      context.beginPath();
      let any = false;
      for (let index = 0; index < count; index += 1) {
        const z = this.z[index]!;
        // Brightness step by nearness: far streaks are faint, near ones hot.
        const nearness = 1 - (z - NEAR) / (FAR - NEAR);
        if (Math.min(STEPS - 1, Math.floor(nearness * nearness * STEPS)) !== level) continue;
        const k = spread / z;
        const tail = spread / (z + stretch * (1 + z * 0.2));
        const x = this.x[index]!;
        const y = fold ? Math.abs(this.y[index]!) * 1.4 : this.y[index]!;
        const hx = vx + x * k, hy = vy + y * k * 0.62;
        // Cap the on-screen length so edge streaks never become long lines.
        let tx = vx + x * tail, ty = vy + y * tail * 0.62;
        const dx = hx - tx, dy = hy - ty;
        const length = Math.hypot(dx, dy);
        const cap = 10 + level * 9 + heat * 16;
        if (length > cap) {
          tx = hx - (dx / length) * cap;
          ty = hy - (dy / length) * cap;
        }
        context.moveTo(hx, hy);
        context.lineTo(tx, ty);
        any = true;
      }
      if (any) context.stroke();
    }
    context.restore();
  }
}
