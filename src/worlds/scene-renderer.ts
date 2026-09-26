import type { VisualQuality } from "../types";
import type { WorldEnvironmentProfile } from "./environment";
import { sceneQualityBudget } from "./scene-registry";
import {
  layeredBackgroundForScene,
} from "./layered-background-registry";
import { LayeredBackgroundRenderer } from "./layered-background-renderer";
import type { LayeredBackgroundProfile } from "./layered-background-types";
import type { WorldSceneProfile } from "./scene-types";
import {
  drawWorldAmbientEffects,
  worldUsesAuthoredAmbientEffects,
} from "./world-ambient-effects";

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

function hexRgb(hex: string): string {
  const value = hex.startsWith("#") ? hex.slice(1) : hex;
  if (value.length !== 6) return "255, 255, 255";
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ].join(", ");
}

function stringSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

type SceneSkyPalette = {
  top: string;
  mid: string;
  horizon: string;
  edge: string;
  glowA: string;
  glowB: string;
  glowC: string;
};

function sceneSkyPalette(profile: WorldSceneProfile): SceneSkyPalette {
  switch (profile.archetype) {
    case "celestial-rainbow":
      return {
        top: "#071126",
        mid: "#172451",
        horizon: "#302454",
        edge: "#030610",
        glowA: "#66e7ff",
        glowB: "#a57cff",
        glowC: profile.variant % 2 === 0 ? "#ffd27a" : "#ff78c8",
      };
    case "infernal":
      return {
        top: "#170609",
        mid: "#351014",
        horizon: "#681f12",
        edge: "#050203",
        glowA: "#ff4c2f",
        glowB: "#ff9a32",
        glowC: "#b3132f",
      };
    case "frost-prism":
      return {
        top: "#06101d",
        mid: "#0d2e4c",
        horizon: "#165b72",
        edge: "#02060b",
        glowA: "#77eaff",
        glowB: "#87a7ff",
        glowC: "#d8fbff",
      };
    case "verdant":
      return {
        top: "#06140f",
        mid: "#103526",
        horizon: "#1f5c37",
        edge: "#020805",
        glowA: "#7dffb0",
        glowB: "#4fd3a2",
        glowC: "#d6ff8e",
      };
    case "shadow-nature":
      return {
        top: "#080612",
        mid: "#171027",
        horizon: "#25153a",
        edge: "#020205",
        glowA: "#7c53c9",
        glowB: "#b35fff",
        glowC: "#3a214f",
      };
    case "cosmic-forge":
      return {
        top: "#071021",
        mid: "#152445",
        horizon: "#263e61",
        edge: "#02040b",
        glowA: "#6bc5ff",
        glowB: "#8a7dff",
        glowC: "#ffbf5c",
      };
    case "abyssal":
      return {
        top: "#050308",
        mid: "#100716",
        horizon: "#25102c",
        edge: "#010102",
        glowA: "#bd55ff",
        glowB: "#ff4d87",
        glowC: "#4a1a61",
      };
    case "aurora-cosmic":
      return {
        top: "#04111d",
        mid: "#0b3453",
        horizon: "#174f6e",
        edge: "#02060b",
        glowA: "#5ef2d6",
        glowB: "#67a8ff",
        glowC: "#c77bff",
      };
    case "void-cathedral":
      return {
        top: "#070713",
        mid: "#17172a",
        horizon: "#292543",
        edge: "#020207",
        glowA: "#d5d2ff",
        glowB: "#9888ff",
        glowC: "#7f6bbd",
      };
    case "eternity":
    default:
      return {
        top: "#08071a",
        mid: "#1a1742",
        horizon: "#37255e",
        edge: "#020207",
        glowA: "#72ecff",
        glowB: "#c27dff",
        glowC: "#ff7fc6",
      };
  }
}

function drawHorizonGlow(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
  alpha: number,
): void {
  const gradient = context.createLinearGradient(0, height * 0.06, 0, height * 0.62);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(0.55, color);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height * 0.72);
  context.restore();
}

function drawCelestialCloudMass(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: SceneSkyPalette,
  variant: number,
): void {
  const drawCloud = (
    x: number,
    y: number,
    rx: number,
    ry: number,
    color: string,
    alpha: number,
  ): void => {
    const gradient = context.createRadialGradient(
      x,
      y,
      0,
      x,
      y,
      Math.max(rx, ry),
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.48, color);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    context.save();
    context.translate(x, y);
    context.scale(1, ry / Math.max(1, rx));
    context.globalAlpha = alpha;
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(0, 0, rx, 0, TAU);
    context.fill();
    context.restore();
  };

  const drift = (variant - 3) * width * 0.012;

  // Keep the center combat corridor clear. Clouds frame the scene from the
  // sides instead of forming one horizontal stripe behind enemy labels.
  drawCloud(
    width * 0.13 + drift,
    height * 0.23,
    width * 0.2,
    height * 0.085,
    palette.glowA,
    0.13,
  );
  drawCloud(
    width * 0.27 + drift,
    height * 0.18,
    width * 0.14,
    height * 0.06,
    palette.glowB,
    0.09,
  );
  drawCloud(
    width * 0.84 - drift,
    height * 0.24,
    width * 0.22,
    height * 0.09,
    palette.glowA,
    0.12,
  );
  drawCloud(
    width * 0.72 - drift,
    height * 0.17,
    width * 0.13,
    height * 0.055,
    palette.glowC,
    0.075,
  );

  // A dim lower atmospheric layer adds depth without crossing the target area.
  drawCloud(
    width * 0.18,
    height * 0.4,
    width * 0.18,
    height * 0.06,
    palette.glowB,
    0.045,
  );
  drawCloud(
    width * 0.82,
    height * 0.42,
    width * 0.2,
    height * 0.065,
    palette.glowA,
    0.04,
  );
}

