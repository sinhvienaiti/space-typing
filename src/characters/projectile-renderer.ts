import type { CharacterId } from "./registry";
import {
  playerProjectileProfile,
  type PlayerProjectileStyleId,
} from "./projectiles";
import { drawPlayerProjectileArt } from "./projectile-art";

export const PLAYER_PROJECTILE_BODY_SCALE = 2.55;
export const PLAYER_PROJECTILE_RAY_COUNT = 8;

export const PROJECTILE_VISUAL_IDENTITIES: Record<
  PlayerProjectileStyleId,
  Readonly<{
    body: string;
    wake: string;
    particles: string;
  }>
> = {
  "meteor-bolt": {
    body: "comet-core",
    wake: "long-blue-comet",
    particles: "dark-debris-sparks",
  },
  "crescent-slash": {
    body: "purple-crescent-blade",
    wake: "curved-crescent-arc",
    particles: "violet-spark-shards",
  },
  "prism-dart": {
    body: "faceted-crystal-arrow",
    wake: "prismatic-shard-stream",
    particles: "cyan-pink-crystals",
  },
  "nova-pearl": {
    body: "pink-energy-pearl",
    wake: "soft-orbiting-halo",
    particles: "orbit-mini-pearls",
  },
  "twin-star-shot": {
    body: "blue-gold-double-star",
    wake: "intertwined-double-ribbon",
    particles: "dual-star-sparks",
  },
  "halo-burst": {
    body: "holy-gold-orb",
    wake: "concentric-rune-rings",
    particles: "golden-cross-sparks",
  },
  "thunder-needle": {
    body: "electric-blue-spear",
    wake: "forked-lightning",
    particles: "electric-branches",
  },
  "blossom-comet": {
    body: "sakura-flower-core",
    wake: "pink-petal-stream",
    particles: "falling-petals",
  },
  "void-spike": {
    body: "dark-void-spike",
    wake: "singularity-distortion",
    particles: "purple-black-shards",
  },
  "solar-lance": {
    body: "orange-solar-spear",
    wake: "plasma-fire-tail",
    particles: "stellar-embers",
  },
  "tidal-pearl": {
    body: "water-vortex-pearl",
    wake: "swirling-water",
    particles: "bubbles-droplets",
  },
  "aurora-ribbon": {
    body: "aurora-bloom-tip",
    wake: "three-color-ribbons",
    particles: "aurora-sparkles",
  },
};

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
    profile.styleId === "crescent-slash"
      ? 10
      : profile.styleId === "aurora-ribbon"
        ? 7
        : profile.styleId === "twin-star-shot"
          ? 5
          : 2;
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
    const size = index % 2 === 0 ? radius : radius * 0.34;
    const x = Math.cos(angle) * size;
    const y = Math.sin(angle) * size;
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
  context.moveTo(radius * 1.6, 0);
  context.lineTo(radius * 0.05, radius * 0.72);
  context.lineTo(-radius * 1.2, 0);
  context.lineTo(radius * 0.05, -radius * 0.72);
  context.closePath();
  context.fill();
}

