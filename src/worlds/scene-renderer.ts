import type { VisualQuality } from "../types";
import type { WorldEnvironmentProfile } from "./environment";
import { sceneQualityBudget } from "./scene-registry";
import type { WorldSceneProfile } from "./scene-types";

export type WorldSceneStar = {
  x: number;
  y: number;
  z: number;
};

export type WorldSceneDrawInput = {
  profile: WorldSceneProfile;
  environment: WorldEnvironmentProfile;
  quality: VisualQuality;
  width: number;
  height: number;
  dpr: number;
  time: number;
  stars: readonly WorldSceneStar[];
};

const TAU = Math.PI * 2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function seededUnit(seed: number, index: number, salt = 0): number {
  let value =
    seed ^
    Math.imul(index + 1, 0x9e3779b1) ^
    Math.imul(salt + 1, 0x85ebca6b);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return (value >>> 0) / 0xffffffff;
}

function rgba(rgb: string, alpha: number): string {
  return "rgba(" + rgb + ", " + String(clamp(alpha, 0, 1)) + ")";
}

export function worldSceneCacheKey(
  profile: WorldSceneProfile,
  width: number,
  height: number,
  dpr: number,
  quality: VisualQuality,
): string {
  return [
    profile.id,
    Math.max(1, Math.round(width)),
    Math.max(1, Math.round(height)),
    Math.round(Math.max(0.5, dpr) * 20) / 20,
    quality,
  ].join(":");
}

function drawNebulaGlow(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number,
): void {
  const gradient = context.createRadialGradient(
    x,
    y,
    0,
    x,
    y,
    radius,
  );
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.45, color);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, TAU);
  context.fill();
  context.restore();
}

function drawBaseSky(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, environment, profile, quality } = input;
  const budget = sceneQualityBudget(quality);
  const gradient = context.createRadialGradient(
    width * 0.5,
    height * 0.68,
    Math.min(width, height) * 0.05,
    width * 0.5,
    height * 0.44,
    Math.max(width, height) * 0.9,
  );
  gradient.addColorStop(0, environment.backgroundCore);
  gradient.addColorStop(0.48, environment.backgroundMid);
  gradient.addColorStop(1, environment.backgroundEdge);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  for (let index = 0; index < budget.farDetails; index += 1) {
    const x = width * (0.08 + seededUnit(profile.seed, index, 1) * 0.84);
    const y = height * (0.08 + seededUnit(profile.seed, index, 2) * 0.48);
    const radius =
      Math.min(width, height) *
      (0.2 + seededUnit(profile.seed, index, 3) * 0.3);
    drawNebulaGlow(
      context,
      x,
      y,
      radius,
      rgba(environment.hazeRgb, 0.42),
      0.045 + index * 0.012,
    );
  }
}

function drawCelestialLandmarks(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, profile, environment } = input;
  const horizon = height * profile.horizonRatio;
  const centerX = width * (0.48 + (profile.variant - 3) * 0.025);

  context.save();
  context.strokeStyle = rgba(environment.gridRgb, 0.22);
  context.fillStyle = rgba(environment.hazeRgb, 0.08);
  context.lineWidth = 2;

  const ringCount = 2 + (profile.variant % 3);
  for (let index = 0; index < ringCount; index += 1) {
    context.globalAlpha = 0.5 - index * 0.08;
    context.beginPath();
    context.ellipse(
      centerX,
      horizon * (0.9 + index * 0.18),
      width * (0.09 + index * 0.035),
      height * (0.025 + index * 0.012),
      index * 0.12,
      0,
      TAU,
    );
    context.stroke();
  }

  context.globalAlpha = 0.34;
  const pillarCount = 3 + profile.variant;
  for (let index = 0; index < pillarCount; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const step = Math.floor(index / 2) + 1;
    const x = centerX + side * width * (0.12 + step * 0.095);
    const h = height * (0.12 + seededUnit(profile.seed, index, 15) * 0.14);
    context.fillRect(x - width * 0.009, horizon - h, width * 0.018, h);
    context.beginPath();
    context.ellipse(x, horizon - h, width * 0.035, height * 0.01, 0, 0, TAU);
    context.stroke();
  }

  context.globalAlpha = 0.16;
  for (let index = 0; index < 5; index += 1) {
    const x = width * (0.08 + index * 0.22);
    const y = horizon * (0.8 + (index % 2) * 0.16);
    context.beginPath();
    context.ellipse(
      x,
      y,
      width * 0.09,
      height * 0.025,
      0,
      0,
      TAU,
    );
    context.fill();
  }
  context.restore();
}