function drawArchetypeBackdrop(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
  palette: SceneSkyPalette,
): void {
  const { width, height, profile } = input;
  const horizon = height * profile.horizonRatio;

  context.save();

  if (profile.archetype === "celestial-rainbow") {
    drawCelestialCloudMass(context, width, height, palette, profile.variant);

    // Large off-center celestial body. Avoid placing perfect geometry directly
    // behind the center target lane.
    const haloOnRight = profile.variant % 2 === 1;
    const centerX = width * (haloOnRight ? 0.79 : 0.21);
    const centerY = height * (0.125 + profile.variant * 0.004);
    const haloRadius = Math.min(width, height) * 0.09;

    drawNebulaGlow(
      context,
      centerX,
      centerY,
      haloRadius * 2.2,
      palette.glowB,
      0.08,
    );

    context.globalAlpha = 0.26;
    context.strokeStyle = palette.glowC;
    context.lineWidth = Math.max(2.2, width * 0.0026);
    context.beginPath();
    context.arc(centerX, centerY, haloRadius, 0, TAU);
    context.stroke();

    context.globalAlpha = 0.1;
    context.fillStyle = palette.glowB;
    context.beginPath();
    context.arc(centerX, centerY, haloRadius * 0.62, 0, TAU);
    context.fill();

    // Narrow diagonal nebula ribbon in the upper sky, not a full-width band.
    const rainbow = context.createLinearGradient(
      width * 0.08,
      height * 0.02,
      width * 0.7,
      height * 0.2,
    );
    rainbow.addColorStop(0, "rgba(74, 220, 255, 0)");
    rainbow.addColorStop(0.22, "rgba(74, 220, 255, 0.14)");
    rainbow.addColorStop(0.5, "rgba(151, 104, 255, 0.13)");
    rainbow.addColorStop(0.76, "rgba(255, 103, 193, 0.11)");
    rainbow.addColorStop(1, "rgba(255, 211, 122, 0)");

    context.globalAlpha = 0.9;
    context.fillStyle = rainbow;
    context.beginPath();
    context.moveTo(width * 0.03, height * 0.035);
    context.bezierCurveTo(
      width * 0.22,
      height * 0.055,
      width * 0.38,
      height * 0.14,
      width * 0.68,
      height * 0.16,
    );
    context.lineTo(width * 0.71, height * 0.205);
    context.bezierCurveTo(
      width * 0.4,
      height * 0.19,
      width * 0.22,
      height * 0.105,
      width * 0.015,
      height * 0.085,
    );
    context.closePath();
    context.fill();

    // Soft lower vignette gives foreground depth without adding another grid.
    const foreground = context.createLinearGradient(
      0,
      height * 0.52,
      0,
      height,
    );
    foreground.addColorStop(0, "rgba(0,0,0,0)");
    foreground.addColorStop(1, "rgba(1,3,12,0.36)");
    context.globalAlpha = 1;
    context.fillStyle = foreground;
    context.fillRect(0, height * 0.5, width, height * 0.5);
  } else if (profile.archetype === "infernal") {
    context.globalAlpha = 0.22;
    context.fillStyle = palette.glowB;
    context.fillRect(0, horizon * 0.72, width, height * 0.055);
    context.globalAlpha = 0.24;
    context.fillStyle = "#130204";
    context.beginPath();
    context.moveTo(0, horizon);
    for (let index = 0; index <= 10; index += 1) {
      const x = width * (index / 10);
      const peak = height * (0.025 + ((index * 7 + profile.variant) % 4) * 0.028);
      context.lineTo(x, horizon - peak);
    }
    context.lineTo(width, horizon + height * 0.06);
    context.lineTo(0, horizon + height * 0.06);
    context.closePath();
    context.fill();
  } else if (profile.archetype === "frost-prism") {
    context.globalAlpha = 0.16;
    context.fillStyle = palette.glowA;
    context.fillRect(0, horizon, width, height * 0.04);
    context.globalAlpha = 0.1;
    context.fillStyle = "#bff6ff";
    for (let index = 0; index < 9; index += 1) {
      const x = width * (0.03 + index * 0.12);
      const h = height * (0.035 + (index % 4) * 0.018);
      context.beginPath();
      context.moveTo(x - width * 0.018, horizon);
      context.lineTo(x, horizon - h);
      context.lineTo(x + width * 0.018, horizon);
      context.closePath();
      context.fill();
    }
  } else if (profile.archetype === "verdant") {
    context.globalAlpha = 0.18;
    context.fillStyle = "#05140d";
    for (let index = 0; index < 11; index += 1) {
      const x = width * (index / 10);
      const r = width * (0.05 + (index % 3) * 0.012);
      context.beginPath();
      context.arc(x, horizon - height * 0.02, r, 0, TAU);
      context.fill();
    }
    context.globalAlpha = 0.13;
    context.fillStyle = palette.glowC;
    context.fillRect(0, horizon * 0.96, width, height * 0.028);
  } else if (profile.archetype === "shadow-nature") {
    context.globalAlpha = 0.22;
    context.fillStyle = "#020105";
    context.beginPath();
    context.arc(
      width * (0.52 + (profile.variant - 3) * 0.025),
      height * 0.145,
      Math.min(width, height) * 0.075,
      0,
      TAU,
    );
    context.fill();
    context.globalAlpha = 0.12;
    context.fillStyle = palette.glowB;
    context.fillRect(0, horizon * 0.88, width, height * 0.035);
  } else if (profile.archetype === "cosmic-forge") {
    context.globalAlpha = 0.16;
    context.fillStyle = "#080d18";
    const towerCount = 8;
    for (let index = 0; index < towerCount; index += 1) {
      const x = width * (0.03 + index * 0.135);
      const h = height * (0.06 + (index % 4) * 0.028);
      context.fillRect(x, horizon - h, width * 0.055, h);
    }
    context.globalAlpha = 0.17;
    context.strokeStyle = palette.glowC;
    context.lineWidth = Math.max(2, width * 0.002);
    context.beginPath();
    context.arc(width * 0.5, horizon * 0.76, width * 0.09, 0, TAU);
    context.stroke();
  } else if (profile.archetype === "abyssal") {
    context.globalAlpha = 0.3;
    context.fillStyle = "#000";
    context.beginPath();
    context.arc(width * 0.5, height * 0.15, Math.min(width, height) * 0.085, 0, TAU);
    context.fill();
    context.globalAlpha = 0.11;
    context.strokeStyle = palette.glowA;
    context.lineWidth = Math.max(2, width * 0.002);
    context.beginPath();
    context.arc(width * 0.5, height * 0.15, Math.min(width, height) * 0.112, 0, TAU);
    context.stroke();
  } else if (profile.archetype === "aurora-cosmic") {
    context.globalAlpha = 0.14;
    context.strokeStyle = palette.glowA;
    context.lineWidth = Math.max(5, height * 0.01);
    for (let band = 0; band < 3; band += 1) {
      context.beginPath();
      context.moveTo(0, height * (0.08 + band * 0.03));
      for (let step = 1; step <= 8; step += 1) {
        const x = width * (step / 8);
        const y =
          height * (0.08 + band * 0.03) +
          Math.sin(step * 0.9 + band + profile.variant) * height * 0.025;
        context.lineTo(x, y);
      }
      context.stroke();
    }
  } else if (profile.archetype === "void-cathedral") {
    context.globalAlpha = 0.2;
    context.fillStyle = "#060611";
    for (const side of [-1, 1]) {
      const x = width * 0.5 + side * width * 0.2;
      context.fillRect(x - width * 0.018, horizon - height * 0.18, width * 0.036, height * 0.18);
    }
    context.globalAlpha = 0.12;
    context.strokeStyle = palette.glowA;
    context.lineWidth = Math.max(2, width * 0.002);
    context.beginPath();
    context.ellipse(width * 0.5, horizon - height * 0.04, width * 0.17, height * 0.14, 0, Math.PI, TAU);
    context.stroke();
  } else {
    context.globalAlpha = 0.14;
    context.strokeStyle = palette.glowB;
    context.lineWidth = Math.max(3, width * 0.0025);
    for (let index = 0; index < 3; index += 1) {
      context.beginPath();
      context.ellipse(
        width * 0.5,
        height * (0.12 + index * 0.025),
        width * (0.11 + index * 0.055),
        height * (0.026 + index * 0.012),
        index * 0.3,
        0,
        TAU,
      );
      context.stroke();
    }
  }

  context.restore();
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
  const palette = sceneSkyPalette(profile);

  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, palette.top);
  gradient.addColorStop(0.48, palette.mid);
  gradient.addColorStop(0.72, palette.horizon);
  gradient.addColorStop(1, palette.edge);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  drawHorizonGlow(
    context,
    width,
    height,
    palette.glowA,
    profile.archetype === "celestial-rainbow" ? 0.13 : 0.085,
  );

  const glowColors = [palette.glowA, palette.glowB, palette.glowC] as const;
  for (let index = 0; index < budget.farDetails + 2; index += 1) {
    const x = width * (0.06 + seededUnit(profile.seed, index, 1) * 0.88);
    const y = height * (0.05 + seededUnit(profile.seed, index, 2) * 0.42);
    const radius =
      Math.min(width, height) *
      (0.18 + seededUnit(profile.seed, index, 3) * 0.3);
    drawNebulaGlow(
      context,
      x,
      y,
      radius,
      glowColors[index % glowColors.length]!,
      0.055 + index * 0.012,
    );
  }

  drawNebulaGlow(
    context,
    width * 0.5,
    height * 0.28,
    Math.min(width, height) * 0.58,
    rgba(environment.hazeRgb, 0.72),
    0.045,
  );

  drawArchetypeBackdrop(context, input, palette);
}

