import type { CharacterId } from "./registry";
import {
  playerProjectileProfile,
  type PlayerProjectileStyleId,
} from "./projectiles";

export const PLAYER_PROJECTILE_BODY_SCALE = 2.35;
export const PLAYER_PROJECTILE_RAY_COUNT = 10;

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

function drawEnergyRayBurst(
  context: CanvasRenderingContext2D,
  radius: number,
  primary: string,
  secondary: string,
  time: number,
  id: number,
  glowScale: number,
): void {
  context.save();
  context.globalCompositeOperation = "lighter";
  context.lineCap = "round";
  context.shadowColor = primary;
  context.shadowBlur = 18 * glowScale;

  // Long axial flare: the bright comet-like beam visible in the reference.
  const axialPulse = 0.94 + Math.sin(time * 12 + id) * 0.06;
  const front = radius * 3.5 * axialPulse;
  const back = radius * 2.5;
  const axial = context.createLinearGradient(-back, 0, front, 0);
  axial.addColorStop(0, "rgba(255,255,255,0)");
  axial.addColorStop(0.42, primary);
  axial.addColorStop(0.58, secondary);
  axial.addColorStop(1, "rgba(255,255,255,0)");
  context.strokeStyle = axial;
  context.globalAlpha = 0.82;
  context.lineWidth = Math.max(1.3, radius * 0.18);
  context.beginPath();
  context.moveTo(-back, 0);
  context.lineTo(front, 0);
  context.stroke();

  // Bounded radial flare rays give the projectile a luminous star core instead
  // of a flat 2D shape. Alternating ray lengths keep the word area readable.
  for (let index = 0; index < PLAYER_PROJECTILE_RAY_COUNT; index += 1) {
    const angle =
      (Math.PI * 2 * index) / PLAYER_PROJECTILE_RAY_COUNT +
      Math.sin(time * 2.4 + id * 0.37) * 0.045;
    const longRay = index % 2 === 0;
    const inner = radius * (longRay ? 0.58 : 0.72);
    const outer = radius * (longRay ? 2.45 : 1.62);
    context.strokeStyle = index % 3 === 0 ? secondary : primary;
    context.globalAlpha = longRay ? 0.66 : 0.46;
    context.lineWidth = longRay ? 1.25 : 0.9;
    context.beginPath();
    context.moveTo(
      Math.cos(angle) * inner,
      Math.sin(angle) * inner,
    );
    context.lineTo(
      Math.cos(angle) * outer,
      Math.sin(angle) * outer,
    );
    context.stroke();
  }

  // Hot white-blue center, separate from the style body below.
  context.globalAlpha = 0.92;
  context.fillStyle = secondary;
  context.shadowBlur = 24 * glowScale;
  context.beginPath();
  context.arc(0, 0, Math.max(2.4, radius * 0.42), 0, Math.PI * 2);
  context.fill();
  context.restore();
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
    PLAYER_PROJECTILE_BODY_SCALE *
    (0.92 + Math.min(1.5, shot.power) * 0.13);
  const styleId = profile.styleId;
  const detail = detailScale >= 0.72;

  context.save();
  context.translate(position.x, position.y);
  context.rotate(position.angle);
  drawProjectileTrail(
    context,
    styleId,
    profile.trailLength * (detail ? 1.18 : 0.9),
    profile.primary,
    profile.secondary,
    profile.accent,
    time,
    shot.id,
  );
  drawEnergyRayBurst(
    context,
    radius,
    profile.primary,
    profile.secondary,
    time,
    shot.id,
    glowScale,
  );

  context.globalCompositeOperation = "lighter";
  context.shadowColor = profile.primary;
  context.shadowBlur = 26 * profile.glow * glowScale;
  context.globalAlpha = 0.86;
  context.fillStyle = profile.primary;

  if (styleId === "meteor-bolt") {
    context.beginPath();
    context.moveTo(radius * 1.75, 0);
    context.quadraticCurveTo(
      radius * 0.55,
      radius * 0.92,
      -radius * 0.85,
      radius * 0.48,
    );
    context.quadraticCurveTo(
      -radius * 0.35,
      0,
      -radius * 0.85,
      -radius * 0.48,
    );
    context.quadraticCurveTo(
      radius * 0.55,
      -radius * 0.92,
      radius * 1.75,
      0,
    );
    context.closePath();
    context.fill();
  } else if (styleId === "crescent-slash") {
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
