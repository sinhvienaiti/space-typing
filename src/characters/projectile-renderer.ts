import type { CharacterId } from "./registry";
import {
  playerProjectileProfile,
  projectileHeadGlowProfile,
  projectileTrailProfile,
  type PlayerProjectileStyleId,
  type ProjectileHeadGlowProfile,
  type ProjectileTrailProfile,
} from "./projectiles";
import { drawPlayerProjectileArt } from "./projectile-art";

export const PLAYER_PROJECTILE_BODY_SCALE = 2.55;
export const PLAYER_PROJECTILE_RAY_COUNT = 8;

export const PROJECTILE_TAPER_SEGMENT_COUNT = 3;
export const SCORE_POPUP_PROTECTED_TOP_Y = 148;
export const SCORE_POPUP_FLOAT_DISTANCE = 26;
export const SCORE_POPUP_BOTTOM_MARGIN = 72;

export function scorePopupSafeY(
  requestedY: number,
  canvasHeight: number,
): number {
  const safeMax = Math.max(
    SCORE_POPUP_PROTECTED_TOP_Y,
    canvasHeight - SCORE_POPUP_BOTTOM_MARGIN,
  );
  const safeMin = Math.min(
    safeMax,
    SCORE_POPUP_PROTECTED_TOP_Y + SCORE_POPUP_FLOAT_DISTANCE,
  );
  return Math.max(safeMin, Math.min(safeMax, requestedY));
}

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

function drawHeadHotDiamond(
  context: CanvasRenderingContext2D,
  x: number,
  radius: number,
  profile: Readonly<ProjectileHeadGlowProfile>,
  secondary: string,
  glowScale: number,
  lengthScale = 1.55,
  widthScale = 0.72,
): void {
  const hotRadius = radius * profile.hotCoreScale;
  context.save();
  context.globalCompositeOperation = "lighter";
  context.fillStyle = "#ffffff";
  context.shadowColor = secondary;
  context.shadowBlur = 12 * glowScale;
  context.globalAlpha = profile.hotCoreAlpha;
  context.beginPath();
  context.moveTo(x + hotRadius * lengthScale, 0);
  context.lineTo(x, hotRadius * widthScale);
  context.lineTo(x - hotRadius * lengthScale * 0.72, 0);
  context.lineTo(x, -hotRadius * widthScale);
  context.closePath();
  context.fill();

  context.globalAlpha = profile.hotCoreAlpha * 0.72;
  context.fillStyle = secondary;
  context.shadowBlur = 7 * glowScale;
  context.beginPath();
  context.moveTo(x + hotRadius * lengthScale * 0.82, 0);
  context.lineTo(x, hotRadius * widthScale * 0.42);
  context.lineTo(x - hotRadius * lengthScale * 0.34, 0);
  context.lineTo(x, -hotRadius * widthScale * 0.42);
  context.closePath();
  context.fill();
  context.restore();
}

function drawHeadTrailBlend(
  context: CanvasRenderingContext2D,
  radius: number,
  profile: Readonly<ProjectileHeadGlowProfile>,
  primary: string,
  glowScale: number,
): void {
  const frontX = radius * profile.frontOffset;
  const rearX = frontX - radius * profile.trailBlendLength;
  context.save();
  context.globalCompositeOperation = "lighter";
  context.fillStyle = primary;
  context.shadowColor = primary;
  context.shadowBlur = 14 * profile.bloomSoftness * glowScale;
  context.globalAlpha = profile.bloomAlpha * 0.18;
  context.beginPath();
  context.moveTo(rearX, -radius * 0.13);
  context.quadraticCurveTo(
    frontX - radius * 0.72,
    -radius * 0.42,
    frontX + radius * 0.08,
    0,
  );
  context.quadraticCurveTo(
    frontX - radius * 0.72,
    radius * 0.42,
    rearX,
    radius * 0.13,
  );
  context.closePath();
  context.fill();
  context.restore();
}

