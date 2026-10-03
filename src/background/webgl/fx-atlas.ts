import { FX_ATLAS_HEIGHT, FX_ATLAS_WIDTH, FX_RECTS } from "../fx-frames";

type Canvas2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function createCanvas(): HTMLCanvasElement | OffscreenCanvas | null {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(FX_ATLAS_WIDTH, FX_ATLAS_HEIGHT);
  }
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = FX_ATLAS_WIDTH;
  canvas.height = FX_ATLAS_HEIGHT;
  return canvas;
}

function drawGlow(context: Canvas2D): void {
  const { x, y, w, h } = FX_RECTS.glow;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, w / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.18, "rgba(255,255,255,0.55)");
  gradient.addColorStop(0.45, "rgba(255,255,255,0.16)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(x, y, w, h);
}

function drawSparkle(context: Canvas2D): void {
  const { x, y, w, h } = FX_RECTS.sparkle;
  const cx = x + w / 2;
  const cy = y + h / 2;
  for (const horizontal of [true, false]) {
    const beam = horizontal
      ? context.createLinearGradient(x, cy, x + w, cy)
      : context.createLinearGradient(cx, y, cx, y + h);
    beam.addColorStop(0, "rgba(255,255,255,0)");
    beam.addColorStop(0.5, "rgba(255,255,255,0.9)");
    beam.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = beam;
    if (horizontal) context.fillRect(x, cy - 1.5, w, 3);
    else context.fillRect(cx - 1.5, y, 3, h);
  }
  const core = context.createRadialGradient(cx, cy, 0, cx, cy, w * 0.18);
  core.addColorStop(0, "rgba(255,255,255,1)");
  core.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = core;
  context.fillRect(x, y, w, h);
}

function drawMote(context: Canvas2D): void {
  const { x, y, w, h } = FX_RECTS.mote;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, w / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.5)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(x, y, w, h);
}

function drawStreak(context: Canvas2D): void {
  const { x, y, w, h } = FX_RECTS.streak;
  const cy = y + h / 2;
  // Tail fades in toward the bright head on the right (+x = travel direction).
  const tail = context.createLinearGradient(x, cy, x + w, cy);
  tail.addColorStop(0, "rgba(255,255,255,0)");
  tail.addColorStop(0.65, "rgba(255,255,255,0.28)");
  tail.addColorStop(0.94, "rgba(255,255,255,0.95)");
  tail.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = tail;
  context.fillRect(x, y, w, h);
  // Thin vertical profile.
  context.globalCompositeOperation = "destination-in";
  const profile = context.createLinearGradient(x, y, x, y + h);
  profile.addColorStop(0, "rgba(255,255,255,0)");
  profile.addColorStop(0.5, "rgba(255,255,255,1)");
  profile.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = profile;
  context.fillRect(x, y, w, h);
  context.globalCompositeOperation = "source-over";
  const headX = x + w * 0.93;
  const head = context.createRadialGradient(headX, cy, 0, headX, cy, h * 0.5);
  head.addColorStop(0, "rgba(255,255,255,1)");
  head.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = head;
  context.fillRect(headX - h * 0.5, y, h, h);
}

/** Draws the shared FX atlas (glow, sparkle, mote, meteor streak) in white. */
export function drawFxAtlas(): HTMLCanvasElement | OffscreenCanvas | null {
  const canvas = createCanvas();
  if (canvas === null) return null;
  const context = canvas.getContext("2d") as Canvas2D | null;
  if (context === null) return null;
  context.clearRect(0, 0, FX_ATLAS_WIDTH, FX_ATLAS_HEIGHT);
  drawGlow(context);
  drawSparkle(context);
  drawMote(context);
  drawStreak(context);
  return canvas;
}
