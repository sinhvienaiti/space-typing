import type { CharacterId } from "./registry";
import {
  characterVisualProfile,
  type CharacterSilhouette,
  type CharacterVisualProfile,
} from "./visuals";
import {
  EQUIPMENT_AURA_COLORS,
  type EquipmentAuraProfile,
} from "./equipment-aura";

export type CharacterDrawOptions = {
  x: number;
  y: number;
  time: number;
  scale?: number;
  glowScale?: number;
  alpha?: number;
  aura?: EquipmentAuraProfile | null;
  detailScale?: number;
};

let characterShipSheet: HTMLImageElement | null = null;
let characterShipSource: "v3" | "v2" | "procedural" = "procedural";

const CHARACTER_SHIP_SPRITE_INDEX: Record<CharacterId, number> = {
  vanguard: 0,
  aegis: 1,
  volt: 2,
  wraith: 3,
  fortune: 4,
  arsenal: 5,
  oracle: 6,
  bastion: 7,
  reaper: 8,
  celestial: 9,
  zenith: 10,
};

export function setCharacterShipSheet(
  image: HTMLImageElement | null,
  source: "v3" | "v2" | "procedural" = image === null
    ? "procedural"
    : "v2",
): void {
  characterShipSheet = image;
  characterShipSource = image === null ? "procedural" : source;
}

export function characterShipArtSource(): "v3" | "v2" | "procedural" {
  return characterShipSource;
}

export function hasCharacterShipImage(_id: CharacterId): boolean {
  return characterShipSheet !== null;
}

function drawEquipmentAura(
  context: CanvasRenderingContext2D,
  aura: EquipmentAuraProfile,
  time: number,
  glowScale: number,
  detailScale: number,
): void {
  const colors = EQUIPMENT_AURA_COLORS[aura.primary];
  const secondary =
    aura.secondary === null
      ? colors.secondary
      : EQUIPMENT_AURA_COLORS[aura.secondary].primary;
  const intensity = aura.intensity;
  const pulse = 0.92 + Math.sin(time * 3.4) * 0.08;

  context.save();
  context.globalCompositeOperation = "lighter";
  context.globalAlpha *= 0.16 + intensity * 0.14;
  context.strokeStyle = colors.primary;
  context.shadowBlur = (10 + intensity * 12) * glowScale;
  context.shadowColor = colors.primary;
  context.lineWidth = 1 + intensity * 0.8;

  if (aura.primary === "guard") {
    context.setLineDash([6, 5]);
    context.lineDashOffset = -time * 11;
    context.beginPath();
    context.arc(0, 0, 32 * pulse, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
  } else if (aura.primary === "storm") {
    const stormPhases =
      detailScale < 0.7 ? [0] : [0, Math.PI];
    for (const phase of stormPhases) {
      const angle = time * 2.7 + phase;
      context.beginPath();
      context.moveTo(Math.cos(angle) * 24, Math.sin(angle) * 15);
      context.lineTo(
        Math.cos(angle + 0.45) * 31,
        Math.sin(angle + 0.45) * 23,
      );
      context.lineTo(
        Math.cos(angle + 0.75) * 26,
        Math.sin(angle + 0.75) * 18,
      );
      context.stroke();
    }
  } else if (aura.primary === "flame") {
    context.fillStyle = colors.primary;
    context.globalAlpha *= 0.7;
    for (const x of [-13, 0, 13]) {
      context.beginPath();
      context.ellipse(
        x,
        26 + Math.sin(time * 7 + x) * 2,
        3.2,
        10 + intensity * 5,
        0,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
  } else if (aura.primary === "fortune" || aura.primary === "celestial") {
    context.fillStyle = colors.primary;
    const moteCount = detailScale < 0.7 ? 2 : detailScale < 1 ? 3 : 4;
    for (let index = 0; index < moteCount; index += 1) {
      const angle = time * 0.9 + index * Math.PI * 2 / moteCount;
      const radius = 29 + Math.sin(time * 2 + index) * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius * 0.64;
      context.beginPath();
      context.arc(x, y, 1.4 + intensity, 0, Math.PI * 2);
      context.fill();
    }
  } else if (aura.primary === "void") {
    context.strokeStyle = secondary;
    context.setLineDash([2, 7]);
    context.lineDashOffset = time * 16;
    context.beginPath();
    context.ellipse(0, 1, 30 * pulse, 20 * pulse, 0, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
  } else {
    context.beginPath();
    context.ellipse(0, 1, 29 * pulse, 21 * pulse, 0, 0, Math.PI * 2);
    context.stroke();
  }

  context.globalAlpha *= 0.58;
  context.strokeStyle = secondary;
  context.beginPath();
  context.arc(0, 0, 25 + intensity * 4, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawIllustratedShip(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  characterId: CharacterId,
  profile: Readonly<CharacterVisualProfile>,
  glowScale: number,
): void {
  const size = 78;
  const index = CHARACTER_SHIP_SPRITE_INDEX[characterId];
  const columns = 4;
  const rows = 3;
  const cellWidth = image.naturalWidth / columns;
  const cellHeight = image.naturalHeight / rows;
  const sourceX = (index % columns) * cellWidth;
  const sourceY = Math.floor(index / columns) * cellHeight;
  context.save();
  context.globalCompositeOperation = "lighter";
  context.globalAlpha *= characterShipSource === "v3" ? 0.05 : 0.12;
  context.fillStyle = profile.glow;
  // Premium sprites already contain painted light. Avoid double bloom.
  context.shadowBlur = (characterShipSource === "v3" ? 4 : 24) * glowScale;
  context.shadowColor = profile.glow;
  context.beginPath();
  context.ellipse(0, 2, 31, 27, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();

  context.save();
  context.shadowBlur = (characterShipSource === "v3" ? 0 : 9 * glowScale);
  context.shadowColor = profile.glow;
  context.drawImage(
    image,
    sourceX,
    sourceY,
    cellWidth,
    cellHeight,
    -size / 2,
    -size / 2,
    size,
    size,
  );
  context.restore();
}

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
  const detailScale = options.detailScale ?? 1;
  const bob = Math.sin(options.time * 3.2) * 1.3;
  const banking = Math.sin(options.time * 1.7) * 0.012;

  context.save();
  context.translate(options.x, options.y + bob);
  context.rotate(banking);
  context.scale(scale, scale);
  context.globalAlpha = alpha;

  if (options.aura !== undefined && options.aura !== null) {
    drawEquipmentAura(
      context,
      options.aura,
      options.time,
      glowScale,
      detailScale,
    );
  }

  const illustrated = characterShipSheet;
  if (illustrated !== null) {
    // Preserve the animated thrusters from the procedural renderer. The
    // illustrated sheet is the hull layer, not a replacement for motion FX.
    if (characterShipSource !== "v3") {
      for (const [index, x] of engineOffsets(profile.engineCount).entries()) {
        drawEngine(context, profile, x, options.time, index);
      }
    }
    // V3 sprites contain painted thrusters and core lighting; using the
    // old procedural flames as well would double the glow and hurt clarity.
    drawIllustratedShip(
      context,
      illustrated,
      characterId,
      profile,
      glowScale,
    );
    context.restore();
    return;
  }

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
