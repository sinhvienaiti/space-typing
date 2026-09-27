import type { CharacterId } from "./registry";
import {
  playerProjectileProfile,
  type PlayerProjectileStyleId,
} from "./projectiles";

export type PlayerShotOutcome =
  | "hit"
  | "layer"
  | "kill"
  | "boss-hit"
  | "boss-kill";

export type PlayerVisualShot = {
  id: number;
  characterId: CharacterId;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  age: number;
  duration: number;
  power: number;
  outcome: PlayerShotOutcome;
};

export type PlayerMuzzleFlash = {
  characterId: CharacterId;
  x: number;
  y: number;
  life: number;
  maxLife: number;
};

export type PlayerCombatImpact = {
  characterId: CharacterId;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  kill: boolean;
  power: number;
};

export type KillScorePopup = {
  x: number;
  y: number;
  value: number;
  life: number;
  maxLife: number;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function playerShotProgress(shot: PlayerVisualShot): number {
  return clamp01(shot.age / Math.max(0.001, shot.duration));
}

export function killScorePopupOpacity(popup: KillScorePopup): number {
  const ratio = clamp01(popup.life / Math.max(0.001, popup.maxLife));
  return Math.min(1, ratio * 1.55);
}

export function advanceKillScorePopups(
  popups: KillScorePopup[],
  dt: number,
): void {
  let live = 0;
  for (const popup of popups) {
    popup.life -= dt;
    if (popup.life > 0) popups[live++] = popup;
  }
  popups.length = live;
}

function shotPosition(shot: PlayerVisualShot): {
  x: number;
  y: number;
  angle: number;
} {
  const progress = playerShotProgress(shot);
  const eased = 1 - Math.pow(1 - progress, 3);
  const dx = shot.targetX - shot.startX;
  const dy = shot.targetY - shot.startY;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / distance;
  const ny = dx / distance;
  const profile = playerProjectileProfile(shot.characterId);
  const curveScale =
    profile.styleId === "crescent-slash" ||
    profile.styleId === "aurora-ribbon"
      ? 5
      : profile.styleId === "twin-star-shot"
        ? 3.5
        : 1.8;
  const curve =
    Math.sin(progress * Math.PI) *
    Math.sin(shot.id * 1.73) *
    curveScale;

  return {
    x: shot.startX + dx * eased + nx * curve,
    y: shot.startY + dy * eased + ny * curve,
    angle: Math.atan2(dy, dx),
  };
}

function drawStar(
  context: CanvasRenderingContext2D,
  radius: number,
): void {
  context.beginPath();
  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8;
    const r = index % 2 === 0 ? radius : radius * 0.34;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.fill();
}

function drawDiamond(
  context: CanvasRenderingContext2D,
  radius: number,
): void {
  context.beginPath();
  context.moveTo(radius * 1.45, 0);
  context.lineTo(0, radius * 0.62);
  context.lineTo(-radius * 1.1, 0);
  context.lineTo(0, -radius * 0.62);
  context.closePath();
  context.fill();
}

function drawProjectileTrail(
  context: CanvasRenderingContext2D,
  styleId: PlayerProjectileStyleId,
  trailLength: number,
  primary: string,
  secondary: string,
  accent: string,
  time: number,
  id: number,
): void {
  context.save();
  context.globalCompositeOperation = "lighter";
  context.lineCap = "round";
  context.shadowBlur = 9;
  context.shadowColor = primary;

  const gradient = context.createLinearGradient(0, 0, -trailLength, 0);
  gradient.addColorStop(0, secondary);
  gradient.addColorStop(0.24, primary);
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.strokeStyle = gradient;
  context.globalAlpha = 0.5;
  context.lineWidth = 10;
  context.beginPath();
  context.moveTo(-2, 0);
  context.quadraticCurveTo(
    -trailLength * 0.5,
    Math.sin(time * 8 + id) * 2.6,
    -trailLength,
    Math.sin(time * 5 + id * 0.7) * 3.4,
  );
  context.stroke();

  context.globalAlpha = 0.96;
  context.lineWidth = 3.2;
  context.beginPath();
  context.moveTo(0, 0);
  context.quadraticCurveTo(
    -trailLength * 0.48,
    Math.sin(time * 8 + id) * 1.6,
    -trailLength * 0.9,
    Math.sin(time * 5 + id * 0.7) * 2.2,
  );
  context.stroke();

  if (styleId === "twin-star-shot") {
    for (const offset of [-3, 3]) {
      context.strokeStyle = offset < 0 ? primary : accent;
      context.globalAlpha = 0.72;
      context.lineWidth = 1.6;
      context.beginPath();
      context.moveTo(-2, offset);
      context.quadraticCurveTo(
        -trailLength * 0.5,
        -offset + Math.sin(time * 9 + id) * 2,
        -trailLength * 0.86,
        offset,
      );
      context.stroke();
    }
  } else if (styleId === "thunder-needle") {
    context.strokeStyle = secondary;
    context.lineWidth = 1.25;
    context.globalAlpha = 0.72;
    context.beginPath();
    context.moveTo(-3, 0);
    for (let index = 1; index <= 5; index += 1) {
      context.lineTo(
        -(trailLength * index) / 5,
        Math.sin(time * 18 + id + index * 2.2) * 3.4,
      );
    }
    context.stroke();
  } else if (styleId === "blossom-comet") {
    context.fillStyle = secondary;
    for (let index = 1; index <= 4; index += 1) {
      const ratio = index / 5;
      context.globalAlpha = 0.65 - ratio * 0.28;
      context.beginPath();
      context.ellipse(
        -trailLength * ratio,
        Math.sin(time * 7 + id + index) * 4,
        2.1,
        0.9,
        time + index,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
  } else if (styleId === "prism-dart") {
    context.fillStyle = accent;
    for (let index = 1; index <= 4; index += 1) {
      context.save();
      context.translate(
        -trailLength * (index / 5),
        Math.sin(time * 5 + id + index) * 3.5,
      );
      context.scale(0.55, 0.55);
      context.globalAlpha = 0.65 - index * 0.08;
      drawDiamond(context, 3.2);
      context.restore();
    }
  } else if (styleId === "tidal-pearl") {
    context.strokeStyle = secondary;
    context.lineWidth = 1;
    for (let index = 1; index <= 3; index += 1) {
      const ratio = index / 4;
      context.globalAlpha = 0.55 - ratio * 0.2;
      context.beginPath();
      context.arc(
        -trailLength * ratio,
        Math.sin(time * 6 + id + index) * 3,
        1.3 + index * 0.4,
        0,
        Math.PI * 2,
      );
      context.stroke();
    }
  } else if (styleId === "halo-burst") {
    context.strokeStyle = accent;
    context.lineWidth = 1;
    for (let index = 1; index <= 2; index += 1) {
      context.globalAlpha = 0.5 - index * 0.1;
      context.beginPath();
      context.ellipse(
        -trailLength * (index / 3),
        0,
        3 + index,
        1.5 + index * 0.3,
        0,
        0,
        Math.PI * 2,
      );
      context.stroke();
    }
  } else if (styleId === "void-spike") {
    context.globalCompositeOperation = "source-over";
    context.strokeStyle = "rgba(10,0,24,0.72)";
    context.shadowBlur = 0;
    context.lineWidth = 2.4;
    context.globalAlpha = 0.76;
    context.beginPath();
    context.moveTo(-3, 0);
    context.lineTo(-trailLength * 0.82, 0);
    context.stroke();
  } else if (styleId === "solar-lance") {
    context.strokeStyle = secondary;
    context.lineWidth = 1.2;
    context.globalAlpha = 0.68;
    for (let index = 1; index <= 4; index += 1) {
      const x = -trailLength * (index / 5);
      const y = Math.sin(time * 10 + id + index * 1.4) * 4;
      context.beginPath();
      context.moveTo(x - 3, y - 1.5);
      context.lineTo(x + 2, y + 1.5);
      context.stroke();
    }
  } else if (styleId === "aurora-ribbon" || styleId === "crescent-slash") {
    const colors =
      styleId === "aurora-ribbon"
        ? [primary, accent, secondary]
        : [primary, secondary];
    for (let index = 0; index < colors.length; index += 1) {
      context.strokeStyle = colors[index]!;
      context.globalAlpha = 0.48;
      context.lineWidth = 1.3;
      context.beginPath();
      context.moveTo(-3, 0);
      context.quadraticCurveTo(
        -trailLength * 0.45,
        Math.sin(time * 7 + id + index * 2) * (4 + index),
        -trailLength * (0.72 + index * 0.06),
        Math.cos(time * 6 + id + index) * 2,
      );
      context.stroke();
    }
  }

  context.restore();
}

export function drawPlayerProjectile(
  context: CanvasRenderingContext2D,
  shot: PlayerVisualShot,
  time: number,
  glowScale: number,
  detailScale: number,
): void {
  const profile = playerProjectileProfile(shot.characterId);
  const position = shotPosition(shot);
  const radius =
    profile.bodyRadius *
    1.7 *
    (0.9 + Math.min(1.5, shot.power) * 0.12);
  const styleId = profile.styleId;
  const detail = detailScale >= 0.72;

  context.save();
  context.translate(position.x, position.y);
  context.rotate(position.angle);
  drawProjectileTrail(
    context,
    styleId,
    profile.trailLength * (detail ? 1 : 0.76),
    profile.primary,
    profile.secondary,
    profile.accent,
    time,
    shot.id,
  );

  context.globalCompositeOperation = "lighter";
  context.shadowColor = profile.primary;
  context.shadowBlur = 20 * profile.glow * glowScale;
  context.globalAlpha = 0.78;
  context.fillStyle = profile.primary;

  if (styleId === "crescent-slash") {
    context.strokeStyle = profile.primary;
    context.lineWidth = Math.max(2, radius * 0.75);
    context.beginPath();
    context.arc(0, 0, radius * 1.25, -1.05, 1.05);
    context.stroke();
  } else if (styleId === "thunder-needle" || styleId === "solar-lance") {
    context.beginPath();
    context.moveTo(radius * 1.8, 0);
    context.lineTo(-radius * 0.8, radius * 0.45);
    context.lineTo(-radius * 0.35, 0);
    context.lineTo(-radius * 0.8, -radius * 0.45);
    context.closePath();
    context.fill();
  } else if (styleId === "prism-dart" || styleId === "void-spike") {
    drawDiamond(context, radius);
  } else if (styleId === "twin-star-shot") {
    context.save();
    context.translate(0, -radius * 0.55);
    context.fillStyle = profile.primary;
    drawStar(context, radius * 0.8);
    context.translate(0, radius * 1.1);
    context.fillStyle = profile.accent;
    drawStar(context, radius * 0.72);
    context.restore();
  } else if (styleId === "blossom-comet") {
    context.save();
    context.rotate(time * 2.2 + shot.id);
    for (let index = 0; index < 5; index += 1) {
      context.save();
      context.rotate((Math.PI * 2 * index) / 5);
      context.beginPath();
      context.ellipse(radius * 0.7, 0, radius * 0.7, radius * 0.34, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    context.restore();
  } else {
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.globalAlpha = 1;
  context.shadowBlur = 11 * glowScale;
  context.fillStyle = profile.secondary;
  if (styleId === "halo-burst") {
    context.strokeStyle = profile.secondary;
    context.lineWidth = 1.4;
    context.beginPath();
    context.arc(0, 0, radius * 1.45, 0, Math.PI * 2);
    context.stroke();
  } else if (styleId === "tidal-pearl") {
    context.strokeStyle = profile.secondary;
    context.lineWidth = 1.2;
    context.beginPath();
    context.arc(0, 0, radius * 1.35, time * 4, time * 4 + Math.PI * 1.35);
    context.stroke();
  } else if (styleId === "aurora-ribbon") {
    context.strokeStyle = profile.secondary;
    context.lineWidth = 1.4;
    context.beginPath();
    context.moveTo(-radius, -radius * 0.45);
    context.quadraticCurveTo(0, radius * 0.7, radius * 1.2, -radius * 0.2);
    context.stroke();
  }

  context.beginPath();
  context.arc(radius * 0.18, -radius * 0.08, Math.max(1.3, radius * 0.34), 0, Math.PI * 2);
  context.fill();
  context.restore();
}

export function drawPlayerMuzzleFlash(
  context: CanvasRenderingContext2D,
  flash: PlayerMuzzleFlash,
  time: number,
  glowScale: number,
): void {
  const profile = playerProjectileProfile(flash.characterId);
  const alpha = clamp01(flash.life / Math.max(0.001, flash.maxLife));
  const radius = profile.muzzleRadius * (1 + (1 - alpha) * 0.9);

  context.save();
  context.translate(flash.x, flash.y);
  context.globalCompositeOperation = "lighter";
  context.globalAlpha = alpha * 0.76;
  context.shadowBlur = 12 * glowScale;
  context.shadowColor = profile.primary;
  context.fillStyle = profile.secondary;

  if (profile.styleId === "halo-burst" || profile.styleId === "tidal-pearl") {
    context.strokeStyle = profile.primary;
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.stroke();
  } else {
    context.rotate(time * 5);
    drawStar(context, radius);
  }

  context.restore();
}

export function drawPlayerCombatImpact(
  context: CanvasRenderingContext2D,
  impact: PlayerCombatImpact,
  time: number,
  glowScale: number,
  detailScale: number,
): void {
  const profile = playerProjectileProfile(impact.characterId);
  const alpha = clamp01(impact.life / Math.max(0.001, impact.maxLife));
  const progress = 1 - alpha;
  const strength = impact.kill ? 1.35 : 0.82;
  const radius = (7 + progress * (impact.kill ? 18 : 10)) * strength;

  context.save();
  context.translate(impact.x, impact.y);
  context.globalCompositeOperation = "lighter";
  context.globalAlpha = alpha * (impact.kill ? 0.78 : 0.58);
  context.shadowColor = profile.primary;
  context.shadowBlur = 12 * glowScale;
  context.strokeStyle = profile.primary;
  context.fillStyle = profile.secondary;
  context.lineWidth = impact.kill ? 2 : 1.3;

  if (profile.styleId === "blossom-comet" && detailScale >= 0.7) {
    for (let index = 0; index < (impact.kill ? 7 : 4); index += 1) {
      context.save();
      context.rotate((Math.PI * 2 * index) / (impact.kill ? 7 : 4) + time);
      context.beginPath();
      context.ellipse(radius * 0.58, 0, 3.5, 1.5, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  } else if (profile.styleId === "thunder-needle") {
    for (let index = 0; index < (impact.kill ? 7 : 4); index += 1) {
      const angle = (Math.PI * 2 * index) / (impact.kill ? 7 : 4);
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(
        Math.cos(angle) * radius * 0.52,
        Math.sin(angle) * radius * 0.52,
      );
      context.lineTo(
        Math.cos(angle + 0.16) * radius,
        Math.sin(angle + 0.16) * radius,
      );
      context.stroke();
    }
  } else if (profile.styleId === "void-spike") {
    context.globalCompositeOperation = "source-over";
    context.fillStyle = "rgba(8,0,20,0.72)";
    context.beginPath();
    context.arc(0, 0, radius * 0.44, 0, Math.PI * 2);
    context.fill();
    context.globalCompositeOperation = "lighter";
    context.strokeStyle = profile.primary;
    context.beginPath();
    context.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
    context.stroke();
  } else if (profile.styleId === "prism-dart" && detailScale >= 0.7) {
    for (let index = 0; index < (impact.kill ? 6 : 4); index += 1) {
      context.save();
      context.rotate((Math.PI * 2 * index) / (impact.kill ? 6 : 4));
      context.translate(radius * 0.58, 0);
      context.scale(0.7, 0.7);
      drawDiamond(context, 3.4);
      context.restore();
    }
  } else {
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.stroke();
    if (
      profile.styleId === "halo-burst" ||
      profile.styleId === "tidal-pearl" ||
      profile.styleId === "aurora-ribbon"
    ) {
      context.globalAlpha *= 0.66;
      context.beginPath();
      context.arc(0, 0, radius * 0.58, 0, Math.PI * 2);
      context.stroke();
    }
  }

  context.restore();
}

export function drawKillScorePopup(
  context: CanvasRenderingContext2D,
  popup: KillScorePopup,
): void {
  const alpha = killScorePopupOpacity(popup);
  if (alpha <= 0) return;
  const progress = 1 - clamp01(popup.life / Math.max(0.001, popup.maxLife));
  const y = popup.y - progress * 26;

  context.save();
  context.globalAlpha = alpha;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "800 17px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.lineWidth = 4;
  context.strokeStyle = "rgba(4, 8, 20, 0.82)";
  context.fillStyle = "#ffe48a";
  const text = "+" + String(Math.max(0, Math.round(popup.value)));
  context.strokeText(text, popup.x, y);
  context.fillText(text, popup.x, y);
  context.restore();
}
