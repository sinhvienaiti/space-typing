import type { CharacterId } from "./registry";
import {
  characterVisualProfile,
  type CharacterSilhouette,
  type CharacterVisualProfile,
} from "./visuals";

export type CharacterDrawOptions = {
  x: number;
  y: number;
  time: number;
  scale?: number;
  glowScale?: number;
  alpha?: number;
};

function hullPath(
  context: CanvasRenderingContext2D,
  silhouette: CharacterSilhouette,
  wingSpan: number,
  bodyLength: number,
): void {
  const w = wingSpan;
  const l = bodyLength;
  context.beginPath();

  switch (silhouette) {
    case "fortress":
      context.moveTo(0, -24 * l);
      context.lineTo(12 * w, -10 * l);
      context.lineTo(24 * w, 2);
      context.lineTo(20 * w, 17 * l);
      context.lineTo(8 * w, 13 * l);
      context.lineTo(0, 21 * l);
      context.lineTo(-8 * w, 13 * l);
      context.lineTo(-20 * w, 17 * l);
      context.lineTo(-24 * w, 2);
      context.lineTo(-12 * w, -10 * l);
      break;
    case "arc":
      context.moveTo(0, -27 * l);
      context.quadraticCurveTo(13 * w, -13, 24 * w, 7);
      context.quadraticCurveTo(17 * w, 6, 9 * w, 17 * l);
      context.lineTo(0, 12 * l);
      context.lineTo(-9 * w, 17 * l);
      context.quadraticCurveTo(-17 * w, 6, -24 * w, 7);
      context.quadraticCurveTo(-13 * w, -13, 0, -27 * l);
      break;
    case "phantom":
      context.moveTo(0, -26 * l);
      context.bezierCurveTo(9 * w, -14, 24 * w, -5, 27 * w, 10);
      context.lineTo(11 * w, 5);
      context.lineTo(5 * w, 20 * l);
      context.lineTo(0, 13 * l);
      context.lineTo(-5 * w, 20 * l);
      context.lineTo(-11 * w, 5);
      context.lineTo(-27 * w, 10);
      context.bezierCurveTo(-24 * w, -5, -9 * w, -14, 0, -26 * l);
      break;
    case "crown":
      context.moveTo(0, -27 * l);
      context.lineTo(7 * w, -11);
      context.lineTo(18 * w, -17);
      context.lineTo(15 * w, 3);
      context.lineTo(25 * w, 13);
      context.lineTo(8 * w, 12);
      context.lineTo(0, 21 * l);
      context.lineTo(-8 * w, 12);
      context.lineTo(-25 * w, 13);
      context.lineTo(-15 * w, 3);
      context.lineTo(-18 * w, -17);
      context.lineTo(-7 * w, -11);
      break;
    case "blade":
      context.moveTo(0, -29 * l);
      context.lineTo(8 * w, -8);
      context.lineTo(28 * w, 8);
      context.lineTo(13 * w, 8);
      context.lineTo(7 * w, 21 * l);
      context.lineTo(0, 14 * l);
      context.lineTo(-7 * w, 21 * l);
      context.lineTo(-13 * w, 8);
      context.lineTo(-28 * w, 8);
      context.lineTo(-8 * w, -8);
      break;
    case "spear":
    default:
      context.moveTo(0, -29 * l);
      context.lineTo(8 * w, -8);
      context.lineTo(23 * w, 15);
      context.lineTo(8 * w, 11);
      context.lineTo(0, 21 * l);
      context.lineTo(-8 * w, 11);
      context.lineTo(-23 * w, 15);
      context.lineTo(-8 * w, -8);
      break;
  }

  context.closePath();
}