function drawProductionLoadingSky(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const palette = sceneSkyPalette(input.profile);
  const gradient = context.createLinearGradient(0, 0, 0, input.height);
  gradient.addColorStop(0, palette.top);
  gradient.addColorStop(0.55, palette.mid);
  gradient.addColorStop(1, palette.edge);
  context.fillStyle = gradient;
  context.fillRect(0, 0, input.width, input.height);
}

function drawCelestialLandmarks(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, profile, environment } = input;
  const horizon = height * profile.horizonRatio;

  context.save();
  context.strokeStyle = rgba(environment.gridRgb, 0.14);
  context.fillStyle = rgba(environment.hazeRgb, 0.065);
  context.lineWidth = Math.max(1.2, width * 0.0012);

  // Far floating temple/island silhouettes frame the center instead of
  // stacking rings behind enemy labels.
  const islands = [
    { x: 0.1, y: 0.2, w: 0.12, h: 0.025 },
    { x: 0.29, y: 0.17, w: 0.08, h: 0.018 },
    { x: 0.72, y: 0.19, w: 0.09, h: 0.02 },
    { x: 0.9, y: 0.22, w: 0.13, h: 0.028 },
  ];

  context.globalAlpha = 0.34;
  for (const island of islands) {
    const x = width * island.x;
    const y = height * island.y;
    context.beginPath();
    context.ellipse(
      x,
      y,
      width * island.w,
      height * island.h,
      0,
      0,
      TAU,
    );
    context.fill();

    context.beginPath();
    context.moveTo(x - width * island.w * 0.6, y);
    context.lineTo(x, y + height * island.h * 1.7);
    context.lineTo(x + width * island.w * 0.6, y);
    context.closePath();
    context.fill();
  }

  // Sparse side spires only; keep the central combat lane open.
  context.globalAlpha = 0.22;
  const sideXs = [0.075, 0.18, 0.82, 0.925];
  for (let index = 0; index < sideXs.length; index += 1) {
    const x = width * sideXs[index]!;
    const h =
      height *
      (0.065 + seededUnit(profile.seed, index, 15) * 0.075);
    const baseY = Math.max(horizon, height * 0.205);
    context.fillRect(
      x - width * 0.006,
      baseY - h,
      width * 0.012,
      h,
    );
    context.beginPath();
    context.moveTo(x - width * 0.012, baseY - h);
    context.lineTo(x, baseY - h - height * 0.024);
    context.lineTo(x + width * 0.012, baseY - h);
    context.closePath();
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

function drawLandmarkSignature(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, profile, environment } = input;
  const style = profile.landmarkStyle;
  const horizon = height * profile.horizonRatio;
  const seed = stringSeed(style) ^ profile.seed;
  const centerX =
    width * (0.5 + (seededUnit(seed, 0, 201) - 0.5) * 0.08);
  const alpha = 0.08 + profile.landmarkIntensity * 0.16;

  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = rgba(environment.starRgb, 0.78);
  context.fillStyle = rgba(environment.hazeRgb, 0.44);
  context.lineWidth = Math.max(1.2, Math.min(width, height) * 0.002);

  if (
    style.includes("gate") ||
    style.includes("cathedral") ||
    style.includes("chapel") ||
    style.includes("basilica") ||
    style.includes("sanctuary") ||
    style.includes("crypt")
  ) {
    const archW = width * (0.075 + profile.variant * 0.008);
    const archH = height * (0.07 + profile.variant * 0.007);
    context.beginPath();
    context.ellipse(
      centerX,
      horizon - archH * 0.12,
      archW,
      archH,
      0,
      Math.PI,
      TAU,
    );
    context.stroke();
    for (const side of [-1, 1]) {
      context.fillRect(
        centerX + side * archW - width * 0.006,
        horizon - archH * 0.1,
        width * 0.012,
        archH * 1.1,
      );
    }
  } else if (style.includes("crown") || style.includes("throne")) {
    const points = 5 + (profile.variant % 2) * 2;
    const baseY = horizon - height * 0.012;
    const span = width * 0.15;
    context.beginPath();
    context.moveTo(centerX - span / 2, baseY);
    for (let index = 0; index < points; index += 1) {
      const x =
        centerX - span / 2 + (span * index) / Math.max(1, points - 1);
      const peak =
        index % 2 === 0
          ? height * (0.065 + profile.variant * 0.006)
          : height * 0.028;
      context.lineTo(x, baseY - peak);
    }
    context.lineTo(centerX + span / 2, baseY);
    context.closePath();
    context.stroke();
  } else if (
    style.includes("prism") ||
    style.includes("crystal") ||
    style.includes("glass")
  ) {
    const radius =
      Math.min(width, height) * (0.045 + profile.variant * 0.004);
    context.save();
    context.translate(centerX, horizon - radius * 0.9);
    context.rotate((profile.variant - 3) * 0.08);
    context.beginPath();
    context.moveTo(0, -radius);
    context.lineTo(radius * 0.7, 0);
    context.lineTo(0, radius);
    context.lineTo(-radius * 0.7, 0);
    context.closePath();
    context.stroke();
    context.beginPath();
    context.moveTo(0, -radius);
    context.lineTo(0, radius);
    context.moveTo(-radius * 0.7, 0);
    context.lineTo(radius * 0.7, 0);
    context.stroke();
    context.restore();
  } else if (
    style.includes("furnace") ||
    style.includes("foundry") ||
    style.includes("works") ||
    style.includes("engine") ||
    style.includes("reactor") ||
    style.includes("port") ||
    style.includes("circuit")
  ) {
    const ring = width * (0.045 + profile.variant * 0.006);
    context.beginPath();
    context.arc(centerX, horizon - height * 0.07, ring, 0, TAU);
    context.stroke();
    context.beginPath();
    context.arc(centerX, horizon - height * 0.07, ring * 0.58, 0, TAU);
    context.stroke();
    for (let index = -2; index <= 2; index += 1) {
      const x = centerX + index * ring * 0.72;
      context.fillRect(
        x - width * 0.005,
        horizon - height * (0.04 + Math.abs(index) * 0.012),
        width * 0.01,
        height * (0.04 + Math.abs(index) * 0.012),
      );
    }
  } else if (
    style.includes("grove") ||
    style.includes("garden") ||
    style.includes("meadow") ||
    style.includes("bloom") ||
    style.includes("orchard") ||
    style.includes("pollen") ||
    style.includes("leaf")
  ) {
    const trunkH = height * (0.07 + profile.variant * 0.01);
    context.beginPath();
    context.moveTo(centerX, horizon);
    context.quadraticCurveTo(
      centerX - width * 0.025,
      horizon - trunkH * 0.55,
      centerX,
      horizon - trunkH,
    );
    context.stroke();
    for (let index = 0; index < 5; index += 1) {
      const angle = -Math.PI * 0.88 + index * 0.44;
      context.beginPath();
      context.ellipse(
        centerX + Math.cos(angle) * width * 0.04,
        horizon - trunkH + Math.sin(angle) * height * 0.022,
        width * 0.025,
        height * 0.013,
        angle,
        0,
        TAU,
      );
      context.fill();
    }
  } else if (
    style.includes("eclipse") ||
    style.includes("halo") ||
    style.includes("orbit") ||
    style.includes("singularity") ||
    style.includes("nexus") ||
    style.includes("cosmos") ||
    style.includes("aurora")
  ) {
    const ring =
      Math.min(width, height) * (0.055 + profile.variant * 0.004);
    context.beginPath();
    context.arc(centerX, height * 0.135, ring, 0, TAU);
    context.stroke();
    context.globalAlpha *= 0.7;
    context.beginPath();
    context.arc(
      centerX + ring * 0.45,
      height * 0.135 - ring * 0.22,
      ring * 0.44,
      0,
      TAU,
    );
    context.fill();
  } else if (
    style.includes("snow") ||
    style.includes("winter") ||
    style.includes("glacier") ||
    style.includes("tundra")
  ) {
    const count = 3 + profile.variant;
    for (let index = 0; index < count; index += 1) {
      const x =
        centerX + (index - (count - 1) / 2) * width * 0.026;
      const h =
        height *
        (0.035 + (index % 3) * 0.018 + profile.variant * 0.003);
      context.beginPath();
      context.moveTo(x - width * 0.011, horizon);
      context.lineTo(x, horizon - h);
      context.lineTo(x + width * 0.011, horizon);
      context.closePath();
      context.stroke();
    }
  } else {
    const radius = Math.min(width, height) * 0.04;
    context.beginPath();
    context.arc(centerX, horizon - radius, radius, 0, TAU);
    context.stroke();
  }

  context.restore();
}

