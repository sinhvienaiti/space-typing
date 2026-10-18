import type { Frame3D } from "../render3d/shared-renderer";

/**
 * A cheap bloom for the boss model (High/Ultra only): the 3D frame is copied
 * into a small canvas (downscale + a soft blur), squared by a self-multiply
 * so only the bright crystal and its emissive survive, and added back over
 * the model a little larger. Refreshed every other frame (the boss moves
 * slowly), so it costs two small copies and one additive draw.
 */
const EDGE = 160;

export class BossGlow {
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private tick = 0;
  private failed = false;

  /** Adds the glow of `frame` (drawn at x, y, size × size) with `strength` 0 … 1. */
  draw(target: CanvasRenderingContext2D, frame: Frame3D, x: number, y: number, size: number, strength: number): void {
    if (strength <= 0.01 || this.failed) return;
    if (this.context === null) {
      if (typeof document === "undefined") {
        this.failed = true;
        return;
      }
      this.canvas = document.createElement("canvas");
      this.canvas.width = EDGE;
      this.canvas.height = EDGE;
      this.context = this.canvas.getContext("2d");
      if (this.context === null) {
        this.failed = true;
        return;
      }
    }
    const context = this.context;
    const canvas = this.canvas!;
    if (this.tick % 2 === 0) {
      // On opaque black, so the multiply below is a plain x² per pass (a
      // transparent edge would be brightened instead and draw an outline);
      // black adds nothing when the result is drawn additively.
      context.globalCompositeOperation = "source-over";
      context.fillStyle = "#000";
      context.fillRect(0, 0, EDGE, EDGE);
      context.filter = "blur(2.5px)";
      context.drawImage(frame.source, frame.sx, frame.sy, frame.width, frame.height, 0, 0, EDGE, EDGE);
      context.filter = "none";
      // Bright pass: x⁸ (three self-multiplies). The crystal is pale pastel
      // everywhere, so a milder curve hazed the whole body; this keeps only
      // the emissive cores, specular glints and hit/charge light.
      context.globalCompositeOperation = "multiply";
      context.drawImage(canvas, 0, 0);
      context.drawImage(canvas, 0, 0);
      context.drawImage(canvas, 0, 0);
    }
    this.tick += 1;
    const grow = size * 0.06;
    target.save();
    target.globalCompositeOperation = "lighter";
    target.globalAlpha = Math.min(1, strength);
    target.drawImage(canvas, x - grow, y - grow, size + grow * 2, size + grow * 2);
    target.restore();
  }
}