function drawDirectionalHeadAura(
  context: CanvasRenderingContext2D,
  radius: number,
  profile: Readonly<ProjectileHeadGlowProfile>,
  primary: string,
  secondary: string,
  accent: string,
  glowScale: number,
  time: number,
  id: number,
): void {
  const frontX = radius * profile.frontOffset;
  const outerLength = radius * profile.directionalAuraLength;
  const outerWidth = radius * profile.directionalAuraWidth;
  const tipX = frontX + outerLength;
  const rearX = frontX - radius * Math.min(1.1, profile.directionalAuraLength * 0.34);
  const coreTipX = frontX + radius * profile.directionalCoreLength;
  const coreWidth = radius * profile.directionalCoreWidth;

  context.save();
  context.globalCompositeOperation = "lighter";

  // Soft rear energy connection so the aura reads as emitted by the generated
  // body instead of being a separate decoration placed in front of it.
  context.fillStyle = primary;
  context.shadowColor = primary;
  context.shadowBlur = 22 * profile.bloomSoftness * glowScale;
  context.globalAlpha = profile.directionalRearAlpha;
  context.beginPath();
  context.moveTo(
    frontX - radius * profile.directionalAuraLength * 0.72,
    -outerWidth * 0.18,
  );
  context.quadraticCurveTo(
    frontX - radius * 0.35,
    -outerWidth * 0.34,
    frontX + radius * 0.18,
    0,
  );
  context.quadraticCurveTo(
    frontX - radius * 0.35,
    outerWidth * 0.34,
    frontX - radius * profile.directionalAuraLength * 0.72,
    outerWidth * 0.18,
  );
  context.closePath();
  context.fill();

  if (profile.family === "aurora") {
    // Two broad filled wisps form a soft arrow-shaped aurora halo. They stay
    // asymmetric and curved so Zenith never falls back to a generic orb.
    for (let band = 0; band < 2; band += 1) {
      const sign = band === 0 ? -1 : 1;
      const color = band === 0 ? primary : accent;
      const phase = time * 3.2 + id * 0.41 + band * 1.9;
      const wave = Math.sin(phase) * outerWidth * 0.08;
      context.fillStyle = color;
      context.shadowColor = color;
      context.shadowBlur = 28 * profile.bloomSoftness * glowScale;
      context.globalAlpha = profile.directionalAuraAlpha * (band === 0 ? 0.92 : 0.72);
      context.beginPath();
      context.moveTo(rearX, sign * outerWidth * 0.22);
      context.bezierCurveTo(
        frontX - outerLength * 0.1,
        sign * outerWidth * 0.72 + wave,
        frontX + outerLength * 0.38,
        -sign * outerWidth * 0.34,
        tipX,
        sign * outerWidth * 0.035,
      );
      context.bezierCurveTo(
        frontX + outerLength * 0.35,
        sign * outerWidth * 0.12,
        frontX - outerLength * 0.18,
        sign * outerWidth * 0.08,
        rearX,
        sign * outerWidth * 0.22,
      );
      context.closePath();
      context.fill();
    }
  } else if (
    profile.family === "orb" ||
    profile.family === "halo" ||
    profile.family === "tidal"
  ) {
    // Round-bodied projectiles retain their authored body silhouette, but the
    // aura itself is still a forward teardrop/arrow rather than another circle.
    context.fillStyle = primary;
    context.shadowColor = primary;
    context.shadowBlur = 28 * profile.bloomSoftness * glowScale;
    context.globalAlpha = profile.directionalAuraAlpha;
    context.beginPath();
    context.moveTo(rearX, -outerWidth * 0.48);
    context.bezierCurveTo(
      frontX + outerLength * 0.08,
      -outerWidth * 0.72,
      frontX + outerLength * 0.46,
      -outerWidth * 0.24,
      tipX,
      0,
    );
    context.bezierCurveTo(
      frontX + outerLength * 0.46,
      outerWidth * 0.24,
      frontX + outerLength * 0.08,
      outerWidth * 0.72,
      rearX,
      outerWidth * 0.48,
    );
    context.quadraticCurveTo(frontX - outerLength * 0.04, 0, rearX, -outerWidth * 0.48);
    context.closePath();
    context.fill();
  } else if (
    profile.family === "crescent" ||
    profile.family === "blossom"
  ) {
    // Curved/slash projectiles use a split arrow halo so the aura follows the
    // silhouette instead of flattening it into a straight spear.
    for (let wing = 0; wing < 2; wing += 1) {
      const sign = wing === 0 ? -1 : 1;
      context.fillStyle = wing === 0 ? primary : accent;
      context.shadowColor = wing === 0 ? primary : accent;
      context.shadowBlur = 24 * profile.bloomSoftness * glowScale;
      context.globalAlpha = profile.directionalAuraAlpha * 0.82;
      context.beginPath();
      context.moveTo(rearX, sign * outerWidth * 0.12);
      context.quadraticCurveTo(
        frontX + outerLength * 0.18,
        sign * outerWidth * 0.72,
        tipX,
        0,
      );
      context.quadraticCurveTo(
        frontX + outerLength * 0.24,
        sign * outerWidth * 0.22,
        rearX,
        sign * outerWidth * 0.12,
      );
      context.closePath();
      context.fill();
    }
  } else {
    // Meteor, Crystal, Star, Needle, Void and Lance all need a clearly
    // directional arrow/lance aura. Layered wedges give a soft halo around the
    // authored shape without constructing a gradient for every shot/frame.
    context.fillStyle = primary;
    context.shadowColor = primary;
    context.shadowBlur = 30 * profile.bloomSoftness * glowScale;
    context.globalAlpha = profile.directionalAuraAlpha;
    context.beginPath();
    context.moveTo(rearX, -outerWidth * 0.54);
    context.lineTo(frontX + outerLength * 0.28, -outerWidth * 0.32);
    context.lineTo(tipX, 0);
    context.lineTo(frontX + outerLength * 0.28, outerWidth * 0.32);
    context.lineTo(rearX, outerWidth * 0.54);
    context.lineTo(frontX - outerLength * 0.18, 0);
    context.closePath();
    context.fill();

    context.fillStyle = accent;
    context.shadowColor = accent;
    context.shadowBlur = 18 * profile.bloomSoftness * glowScale;
    context.globalAlpha = profile.directionalAuraAlpha * 0.38;
    context.beginPath();
    context.moveTo(frontX - outerLength * 0.42, -outerWidth * 0.24);
    context.lineTo(frontX + outerLength * 0.34, -outerWidth * 0.16);
    context.lineTo(tipX - outerLength * 0.04, 0);
    context.lineTo(frontX + outerLength * 0.34, outerWidth * 0.16);
    context.lineTo(frontX - outerLength * 0.42, outerWidth * 0.24);
    context.closePath();
    context.fill();
  }

  // Bright inner arrow is intentionally much narrower than the outer aura.
  // This gives the "dazzling tip -> softer halo -> fading trail" hierarchy.
  context.fillStyle = secondary;
  context.shadowColor = secondary;
  context.shadowBlur = 14 * glowScale;
  context.globalAlpha = profile.directionalCoreAlpha;
  context.beginPath();
  context.moveTo(frontX - radius * 0.34, -coreWidth);
  context.lineTo(
    frontX + radius * profile.directionalCoreLength * 0.34,
    -coreWidth * 0.52,
  );
  context.lineTo(coreTipX, 0);
  context.lineTo(
    frontX + radius * profile.directionalCoreLength * 0.34,
    coreWidth * 0.52,
  );
  context.lineTo(frontX - radius * 0.34, coreWidth);
  context.lineTo(frontX + radius * 0.08, 0);
  context.closePath();
  context.fill();

  // A tiny axial streak and short wing flare make the nose sparkle without
  // introducing the old round blob.
  context.strokeStyle = "#ffffff";
  context.shadowColor = secondary;
  context.shadowBlur = 10 * glowScale;
  context.globalAlpha = profile.directionalTipAlpha;
  context.lineCap = "round";
  context.lineWidth = Math.max(0.9, radius * 0.065);
  context.beginPath();
  context.moveTo(frontX + radius * 0.04, 0);
  context.lineTo(coreTipX + radius * 0.16, 0);
  context.stroke();

  context.globalAlpha = profile.directionalTipAlpha * 0.62;
  context.lineWidth = Math.max(0.7, radius * 0.045);
  context.beginPath();
  context.moveTo(
    coreTipX - radius * 0.12,
    -coreWidth * 1.45,
  );
  context.lineTo(coreTipX + radius * 0.04, 0);
  context.lineTo(
    coreTipX - radius * 0.12,
    coreWidth * 1.45,
  );
  context.stroke();

  context.restore();
}