function drawStaticLandmarks(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const archetype = input.profile.archetype;
  context.save();
  context.globalAlpha = input.profile.landmarkIntensity;
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
  context.restore();
  drawLandmarkSignature(context, input);
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
    input.environment.hazeIntensity * 0.34,
  );
  context.fillRect(0, 0, input.width, input.height);
  context.restore();
}

export function productionGalaxyPolishEnabled(
  profile: Pick<WorldSceneProfile, "worldId">,
): boolean {
  return profile.worldId === "world-01";
}

export function galaxySceneryReadabilityFactor(
  xRatio: number,
  yRatio: number,
): number {
  if (yRatio < 0.1 || yRatio > 0.64) return 1;

  const centerDistance = Math.abs(xRatio - 0.5);
  if (centerDistance < 0.1) return 0.34;
  if (centerDistance < 0.18) return 0.55;
  if (centerDistance > 0.28) return 1.08;
  return 0.82;
}

function drawStars(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const {
    width,
    height,
    time,
    stars,
    environment,
    profile,
    quality,
  } = input;
  const budget = sceneQualityBudget(quality);
  const productionGalaxy = productionGalaxyPolishEnabled(profile);
  const effectiveStarDensity =
    profile.starDensity * (productionGalaxy ? 0.68 : 1);
  const farCount = Math.max(
    18,
    Math.round(budget.farStars * effectiveStarDensity),
  );
  const nearCount = Math.max(
    0,
    Math.round(
      budget.nearStars *
        effectiveStarDensity *
        Math.max(0.25, profile.flightIntensity) *
        (productionGalaxy
          ? 0.12
          : profile.archetype === "celestial-rainbow"
            ? 0.24
            : 0.34),
    ),
  );
  const vanishingX = width * (0.5 + (profile.variant - 3) * 0.006);
  const vanishingY = height * 0.34;
  const flight = 0.45 + profile.flightIntensity * 0.85;

  context.save();

  // Dense far-star layer. Stars expand slowly from a vanishing zone to create
  // forward travel rather than simply scrolling down the screen.
  for (let index = 0; index < farCount; index += 1) {
    const angle = seededUnit(profile.seed, index, 301) * TAU;
    const depth = 0.15 + seededUnit(profile.seed, index, 302) * 0.5;
    const phase =
      (seededUnit(profile.seed, index, 303) +
        time * (0.006 + depth * 0.006) * flight) %
      1;
    const radial = 0.035 + Math.pow(phase, 1.35) * 0.96;
    const x =
      vanishingX +
      Math.cos(angle) * radial * width * 0.72;
    const y =
      vanishingY +
      Math.sin(angle) * radial * height * 0.88;
    if (x < -4 || x > width + 4 || y < -4 || y > height + 4) {
      continue;
    }

    const hierarchy = seededUnit(profile.seed, index, 304);
    const centralQuiet =
      x > width * 0.34 &&
      x < width * 0.66 &&
      y > height * 0.12 &&
      y < height * 0.62;
    const galaxyReadability =
      productionGalaxyPolishEnabled(profile)
        ? galaxySceneryReadabilityFactor(x / width, y / height)
        : null;
    const quietFactor =
      galaxyReadability ?? (centralQuiet ? 0.58 : 1);
    const outerThird =
      productionGalaxyPolishEnabled(profile) &&
      (x < width * 0.3 || x > width * 0.7);
    const brightThreshold = outerThird ? 0.91 : 0.94;
    const glintThreshold = outerThird ? 0.986 : 0.992;
    const size =
      0.45 +
      depth * 1.15 +
      (hierarchy > brightThreshold ? 0.8 : 0) +
      (hierarchy > glintThreshold ? 0.9 : 0);
    const alpha =
      (0.15 +
        depth * 0.36 +
        (hierarchy > brightThreshold ? 0.16 : 0)) *
      quietFactor;

    context.fillStyle = rgba(environment.starRgb, alpha);
    if (
      hierarchy > glintThreshold &&
      quality !== "low" &&
      quietFactor >= 0.8
    ) {
      const arm = 2.1 + depth * 2.1;
      context.fillRect(x - 0.75, y - arm, 1.5, arm * 2);
      context.fillRect(x - arm, y - 0.75, arm * 2, 1.5);
      context.globalAlpha = 0.7;
      context.beginPath();
      context.arc(x, y, 1.25 + depth * 0.8, 0, TAU);
      context.fill();
      context.globalAlpha = 1;
    } else if (hierarchy > brightThreshold) {
      context.beginPath();
      context.arc(x, y, size * 0.62, 0, TAU);
      context.fill();
    } else {
      context.fillRect(x, y, size, size);
    }
  }

  // Existing seeded stars add a slow twinkling texture behind the flight layer.
  const legacyLimit = Math.min(stars.length, Math.max(20, farCount >> 1));
  for (let index = 0; index < legacyLimit; index += 1) {
    const star = stars[index]!;
    const y =
      ((star.y +
        time * 0.01 * environment.starDrift * star.z) %
        1) *
      height;
    const legacyX = star.x * width;
    const readability =
      productionGalaxyPolishEnabled(profile)
        ? galaxySceneryReadabilityFactor(star.x, y / height)
        : 1;
    context.fillStyle = rgba(
      environment.starRgb,
      (0.08 + star.z * 0.25) * readability,
    );
    const size = Math.max(0.7, star.z * 1.3);
    context.fillRect(legacyX, y, size, size);
  }

  // Near stars move substantially faster and become short streaks. Their count
  // is bounded by Visual Quality.
  context.lineCap = "round";
  for (let index = 0; index < nearCount; index += 1) {
    const angle = seededUnit(profile.seed, index, 311) * TAU;
    const depth = 0.65 + seededUnit(profile.seed, index, 312) * 0.35;
    const phase =
      (seededUnit(profile.seed, index, 313) +
        time * (0.035 + depth * 0.035) * flight) %
      1;
    const radial = Math.pow(phase, 1.55);
    const trail = Math.max(0, radial - (0.016 + depth * 0.025));
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = vanishingX + cos * radial * width * 0.76;
    const y = vanishingY + sin * radial * height * 0.92;
    const x0 = vanishingX + cos * trail * width * 0.76;
    const y0 = vanishingY + sin * trail * height * 0.92;
    if (x < -20 || x > width + 20 || y < -20 || y > height + 20) {
      continue;
    }

    if (profile.archetype === "celestial-rainbow") {
      const xRatio = x / width;
      const yRatio = y / height;
      const productionGalaxy =
        productionGalaxyPolishEnabled(profile);
      const centralQuiet =
        xRatio > 0.35 &&
        xRatio < 0.65 &&
        yRatio > 0.12 &&
        yRatio < 0.62;
      const readability = productionGalaxy
        ? galaxySceneryReadabilityFactor(xRatio, yRatio)
        : centralQuiet
          ? 0.5
          : 1;
      const alpha = (0.22 + depth * 0.24) * readability;
      context.fillStyle = rgba(environment.starRgb, alpha);
      context.beginPath();
      context.arc(x, y, 0.85 + depth * 1.05, 0, TAU);
      context.fill();

      const glintThreshold =
        productionGalaxy && Math.abs(xRatio - 0.5) > 0.28
          ? 0.82
          : productionGalaxy
            ? 0.9
            : 0.86;
      if (
        quality !== "low" &&
        (!productionGalaxy || readability >= 0.8) &&
        seededUnit(profile.seed, index, 314) > glintThreshold
      ) {
        const arm = 1.8 + depth * 2.4;
        context.strokeStyle = rgba(
          environment.starRgb,
          alpha * 0.72,
        );
        context.lineWidth = 0.7;
        context.beginPath();
        context.moveTo(x - arm, y);
        context.lineTo(x + arm, y);
        context.moveTo(x, y - arm);
        context.lineTo(x, y + arm);
        context.stroke();
      }
      continue;
    }

    const trailGradient = context.createLinearGradient(
      x0,
      y0,
      x,
      y,
    );
    trailGradient.addColorStop(
      0,
      rgba(environment.starRgb, 0),
    );
    trailGradient.addColorStop(
      0.65,
      rgba(environment.starRgb, 0.025 + depth * 0.055),
    );
    trailGradient.addColorStop(
      1,
      rgba(environment.starRgb, 0.11 + depth * 0.12),
    );

    context.strokeStyle = trailGradient;
    context.lineWidth = 0.55 + depth * 0.72;
    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x, y);
    context.stroke();

    context.fillStyle = rgba(
      environment.starRgb,
      0.14 + depth * 0.12,
    );
    context.beginPath();
    context.arc(x, y, 0.7 + depth * 0.7, 0, TAU);
    context.fill();
  }

  context.restore();
}