function drawGlowCore(
  context: CanvasRenderingContext2D,
  radius: number,
  primary: string,
  secondary: string,
  glowScale: number,
): void {
  context.save();
  context.globalCompositeOperation = "lighter";
  context.shadowColor = primary;
  context.shadowBlur = 24 * glowScale;
  context.globalAlpha = 0.54;
  context.fillStyle = primary;
  context.beginPath();
  context.arc(0, 0, radius * 1.15, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;
  context.shadowColor = secondary;
  context.shadowBlur = 13 * glowScale;
  context.fillStyle = secondary;
  context.beginPath();
  context.arc(radius * 0.18, -radius * 0.06, Math.max(2.2, radius * 0.36), 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawCrossFlare(
  context: CanvasRenderingContext2D,
  radius: number,
  primary: string,
  secondary: string,
  glowScale: number,
  longAxis = 2.7,
): void {
  context.save();
  context.globalCompositeOperation = "lighter";
  context.lineCap = "round";
  context.shadowColor = primary;
  context.shadowBlur = 15 * glowScale;
  for (let index = 0; index < 4; index += 1) {
    const angle = (Math.PI * index) / 2;
    context.strokeStyle = index % 2 === 0 ? secondary : primary;
    context.globalAlpha = index % 2 === 0 ? 0.78 : 0.52;
    context.lineWidth = index % 2 === 0 ? 1.6 : 1;
    context.beginPath();
    context.moveTo(
      Math.cos(angle) * radius * 0.58,
      Math.sin(angle) * radius * 0.58,
    );
    context.lineTo(
      Math.cos(angle) * radius * longAxis,
      Math.sin(angle) * radius * longAxis,
    );
    context.stroke();
  }
  context.restore();
}

function drawLinearWake(
  context: CanvasRenderingContext2D,
  length: number,
  width: number,
  primary: string,
  secondary: string,
  time: number,
  id: number,
  bend = 0,
): void {
  const gradient = context.createLinearGradient(0, 0, -length, 0);
  gradient.addColorStop(0, secondary);
  gradient.addColorStop(0.18, primary);
  gradient.addColorStop(0.62, primary);
  gradient.addColorStop(1, "rgba(255,255,255,0)");

  context.save();
  context.globalCompositeOperation = "lighter";
  context.lineCap = "round";
  context.shadowColor = primary;
  context.shadowBlur = 18;
  context.strokeStyle = gradient;
  context.globalAlpha = 0.34;
  context.lineWidth = width * 2.4;
  context.beginPath();
  context.moveTo(-2, 0);
  context.quadraticCurveTo(
    -length * 0.45,
    Math.sin(time * 5.2 + id) * bend,
    -length,
    Math.sin(time * 3.7 + id * 0.6) * bend,
  );
  context.stroke();

  context.globalAlpha = 0.94;
  context.shadowBlur = 8;
  context.lineWidth = Math.max(2, width * 0.58);
  context.beginPath();
  context.moveTo(0, 0);
  context.quadraticCurveTo(
    -length * 0.48,
    Math.sin(time * 5.2 + id) * bend * 0.55,
    -length * 0.92,
    Math.sin(time * 3.7 + id * 0.6) * bend * 0.55,
  );
  context.stroke();
  context.restore();
}

function drawMeteorWake(
  context: CanvasRenderingContext2D,
  length: number,
  radius: number,
  primary: string,
  secondary: string,
  accent: string,
  time: number,
  id: number,
): void {
  drawLinearWake(context, length, radius * 0.8, primary, secondary, time, id, 4);
  context.save();
  context.globalCompositeOperation = "lighter";
  context.fillStyle = secondary;
  for (let index = 1; index <= 7; index += 1) {
    const ratio = index / 8;
    const x = -length * ratio;
    const y = Math.sin(time * 8 + id + index * 2.2) * (3 + ratio * 9);
    context.globalAlpha = 0.7 - ratio * 0.42;
    context.beginPath();
    context.arc(x, y, 1.2 + (index % 3) * 0.45, 0, Math.PI * 2);
    context.fill();
  }
  context.globalCompositeOperation = "source-over";
  context.fillStyle = "rgba(9, 20, 48, 0.72)";
  for (let index = 0; index < 4; index += 1) {
    const ratio = (index + 2) / 7;
    const x = -length * ratio;
    const y = Math.cos(time * 3.4 + id + index * 1.8) * (5 + index * 2);
    context.globalAlpha = 0.65 - index * 0.1;
    context.beginPath();
    context.arc(x, y, 1.4 + index * 0.4, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawCrescentWake(
  context: CanvasRenderingContext2D,
  length: number,
  radius: number,
  primary: string,
  secondary: string,
  time: number,
  id: number,
): void {
  context.save();
  context.globalCompositeOperation = "lighter";
  context.lineCap = "round";
  context.shadowColor = primary;
  context.shadowBlur = 16;
  for (let band = 0; band < 3; band += 1) {
    context.strokeStyle = band === 1 ? secondary : primary;
    context.globalAlpha = 0.58 - band * 0.12;
    context.lineWidth = Math.max(1.4, radius * (0.42 - band * 0.08));
    context.beginPath();
    context.moveTo(-radius * 0.25, (band - 1) * radius * 0.28);
    context.bezierCurveTo(
      -length * 0.28,
      -radius * (2.2 + band * 0.35),
      -length * 0.68,
      radius * (1.3 + band * 0.3),
      -length,
      Math.sin(time * 3.4 + id) * radius * 0.5,
    );
    context.stroke();
  }
  context.restore();
}

function drawPrismWake(
  context: CanvasRenderingContext2D,
  length: number,
  radius: number,
  primary: string,
  secondary: string,
  accent: string,
  time: number,
  id: number,
): void {
  drawLinearWake(context, length * 0.72, radius * 0.42, primary, secondary, time, id, 2);
  context.save();
  context.globalCompositeOperation = "lighter";
  for (let index = 1; index <= 8; index += 1) {
    const ratio = index / 9;
    context.save();
    context.translate(
      -length * ratio,
      Math.sin(time * 4 + id + index * 1.9) * (4 + ratio * 9),
    );
    context.rotate(time * 1.6 + index);
    context.fillStyle = index % 2 === 0 ? secondary : accent;
    context.globalAlpha = 0.7 - ratio * 0.34;
    context.scale(0.62, 0.62);
    drawDiamond(context, 3 + (index % 3));
    context.restore();
  }
  context.restore();
}

function drawNovaWake(
  context: CanvasRenderingContext2D,
  length: number,
  radius: number,
  primary: string,
  secondary: string,
  time: number,
  id: number,
): void {
  drawLinearWake(context, length * 0.62, radius * 0.56, primary, secondary, time, id, 2);
  context.save();
  context.globalCompositeOperation = "lighter";
  context.strokeStyle = primary;
  context.fillStyle = secondary;
  for (let index = 0; index < 5; index += 1) {
    const ratio = (index + 1) / 6;
    const x = -length * ratio * 0.68;
    const y = Math.sin(time * 4.5 + id + index * 1.3) * radius * 1.25;
    context.globalAlpha = 0.64 - ratio * 0.25;
    context.beginPath();
    context.arc(x, y, 1.8 + (index % 2) * 0.7, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawTwinStarWake(
  context: CanvasRenderingContext2D,
  length: number,
  radius: number,
  primary: string,
  accent: string,
  time: number,
  id: number,
): void {
  context.save();
  context.globalCompositeOperation = "lighter";
  context.lineCap = "round";
  for (let band = 0; band < 2; band += 1) {
    const sign = band === 0 ? -1 : 1;
    context.strokeStyle = band === 0 ? primary : accent;
    context.shadowColor = band === 0 ? primary : accent;
    context.shadowBlur = 13;
    context.globalAlpha = 0.78;
    context.lineWidth = Math.max(2.1, radius * 0.3);
    context.beginPath();
    context.moveTo(0, sign * radius * 0.55);
    context.bezierCurveTo(
      -length * 0.3,
      -sign * radius * 1.7,
      -length * 0.68,
      sign * radius * 1.7,
      -length,
      sign * Math.sin(time * 5 + id) * radius * 0.55,
    );
    context.stroke();
  }
  context.restore();
}

function drawHaloWake(
  context: CanvasRenderingContext2D,
  length: number,
  radius: number,
  primary: string,
  secondary: string,
  accent: string,
  time: number,
): void {
  drawLinearWake(context, length * 0.7, radius * 0.34, primary, secondary, time, 0, 1);
  context.save();
  context.globalCompositeOperation = "lighter";
  context.strokeStyle = accent;
  context.shadowColor = primary;
  context.shadowBlur = 10;
  for (let index = 1; index <= 4; index += 1) {
    const x = -length * (index / 5);
    const ring = radius * (0.55 + index * 0.12);
    context.globalAlpha = 0.62 - index * 0.09;
    context.lineWidth = 1.2;
    context.beginPath();
    context.ellipse(x, 0, ring, ring * 0.34, 0, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
}

function drawThunderWake(
  context: CanvasRenderingContext2D,
  length: number,
  radius: number,
  primary: string,
  secondary: string,
  time: number,
  id: number,
): void {
  drawLinearWake(context, length * 0.78, radius * 0.34, primary, secondary, time, id, 1);
  context.save();
  context.globalCompositeOperation = "lighter";
  context.strokeStyle = secondary;
  context.shadowColor = primary;
  context.shadowBlur = 12;
  context.lineWidth = 1.5;
  context.globalAlpha = 0.92;
  for (let branch = 0; branch < 3; branch += 1) {
    context.beginPath();
    context.moveTo(-radius * 0.2, (branch - 1) * radius * 0.35);
    for (let index = 1; index <= 8; index += 1) {
      const ratio = index / 8;
      const x = -length * ratio;
      const y =
        Math.sin(time * 18 + id + branch * 2.4 + index * 1.8) *
        radius *
        (0.22 + ratio * 0.75) +
        (branch - 1) * radius * 0.45;
      context.lineTo(x, y);
    }
    context.stroke();
  }
  context.restore();
}

function drawBlossomWake(
  context: CanvasRenderingContext2D,
  length: number,
  radius: number,
  primary: string,
  secondary: string,
  time: number,
  id: number,
): void {
  drawLinearWake(context, length * 0.66, radius * 0.44, primary, secondary, time, id, 4);
  context.save();
  context.globalCompositeOperation = "lighter";
  context.fillStyle = secondary;
  for (let index = 1; index <= 9; index += 1) {
    const ratio = index / 10;
    const x = -length * ratio;
    const y = Math.sin(time * 5.3 + id + index * 1.55) * (5 + ratio * 12);
    context.save();
    context.translate(x, y);
    context.rotate(time * 1.8 + index * 0.9);
    context.globalAlpha = 0.72 - ratio * 0.38;
    context.beginPath();
    context.ellipse(0, 0, 3.2, 1.35, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  context.restore();
}

function drawVoidWake(
  context: CanvasRenderingContext2D,
  length: number,
  radius: number,
  primary: string,
  secondary: string,
  accent: string,
  time: number,
  id: number,
): void {
  context.save();
  context.globalCompositeOperation = "source-over";
  context.lineCap = "round";
  context.strokeStyle = "rgba(10, 0, 24, 0.78)";
  context.lineWidth = radius * 1.5;
  context.beginPath();
  context.moveTo(-radius * 0.2, 0);
  context.quadraticCurveTo(
    -length * 0.45,
    Math.sin(time * 3.1 + id) * radius * 0.9,
    -length,
    0,
  );
  context.stroke();
  context.globalCompositeOperation = "lighter";
  context.strokeStyle = primary;
  context.shadowColor = primary;
  context.shadowBlur = 14;
  context.globalAlpha = 0.68;
  context.lineWidth = 2;
  context.stroke();
  context.fillStyle = accent;
  for (let index = 1; index <= 6; index += 1) {
    const ratio = index / 7;
    const x = -length * ratio;
    const y = Math.sin(time * 4 + id + index * 1.7) * radius * (0.7 + ratio);
    context.save();
    context.translate(x, y);
    context.rotate(time + index);
    context.globalAlpha = 0.6 - ratio * 0.3;
    drawDiamond(context, 2.2 + (index % 2));
    context.restore();
  }
  context.restore();
}

function drawSolarWake(
  context: CanvasRenderingContext2D,
  length: number,
  radius: number,
  primary: string,
  secondary: string,
  accent: string,
  time: number,
  id: number,
): void {
  drawLinearWake(context, length, radius * 0.75, primary, secondary, time, id, 5);
  context.save();
  context.globalCompositeOperation = "lighter";
  context.fillStyle = accent;
  context.shadowColor = primary;
  context.shadowBlur = 12;
  for (let index = 1; index <= 8; index += 1) {
    const ratio = index / 9;
    const x = -length * ratio;
    const y = Math.sin(time * 8.5 + id + index * 1.45) * radius * (0.35 + ratio);
    const spark = 1.5 + (index % 3) * 0.55;
    context.globalAlpha = 0.76 - ratio * 0.38;
    context.beginPath();
    context.moveTo(x - spark * 2.1, y);
    context.lineTo(x + spark * 1.4, y - spark);
    context.lineTo(x + spark * 1.1, y + spark);
    context.closePath();
    context.fill();
  }
  context.restore();
}

function drawTidalWake(
  context: CanvasRenderingContext2D,
  length: number,
  radius: number,
  primary: string,
  secondary: string,
  time: number,
  id: number,
): void {
  context.save();
  context.globalCompositeOperation = "lighter";
  context.lineCap = "round";
  context.shadowColor = primary;
  context.shadowBlur = 13;
  for (let band = 0; band < 2; band += 1) {
    context.strokeStyle = band === 0 ? primary : secondary;
    context.globalAlpha = 0.66 - band * 0.14;
    context.lineWidth = Math.max(1.5, radius * (0.38 - band * 0.08));
    context.beginPath();
    context.moveTo(-radius * 0.2, 0);
    context.bezierCurveTo(
      -length * 0.25,
      (band === 0 ? -1 : 1) * radius * 1.4,
      -length * 0.62,
      (band === 0 ? 1 : -1) * radius * 1.6,
      -length,
      Math.sin(time * 4 + id) * radius * 0.5,
    );
    context.stroke();
  }
  context.fillStyle = secondary;
  for (let index = 1; index <= 7; index += 1) {
    const ratio = index / 8;
    context.globalAlpha = 0.65 - ratio * 0.32;
    context.beginPath();
    context.arc(
      -length * ratio,
      Math.sin(time * 5.2 + id + index * 1.3) * (4 + ratio * 8),
      1.4 + (index % 3) * 0.55,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.restore();
}

function drawAuroraWake(
  context: CanvasRenderingContext2D,
  length: number,
  radius: number,
  primary: string,
  secondary: string,
  accent: string,
  time: number,
  id: number,
): void {
  context.save();
  context.globalCompositeOperation = "lighter";
  context.lineCap = "round";
  for (let band = 0; band < 3; band += 1) {
    const color = band === 0 ? primary : band === 1 ? accent : secondary;
    const phase = band * 2.05;
    context.strokeStyle = color;
    context.shadowColor = color;
    context.shadowBlur = 14;
    context.globalAlpha = 0.64;
    context.lineWidth = Math.max(2, radius * 0.28);
    context.beginPath();
    context.moveTo(0, (band - 1) * radius * 0.42);
    context.bezierCurveTo(
      -length * 0.28,
      Math.sin(time * 3.8 + id + phase) * radius * 1.5,
      -length * 0.68,
      Math.cos(time * 3.2 + id + phase) * radius * 1.7,
      -length,
      Math.sin(time * 2.8 + id + phase) * radius * 0.75,
    );
    context.stroke();
  }
  context.restore();
}

function drawStyleWake(
  context: CanvasRenderingContext2D,
  styleId: PlayerProjectileStyleId,
  length: number,
  radius: number,
  primary: string,
  secondary: string,
  accent: string,
  time: number,
  id: number,
): void {
  switch (styleId) {
    case "meteor-bolt":
      drawMeteorWake(context, length, radius, primary, secondary, accent, time, id);
      return;
    case "crescent-slash":
      drawCrescentWake(context, length, radius, primary, secondary, time, id);
      return;
    case "prism-dart":
      drawPrismWake(context, length, radius, primary, secondary, accent, time, id);
      return;
    case "nova-pearl":
      drawNovaWake(context, length, radius, primary, secondary, time, id);
      return;
    case "twin-star-shot":
      drawTwinStarWake(context, length, radius, primary, accent, time, id);
      return;
    case "halo-burst":
      drawHaloWake(context, length, radius, primary, secondary, accent, time);
      return;
    case "thunder-needle":
      drawThunderWake(context, length, radius, primary, secondary, time, id);
      return;
    case "blossom-comet":
      drawBlossomWake(context, length, radius, primary, secondary, time, id);
      return;
    case "void-spike":
      drawVoidWake(context, length, radius, primary, secondary, accent, time, id);
      return;
    case "solar-lance":
      drawSolarWake(context, length, radius, primary, secondary, accent, time, id);
      return;
    case "tidal-pearl":
      drawTidalWake(context, length, radius, primary, secondary, time, id);
      return;
    case "aurora-ribbon":
      drawAuroraWake(context, length, radius, primary, secondary, accent, time, id);
      return;
  }
}

function drawMeteorBody(
  context: CanvasRenderingContext2D,
  radius: number,
  primary: string,
  secondary: string,
  glowScale: number,
): void {
  context.save();
  context.globalCompositeOperation = "lighter";
  context.fillStyle = primary;
  context.shadowColor = primary;
  context.shadowBlur = 28 * glowScale;
  context.beginPath();
  context.moveTo(radius * 1.9, 0);
  context.bezierCurveTo(
    radius * 0.72,
    radius * 1.02,
    -radius * 0.95,
    radius * 0.72,
    -radius * 1.25,
    0,
  );
  context.bezierCurveTo(
    -radius * 0.95,
    -radius * 0.72,
    radius * 0.72,
    -radius * 1.02,
    radius * 1.9,
    0,
  );
  context.fill();
  drawGlowCore(context, radius, primary, secondary, glowScale);
  drawCrossFlare(context, radius, primary, secondary, glowScale, 3.1);
  context.restore();
}

function drawCrescentBody(
  context: CanvasRenderingContext2D,
  radius: number,
  primary: string,
  secondary: string,
  glowScale: number,
): void {
  context.save();
  context.globalCompositeOperation = "lighter";
  context.shadowColor = primary;
  context.shadowBlur = 22 * glowScale;
  context.lineCap = "round";
  context.strokeStyle = primary;
  context.globalAlpha = 0.9;
  context.lineWidth = radius * 0.82;
  context.beginPath();
  context.arc(0, 0, radius * 1.15, -1.15, 1.15);
  context.stroke();
  context.strokeStyle = secondary;
  context.globalAlpha = 1;
  context.lineWidth = radius * 0.25;
  context.beginPath();
  context.arc(radius * 0.18, 0, radius * 1.02, -1.08, 1.08);
  context.stroke();
  drawCrossFlare(context, radius * 0.72, primary, secondary, glowScale, 2.1);
  context.restore();
}

function drawPrismBody(
  context: CanvasRenderingContext2D,
  radius: number,
  primary: string,
  secondary: string,
  accent: string,
  glowScale: number,
): void {
  context.save();
  context.globalCompositeOperation = "lighter";
  context.shadowColor = primary;
  context.shadowBlur = 20 * glowScale;
  context.fillStyle = primary;
  drawDiamond(context, radius * 1.08);
  context.fillStyle = accent;
  context.globalAlpha = 0.78;
  context.save();
  context.scale(0.62, 0.62);
  drawDiamond(context, radius);
  context.restore();
  context.fillStyle = secondary;
  context.globalAlpha = 1;
  context.beginPath();
  context.moveTo(radius * 1.1, 0);
  context.lineTo(radius * 0.1, radius * 0.22);
  context.lineTo(-radius * 0.28, 0);
  context.lineTo(radius * 0.1, -radius * 0.22);
  context.closePath();
  context.fill();
  context.restore();
}

function drawNovaBody(
  context: CanvasRenderingContext2D,
  radius: number,
  primary: string,
  secondary: string,
  glowScale: number,
  time: number,
  id: number,
): void {
  drawGlowCore(context, radius * 1.02, primary, secondary, glowScale);
  context.save();
  context.globalCompositeOperation = "lighter";
  context.strokeStyle = primary;
  context.shadowColor = primary;
  context.shadowBlur = 15 * glowScale;
  for (let ring = 0; ring < 2; ring += 1) {
    context.globalAlpha = 0.72 - ring * 0.16;
    context.lineWidth = 1.2;
    context.beginPath();
    context.ellipse(
      0,
      0,
      radius * (1.38 + ring * 0.28),
      radius * (0.48 + ring * 0.12),
      time * 1.8 + id + ring * 1.3,
      0,
      Math.PI * 2,
    );
    context.stroke();
  }
  context.fillStyle = secondary;
  for (let index = 0; index < 4; index += 1) {
    const angle = time * 2.2 + id + (Math.PI * 2 * index) / 4;
    context.beginPath();
    context.arc(
      Math.cos(angle) * radius * 1.45,
      Math.sin(angle) * radius * 0.72,
      radius * 0.16,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.restore();
}

function drawTwinStarBody(
  context: CanvasRenderingContext2D,
  radius: number,
  primary: string,
  accent: string,
  secondary: string,
  glowScale: number,
  time: number,
  id: number,
): void {
  context.save();
  context.globalCompositeOperation = "lighter";
  const separation = radius * 0.7;
  const wobble = Math.sin(time * 6 + id) * radius * 0.18;
  context.shadowBlur = 20 * glowScale;
  context.shadowColor = primary;
  context.fillStyle = primary;
  context.save();
  context.translate(0, -separation + wobble);
  drawStar(context, radius * 0.82);
  context.restore();
  context.shadowColor = accent;
  context.fillStyle = accent;
  context.save();
  context.translate(0, separation - wobble);
  drawStar(context, radius * 0.82);
  context.restore();
  context.fillStyle = secondary;
  context.globalAlpha = 0.86;
  context.beginPath();
  context.arc(radius * 0.15, 0, radius * 0.24, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawHaloBody(
  context: CanvasRenderingContext2D,
  radius: number,
  primary: string,
  secondary: string,
  accent: string,
  glowScale: number,
): void {
  drawGlowCore(context, radius * 0.9, primary, secondary, glowScale);
  context.save();
  context.globalCompositeOperation = "lighter";
  context.strokeStyle = accent;
  context.shadowColor = primary;
  context.shadowBlur = 18 * glowScale;
  for (let ring = 0; ring < 3; ring += 1) {
    context.globalAlpha = 0.82 - ring * 0.17;
    context.lineWidth = ring === 0 ? 1.8 : 1.1;
    context.beginPath();
    context.ellipse(
      0,
      0,
      radius * (1.25 + ring * 0.28),
      radius * (0.78 + ring * 0.14),
      ring * 0.72,
      0,
      Math.PI * 2,
    );
    context.stroke();
  }
  drawCrossFlare(context, radius, primary, secondary, glowScale, 2.8);
  context.restore();
}

function drawThunderBody(
  context: CanvasRenderingContext2D,
  radius: number,
  primary: string,
  secondary: string,
  glowScale: number,
  time: number,
  id: number,
): void {
  context.save();
  context.globalCompositeOperation = "lighter";
  context.fillStyle = primary;
  context.shadowColor = primary;
  context.shadowBlur = 22 * glowScale;
  context.beginPath();
  context.moveTo(radius * 2.25, 0);
  context.lineTo(radius * 0.4, radius * 0.48);
  context.lineTo(-radius * 1.05, radius * 0.24);
  context.lineTo(-radius * 0.4, 0);
  context.lineTo(-radius * 1.05, -radius * 0.24);
  context.lineTo(radius * 0.4, -radius * 0.48);
  context.closePath();
  context.fill();
  context.strokeStyle = secondary;
  context.lineWidth = 1.2;
  for (let branch = 0; branch < 4; branch += 1) {
    const sign = branch % 2 === 0 ? -1 : 1;
    context.beginPath();
    context.moveTo(-radius * 0.25, sign * radius * 0.18);
    context.lineTo(
      radius * 0.25,
      sign * radius * (0.52 + Math.sin(time * 10 + id + branch) * 0.12),
    );
    context.lineTo(radius * 0.75, sign * radius * 0.36);
    context.stroke();
  }
  context.fillStyle = secondary;
  context.beginPath();
  context.arc(radius * 0.45, 0, radius * 0.24, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawBlossomBody(
  context: CanvasRenderingContext2D,
  radius: number,
  primary: string,
  secondary: string,
  glowScale: number,
  time: number,
  id: number,
): void {
  context.save();
  context.globalCompositeOperation = "lighter";
  context.fillStyle = primary;
  context.shadowColor = primary;
  context.shadowBlur = 22 * glowScale;
  context.rotate(time * 0.8 + id * 0.2);
  for (let index = 0; index < 5; index += 1) {
    context.save();
    context.rotate((Math.PI * 2 * index) / 5);
    context.beginPath();
    context.ellipse(radius * 0.72, 0, radius * 0.74, radius * 0.34, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  context.fillStyle = secondary;
  context.shadowBlur = 11 * glowScale;
  context.beginPath();
  context.arc(0, 0, radius * 0.34, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawVoidBody(
  context: CanvasRenderingContext2D,
  radius: number,
  primary: string,
  secondary: string,
  accent: string,
  glowScale: number,
): void {
  context.save();
  context.globalCompositeOperation = "source-over";
  context.fillStyle = "rgba(5, 0, 16, 0.96)";
  context.shadowColor = primary;
  context.shadowBlur = 24 * glowScale;
  context.beginPath();
  context.arc(-radius * 0.4, 0, radius * 0.78, 0, Math.PI * 2);
  context.fill();
  context.globalCompositeOperation = "lighter";
  context.strokeStyle = primary;
  context.lineWidth = radius * 0.18;
  context.globalAlpha = 0.92;
  context.beginPath();
  context.arc(-radius * 0.4, 0, radius * 0.95, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = accent;
  context.beginPath();
  context.moveTo(radius * 2.0, 0);
  context.lineTo(radius * 0.15, radius * 0.55);
  context.lineTo(-radius * 0.15, 0);
  context.lineTo(radius * 0.15, -radius * 0.55);
  context.closePath();
  context.fill();
  context.fillStyle = secondary;
  context.globalAlpha = 0.7;
  context.beginPath();
  context.arc(-radius * 0.4, 0, radius * 0.22, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawSolarBody(
  context: CanvasRenderingContext2D,
  radius: number,
  primary: string,
  secondary: string,
  accent: string,
  glowScale: number,
): void {
  context.save();
  context.globalCompositeOperation = "lighter";
  context.shadowColor = primary;
  context.shadowBlur = 26 * glowScale;
  context.fillStyle = primary;
  context.beginPath();
  context.moveTo(radius * 2.5, 0);
  context.lineTo(radius * 0.2, radius * 0.58);
  context.lineTo(-radius * 1.05, radius * 0.28);
  context.lineTo(-radius * 0.5, 0);
  context.lineTo(-radius * 1.05, -radius * 0.28);
  context.lineTo(radius * 0.2, -radius * 0.58);
  context.closePath();
  context.fill();
  context.fillStyle = secondary;
  context.beginPath();
  context.moveTo(radius * 2.05, 0);
  context.lineTo(radius * 0.3, radius * 0.16);
  context.lineTo(-radius * 0.2, 0);
  context.lineTo(radius * 0.3, -radius * 0.16);
  context.closePath();
  context.fill();
  context.strokeStyle = accent;
  context.lineWidth = 1.3;
  context.beginPath();
  context.arc(-radius * 0.3, 0, radius * 0.85, 0, Math.PI * 2);
  context.stroke();
  drawCrossFlare(context, radius * 0.78, primary, secondary, glowScale, 2.5);
  context.restore();
}

function drawTidalBody(
  context: CanvasRenderingContext2D,
  radius: number,
  primary: string,
  secondary: string,
  glowScale: number,
  time: number,
  id: number,
): void {
  drawGlowCore(context, radius * 0.88, primary, secondary, glowScale);
  context.save();
  context.globalCompositeOperation = "lighter";
  context.strokeStyle = primary;
  context.shadowColor = primary;
  context.shadowBlur = 16 * glowScale;
  context.lineCap = "round";
  for (let arm = 0; arm < 3; arm += 1) {
    context.lineWidth = 1.6;
    context.globalAlpha = 0.72;
    context.beginPath();
    for (let step = 0; step <= 12; step += 1) {
      const ratio = step / 12;
      const angle =
        time * 3.2 +
        id * 0.2 +
        arm * ((Math.PI * 2) / 3) +
        ratio * Math.PI * 1.5;
      const r = radius * (0.35 + ratio * 1.05);
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r * 0.72;
      if (step === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  }
  context.restore();
}

function drawAuroraBody(
  context: CanvasRenderingContext2D,
  radius: number,
  primary: string,
  secondary: string,
  accent: string,
  glowScale: number,
): void {
  context.save();
  context.globalCompositeOperation = "lighter";
  context.shadowBlur = 22 * glowScale;
  for (let petal = 0; petal < 6; petal += 1) {
    const color = petal % 3 === 0 ? primary : petal % 3 === 1 ? accent : secondary;
    context.save();
    context.rotate((Math.PI * 2 * petal) / 6);
    context.strokeStyle = color;
    context.shadowColor = color;
    context.globalAlpha = 0.78;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, 0);
    context.quadraticCurveTo(
      radius * 0.95,
      radius * 0.55,
      radius * 1.7,
      0,
    );
    context.stroke();
    context.restore();
  }
  context.fillStyle = secondary;
  context.shadowColor = primary;
  context.beginPath();
  context.arc(0, 0, radius * 0.38, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawStyleBody(
  context: CanvasRenderingContext2D,
  styleId: PlayerProjectileStyleId,
  radius: number,
  primary: string,
  secondary: string,
  accent: string,
  glowScale: number,
  time: number,
  id: number,
): void {
  switch (styleId) {
    case "meteor-bolt":
      drawMeteorBody(context, radius, primary, secondary, glowScale);
      return;
    case "crescent-slash":
      drawCrescentBody(context, radius, primary, secondary, glowScale);
      return;
    case "prism-dart":
      drawPrismBody(context, radius, primary, secondary, accent, glowScale);
      return;
    case "nova-pearl":
      drawNovaBody(context, radius, primary, secondary, glowScale, time, id);
      return;
    case "twin-star-shot":
      drawTwinStarBody(context, radius, primary, accent, secondary, glowScale, time, id);
      return;
    case "halo-burst":
      drawHaloBody(context, radius, primary, secondary, accent, glowScale);
      return;
    case "thunder-needle":
      drawThunderBody(context, radius, primary, secondary, glowScale, time, id);
      return;
    case "blossom-comet":
      drawBlossomBody(context, radius, primary, secondary, glowScale, time, id);
      return;
    case "void-spike":
      drawVoidBody(context, radius, primary, secondary, accent, glowScale);
      return;
    case "solar-lance":
      drawSolarBody(context, radius, primary, secondary, accent, glowScale);
      return;
    case "tidal-pearl":
      drawTidalBody(context, radius, primary, secondary, glowScale, time, id);
      return;
    case "aurora-ribbon":
      drawAuroraBody(context, radius, primary, secondary, accent, glowScale);
      return;
  }
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
    (0.94 + Math.min(1.5, shot.power) * 0.12);
  const wakeLength = Math.max(
    110,
    profile.trailLength * (detailScale >= 0.72 ? 1.38 : 1.08),
  );

  context.save();
  context.translate(position.x, position.y);
  context.rotate(position.angle);
  drawStyleWake(
    context,
    profile.styleId,
    wakeLength,
    radius,
    profile.primary,
    profile.secondary,
    profile.accent,
    time,
    shot.id,
  );
  const drewGeneratedArt = drawPlayerProjectileArt(
    context,
    profile.styleId,
    radius,
    profile.primary,
    glowScale,
  );
  if (!drewGeneratedArt) {
    drawStyleBody(
      context,
      profile.styleId,
      radius,
      profile.primary,
      profile.secondary,
      profile.accent,
      glowScale,
      time,
      shot.id,
    );
  }
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
  const radius = profile.muzzleRadius * (1 + (1 - alpha) * 0.8);

  context.save();
  context.translate(flash.x, flash.y);
  context.globalCompositeOperation = "lighter";
  context.globalAlpha = alpha * 0.74;
  context.shadowBlur = 13 * glowScale;
  context.shadowColor = profile.primary;
  context.fillStyle = profile.secondary;
  if (
    profile.styleId === "halo-burst" ||
    profile.styleId === "tidal-pearl"
  ) {
    context.strokeStyle = profile.primary;
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.stroke();
  } else {
    context.rotate(time * 4.6);
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
  const strength = impact.kill ? 1.38 : 0.84;
  const radius = (8 + progress * (impact.kill ? 20 : 11)) * strength;

  context.save();
  context.translate(impact.x, impact.y);
  context.globalCompositeOperation = "lighter";
  context.globalAlpha = alpha * (impact.kill ? 0.82 : 0.62);
  context.shadowColor = profile.primary;
  context.shadowBlur = 13 * glowScale;
  context.strokeStyle = profile.primary;
  context.fillStyle = profile.secondary;
  context.lineWidth = impact.kill ? 2 : 1.3;

  switch (profile.styleId) {
    case "blossom-comet":
      for (let index = 0; index < (impact.kill ? 8 : 5); index += 1) {
        context.save();
        context.rotate((Math.PI * 2 * index) / (impact.kill ? 8 : 5) + time);
        context.beginPath();
        context.ellipse(radius * 0.58, 0, 3.8, 1.6, 0, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
      break;
    case "thunder-needle":
      for (let index = 0; index < (impact.kill ? 8 : 5); index += 1) {
        const angle = (Math.PI * 2 * index) / (impact.kill ? 8 : 5);
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(Math.cos(angle) * radius * 0.52, Math.sin(angle) * radius * 0.52);
        context.lineTo(Math.cos(angle + 0.16) * radius, Math.sin(angle + 0.16) * radius);
        context.stroke();
      }
      break;
    case "void-spike":
      context.globalCompositeOperation = "source-over";
      context.fillStyle = "rgba(8,0,20,0.78)";
      context.beginPath();
      context.arc(0, 0, radius * 0.45, 0, Math.PI * 2);
      context.fill();
      context.globalCompositeOperation = "lighter";
      context.strokeStyle = profile.primary;
      context.beginPath();
      context.arc(0, 0, radius * 0.76, 0, Math.PI * 2);
      context.stroke();
      break;
    case "prism-dart":
      if (detailScale >= 0.7) {
        for (let index = 0; index < (impact.kill ? 7 : 4); index += 1) {
          context.save();
          context.rotate((Math.PI * 2 * index) / (impact.kill ? 7 : 4));
          context.translate(radius * 0.62, 0);
          context.scale(0.72, 0.72);
          drawDiamond(context, 3.6);
          context.restore();
        }
      }
      break;
    case "halo-burst":
      for (let ring = 0; ring < 3; ring += 1) {
        context.globalAlpha = alpha * (0.74 - ring * 0.14);
        context.beginPath();
        context.arc(0, 0, radius * (0.48 + ring * 0.25), 0, Math.PI * 2);
        context.stroke();
      }
      break;
    case "tidal-pearl":
      for (let ring = 0; ring < 2; ring += 1) {
        context.beginPath();
        context.arc(0, 0, radius * (0.5 + ring * 0.28), time * 4 + ring, time * 4 + ring + Math.PI * 1.45);
        context.stroke();
      }
      break;
    case "solar-lance":
      drawCrossFlare(context, radius * 0.72, profile.primary, profile.secondary, glowScale, 2.8);
      break;
    case "twin-star-shot":
      context.save();
      context.translate(-radius * 0.3, -radius * 0.3);
      drawStar(context, radius * 0.34);
      context.translate(radius * 0.6, radius * 0.6);
      drawStar(context, radius * 0.34);
      context.restore();
      break;
    case "aurora-ribbon":
      for (let band = 0; band < 3; band += 1) {
        context.strokeStyle = band === 0 ? profile.primary : band === 1 ? profile.accent : profile.secondary;
        context.beginPath();
        context.arc(0, 0, radius * (0.42 + band * 0.19), 0, Math.PI * 2);
        context.stroke();
      }
      break;
    default:
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.stroke();
      break;
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
  const label = "+" + String(Math.max(0, Math.round(popup.value)));
  context.strokeText(label, popup.x, y);
  context.fillText(label, popup.x, y);
  context.restore();
}