function drawHeadSparkles(
  context: CanvasRenderingContext2D,
  frontX: number,
  radius: number,
  profile: Readonly<ProjectileHeadGlowProfile>,
  color: string,
  glowScale: number,
  time: number,
  id: number,
  detailScale: number,
): void {
  if (detailScale < 0.68 || profile.sparkleCount <= 0) return;

  context.save();
  context.globalCompositeOperation = "lighter";
  context.strokeStyle = color;
  context.shadowColor = color;
  context.shadowBlur = 6 * glowScale;
  context.lineCap = "round";
  context.lineWidth = Math.max(0.8, radius * 0.055);

  for (let index = 0; index < profile.sparkleCount; index += 1) {
    const angle =
      time * 1.45 +
      id * 0.37 +
      (Math.PI * 2 * index) / Math.max(1, profile.sparkleCount);
    const distance =
      radius * profile.sparkleSpread * (0.62 + (index % 2) * 0.22);
    const x = frontX - radius * 0.32 + Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance * 0.68;
    const size = radius * (0.075 + (index % 2) * 0.025);
    context.globalAlpha = 0.4 + (index % 2) * 0.14;
    context.beginPath();
    context.moveTo(x - size * 1.7, y);
    context.lineTo(x + size * 1.7, y);
    context.moveTo(x, y - size * 1.7);
    context.lineTo(x, y + size * 1.7);
    context.stroke();
  }
  context.restore();
}

function drawMeteorHeadLight(
  context: CanvasRenderingContext2D,
  radius: number,
  profile: Readonly<ProjectileHeadGlowProfile>,
  primary: string,
  secondary: string,
  glowScale: number,
): void {
  const frontX = radius * profile.frontOffset;
  const noseX = frontX + radius * profile.forwardFlareLength * 0.62;
  context.save();
  context.globalCompositeOperation = "lighter";
  context.fillStyle = primary;
  context.shadowColor = primary;
  context.shadowBlur = 25 * profile.bloomSoftness * glowScale;
  context.globalAlpha = profile.bloomAlpha * 0.5;
  context.beginPath();
  context.moveTo(frontX - radius * 1.15, -radius * 0.72);
  context.quadraticCurveTo(frontX + radius * 0.35, -radius * 0.58, noseX, 0);
  context.quadraticCurveTo(frontX + radius * 0.35, radius * 0.58, frontX - radius * 1.15, radius * 0.72);
  context.quadraticCurveTo(frontX - radius * 0.52, 0, frontX - radius * 1.15, -radius * 0.72);
  context.closePath();
  context.fill();
  context.restore();
  drawHeadHotDiamond(context, noseX - radius * 0.12, radius, profile, secondary, glowScale, 1.75, 0.62);
}

function drawCrescentHeadLight(
  context: CanvasRenderingContext2D,
  radius: number,
  profile: Readonly<ProjectileHeadGlowProfile>,
  primary: string,
  secondary: string,
  glowScale: number,
): void {
  const frontX = radius * profile.frontOffset;
  context.save();
  context.globalCompositeOperation = "lighter";
  context.strokeStyle = primary;
  context.shadowColor = primary;
  context.shadowBlur = 19 * profile.bloomSoftness * glowScale;
  context.lineCap = "round";
  context.globalAlpha = profile.bloomAlpha * 0.75;
  context.lineWidth = Math.max(1.3, radius * 0.16);
  context.beginPath();
  context.moveTo(frontX - radius * 0.88, radius * 0.68);
  context.quadraticCurveTo(
    frontX + radius * 0.72,
    0,
    frontX - radius * 0.72,
    -radius * 0.76,
  );
  context.stroke();

  context.strokeStyle = secondary;
  context.globalAlpha = profile.hotCoreAlpha * 0.72;
  context.lineWidth = Math.max(0.9, radius * 0.07);
  context.beginPath();
  context.moveTo(frontX - radius * 0.44, radius * 0.46);
  context.quadraticCurveTo(
    frontX + radius * 0.54,
    0,
    frontX - radius * 0.38,
    -radius * 0.5,
  );
  context.stroke();
  context.restore();
}