function drawInfernalLandmarks(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, profile, environment } = input;
  const horizon = height * profile.horizonRatio;

  drawNebulaGlow(
    context,
    width * 0.5,
    horizon * 1.3,
    width * 0.55,
    rgba(environment.gridRgb, 0.62),
    0.18,
  );

  context.save();
  context.fillStyle = rgba(environment.gridRgb, 0.12);
  context.strokeStyle = rgba(environment.starRgb, 0.18);
  const count = 7 + profile.variant;
  for (let index = 0; index < count; index += 1) {
    const x = width * (index / Math.max(1, count - 1));
    const heightScale =
      0.08 + seededUnit(profile.seed, index, 30) * 0.18;
    context.beginPath();
    context.moveTo(x - width * 0.045, horizon);
    context.lineTo(x, horizon - height * heightScale);
    context.lineTo(x + width * 0.045, horizon);
    context.closePath();
    context.fill();
  }

  const fortressWidth = width * (0.16 + profile.variant * 0.012);
  const fortressX = width * 0.5 - fortressWidth / 2;
  context.globalAlpha = 0.42;
  context.fillRect(
    fortressX,
    horizon - height * 0.13,
    fortressWidth,
    height * 0.13,
  );
  for (const side of [-1, 1]) {
    const x = width * 0.5 + side * fortressWidth * 0.42;
    context.beginPath();
    context.moveTo(x - width * 0.018, horizon - height * 0.13);
    context.lineTo(x, horizon - height * (0.22 + profile.variant * 0.008));
    context.lineTo(x + width * 0.018, horizon - height * 0.13);
    context.closePath();
    context.fill();
  }
  context.restore();
}

function drawFrostLandmarks(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, profile, environment } = input;
  const horizon = height * profile.horizonRatio;

  context.save();
  context.strokeStyle = rgba(environment.starRgb, 0.19);
  context.lineWidth = 2;
  for (let band = 0; band < 3; band += 1) {
    context.beginPath();
    const yBase = height * (0.08 + band * 0.045);
    context.moveTo(-width * 0.05, yBase);
    for (let step = 0; step <= 7; step += 1) {
      const x = width * (step / 7);
      const y =
        yBase +
        Math.sin(step * 0.9 + profile.variant * 0.6 + band) *
          height *
          0.018;
      context.lineTo(x, y);
    }
    context.stroke();
  }

  context.fillStyle = rgba(environment.hazeRgb, 0.13);
  const count = 6 + profile.variant;
  for (let index = 0; index < count; index += 1) {
    const x = width * (0.03 + (index / Math.max(1, count - 1)) * 0.94);
    const spireH =
      height * (0.08 + seededUnit(profile.seed, index, 42) * 0.17);
    const half = width * (0.014 + seededUnit(profile.seed, index, 43) * 0.018);
    context.beginPath();
    context.moveTo(x - half, horizon);
    context.lineTo(x, horizon - spireH);
    context.lineTo(x + half, horizon);
    context.closePath();
    context.fill();
  }
  context.restore();
}

function drawVerdantLandmarks(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, profile, environment } = input;
  const horizon = height * profile.horizonRatio;

  context.save();
  context.fillStyle = rgba(environment.hazeRgb, 0.1);
  context.strokeStyle = rgba(environment.gridRgb, 0.16);
  context.lineWidth = Math.max(2, width * 0.003);

  const treeCount = 4 + profile.variant;
  for (let index = 0; index < treeCount; index += 1) {
    const x = width * (0.04 + (index / Math.max(1, treeCount - 1)) * 0.92);
    const trunkH =
      height * (0.08 + seededUnit(profile.seed, index, 55) * 0.12);
    context.beginPath();
    context.moveTo(x, horizon);
    context.quadraticCurveTo(
      x + (index % 2 === 0 ? -1 : 1) * width * 0.018,
      horizon - trunkH * 0.55,
      x,
      horizon - trunkH,
    );
    context.stroke();

    context.beginPath();
    context.arc(
      x,
      horizon - trunkH,
      width * (0.025 + seededUnit(profile.seed, index, 56) * 0.028),
      0,
      TAU,
    );
    context.fill();
  }

  context.globalAlpha = 0.24;
  context.beginPath();
  context.ellipse(
    width * 0.5,
    horizon * 0.75,
    width * (0.12 + profile.variant * 0.006),
    height * 0.035,
    0,
    0,
    TAU,
  );
  context.stroke();
  context.restore();
}