function drawCinematicVortex(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, time, profile } = input;
  // Galaxy/Celestial scenes now use curated authored scenic objects. Avoid
  // reintroducing procedural swirl art that reads like a placeholder.
  if (profile.archetype === "celestial-rainbow") return;
  if (profile.vortexStrength < 0.28) return;

  const palette = sceneSkyPalette(profile);
  const rightSide = profile.variant % 2 === 1;
  const centerX = width * (rightSide ? 0.79 : 0.21);
  const centerY = height * (0.17 + (profile.variant % 3) * 0.018);
  const strength = clamp(profile.vortexStrength, 0, 1.2);
  const arms = profile.archetype === "eternity" ? 3 : 2;
  const points = 18 + Math.round(strength * 20);
  const maxRadius =
    Math.min(width, height) *
    (profile.archetype === "abyssal" ? 0.13 : 0.17);

  const armColors = [
    hexRgb(palette.glowA),
    hexRgb(palette.glowB),
  ] as const;

  context.save();
  context.globalCompositeOperation = "lighter";

  for (let arm = 0; arm < arms; arm += 1) {
    for (let index = 0; index < points; index += 1) {
      const t = index / Math.max(1, points - 1);
      const angle =
        arm * (TAU / arms) +
        t * TAU * (2.15 + strength * 0.9) +
        time * (0.055 + strength * 0.05);
      const radius = maxRadius * Math.pow(t, 0.78);
      const x = centerX + Math.cos(angle) * radius;
      const y =
        centerY +
        Math.sin(angle) *
          radius *
          (0.44 + t * 0.18);
      const size = 0.6 + (1 - t) * 1.6;
      const alpha =
        (0.035 + (1 - t) * 0.1) *
        strength;
      context.fillStyle = rgba(
        armColors[arm % armColors.length]!,
        alpha,
      );
      context.beginPath();
      context.arc(x, y, size, 0, TAU);
      context.fill();
    }
  }

  context.restore();
}