function drawCrystalHeadLight(
  context: CanvasRenderingContext2D,
  radius: number,
  profile: Readonly<ProjectileHeadGlowProfile>,
  primary: string,
  secondary: string,
  accent: string,
  glowScale: number,
): void {
  const frontX = radius * profile.frontOffset;
  const noseX = frontX + radius * profile.forwardFlareLength * 0.58;
  context.save();
  context.globalCompositeOperation = "lighter";
  context.shadowColor = primary;
  context.shadowBlur = 18 * profile.bloomSoftness * glowScale;
  context.globalAlpha = profile.bloomAlpha * 0.62;
  context.fillStyle = accent;
  context.beginPath();
  context.moveTo(noseX, 0);
  context.lineTo(frontX + radius * 0.15, radius * 0.7);
  context.lineTo(frontX - radius * 0.78, radius * 0.22);
  context.lineTo(frontX - radius * 0.52, 0);
  context.lineTo(frontX - radius * 0.78, -radius * 0.22);
  context.lineTo(frontX + radius * 0.15, -radius * 0.7);
  context.closePath();
  context.fill();

  context.strokeStyle = secondary;
  context.lineWidth = Math.max(0.9, radius * 0.07);
  context.globalAlpha = 0.82;
  context.beginPath();
  context.moveTo(frontX - radius * 0.5, 0);
  context.lineTo(noseX, 0);
  context.moveTo(frontX + radius * 0.08, -radius * 0.5);
  context.lineTo(frontX + radius * 0.38, 0);
  context.lineTo(frontX + radius * 0.08, radius * 0.5);
  context.stroke();
  context.restore();
  drawHeadHotDiamond(context, noseX - radius * 0.16, radius, profile, secondary, glowScale, 1.45, 0.48);
}