function drawShadowLandmarks(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, profile, environment } = input;
  const horizon = height * profile.horizonRatio;

  drawNebulaGlow(
    context,
    width * (0.52 + (profile.variant - 3) * 0.025),
    height * 0.14,
    Math.min(width, height) * 0.22,
    rgba(environment.gridRgb, 0.45),
    0.13,
  );

  context.save();
  context.fillStyle = "rgba(0, 0, 0, 0.58)";
  context.beginPath();
  context.arc(
    width * (0.52 + (profile.variant - 3) * 0.025),
    height * 0.14,
    Math.min(width, height) * 0.075,
    0,
    TAU,
  );
  context.fill();

  context.fillStyle = rgba(environment.hazeRgb, 0.095);
  const count = 5 + profile.variant;
  for (let index = 0; index < count; index += 1) {
    const x = width * (0.04 + index / Math.max(1, count - 1) * 0.92);
    const h = height * (0.06 + seededUnit(profile.seed, index, 71) * 0.16);
    context.beginPath();
    context.moveTo(x - width * 0.012, horizon);
    context.lineTo(x - width * 0.006, horizon - h * 0.68);
    context.lineTo(x, horizon - h);
    context.lineTo(x + width * 0.008, horizon - h * 0.48);
    context.lineTo(x + width * 0.014, horizon);
    context.closePath();
    context.fill();
  }
  context.restore();
}

function drawForgeLandmarks(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, profile, environment } = input;
  const horizon = height * profile.horizonRatio;
  const centerX = width * 0.5;

  context.save();
  context.strokeStyle = rgba(environment.gridRgb, 0.22);
  context.fillStyle = rgba(environment.hazeRgb, 0.08);
  context.lineWidth = 2;

  for (let index = 0; index < 2 + (profile.variant % 2); index += 1) {
    context.beginPath();
    context.ellipse(
      centerX,
      horizon * (0.8 + index * 0.18),
      width * (0.1 + index * 0.045),
      height * (0.032 + index * 0.01),
      index * 0.18,
      0,
      TAU,
    );
    context.stroke();
  }

  const towers = 5 + profile.variant;
  for (let index = 0; index < towers; index += 1) {
    const x = width * (0.04 + index / Math.max(1, towers - 1) * 0.92);
    const towerH =
      height * (0.06 + seededUnit(profile.seed, index, 84) * 0.15);
    const towerW =
      width * (0.012 + seededUnit(profile.seed, index, 85) * 0.012);
    context.fillRect(x - towerW / 2, horizon - towerH, towerW, towerH);
    context.strokeRect(
      x - towerW * 0.75,
      horizon - towerH * 0.7,
      towerW * 1.5,
      towerH * 0.2,
    );
  }
  context.restore();
}

function drawAbyssLandmarks(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, profile, environment } = input;
  const horizon = height * profile.horizonRatio;
  const coreX = width * (0.5 + (profile.variant - 3) * 0.018);

  drawNebulaGlow(
    context,
    coreX,
    height * 0.16,
    Math.min(width, height) * 0.22,
    rgba(environment.gridRgb, 0.48),
    0.12,
  );

  context.save();
  context.fillStyle = "rgba(0, 0, 0, 0.7)";
  context.strokeStyle = rgba(environment.starRgb, 0.14);
  context.lineWidth = 2;
  context.beginPath();
  context.arc(coreX, height * 0.16, Math.min(width, height) * 0.06, 0, TAU);
  context.fill();
  context.stroke();

  context.fillStyle = rgba(environment.hazeRgb, 0.085);
  const columns = 4 + profile.variant;
  for (let index = 0; index < columns; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const step = Math.floor(index / 2) + 1;
    const x = width * 0.5 + side * width * (0.12 + step * 0.1);
    const h = height * (0.08 + seededUnit(profile.seed, index, 97) * 0.11);
    context.save();
    context.translate(x, horizon);
    context.rotate((seededUnit(profile.seed, index, 98) - 0.5) * 0.16);
    context.fillRect(-width * 0.011, -h, width * 0.022, h);
    context.restore();
  }
  context.restore();
}