function drawCinematicCloudMotion(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, time, profile, quality } = input;
  if (profile.cloudDensity < 0.2) return;

  const palette = sceneSkyPalette(profile);
  const budget = sceneQualityBudget(quality);
  const count = Math.max(
    1,
    Math.round(budget.midObjects * profile.cloudDensity * 0.6),
  );

  context.save();
  for (let index = 0; index < count; index += 1) {
    const side = seededUnit(profile.seed, index, 321) < 0.5 ? -1 : 1;
    const depth = 0.3 + seededUnit(profile.seed, index, 322) * 0.55;
    const speed = (0.003 + depth * 0.005) * (0.5 + profile.flightIntensity);
    const travel =
      (seededUnit(profile.seed, index, 323) + time * speed) % 1;
    const baseSideX =
      side < 0
        ? 0.04 + travel * 0.34
        : 0.96 - travel * 0.34;
    const x = width * baseSideX;
    const y =
      height *
      (0.11 + seededUnit(profile.seed, index, 324) * 0.32);
    const rx = width * (0.055 + depth * 0.075);
    const ry = height * (0.015 + depth * 0.03);

    const gradient = context.createRadialGradient(
      x,
      y,
      0,
      x,
      y,
      rx,
    );
    const color =
      index % 2 === 0 ? palette.glowA : palette.glowB;
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.4, color);
    gradient.addColorStop(1, "rgba(0,0,0,0)");

    context.save();
    context.translate(x, y);
    context.scale(1, ry / Math.max(1, rx));
    context.globalAlpha = 0.018 + depth * 0.035;
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(0, 0, rx, 0, TAU);
    context.fill();
    context.restore();
  }
  context.restore();
}

function asteroidColor(
  profile: WorldSceneProfile,
  environment: WorldEnvironmentProfile,
): string {
  if (profile.archetype === "infernal") {
    return rgba(environment.gridRgb, 0.32);
  }
  if (profile.archetype === "frost-prism") {
    return rgba(environment.starRgb, 0.25);
  }
  if (profile.archetype === "abyssal") {
    return rgba(environment.hazeRgb, 0.24);
  }
  return "rgba(108, 125, 153, 0.24)";
}