function drawEngine(
  context: CanvasRenderingContext2D,
  profile: Readonly<CharacterVisualProfile>,
  x: number,
  time: number,
  index: number,
): void {
  const pulse = 0.88 + Math.sin(time * 13 + index * 1.7) * 0.12;
  const length = 12 + pulse * 8;

  context.save();
  context.translate(x, 17);
  context.globalCompositeOperation = "lighter";
  context.fillStyle = profile.engine;
  context.shadowBlur = 13;
  context.shadowColor = profile.glow;
  context.globalAlpha *= 0.78;

  context.beginPath();
  context.moveTo(-2.8, 0);
  context.quadraticCurveTo(0, length, 2.8, 0);
  context.closePath();
  context.fill();

  context.globalAlpha *= 0.72;
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.moveTo(-1.2, 1);
  context.quadraticCurveTo(0, length * 0.65, 1.2, 1);
  context.closePath();
  context.fill();
  context.restore();
}

function engineOffsets(count: 1 | 2 | 3): number[] {
  if (count === 1) return [0];
  if (count === 2) return [-6, 6];
  return [-9, 0, 9];
}

export function drawCharacterShip(
  context: CanvasRenderingContext2D,
  characterId: CharacterId,
  options: CharacterDrawOptions,
): void {
  const profile = characterVisualProfile(characterId);
  const scale = options.scale ?? 1;
  const glowScale = options.glowScale ?? 1;
  const alpha = options.alpha ?? 1;
  const bob = Math.sin(options.time * 3.2) * 1.3;
  const banking = Math.sin(options.time * 1.7) * 0.012;

  context.save();
  context.translate(options.x, options.y + bob);
  context.rotate(banking);
  context.scale(scale, scale);
  context.globalAlpha = alpha;

  context.save();
  context.globalCompositeOperation = "lighter";
  context.fillStyle = profile.glow;
  context.globalAlpha *= 0.08;
  context.shadowBlur = 22 * glowScale;
  context.shadowColor = profile.glow;
  context.beginPath();
  context.ellipse(0, 0, 31, 27, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();

  for (const [index, x] of engineOffsets(profile.engineCount).entries()) {
    drawEngine(context, profile, x, options.time, index);
  }

  const hullGradient = context.createLinearGradient(0, -30, 0, 22);
  hullGradient.addColorStop(0, profile.accent);
  hullGradient.addColorStop(0.28, profile.primary);
  hullGradient.addColorStop(1, profile.secondary);

  context.save();
  context.fillStyle = hullGradient;
  context.strokeStyle = profile.accent;
  context.lineWidth = 1.35;
  context.shadowBlur = 13 * glowScale;
  context.shadowColor = profile.glow;
  hullPath(
    context,
    profile.silhouette,
    profile.wingSpan,
    profile.bodyLength,
  );
  context.fill();
  context.stroke();
  context.restore();

  context.save();
  context.globalAlpha *= 0.58;
  context.strokeStyle = profile.primary;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, -20 * profile.bodyLength);
  context.lineTo(0, 13 * profile.bodyLength);
  context.moveTo(-13 * profile.wingSpan, 7);
  context.lineTo(-5, 3);
  context.moveTo(13 * profile.wingSpan, 7);
  context.lineTo(5, 3);
  context.stroke();
  context.restore();

  context.save();
  context.globalCompositeOperation = "lighter";
  context.fillStyle = profile.core;
  context.strokeStyle = "#ffffff";
  context.lineWidth = 0.8;
  context.shadowBlur = 12 * glowScale;
  context.shadowColor = profile.core;
  context.beginPath();
  if (profile.silhouette === "fortress") {
    context.roundRect(-5.5, -9, 11, 14, 4);
  } else {
    context.ellipse(0, -6, 5, 8, 0, 0, Math.PI * 2);
  }
  context.fill();
  context.globalAlpha *= 0.55;
  context.stroke();
  context.restore();

  context.save();
  context.fillStyle = "rgba(255,255,255,0.62)";
  context.globalAlpha *= 0.45;
  context.beginPath();
  context.ellipse(-1.7, -9, 1.6, 3.5, -0.25, 0, Math.PI * 2);
  context.fill();
  context.restore();

  context.restore();
}