function drawAuroraCosmicLandmarks(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, profile, environment } = input;
  const horizon = height * profile.horizonRatio;

  context.save();
  context.strokeStyle = rgba(environment.starRgb, 0.2);
  context.lineWidth = 2.4;
  for (let band = 0; band < 3; band += 1) {
    context.beginPath();
    for (let step = 0; step <= 10; step += 1) {
      const x = width * (step / 10);
      const y =
        height * (0.06 + band * 0.04) +
        Math.sin(step * 0.72 + band + profile.variant * 0.4) *
          height *
          0.022;
      if (step === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  }

  context.fillStyle = rgba(environment.hazeRgb, 0.12);
  const rocks = 4 + profile.variant;
  for (let index = 0; index < rocks; index += 1) {
    const x = width * (0.08 + seededUnit(profile.seed, index, 111) * 0.84);
    const y = height * (0.1 + seededUnit(profile.seed, index, 112) * 0.17);
    const radius =
      Math.min(width, height) *
      (0.012 + seededUnit(profile.seed, index, 113) * 0.025);
    context.save();
    context.translate(x, y);
    context.rotate(seededUnit(profile.seed, index, 114) * Math.PI);
    context.beginPath();
    context.moveTo(-radius, 0);
    context.lineTo(-radius * 0.25, -radius * 0.75);
    context.lineTo(radius * 0.8, -radius * 0.3);
    context.lineTo(radius * 0.65, radius * 0.65);
    context.closePath();
    context.fill();
    context.restore();
  }

  context.globalAlpha = 0.18;
  context.fillRect(0, horizon, width, 2);
  context.restore();
}

function drawCathedralLandmarks(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, profile, environment } = input;
  const horizon = height * profile.horizonRatio;

  context.save();
  context.strokeStyle = rgba(environment.starRgb, 0.18);
  context.fillStyle = rgba(environment.hazeRgb, 0.09);
  context.lineWidth = 2;

  const columns = 3 + profile.variant;
  for (let index = 0; index < columns; index += 1) {
    for (const side of [-1, 1]) {
      const x =
        width * 0.5 +
        side * width * (0.12 + index * (0.055 + profile.variant * 0.0015));
      const h = height * (0.11 + index * 0.008);
      context.fillRect(x - width * 0.008, horizon - h, width * 0.016, h);
    }
  }

  const archW = width * (0.16 + profile.variant * 0.012);
  const archH = height * (0.11 + profile.variant * 0.006);
  context.beginPath();
  context.ellipse(
    width * 0.5,
    horizon - archH * 0.15,
    archW,
    archH,
    0,
    Math.PI,
    TAU,
  );
  context.stroke();

  drawNebulaGlow(
    context,
    width * 0.5,
    horizon * 0.72,
    width * 0.18,
    rgba(environment.gridRgb, 0.38),
    0.08 + profile.variant * 0.01,
  );
  context.restore();
}

function drawEternityLandmarks(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, profile, environment } = input;
  const horizon = height * profile.horizonRatio;

  context.save();
  context.strokeStyle = rgba(environment.starRgb, 0.23);
  context.fillStyle = rgba(environment.hazeRgb, 0.09);
  context.lineWidth = 2;

  for (let index = 0; index < 3; index += 1) {
    context.beginPath();
    context.ellipse(
      width * 0.5,
      height * (0.12 + index * 0.018),
      width * (0.1 + index * 0.05 + profile.variant * 0.006),
      height * (0.025 + index * 0.01),
      index * 0.34,
      0,
      TAU,
    );
    context.stroke();
  }

  const crownCount = 5 + profile.variant;
  for (let index = 0; index < crownCount; index += 1) {
    const x =
      width * 0.5 +
      (index - (crownCount - 1) / 2) * width * 0.055;
    const h =
      height *
      (0.06 +
        (1 - Math.abs(index - (crownCount - 1) / 2) / crownCount) * 0.1);
    context.beginPath();
    context.moveTo(x - width * 0.016, horizon);
    context.lineTo(x, horizon - h);
    context.lineTo(x + width * 0.016, horizon);
    context.closePath();
    context.fill();
  }
  context.restore();
}

