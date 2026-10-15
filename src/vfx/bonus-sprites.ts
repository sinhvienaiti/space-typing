import { drawGlow } from "./light-sprites";

/**
 * Painted bonus targets (supply pod, treasure drone, reward crates): the
 * chest and carrier art from the Credit puzzle set (src/assets/puzzle,
 * prepared by `pnpm puzzle:prepare`). Drawn with a glow, a soft shadow and a
 * slow tilt so they read as solid objects; until the image has loaded the
 * caller keeps its old code-drawn shape.
 */
export type BonusSpriteKind = "chest" | "chest-open" | "carrier";

const URLS: Readonly<Record<BonusSpriteKind, string>> = {
  chest: new URL("../assets/puzzle/puzzle-chest-closed@2x.webp", import.meta.url).href,
  "chest-open": new URL("../assets/puzzle/puzzle-chest-open@2x.webp", import.meta.url).href,
  carrier: new URL("../assets/puzzle/puzzle-carrier@2x.webp", import.meta.url).href,
};

const images = new Map<BonusSpriteKind, HTMLImageElement>();

function sprite(kind: BonusSpriteKind): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  let image = images.get(kind);
  if (image === undefined) {
    image = new Image();
    image.decoding = "async";
    image.src = URLS[kind];
    images.set(kind, image);
  }
  return image.complete && image.naturalWidth > 0 ? image : null;
}

/** Starts loading the art (call at stage start, so the first pod is ready). */
export function preloadBonusSprites(): void {
  sprite("chest");
  sprite("carrier");
}

export type BonusTargetPose = {
  kind: BonusSpriteKind;
  x: number;
  y: number;
  /** Box edge in CSS px. */
  size: number;
  /** Glow colour (reward colour). */
  glow: string;
  /** Small label under the object, e.g. "SUPPLY · ENERGY". */
  tag: string;
  time: number;
  /** 0 … 1 typed, shown as a bar under the label. */
  progress: number;
};

/** Draws a painted bonus target; false when the art is not ready yet. */
export function drawBonusTarget(context: CanvasRenderingContext2D, pose: BonusTargetPose): boolean {
  const image = sprite(pose.kind);
  if (image === null) return false;
  const { x, y, size, time } = pose;
  const pulse = 0.5 + 0.5 * Math.sin(time * 3.1);

  context.save();
  // Glow behind and a soft contact shadow below: it floats in space.
  context.globalCompositeOperation = "lighter";
  drawGlow(context, pose.glow, x, y + size * 0.04, size * (0.72 + pulse * 0.1), 0.42 + pulse * 0.2);
  context.globalCompositeOperation = "source-over";
  context.fillStyle = "rgba(0, 0, 0, 0.32)";
  context.beginPath();
  context.ellipse(x, y + size * 0.34, size * 0.34, size * 0.07, 0, 0, Math.PI * 2);
  context.fill();

  context.translate(x, y);
  context.rotate(Math.sin(time * 1.6) * 0.07);
  context.scale(1 + Math.sin(time * 2.3) * 0.015, 1 + Math.cos(time * 2.3) * 0.02);
  context.drawImage(image, -size / 2, -size / 2, size, size);
  context.restore();

  // Twinkles orbiting the object.
  context.save();
  context.globalCompositeOperation = "lighter";
  for (let index = 0; index < 3; index += 1) {
    const angle = time * 1.4 + (index * Math.PI * 2) / 3;
    const twinkle = 0.5 + 0.5 * Math.sin(time * 5 + index * 2.1);
    drawGlow(context, "#fff6d0", x + Math.cos(angle) * size * 0.46, y + Math.sin(angle) * size * 0.2 - size * 0.06, 5 + twinkle * 5, 0.5 + twinkle * 0.5);
  }
  context.restore();

  // Readable label pill (and typing progress) under the object.
  const label = pose.tag.toUpperCase();
  context.save();
  context.font = "800 10px 'Exo 2', 'Be Vietnam Pro', ui-sans-serif, system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  const width = context.measureText(label).width + 16;
  const top = y + size * 0.4;
  context.fillStyle = "rgba(5, 10, 22, 0.86)";
  context.strokeStyle = pose.glow;
  context.globalAlpha = 0.95;
  context.lineWidth = 1;
  context.beginPath();
  context.roundRect(x - width / 2, top, width, 17, 8.5);
  context.fill();
  context.stroke();
  context.fillStyle = "#fff6dc";
  context.fillText(label, x, top + 9);
  if (pose.progress > 0) {
    context.fillStyle = pose.glow;
    context.fillRect(x - width / 2 + 6, top + 14, (width - 12) * Math.min(1, pose.progress), 2);
  }
  context.restore();
  return true;
}