function drawCinematicAsteroids(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const {
    width,
    height,
    time,
    profile,
    quality,
    environment,
  } = input;
  // The curated Galaxy/Celestial layer registry supplies real asteroid sprites
  // at multiple depths. Do not draw the old gray procedural polygons on top.
  if (profile.archetype === "celestial-rainbow") return;
  if (profile.asteroidDensity <= 0.02) return;

  const budget = sceneQualityBudget(quality);
  const count = Math.max(
    1,
    Math.round(budget.midObjects * profile.asteroidDensity),
  );
  const baseColor = asteroidColor(profile, environment);

  context.save();
  for (let index = 0; index < count; index += 1) {
    const depth = 0.25 + seededUnit(profile.seed, index, 331) * 0.75;
    const direction =
      seededUnit(profile.seed, index, 332) < 0.5 ? -1 : 1;
    const phase =
      (seededUnit(profile.seed, index, 333) +
        time *
          (0.01 + depth * 0.026) *
          (0.55 + profile.flightIntensity)) %
      1.15;
    const startX = seededUnit(profile.seed, index, 334);
    let normalizedX =
      startX +
      direction *
        (phase - 0.5) *
        (0.18 + depth * 0.16);
    normalizedX = ((normalizedX % 1.18) + 1.18) % 1.18 - 0.09;
    const normalizedY =
      -0.08 + phase * 1.06;
    let x = normalizedX * width;
    const y = normalizedY * height;

    // Keep the highest-contrast large rocks outside the central word corridor.
    if (
      depth > 0.62 &&
      y < height * 0.48 &&
      x > width * 0.36 &&
      x < width * 0.64
    ) {
      x += x < width * 0.5 ? -width * 0.22 : width * 0.22;
    }

    const radius =
      Math.min(width, height) *
      (0.006 + depth * 0.018);
    const rotation =
      seededUnit(profile.seed, index, 335) * TAU +
      time * (0.08 + depth * 0.16) * direction;

    context.save();
    context.translate(x, y);
    context.rotate(rotation);
    context.fillStyle = baseColor;
    context.strokeStyle = rgba(environment.starRgb, 0.08 + depth * 0.08);
    context.lineWidth = 1;
    context.beginPath();
    const points = 6;
    for (let point = 0; point < points; point += 1) {
      const angle = (TAU * point) / points;
      const wobble =
        0.72 +
        seededUnit(profile.seed + index * 97, point, 336) * 0.42;
      const px = Math.cos(angle) * radius * wobble;
      const py = Math.sin(angle) * radius * wobble;
      if (point === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
    context.fill();
    context.stroke();

    if (depth > 0.55) {
      context.globalAlpha = 0.18;
      context.beginPath();
      context.moveTo(-radius * 0.45, -radius * 0.1);
      context.lineTo(radius * 0.38, radius * 0.24);
      context.stroke();
    }
    context.restore();
  }
  context.restore();
}

function drawAuroraMotion(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, time, profile } = input;
  if (
    profile.primaryMotion !== "aurora-wave" &&
    profile.secondaryMotion !== "aurora-wave"
  ) {
    return;
  }

  const palette = sceneSkyPalette(profile);
  context.save();
  context.globalCompositeOperation = "lighter";
  context.lineCap = "round";

  for (let band = 0; band < 3; band += 1) {
    context.strokeStyle =
      band === 0 ? palette.glowA : band === 1 ? palette.glowB : palette.glowC;
    context.globalAlpha = 0.035 + band * 0.012;
    context.lineWidth = Math.max(4, height * (0.008 + band * 0.002));
    context.beginPath();
    for (let step = 0; step <= 12; step += 1) {
      const t = step / 12;
      const x = width * t;
      const y =
        height * (0.08 + band * 0.04) +
        Math.sin(
          t * TAU * 1.15 +
            time * (0.1 + band * 0.025) +
            profile.variant,
        ) *
          height *
          (0.018 + band * 0.005);
      if (step === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  }
  context.restore();
}

function drawReactorMotion(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, time, profile, environment } = input;
  if (
    profile.primaryMotion !== "reactor-motion" &&
    profile.secondaryMotion !== "reactor-motion"
  ) {
    return;
  }

  const centerX = width * (profile.variant % 2 === 0 ? 0.72 : 0.28);
  const centerY = height * 0.19;
  const baseRadius = Math.min(width, height) * 0.07;

  context.save();
  context.strokeStyle = rgba(environment.gridRgb, 0.14);
  context.lineWidth = 1.4;
  context.globalCompositeOperation = "lighter";
  for (let ring = 0; ring < 3; ring += 1) {
    const radius = baseRadius * (1 + ring * 0.36);
    const start =
      time * (0.14 + ring * 0.05) * (ring % 2 === 0 ? 1 : -1);
    context.beginPath();
    context.arc(
      centerX,
      centerY,
      radius,
      start,
      start + Math.PI * (0.75 + ring * 0.18),
    );
    context.stroke();
  }
  context.restore();
}

function drawCinematicEvents(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, time, profile, quality, environment } = input;
  if (profile.eventFrequency < 0.12) return;

  const hasMeteorMotion =
    profile.primaryMotion === "meteor-storm" ||
    profile.secondaryMotion === "meteor-storm";
  const supportsTravelStreaks =
    hasMeteorMotion ||
    profile.archetype === "aurora-cosmic" ||
    profile.archetype === "infernal" ||
    profile.archetype === "cosmic-forge" ||
    profile.archetype === "eternity";
  if (!supportsTravelStreaks) return;

  const budget = sceneQualityBudget(quality);
  const count = Math.max(
    0,
    Math.min(
      budget.eventObjects,
      Math.ceil(profile.eventFrequency * budget.eventObjects),
    ),
  );
  if (count <= 0) return;

  const palette = sceneSkyPalette(profile);

  context.save();
  context.lineCap = "round";
  context.globalCompositeOperation = "lighter";

  for (let index = 0; index < count; index += 1) {
    const period =
      6.5 + seededUnit(profile.seed, index, 341) * 5.5;
    const offset =
      seededUnit(profile.seed, index, 342) * period;
    const local = (time + offset) % period;
    const activeDuration = 0.7 + profile.eventFrequency * 0.55;
    if (local > activeDuration) continue;

    const progress = local / activeDuration;
    const fromLeft = seededUnit(profile.seed, index, 343) < 0.5;
    const startX = width * (fromLeft ? 0.02 : 0.98);
    const startY =
      height *
      (0.08 + seededUnit(profile.seed, index, 344) * 0.32);
    const dx =
      width *
      (fromLeft ? 0.26 : -0.26) *
      (0.72 + seededUnit(profile.seed, index, 345) * 0.45);
    const dy =
      height *
      (0.13 + seededUnit(profile.seed, index, 346) * 0.14);
    const headX = startX + dx * progress;
    const headY = startY + dy * progress;
    const tail = 0.28;
    const tailX = startX + dx * Math.max(0, progress - tail);
    const tailY = startY + dy * Math.max(0, progress - tail);
    const fade = Math.sin(progress * Math.PI);

    context.strokeStyle =
      profile.archetype === "infernal"
        ? palette.glowB
        : profile.archetype === "frost-prism"
          ? palette.glowA
          : rgba(environment.starRgb, 0.85);
    context.globalAlpha = 0.1 + fade * 0.22;
    context.lineWidth = 1.3 + fade * 1.2;
    context.beginPath();
    context.moveTo(tailX, tailY);
    context.lineTo(headX, headY);
    context.stroke();

    context.globalAlpha = 0.12 + fade * 0.28;
    context.fillStyle = palette.glowC;
    context.beginPath();
    context.arc(headX, headY, 1.2 + fade * 1.4, 0, TAU);
    context.fill();
  }

  context.restore();
}

function drawCinematicMotion(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  drawCinematicVortex(context, input);
  drawCinematicCloudMotion(context, input);
  drawAuroraMotion(context, input);
  drawReactorMotion(context, input);
  drawCinematicAsteroids(context, input);
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
  const budget = sceneQualityBudget(quality);
  const count = Math.max(
    2,
    Math.round(
      budget.foregroundObjects *
        Math.max(0.2, profile.foregroundDensity),
    ),
  );
  const speed =
    particleMotionScale(profile) *
    (0.68 + profile.flightIntensity * 0.5);
  const archetype = profile.archetype;
  const particleStyle = profile.particleStyle;

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
    const sceneryReadability =
      productionGalaxyPolishEnabled(profile)
        ? galaxySceneryReadabilityFactor(x, y)
        : 1;
    const alpha = (0.12 + depth * 0.24) * sceneryReadability;

    if (
      particleStyle.includes("feather") ||
      particleStyle.includes("droplet")
    ) {
      context.strokeStyle = rgba(environment.starRgb, alpha);
      context.lineWidth = Math.max(1, size * 0.32);
      context.beginPath();
      context.moveTo(px, py - size * 1.6);
      context.quadraticCurveTo(
        px + size * 0.9,
        py,
        px - size * 0.3,
        py + size * 1.7,
      );
      context.stroke();
    } else if (
      particleStyle.includes("spark") ||
      particleStyle.includes("ember") ||
      particleStyle.includes("fire")
    ) {
      context.strokeStyle = rgba(environment.starRgb, alpha + 0.08);
      context.lineWidth = size * 0.65;
      context.beginPath();
      context.moveTo(px, py);
      context.lineTo(px - drift * 11, py + 5 + size * 2);
      context.stroke();
    } else if (
      particleStyle.includes("snow") ||
      particleStyle.includes("dust") ||
      particleStyle.includes("mote") ||
      particleStyle.includes("spore")
    ) {
      context.fillStyle = rgba(environment.starRgb, alpha);
      context.beginPath();
      context.arc(px, py, size * 0.52, 0, TAU);
      context.fill();
    } else if (
      particleStyle.includes("leaf") ||
      particleStyle.includes("petal") ||
      particleStyle.includes("pollen")
    ) {
      context.fillStyle = rgba(environment.gridRgb, alpha);
      context.beginPath();
      context.ellipse(px, py, size, size * 0.45, phase, 0, TAU);
      context.fill();
    } else if (
      particleStyle.includes("shard") ||
      particleStyle.includes("fragment") ||
      particleStyle.includes("glass") ||
      particleStyle.includes("debris") ||
      particleStyle.includes("meteor") ||
      particleStyle.includes("comet")
    ) {
      context.strokeStyle = rgba(environment.starRgb, alpha + 0.04);
      context.lineWidth = Math.max(1, size * 0.4);
      context.beginPath();
      context.moveTo(px - size * 2.8, py - size);
      context.lineTo(px + size, py + size * 0.35);
      context.stroke();
    } else if (archetype === "infernal") {
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
  const vanishingY = height * Math.max(0.34, profile.horizonRatio + 0.12);
  const pulse = 0.72 + Math.sin(time * 0.22) * 0.08;

  context.save();
  context.strokeStyle = rgba(environment.gridRgb, 0.038 * pulse);
  context.lineWidth = 1;

  // Sparse light-lane perspective: enough depth to guide the eye, without
  // creating the previous "stack of rings" look.
  for (const endX of [0.12, 0.34, 0.66, 0.88]) {
    context.beginPath();
    context.moveTo(width * 0.5, vanishingY);
    context.quadraticCurveTo(
      width * (0.5 + (endX - 0.5) * 0.35),
      height * 0.67,
      width * endX,
      height,
    );
    context.stroke();
  }

  context.globalAlpha = 0.35;
  context.beginPath();
  context.moveTo(width * 0.31, height);
  context.quadraticCurveTo(
    width * 0.42,
    height * 0.67,
    width * 0.485,
    vanishingY,
  );
  context.stroke();

  context.beginPath();
  context.moveTo(width * 0.69, height);
  context.quadraticCurveTo(
    width * 0.58,
    height * 0.67,
    width * 0.515,
    vanishingY,
  );
  context.stroke();

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

function drawFloorSignature(
  context: CanvasRenderingContext2D,
  input: WorldSceneDrawInput,
): void {
  const { width, height, time, profile, environment } = input;
  const style = profile.floorStyle;
  const horizon = height * profile.horizonRatio;
  const accent = rgba(environment.gridRgb, 0.055);

  context.save();
  context.strokeStyle = accent;
  context.lineWidth = 1;

  if (style.includes("rift")) {
    context.beginPath();
    context.moveTo(width * 0.5, horizon);
    for (let step = 1; step <= 12; step += 1) {
      const t = step / 12;
      context.lineTo(
        width * 0.5 +
          Math.sin(step * 2.35 + profile.variant) *
            width *
            0.022 *
            t,
        horizon + (height - horizon) * t,
      );
    }
    context.stroke();
  } else if (style.includes("root") || style.includes("vine")) {
    for (const side of [-1, 1]) {
      context.beginPath();
      context.moveTo(width * 0.5, horizon);
      context.bezierCurveTo(
        width * 0.5 + side * width * 0.04,
        height * 0.48,
        width * 0.5 + side * width * 0.2,
        height * 0.72,
        width * 0.5 + side * width * 0.34,
        height,
      );
      context.stroke();
    }
  } else if (
    style.includes("grid") ||
    style.includes("panel") ||
    style.includes("conduit") ||
    style.includes("track")
  ) {
    const offset = (time * 32) % 64;
    for (let index = 0; index < 8; index += 1) {
      const y = perspectiveY(horizon, height, index, offset, 74);
      const p = (y - horizon) / Math.max(1, height - horizon);
      const half = width * (0.035 + p * 0.3);
      context.strokeRect(
        width * 0.5 - half,
        y,
        half * 2,
        Math.max(2, p * 11),
      );
    }
  } else if (
    style.includes("ice") ||
    style.includes("frozen") ||
    style.includes("glacier")
  ) {
    for (let index = 0; index < 5; index += 1) {
      const startX = width * (0.18 + index * 0.16);
      context.beginPath();
      context.moveTo(startX, height);
      context.lineTo(
        width * 0.5 + (index - 2) * width * 0.02,
        horizon,
      );
      context.stroke();
    }
  } else if (
    style.includes("halo") ||
    style.includes("prism") ||
    style.includes("crown") ||
    style.includes("infinity")
  ) {
    for (let index = 0; index < 4; index += 1) {
      const t = (index + 1) / 5;
      const y = horizon + (height - horizon) * t * t;
      context.beginPath();
      context.ellipse(
        width * 0.5,
        y,
        width * (0.06 + t * 0.34),
        height * (0.006 + t * 0.014),
        0,
        0,
        TAU,
      );
      context.stroke();
    }
  } else {
    for (const side of [-1, 1]) {
      context.beginPath();
      context.moveTo(width * 0.5 + side * width * 0.04, horizon);
      context.lineTo(width * 0.5 + side * width * 0.32, height);
      context.stroke();
    }
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
  drawFloorSignature(context, input);
}

export type WorldSceneRenderPolicy = {
  drawLegacyStaticScene: boolean;
  drawLegacyCinematicMotion: boolean;
  drawLegacyFloorFallback: boolean;
  drawLegacyCinematicEvents: boolean;
};

export function worldSceneRenderPolicy(
  profile: LayeredBackgroundProfile,
): WorldSceneRenderPolicy {
  const production = profile.renderMode === "authored-production";
  return {
    drawLegacyStaticScene: !production,
    drawLegacyCinematicMotion: !production,
    drawLegacyFloorFallback: !production,
    drawLegacyCinematicEvents: !production,
  };
}

export class WorldSceneRenderer {
  private cacheCanvas: HTMLCanvasElement | null = null;
  private cacheKey = "";
  private readonly layeredRenderer = new LayeredBackgroundRenderer();
  private layeredProfile: LayeredBackgroundProfile | null = null;
  private layeredProfileSceneId = "";

  invalidate(): void {
    this.cacheKey = "";
    this.cacheCanvas = null;
  }

  destroy(): void {
    this.invalidate();
    this.layeredRenderer.clear();
    this.layeredProfile = null;
    this.layeredProfileSceneId = "";
  }

  private authoredProfile(
    scene: WorldSceneProfile,
  ): LayeredBackgroundProfile {
    if (
      this.layeredProfile === null ||
      this.layeredProfileSceneId !== scene.id
    ) {
      this.layeredProfile = layeredBackgroundForScene(scene);
      this.layeredProfileSceneId = scene.id;
    }
    return this.layeredProfile;
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
    const authoredProfile = this.authoredProfile(input.profile);
    const policy = worldSceneRenderPolicy(authoredProfile);

    if (policy.drawLegacyStaticScene) {
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
    } else {
      // Production-authored Worlds must not inherit prototype landmarks.
      // Keep only a neutral gradient behind assets while images decode.
      drawProductionLoadingSky(context, input);
    }

    const authoredReady = this.layeredRenderer.draw(
      context,
      authoredProfile,
      {
        width: input.width,
        height: input.height,
        time: input.time,
        quality: input.quality,
        flightIntensity: input.profile.flightIntensity,
        variant: input.profile.variant,
      },
    );

    const authoredAmbientFx = worldUsesAuthoredAmbientEffects(
      input.profile.worldId,
    );

    // Production Worlds may own their ambient FX so they do not stack generic
    // particles/stars on top of an already art-directed scene.
    if (!authoredAmbientFx) {
      drawStars(context, input);
    }

    drawWorldAmbientEffects(context, {
      profile: input.profile,
      quality: input.quality,
      width: input.width,
      height: input.height,
      time: input.time,
    });

    if (policy.drawLegacyCinematicMotion) {
      drawCinematicMotion(context, input);
    }

    if (policy.drawLegacyFloorFallback && !authoredReady) {
      drawFloor(context, input);
    }

    if (!authoredAmbientFx) {
      drawAmbientParticles(context, input);
    }

    if (policy.drawLegacyCinematicEvents) {
      drawCinematicEvents(context, input);
    }
  }
}