function drawStaticLandmarks(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const archetype = input.profile.archetype;
  if (archetype === "celestial-rainbow") {
    drawCelestialLandmarks(context, input);
  } else if (archetype === "infernal") {
    drawInfernalLandmarks(context, input);
  } else if (archetype === "frost-prism") {
    drawFrostLandmarks(context, input);
  } else if (archetype === "verdant") {
    drawVerdantLandmarks(context, input);
  } else if (archetype === "shadow-nature") {
    drawShadowLandmarks(context, input);
  } else if (archetype === "cosmic-forge") {
    drawForgeLandmarks(context, input);
  } else if (archetype === "abyssal") {
    drawAbyssLandmarks(context, input);
  } else if (archetype === "aurora-cosmic") {
    drawAuroraCosmicLandmarks(context, input);
  } else if (archetype === "void-cathedral") {
    drawCathedralLandmarks(context, input);
  } else {
    drawEternityLandmarks(context, input);
  }
}

function drawStaticScene(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  drawBaseSky(context, input);
  drawStaticLandmarks(context, input);

  context.save();
  context.fillStyle = rgba(
    input.environment.hazeRgb,
    input.environment.hazeIntensity * 0.72,
  );
  context.fillRect(0, 0, input.width, input.height);
  context.restore();
}

function drawStars(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, time, stars, environment } = input;
  context.save();
  for (const star of stars) {
    const y =
      ((star.y +
        time * 0.016 * environment.starDrift * star.z) %
        1) *
      height;
    context.fillStyle = rgba(
      environment.starRgb,
      0.11 + star.z * 0.42,
    );
    const size = Math.max(0.8, star.z * 1.65);
    context.fillRect(star.x * width, y, size, size);
  }
  context.restore();
}

function particleMotionScale(profile: WorldSceneProfile): number {
  if (profile.motion === "calm") return 0.55;
  if (profile.motion === "floating") return 0.82;
  if (profile.motion === "heavy") return 1.05;
  return 1.35;
}

function drawAmbientParticles(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, time, profile, environment, quality } = input;
  const count = sceneQualityBudget(quality).ambientParticles;
  const speed = particleMotionScale(profile);
  const archetype = profile.archetype;

  context.save();
  context.lineCap = "round";

  for (let index = 0; index < count; index += 1) {
    const baseX = seededUnit(profile.seed, index, 130);
    const baseY = seededUnit(profile.seed, index, 131);
    const drift = seededUnit(profile.seed, index, 132) - 0.5;
    const phase = seededUnit(profile.seed, index, 133) * TAU;
    const depth = 0.35 + seededUnit(profile.seed, index, 134) * 0.65;
    const t = time * speed * (0.025 + depth * 0.035);
    const x =
      ((baseX + drift * t + Math.sin(time * 0.35 + phase) * 0.008) % 1 + 1) % 1;
    const y = ((baseY + t) % 1 + 1) % 1;
    const px = x * width;
    const py = y * height;
    const size = 1 + depth * 2.6;
    const alpha = 0.12 + depth * 0.24;

    if (archetype === "infernal") {
      context.strokeStyle = rgba(environment.starRgb, alpha + 0.08);
      context.lineWidth = size * 0.7;
      context.beginPath();
      context.moveTo(px, py);
      context.lineTo(px - drift * 10, py + 5 + size * 2);
      context.stroke();
    } else if (archetype === "frost-prism") {
      context.fillStyle = rgba(environment.starRgb, alpha);
      context.beginPath();
      context.arc(px, py, size * 0.55, 0, TAU);
      context.fill();
    } else if (archetype === "verdant") {
      context.fillStyle = rgba(environment.gridRgb, alpha);
      context.beginPath();
      context.ellipse(px, py, size, size * 0.45, phase, 0, TAU);
      context.fill();
    } else if (
      archetype === "shadow-nature" ||
      archetype === "abyssal"
    ) {
      context.fillStyle = rgba(environment.hazeRgb, alpha * 0.75);
      context.save();
      context.translate(px, py);
      context.rotate(phase + time * 0.08);
      context.fillRect(-size, -size * 0.25, size * 2, size * 0.5);
      context.restore();
    } else if (archetype === "cosmic-forge") {
      context.strokeStyle = rgba(environment.gridRgb, alpha + 0.04);
      context.lineWidth = Math.max(1, size * 0.45);
      context.beginPath();
      context.moveTo(px - size * 1.5, py);
      context.lineTo(px + size * 1.5, py);
      context.stroke();
    } else if (archetype === "aurora-cosmic") {
      context.strokeStyle = rgba(environment.starRgb, alpha + 0.05);
      context.lineWidth = Math.max(1, size * 0.45);
      context.beginPath();
      context.moveTo(px - size * 4, py - size * 1.4);
      context.lineTo(px + size * 2, py + size * 0.7);
      context.stroke();
    } else if (archetype === "void-cathedral") {
      context.fillStyle = rgba(environment.starRgb, alpha * 0.7);
      context.beginPath();
      context.arc(px, py, size * 0.42, 0, TAU);
      context.fill();
    } else if (archetype === "eternity") {
      context.strokeStyle = rgba(environment.starRgb, alpha + 0.04);
      context.lineWidth = Math.max(1, size * 0.35);
      context.beginPath();
      context.moveTo(px - size, py);
      context.lineTo(px, py - size);
      context.lineTo(px + size, py);
      context.lineTo(px, py + size);
      context.closePath();
      context.stroke();
    } else {
      context.strokeStyle = rgba(environment.starRgb, alpha);
      context.lineWidth = Math.max(1, size * 0.32);
      context.beginPath();
      context.moveTo(px, py - size * 1.4);
      context.quadraticCurveTo(
        px + size,
        py,
        px - size * 0.35,
        py + size * 1.5,
      );
      context.stroke();
    }
  }

  context.restore();
}