function drawOrbHeadLight(
  context: CanvasRenderingContext2D,
  radius: number,
  profile: Readonly<ProjectileHeadGlowProfile>,
  primary: string,
  secondary: string,
  glowScale: number,
): void {
  const frontX = radius * profile.frontOffset;
  const pulse = 0.96 + Math.sin(frontX * 0.07) * 0.025;
  context.save();
  context.globalCompositeOperation = "lighter";
  context.fillStyle = primary;
  context.shadowColor = primary;
  context.shadowBlur = 27 * profile.bloomSoftness * glowScale;
  context.globalAlpha = profile.bloomAlpha * 0.45;
  context.beginPath();
  context.ellipse(
    frontX,
    0,
    radius * profile.bloomScale * 0.7 * pulse,
    radius * profile.bloomScale * 0.7 * pulse,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.fillStyle = "#ffffff";
  context.shadowColor = secondary;
  context.shadowBlur = 12 * glowScale;
  context.globalAlpha = profile.hotCoreAlpha;
  context.beginPath();
  context.arc(frontX + radius * 0.1, 0, radius * profile.hotCoreScale, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawStarHeadLight(
  context: CanvasRenderingContext2D,
  radius: number,
  profile: Readonly<ProjectileHeadGlowProfile>,
  primary: string,
  secondary: string,
  accent: string,
  glowScale: number,
  time: number,
): void {
  const frontX = radius * profile.frontOffset;
  context.save();
  context.translate(frontX, 0);
  context.globalCompositeOperation = "lighter";
  context.shadowBlur = 19 * profile.bloomSoftness * glowScale;
  context.globalAlpha = profile.bloomAlpha * 0.78;
  context.shadowColor = primary;
  context.fillStyle = primary;
  context.save();
  context.translate(0, -radius * 0.28);
  context.rotate(time * 1.7);
  drawStar(context, radius * 0.78);
  context.restore();

  context.shadowColor = accent;
  context.fillStyle = accent;
  context.save();
  context.translate(-radius * 0.16, radius * 0.34);
  context.rotate(-time * 1.45);
  drawStar(context, radius * 0.62);
  context.restore();

  context.strokeStyle = secondary;
  context.shadowColor = secondary;
  context.globalAlpha = profile.hotCoreAlpha * 0.82;
  context.lineWidth = Math.max(1, radius * 0.08);
  context.beginPath();
  context.moveTo(-radius * 0.5, 0);
  context.lineTo(radius * profile.forwardFlareLength * 0.72, 0);
  context.stroke();
  context.restore();
}

function drawHaloHeadLight(
  context: CanvasRenderingContext2D,
  radius: number,
  profile: Readonly<ProjectileHeadGlowProfile>,
  primary: string,
  secondary: string,
  glowScale: number,
): void {
  const frontX = radius * profile.frontOffset;
  context.save();
  context.globalCompositeOperation = "lighter";
  context.strokeStyle = primary;
  context.shadowColor = primary;
  context.shadowBlur = 20 * profile.bloomSoftness * glowScale;
  context.globalAlpha = profile.frontHaloAlpha * 1.45;
  context.lineWidth = Math.max(1.2, radius * 0.11);
  context.beginPath();
  context.ellipse(frontX, 0, radius * 1.05, radius * 0.56, 0, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = secondary;
  context.shadowColor = secondary;
  context.globalAlpha = profile.hotCoreAlpha * 0.82;
  context.lineWidth = Math.max(1, radius * 0.08);
  context.beginPath();
  context.moveTo(frontX - radius * 0.9, 0);
  context.lineTo(frontX + radius * 1.2, 0);
  context.moveTo(frontX, -radius * 0.82);
  context.lineTo(frontX, radius * 0.82);
  context.stroke();
  context.restore();
  drawHeadHotDiamond(context, frontX + radius * 0.38, radius, profile, secondary, glowScale, 1.05, 0.6);
}

function drawNeedleHeadLight(
  context: CanvasRenderingContext2D,
  radius: number,
  profile: Readonly<ProjectileHeadGlowProfile>,
  primary: string,
  secondary: string,
  glowScale: number,
  time: number,
  id: number,
): void {
  const frontX = radius * profile.frontOffset;
  const tipX = frontX + radius * profile.forwardFlareLength;
  context.save();
  context.globalCompositeOperation = "lighter";
  context.fillStyle = primary;
  context.shadowColor = primary;
  context.shadowBlur = 18 * profile.bloomSoftness * glowScale;
  context.globalAlpha = profile.bloomAlpha * 0.72;
  context.beginPath();
  context.moveTo(frontX - radius * 1.15, -radius * 0.2);
  context.lineTo(tipX, 0);
  context.lineTo(frontX - radius * 1.15, radius * 0.2);
  context.lineTo(frontX - radius * 0.42, 0);
  context.closePath();
  context.fill();

  context.strokeStyle = "#ffffff";
  context.shadowColor = secondary;
  context.shadowBlur = 10 * glowScale;
  context.globalAlpha = profile.hotCoreAlpha;
  context.lineWidth = Math.max(1, radius * 0.08);
  context.beginPath();
  context.moveTo(frontX - radius * 0.5, 0);
  context.lineTo(tipX - radius * 0.08, 0);
  context.stroke();

  context.strokeStyle = secondary;
  context.globalAlpha = 0.48;
  context.lineWidth = Math.max(0.8, radius * 0.05);
  for (let branch = 0; branch < 2; branch += 1) {
    const sign = branch === 0 ? -1 : 1;
    context.beginPath();
    context.moveTo(frontX + radius * 0.1, 0);
    context.lineTo(
      frontX + radius * 0.5,
      sign * radius * (0.22 + Math.sin(time * 12 + id) * 0.05),
    );
    context.lineTo(frontX + radius * 0.86, sign * radius * 0.08);
    context.stroke();
  }
  context.restore();
}

function drawBlossomHeadLight(
  context: CanvasRenderingContext2D,
  radius: number,
  profile: Readonly<ProjectileHeadGlowProfile>,
  primary: string,
  secondary: string,
  glowScale: number,
  time: number,
  id: number,
): void {
  const frontX = radius * profile.frontOffset;
  context.save();
  context.translate(frontX, 0);
  context.rotate(time * 0.55 + id * 0.13);
  context.globalCompositeOperation = "lighter";
  context.fillStyle = primary;
  context.shadowColor = primary;
  context.shadowBlur = 17 * profile.bloomSoftness * glowScale;
  context.globalAlpha = profile.bloomAlpha * 0.7;
  for (let petal = 0; petal < 5; petal += 1) {
    context.save();
    context.rotate((Math.PI * 2 * petal) / 5);
    context.beginPath();
    context.ellipse(radius * 0.48, 0, radius * 0.48, radius * 0.18, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  context.fillStyle = secondary;
  context.shadowColor = secondary;
  context.shadowBlur = 8 * glowScale;
  context.globalAlpha = profile.hotCoreAlpha * 0.82;
  context.beginPath();
  context.arc(0, 0, radius * profile.hotCoreScale * 0.72, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawVoidHeadLight(
  context: CanvasRenderingContext2D,
  radius: number,
  profile: Readonly<ProjectileHeadGlowProfile>,
  primary: string,
  secondary: string,
  accent: string,
  glowScale: number,
): void {
  const frontX = radius * profile.frontOffset;
  const tipX = frontX + radius * profile.forwardFlareLength * 0.72;
  context.save();
  context.globalCompositeOperation = "source-over";
  context.fillStyle = "rgba(5, 0, 18, 0.88)";
  context.shadowColor = primary;
  context.shadowBlur = 18 * profile.bloomSoftness * glowScale;
  context.beginPath();
  context.moveTo(tipX, 0);
  context.lineTo(frontX - radius * 0.85, radius * 0.48);
  context.lineTo(frontX - radius * 0.38, 0);
  context.lineTo(frontX - radius * 0.85, -radius * 0.48);
  context.closePath();
  context.fill();

  context.globalCompositeOperation = "lighter";
  context.strokeStyle = primary;
  context.shadowColor = primary;
  context.globalAlpha = profile.bloomAlpha * 0.9;
  context.lineWidth = Math.max(1, radius * 0.09);
  context.stroke();

  context.strokeStyle = secondary;
  context.shadowColor = accent;
  context.globalAlpha = profile.hotCoreAlpha * 0.52;
  context.beginPath();
  context.moveTo(frontX - radius * 0.22, 0);
  context.lineTo(tipX - radius * 0.12, 0);
  context.stroke();
  context.restore();
}

function drawLanceHeadLight(
  context: CanvasRenderingContext2D,
  radius: number,
  profile: Readonly<ProjectileHeadGlowProfile>,
  primary: string,
  secondary: string,
  accent: string,
  glowScale: number,
): void {
  const frontX = radius * profile.frontOffset;
  const tipX = frontX + radius * profile.forwardFlareLength;
  context.save();
  context.globalCompositeOperation = "lighter";
  context.shadowColor = primary;
  context.shadowBlur = 24 * profile.bloomSoftness * glowScale;
  context.fillStyle = primary;
  context.globalAlpha = profile.bloomAlpha * 0.76;
  context.beginPath();
  context.moveTo(frontX - radius * 1.2, -radius * 0.46);
  context.lineTo(frontX + radius * 0.2, -radius * 0.26);
  context.lineTo(tipX, 0);
  context.lineTo(frontX + radius * 0.2, radius * 0.26);
  context.lineTo(frontX - radius * 1.2, radius * 0.46);
  context.lineTo(frontX - radius * 0.52, 0);
  context.closePath();
  context.fill();

  context.fillStyle = accent;
  context.shadowColor = accent;
  context.globalAlpha = profile.forwardFlareAlpha * 0.56;
  context.beginPath();
  context.moveTo(frontX - radius * 0.35, -radius * 0.17);
  context.lineTo(tipX - radius * 0.08, 0);
  context.lineTo(frontX - radius * 0.35, radius * 0.17);
  context.closePath();
  context.fill();

  context.strokeStyle = "#ffffff";
  context.shadowColor = secondary;
  context.shadowBlur = 11 * glowScale;
  context.globalAlpha = profile.hotCoreAlpha;
  context.lineWidth = Math.max(1.1, radius * 0.09);
  context.beginPath();
  context.moveTo(frontX - radius * 0.38, 0);
  context.lineTo(tipX - radius * 0.1, 0);
  context.stroke();
  context.restore();
}

function drawTidalHeadLight(
  context: CanvasRenderingContext2D,
  radius: number,
  profile: Readonly<ProjectileHeadGlowProfile>,
  primary: string,
  secondary: string,
  glowScale: number,
  time: number,
): void {
  const frontX = radius * profile.frontOffset;
  context.save();
  context.globalCompositeOperation = "lighter";
  context.fillStyle = primary;
  context.shadowColor = primary;
  context.shadowBlur = 22 * profile.bloomSoftness * glowScale;
  context.globalAlpha = profile.bloomAlpha * 0.58;
  context.beginPath();
  context.moveTo(frontX + radius * 0.9, 0);
  context.bezierCurveTo(
    frontX + radius * 0.18,
    -radius * 0.86,
    frontX - radius * 0.86,
    -radius * 0.46,
    frontX - radius * 0.76,
    0,
  );
  context.bezierCurveTo(
    frontX - radius * 0.86,
    radius * 0.46,
    frontX + radius * 0.18,
    radius * 0.86,
    frontX + radius * 0.9,
    0,
  );
  context.fill();

  context.strokeStyle = secondary;
  context.shadowColor = secondary;
  context.globalAlpha = profile.hotCoreAlpha * 0.72;
  context.lineWidth = Math.max(1, radius * 0.08);
  context.beginPath();
  context.arc(
    frontX - radius * 0.08,
    0,
    radius * 0.48,
    -Math.PI * 0.82 + Math.sin(time * 3.6) * 0.08,
    Math.PI * 0.62,
  );
  context.stroke();
  context.restore();
  drawHeadHotDiamond(context, frontX + radius * 0.48, radius, profile, secondary, glowScale, 0.9, 0.5);
}

function drawAuroraHeadLight(
  context: CanvasRenderingContext2D,
  radius: number,
  profile: Readonly<ProjectileHeadGlowProfile>,
  primary: string,
  secondary: string,
  accent: string,
  glowScale: number,
  time: number,
  id: number,
): void {
  const frontX = radius * profile.frontOffset;
  context.save();
  context.globalCompositeOperation = "lighter";
  context.lineCap = "round";
  for (let band = 0; band < 3; band += 1) {
    const color = band === 0 ? primary : band === 1 ? accent : secondary;
    const sign = band - 1;
    context.strokeStyle = color;
    context.shadowColor = color;
    context.shadowBlur = 16 * profile.bloomSoftness * glowScale;
    context.globalAlpha = profile.bloomAlpha * (0.72 - band * 0.08);
    context.lineWidth = Math.max(1.15, radius * (0.11 - band * 0.012));
    context.beginPath();
    context.moveTo(
      frontX - radius * 1.3,
      sign * radius * 0.24,
    );
    context.bezierCurveTo(
      frontX - radius * 0.52,
      sign * radius * 0.6 +
        Math.sin(time * 3.5 + id + band) * radius * 0.08,
      frontX + radius * 0.45,
      -sign * radius * 0.42,
      frontX + radius * (1.15 + band * 0.18),
      sign * radius * 0.09,
    );
    context.stroke();
  }

  // A tiny sharp pin-light replaces the previous large generic round blob.
  const pinX = frontX + radius * 0.82;
  context.strokeStyle = "#ffffff";
  context.shadowColor = secondary;
  context.shadowBlur = 9 * glowScale;
  context.globalAlpha = profile.hotCoreAlpha * 0.9;
  context.lineWidth = Math.max(0.9, radius * 0.065);
  context.beginPath();
  context.moveTo(pinX - radius * 0.34, 0);
  context.lineTo(pinX + radius * 0.46, 0);
  context.moveTo(pinX, -radius * 0.24);
  context.lineTo(pinX, radius * 0.24);
  context.stroke();
  context.restore();
}

function drawProjectileHeadGlow(
  context: CanvasRenderingContext2D,
  styleId: PlayerProjectileStyleId,
  radius: number,
  primary: string,
  secondary: string,
  accent: string,
  glowScale: number,
  detailScale: number,
  time: number,
  id: number,
): void {
  const profile = projectileHeadGlowProfile(styleId);
  const frontX = radius * profile.frontOffset;

  drawHeadTrailBlend(
    context,
    radius,
    profile,
    primary,
    glowScale,
  );
  drawDirectionalHeadAura(
    context,
    radius,
    profile,
    primary,
    secondary,
    accent,
    glowScale,
    time,
    id,
  );

  switch (profile.family) {
    case "meteor":
      drawMeteorHeadLight(context, radius, profile, primary, secondary, glowScale);
      break;
    case "crescent":
      drawCrescentHeadLight(context, radius, profile, primary, secondary, glowScale);
      break;
    case "crystal":
      drawCrystalHeadLight(context, radius, profile, primary, secondary, accent, glowScale);
      break;
    case "orb":
      drawOrbHeadLight(context, radius, profile, primary, secondary, glowScale);
      break;
    case "star":
      drawStarHeadLight(context, radius, profile, primary, secondary, accent, glowScale, time);
      break;
    case "halo":
      drawHaloHeadLight(context, radius, profile, primary, secondary, glowScale);
      break;
    case "needle":
      drawNeedleHeadLight(context, radius, profile, primary, secondary, glowScale, time, id);
      break;
    case "blossom":
      drawBlossomHeadLight(context, radius, profile, primary, secondary, glowScale, time, id);
      break;
    case "void":
      drawVoidHeadLight(context, radius, profile, primary, secondary, accent, glowScale);
      break;
    case "lance":
      drawLanceHeadLight(context, radius, profile, primary, secondary, accent, glowScale);
      break;
    case "tidal":
      drawTidalHeadLight(context, radius, profile, primary, secondary, glowScale, time);
      break;
    case "aurora":
      drawAuroraHeadLight(context, radius, profile, primary, secondary, accent, glowScale, time, id);
      break;
  }

  drawHeadSparkles(
    context,
    frontX,
    radius,
    profile,
    secondary,
    glowScale,
    time,
    id,
    detailScale,
  );
}

function trailWidthRatio(
  profile: ProjectileTrailProfile,
  ratio: number,
): number {
  if (ratio <= 0.5) {
    const t = ratio / 0.5;
    return (
      profile.frontWidthRatio +
      (profile.midWidthRatio - profile.frontWidthRatio) * t
    );
  }
  const t = (ratio - 0.5) / 0.5;
  return (
    profile.midWidthRatio +
    (profile.endWidthRatio - profile.midWidthRatio) * t
  );
}

function trailCenterY(
  profile: ProjectileTrailProfile,
  ratio: number,
  time: number,
  id: number,
  phase: number,
  yOffset: number,
): number {
  if (profile.bend <= 0) return yOffset;
  const envelope = ratio * (1 - ratio * 0.38);
  return (
    yOffset +
    Math.sin(time * 4.1 + id * 0.67 + phase + ratio * 4.8) *
      profile.bend *
      envelope
  );
}

function drawTaperedTrailSegment(
  context: CanvasRenderingContext2D,
  length: number,
  headWidth: number,
  profile: ProjectileTrailProfile,
  startRatio: number,
  endRatio: number,
  widthScale: number,
  alpha: number,
  color: string,
  time: number,
  id: number,
  phase: number,
  yOffset: number,
): void {
  const x0 = -length * startRatio;
  const x1 = -length * endRatio;
  const y0 = trailCenterY(profile, startRatio, time, id, phase, yOffset);
  const y1 = trailCenterY(profile, endRatio, time, id, phase, yOffset);
  const half0 =
    headWidth * trailWidthRatio(profile, startRatio) * widthScale * 0.5;
  const half1 =
    headWidth * trailWidthRatio(profile, endRatio) * widthScale * 0.5;

  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(x0, y0 - half0);
  context.lineTo(x1, y1 - half1);
  context.lineTo(x1, y1 + half1);
  context.lineTo(x0, y0 + half0);
  context.closePath();
  context.fill();
}

function drawTaperedRibbon(
  context: CanvasRenderingContext2D,
  length: number,
  headWidth: number,
  profile: ProjectileTrailProfile,
  primary: string,
  hotColor: string,
  time: number,
  id: number,
  phase: number,
  yOffset: number,
  alphaScale: number,
): void {
  context.save();
  context.globalCompositeOperation = "lighter";
  context.shadowColor = primary;
  context.shadowBlur = Math.max(10, headWidth * 0.68);

  // Back-to-front overlapping sections produce both geometric taper and a
  // strong alpha falloff without allocating a CanvasGradient per shot/frame.
  drawTaperedTrailSegment(
    context,
    length,
    headWidth,
    profile,
    0.66,
    1,
    1,
    profile.outerAlpha * 0.22 * alphaScale,
    primary,
    time,
    id,
    phase,
    yOffset,
  );
  drawTaperedTrailSegment(
    context,
    length,
    headWidth,
    profile,
    0.32,
    0.72,
    1,
    profile.outerAlpha * 0.58 * alphaScale,
    primary,
    time,
    id,
    phase,
    yOffset,
  );
  drawTaperedTrailSegment(
    context,
    length,
    headWidth,
    profile,
    0,
    0.4,
    1,
    profile.outerAlpha * alphaScale,
    primary,
    time,
    id,
    phase,
    yOffset,
  );

  context.shadowColor = hotColor;
  context.shadowBlur = Math.max(5, headWidth * 0.28);
  const coreScale = profile.coreWidthRatio;
  drawTaperedTrailSegment(
    context,
    length * 0.9,
    headWidth,
    profile,
    0.58,
    1,
    coreScale,
    profile.coreAlpha * 0.18 * alphaScale,
    hotColor,
    time,
    id,
    phase,
    yOffset,
  );
  drawTaperedTrailSegment(
    context,
    length * 0.9,
    headWidth,
    profile,
    0.25,
    0.66,
    coreScale,
    profile.coreAlpha * 0.54 * alphaScale,
    hotColor,
    time,
    id,
    phase,
    yOffset,
  );
  drawTaperedTrailSegment(
    context,
    length * 0.9,
    headWidth,
    profile,
    0,
    0.34,
    coreScale,
    profile.coreAlpha * alphaScale,
    hotColor,
    time,
    id,
    phase,
    yOffset,
  );

  // Supporting glow is deliberately concentrated at the projectile front.
  context.globalAlpha = 0.34 * alphaScale;
  context.fillStyle = hotColor;
  context.shadowColor = primary;
  context.shadowBlur = Math.max(12, headWidth * 0.8);
  context.beginPath();
  context.ellipse(
    headWidth * 0.08,
    yOffset,
    headWidth * 0.43,
    headWidth * 0.28,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.restore();
}

function drawConfiguredTaperedWake(
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
  const trail = projectileTrailProfile(styleId);
  const headWidth = radius * 2.15;
  const count = trail.ribbonCount;
  for (let band = 0; band < count; band += 1) {
    const centered = band - (count - 1) * 0.5;
    const yOffset = centered * radius * trail.ribbonSpread;
    const phase = band * 2.1;
    const color =
      band === 0
        ? primary
        : band === 1 && count === 2
          ? accent
          : band === 1
            ? accent
            : secondary;
    const hotColor =
      band === 0 ? secondary : band === 1 ? secondary : accent;
    drawTaperedRibbon(
      context,
      length,
      headWidth,
      trail,
      color,
      hotColor,
      time,
      id,
      phase,
      yOffset,
      band === 0 ? 1 : 0.82,
    );
  }

  context.save();
  context.globalCompositeOperation = "lighter";
  context.fillStyle = secondary;
  context.shadowColor = primary;
  context.shadowBlur = 7;
  for (let index = 0; index < trail.sideStreakCount; index += 1) {
    const ratio = (index + 1) / (trail.sideStreakCount + 1);
    const x = -length * (0.18 + ratio * 0.68);
    const side =
      index % 2 === 0 ? -1 : 1;
    const y =
      side *
      radius *
      (0.58 + ratio * 0.92) +
      Math.sin(time * 6.2 + id + index * 1.7) * radius * 0.32;
    const streakLength = Math.max(7, length * (0.045 + ratio * 0.028));
    const streakHalf = Math.max(0.6, radius * (0.08 + (1 - ratio) * 0.04));
    context.globalAlpha = 0.56 * (1 - ratio * 0.54);
    context.beginPath();
    context.moveTo(x + streakLength * 0.16, y);
    context.lineTo(x - streakLength, y - streakHalf);
    context.lineTo(x - streakLength * 0.82, y + streakHalf);
    context.closePath();
    context.fill();
  }
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
    context.globalAlpha = 0.3 - band * 0.055;
    context.lineWidth = Math.max(1.05, radius * (0.2 - band * 0.025));
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
    context.globalAlpha = 0.44;
    context.lineWidth = Math.max(1.1, radius * 0.14);
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
  context.strokeStyle = "rgba(10, 0, 24, 0.62)";
  context.lineWidth = Math.max(1.2, radius * 0.2);
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
    context.globalAlpha = 0.36 - band * 0.08;
    context.lineWidth = Math.max(1.05, radius * (0.18 - band * 0.025));
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
  for (let index = 0; index < 4; index += 1) {
    const ratio = (index + 1) / 5;
    const x = -length * (0.12 + ratio * 0.48);
    const y =
      Math.sin(time * 4.2 + id * 0.7 + index * 1.8) *
      radius *
      (0.45 + ratio * 0.55);
    const color =
      index % 3 === 0 ? primary : index % 3 === 1 ? accent : secondary;
    const size = radius * (0.12 + (index % 2) * 0.035);
    context.strokeStyle = color;
    context.shadowColor = color;
    context.shadowBlur = 7;
    context.globalAlpha = 0.38 - ratio * 0.12;
    context.lineWidth = Math.max(1, radius * 0.07);
    context.beginPath();
    context.moveTo(x - size * 1.9, y);
    context.lineTo(x + size * 1.9, y);
    context.moveTo(x, y - size * 1.9);
    context.lineTo(x, y + size * 1.9);
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
  drawConfiguredTaperedWake(
    context,
    styleId,
    length,
    radius,
    primary,
    secondary,
    accent,
    time,
    id,
  );
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
  const trail = projectileTrailProfile(profile.styleId);
  const position = shotPosition(shot);
  const radius =
    profile.bodyRadius *
    PLAYER_PROJECTILE_BODY_SCALE *
    trail.headScale *
    (0.94 + Math.min(1.5, shot.power) * 0.12);
  const wakeLength = Math.max(
    132,
    profile.trailLength *
      trail.lengthScale *
      (detailScale >= 0.72 ? 1 : 0.9),
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
  drawProjectileHeadGlow(
    context,
    profile.styleId,
    radius,
    profile.primary,
    profile.secondary,
    profile.accent,
    glowScale,
    detailScale,
    time,
    shot.id,
  );
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
  const y = popup.y - progress * SCORE_POPUP_FLOAT_DISTANCE;

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