function perspectiveY(
  horizon: number,
  height: number,
  step: number,
  offset: number,
  spacing: number,
): number {
  const raw = horizon + ((step * spacing + offset) % Math.max(1, height - horizon));
  const normalized = (raw - horizon) / Math.max(1, height - horizon);
  return horizon + normalized * normalized * (height - horizon);
}

function drawCelestialFloor(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, time, profile, environment } = input;
  const horizon = height * profile.horizonRatio;
  context.save();
  context.strokeStyle = rgba(environment.gridRgb, 0.09);
  context.lineWidth = 1.2;
  const offset = (time * 26) % 60;
  for (let index = 0; index < 9; index += 1) {
    const y = perspectiveY(horizon, height, index, offset, 72);
    const p = (y - horizon) / Math.max(1, height - horizon);
    context.beginPath();
    context.ellipse(
      width * 0.5,
      y,
      width * (0.08 + p * 0.62),
      height * (0.008 + p * 0.025),
      0,
      0,
      TAU,
    );
    context.stroke();
  }
  for (const side of [-1, 1]) {
    context.beginPath();
    context.moveTo(width * 0.5 + side * width * 0.035, horizon);
    context.lineTo(width * 0.5 + side * width * 0.38, height);
    context.stroke();
  }
  context.restore();
}

function drawInfernalFloor(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, time, profile, environment } = input;
  const horizon = height * profile.horizonRatio;
  context.save();
  context.strokeStyle = rgba(environment.gridRgb, 0.13);
  context.shadowBlur = 5;
  context.shadowColor = rgba(environment.gridRgb, 0.3);
  context.lineWidth = 1.25;
  for (let index = 0; index < 8; index += 1) {
    const baseX = width * (0.08 + seededUnit(profile.seed, index, 150) * 0.84);
    context.beginPath();
    context.moveTo(baseX, height);
    for (let step = 1; step <= 6; step += 1) {
      const t = step / 6;
      const x =
        baseX +
        Math.sin(index * 2.4 + step * 1.7 + time * 0.18) *
          width *
          0.018 *
          (1 - t);
      const y = height - (height - horizon) * t;
      context.lineTo(x, y);
    }
    context.stroke();
  }
  context.restore();
}

function drawFrostFloor(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, time, profile, environment } = input;
  const horizon = height * profile.horizonRatio;
  context.save();
  context.strokeStyle = rgba(environment.gridRgb, 0.08);
  context.lineWidth = 1;
  const offset = (time * 18) % 80;
  for (let index = 0; index < 7; index += 1) {
    const y = perspectiveY(horizon, height, index, offset, 92);
    context.beginPath();
    context.moveTo(width * 0.08, y);
    for (let step = 1; step <= 6; step += 1) {
      const x = width * (0.08 + step * 0.14);
      context.lineTo(
        x,
        y + Math.sin(step * 2 + index + profile.variant) * 4,
      );
    }
    context.stroke();
  }
  context.restore();
}

function drawVerdantFloor(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, profile, environment, time } = input;
  const horizon = height * profile.horizonRatio;
  context.save();
  context.strokeStyle = rgba(environment.gridRgb, 0.11);
  context.lineWidth = 1.6;
  for (let root = 0; root < 7; root += 1) {
    const startX = width * (0.08 + root * 0.14);
    context.beginPath();
    context.moveTo(startX, height);
    context.bezierCurveTo(
      startX + Math.sin(root + time * 0.12) * width * 0.03,
      height * 0.7,
      width * 0.5 + (root - 3) * width * 0.012,
      height * 0.4,
      width * 0.5,
      horizon,
    );
    context.stroke();
  }
  context.restore();
}

function drawShadowFloor(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, profile, environment, time } = input;
  const horizon = height * profile.horizonRatio;
  context.save();
  context.strokeStyle = rgba(environment.gridRgb, 0.085);
  context.setLineDash([8, 12]);
  context.lineDashOffset = -time * 18;
  context.lineWidth = 1.2;
  for (const side of [-1, 1]) {
    context.beginPath();
    context.moveTo(width * 0.5 + side * width * 0.03, horizon);
    context.quadraticCurveTo(
      width * 0.5 + side * width * 0.14,
      height * 0.55,
      width * 0.5 + side * width * 0.36,
      height,
    );
    context.stroke();
  }
  context.beginPath();
  context.moveTo(width * 0.5, horizon);
  for (let step = 1; step <= 9; step += 1) {
    const t = step / 9;
    context.lineTo(
      width * 0.5 +
        Math.sin(step * 2.1 + profile.variant) * width * 0.018 * t,
      horizon + (height - horizon) * t,
    );
  }
  context.stroke();
  context.restore();
}

function drawForgeFloor(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, time, profile, environment } = input;
  const horizon = height * profile.horizonRatio;
  context.save();
  context.strokeStyle = rgba(environment.gridRgb, 0.1);
  context.lineWidth = 1.1;
  const offset = (time * 36) % 54;
  for (let index = 0; index < 11; index += 1) {
    const y = perspectiveY(horizon, height, index, offset, 58);
    const p = (y - horizon) / Math.max(1, height - horizon);
    const half = width * (0.055 + p * 0.38);
    context.strokeRect(
      width * 0.5 - half,
      y,
      half * 2,
      Math.max(2, p * 18),
    );
  }
  for (const side of [-1, 1]) {
    context.beginPath();
    context.moveTo(width * 0.5 + side * width * 0.045, horizon);
    context.lineTo(width * 0.5 + side * width * 0.42, height);
    context.stroke();
  }
  context.restore();
}

function drawAbyssFloor(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, time, profile, environment } = input;
  const horizon = height * profile.horizonRatio;
  context.save();
  context.fillStyle = "rgba(0, 0, 0, 0.18)";
  context.beginPath();
  context.moveTo(width * 0.46, horizon);
  context.lineTo(width * 0.28, height);
  context.lineTo(width * 0.72, height);
  context.lineTo(width * 0.54, horizon);
  context.closePath();
  context.fill();

  context.strokeStyle = rgba(environment.gridRgb, 0.075);
  context.lineWidth = 1;
  context.setLineDash([5, 9]);
  context.lineDashOffset = -time * 9;
  for (const side of [-1, 1]) {
    context.beginPath();
    context.moveTo(width * 0.5 + side * width * 0.04, horizon);
    context.lineTo(width * 0.5 + side * width * 0.22, height);
    context.stroke();
  }
  context.restore();
}

function drawAuroraFloor(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, time, profile, environment } = input;
  const horizon = height * profile.horizonRatio;
  context.save();
  context.strokeStyle = rgba(environment.gridRgb, 0.085);
  context.lineWidth = 1.1;
  const offset = (time * 44) % 70;
  for (let index = 0; index < 8; index += 1) {
    const y = perspectiveY(horizon, height, index, offset, 82);
    const p = (y - horizon) / Math.max(1, height - horizon);
    context.beginPath();
    context.moveTo(width * (0.5 - 0.08 - p * 0.34), y);
    context.lineTo(width * (0.5 + 0.08 + p * 0.34), y);
    context.stroke();
  }
  for (let index = 0; index < 5; index += 1) {
    const x = width * (0.16 + index * 0.17);
    context.beginPath();
    context.moveTo(x, height);
    context.lineTo(width * 0.5 + (index - 2) * width * 0.018, horizon);
    context.stroke();
  }
  context.restore();
}

function drawCathedralFloor(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, time, profile, environment } = input;
  const horizon = height * profile.horizonRatio;
  context.save();
  context.fillStyle = rgba(environment.hazeRgb, 0.025);
  context.beginPath();
  context.moveTo(width * 0.46, horizon);
  context.lineTo(width * 0.25, height);
  context.lineTo(width * 0.75, height);
  context.lineTo(width * 0.54, horizon);
  context.closePath();
  context.fill();

  context.strokeStyle = rgba(environment.gridRgb, 0.075);
  context.lineWidth = 1;
  const offset = (time * 22) % 66;
  for (let index = 0; index < 9; index += 1) {
    const y = perspectiveY(horizon, height, index, offset, 72);
    const p = (y - horizon) / Math.max(1, height - horizon);
    const half = width * (0.035 + p * 0.22);
    context.beginPath();
    context.moveTo(width * 0.5 - half, y);
    context.lineTo(width * 0.5 + half, y);
    context.stroke();
  }
  context.restore();
}

function drawEternityFloor(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, time, profile, environment } = input;
  const horizon = height * profile.horizonRatio;
  context.save();
  context.strokeStyle = rgba(environment.gridRgb, 0.095);
  context.lineWidth = 1.2;
  const centerX = width * 0.5;
  const span = height - horizon;
  for (let index = 0; index < 3; index += 1) {
    context.beginPath();
    for (let step = 0; step <= 40; step += 1) {
      const t = step / 40;
      const y = horizon + t * span;
      const amplitude = width * (0.03 + t * 0.24);
      const x =
        centerX +
        Math.sin(t * Math.PI * 2 + time * 0.22 + index * 2.1) *
          amplitude;
      if (step === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  }
  context.restore();
}

function drawFloor(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const archetype = input.profile.archetype;
  if (archetype === "celestial-rainbow") {
    drawCelestialFloor(context, input);
  } else if (archetype === "infernal") {
    drawInfernalFloor(context, input);
  } else if (archetype === "frost-prism") {
    drawFrostFloor(context, input);
  } else if (archetype === "verdant") {
    drawVerdantFloor(context, input);
  } else if (archetype === "shadow-nature") {
    drawShadowFloor(context, input);
  } else if (archetype === "cosmic-forge") {
    drawForgeFloor(context, input);
  } else if (archetype === "abyssal") {
    drawAbyssFloor(context, input);
  } else if (archetype === "aurora-cosmic") {
    drawAuroraFloor(context, input);
  } else if (archetype === "void-cathedral") {
    drawCathedralFloor(context, input);
  } else {
    drawEternityFloor(context, input);
  }
}

export class WorldSceneRenderer {
  private cacheCanvas: HTMLCanvasElement | null = null;
  private cacheKey = "";

  invalidate(): void {
    this.cacheKey = "";
    this.cacheCanvas = null;
  }

  destroy(): void {
    this.invalidate();
  }

  private prepareStaticCache(input: WorldSceneDrawInput): void {
    if (typeof document === "undefined") return;

    const key = worldSceneCacheKey(
      input.profile,
      input.width,
      input.height,
      input.dpr,
      input.quality,
    );
    if (this.cacheCanvas !== null && this.cacheKey === key) return;

    const canvas = document.createElement("canvas");
    const dpr = Math.max(0.5, input.dpr);
    canvas.width = Math.max(1, Math.floor(input.width * dpr));
    canvas.height = Math.max(1, Math.floor(input.height * dpr));
    const offscreen = canvas.getContext("2d");
    if (offscreen === null) {
      this.cacheCanvas = null;
      this.cacheKey = "";
      return;
    }

    offscreen.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawStaticScene(offscreen, input);
    this.cacheCanvas = canvas;
    this.cacheKey = key;
  }

  draw(
    context: CanvasRenderingContext2D,
    input: WorldSceneDrawInput,
  ): void {
    this.prepareStaticCache(input);

    if (this.cacheCanvas !== null) {
      context.drawImage(
        this.cacheCanvas,
        0,
        0,
        this.cacheCanvas.width,
        this.cacheCanvas.height,
        0,
        0,
        input.width,
        input.height,
      );
    } else {
      drawStaticScene(context, input);
    }

    drawStars(context, input);
    drawFloor(context, input);
    drawAmbientParticles(context, input);
  }
}
