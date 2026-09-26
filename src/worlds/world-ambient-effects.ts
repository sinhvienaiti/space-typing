import type { VisualQuality } from "../types";
import type { WorldSceneProfile } from "./scene-types";

export type WorldAmbientEffectsInput = {
  profile: WorldSceneProfile;
  quality: VisualQuality;
  width: number;
  height: number;
  time: number;
};

export type WorldAmbientEffectsProfile = {
  worldId: string;
  cloudMist: boolean;
  waterfallShimmer: boolean;
  starDrift: boolean;
  galaxyDrift: boolean;
  haloGlow: boolean;
  meteorCount: number;
};

const HALO_GARDEN_EFFECTS: WorldAmbientEffectsProfile = {
  worldId: "world-02",
  cloudMist: true,
  waterfallShimmer: true,
  starDrift: true,
  galaxyDrift: true,
  haloGlow: true,
  meteorCount: 3,
};

const EFFECT_PROFILES: Readonly<Record<string, WorldAmbientEffectsProfile>> = {
  "world-02": HALO_GARDEN_EFFECTS,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function qualityFactor(quality: VisualQuality): number {
  if (quality === "low") return 0.45;
  if (quality === "medium") return 0.68;
  if (quality === "high") return 0.86;
  return 1;
}

function seededUnit(index: number, salt: number): number {
  let value =
    Math.imul(index + 1, 0x9e3779b1) ^
    Math.imul(salt + 1, 0x85ebca6b);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return (value >>> 0) / 0xffffffff;
}

export function worldAmbientEffectsProfile(
  worldId: string,
): WorldAmbientEffectsProfile | null {
  return EFFECT_PROFILES[worldId] ?? null;
}

export function worldUsesAuthoredAmbientEffects(worldId: string): boolean {
  return EFFECT_PROFILES[worldId] !== undefined;
}

function drawGalaxyDrift(
  context: CanvasRenderingContext2D,
  input: WorldAmbientEffectsInput,
): void {
  const { width, height, time } = input;
  const drift = Math.sin(time * 0.018) * width * 0.025;
  const x = width * 0.3 + drift;
  const y = height * 0.16 + Math.cos(time * 0.014) * height * 0.012;
  const radius = Math.max(width, height) * 0.34;
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, "rgba(111, 86, 255, 0.12)");
  gradient.addColorStop(0.35, "rgba(71, 164, 255, 0.065)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  context.save();
  context.globalCompositeOperation = "screen";
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height * 0.62);
  context.restore();
}

function drawCloudMist(
  context: CanvasRenderingContext2D,
  input: WorldAmbientEffectsInput,
): void {
  const { width, height, time, quality } = input;
  const factor = qualityFactor(quality);
  const farCount = Math.max(3, Math.round(7 * factor));
  const nearCount = Math.max(2, Math.round(5 * factor));

  const drawBand = (
    count: number,
    baseY: number,
    speed: number,
    alpha: number,
    scale: number,
    salt: number,
  ): void => {
    context.save();
    context.globalCompositeOperation = "screen";
    for (let index = 0; index < count; index += 1) {
      const phase = seededUnit(index, salt);
      const widthRatio = 0.12 + seededUnit(index, salt + 1) * 0.13;
      const x =
        ((phase + time * speed + index / count) % 1.18 - 0.09) * width;
      const y =
        height *
        (baseY +
          (seededUnit(index, salt + 2) - 0.5) * 0.08 +
          Math.sin(time * 0.025 + phase * Math.PI * 2) * 0.008);
      const rx = width * widthRatio * scale;
      const ry = height * (0.035 + widthRatio * 0.08) * scale;

      context.globalAlpha =
        alpha * (0.7 + seededUnit(index, salt + 3) * 0.3);
      context.fillStyle = "rgba(216, 236, 255, 0.48)";
      context.beginPath();
      context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  };

  drawBand(farCount, 0.52, 0.00075, 0.11, 0.75, 11);
  if (quality !== "low") {
    drawBand(nearCount, 0.76, 0.00115, 0.085, 1, 29);
  }
}

const WATERFALLS = [
  { x: 0.072, y0: 0.24, y1: 0.67, width: 0.012 },
  { x: 0.728, y0: 0.28, y1: 0.61, width: 0.01 },
  { x: 0.79, y0: 0.3, y1: 0.68, width: 0.008 },
  { x: 0.92, y0: 0.4, y1: 0.74, width: 0.009 },
] as const;

function drawWaterfallShimmer(
  context: CanvasRenderingContext2D,
  input: WorldAmbientEffectsInput,
): void {
  const { width, height, time, quality } = input;
  const count =
    quality === "low"
      ? 1
      : quality === "medium"
        ? 2
        : quality === "high"
          ? 3
          : WATERFALLS.length;

  context.save();
  context.globalCompositeOperation = "screen";

  for (let index = 0; index < count; index += 1) {
    const fall = WATERFALLS[index]!;
    const x = width * fall.x;
    const y0 = height * fall.y0;
    const y1 = height * fall.y1;
    const fallWidth = Math.max(2, width * fall.width);
    const cycle = (time * (0.12 + index * 0.015) + index * 0.23) % 1;

    const column = context.createLinearGradient(0, y0, 0, y1);
    column.addColorStop(0, "rgba(184, 239, 255, 0.05)");
    column.addColorStop(0.32, "rgba(126, 218, 255, 0.22)");
    column.addColorStop(0.8, "rgba(218, 247, 255, 0.1)");
    column.addColorStop(1, "rgba(255, 255, 255, 0)");
    context.fillStyle = column;
    context.fillRect(x - fallWidth * 0.5, y0, fallWidth, y1 - y0);

    const streakY = y0 + (y1 - y0) * cycle;
    const streak = context.createLinearGradient(0, streakY - 36, 0, streakY + 50);
    streak.addColorStop(0, "rgba(255,255,255,0)");
    streak.addColorStop(0.45, "rgba(225,250,255,0.46)");
    streak.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = streak;
    context.globalAlpha = 0.6;
    context.fillRect(
      x - fallWidth * 0.32,
      streakY - 36,
      fallWidth * 0.64,
      86,
    );
    context.globalAlpha = 1;
  }

  context.restore();
}

function drawHaloGlow(
  context: CanvasRenderingContext2D,
  input: WorldAmbientEffectsInput,
): void {
  const { width, height, time } = input;
  const x = width * 0.83;
  const y = height * 0.18;
  const pulse = 0.82 + Math.sin(time * 0.9) * 0.12;
  const radius = Math.min(width, height) * 0.22;
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, "rgba(255, 244, 183, 0.2)");
  gradient.addColorStop(0.3, "rgba(255, 218, 120, 0.09)");
  gradient.addColorStop(1, "rgba(255, 226, 150, 0)");

  context.save();
  context.globalCompositeOperation = "screen";
  context.globalAlpha = pulse;
  context.fillStyle = gradient;
  context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  context.restore();
}

function drawStarDrift(
  context: CanvasRenderingContext2D,
  input: WorldAmbientEffectsInput,
): void {
  const { width, height, time, quality } = input;
  const count = Math.round(
    (quality === "low"
      ? 14
      : quality === "medium"
        ? 22
        : quality === "high"
          ? 30
          : 38),
  );

  context.save();
  context.globalCompositeOperation = "screen";

  for (let index = 0; index < count; index += 1) {
    const ux = seededUnit(index, 51);
    const uy = seededUnit(index, 52);
    const phase = seededUnit(index, 53) * Math.PI * 2;
    const x = ((ux + time * (0.00005 + seededUnit(index, 54) * 0.00005)) % 1) * width;
    const y = uy * height * 0.56;
    const twinkle = 0.35 + (Math.sin(time * (0.8 + ux) + phase) + 1) * 0.22;
    const radius = 0.55 + seededUnit(index, 55) * 1.25;

    context.globalAlpha = clamp(twinkle, 0.18, 0.78);
    context.fillStyle = index % 4 === 0 ? "#ffe6a8" : "#d9f5ff";
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function drawMeteors(
  context: CanvasRenderingContext2D,
  input: WorldAmbientEffectsInput,
  maxCount: number,
): void {
  if (input.quality === "low") return;

  const { width, height, time, quality } = input;
  const qualityLimit = quality === "medium" ? 1 : quality === "high" ? 2 : 3;
  const count = Math.min(maxCount, qualityLimit);

  context.save();
  context.globalCompositeOperation = "screen";
  context.lineCap = "round";

  for (let index = 0; index < count; index += 1) {
    const cycleSeconds = 8.5 + index * 3.2;
    const cycle = (time / cycleSeconds + seededUnit(index, 72)) % 1;
    const visibleStart = 0.08 + index * 0.015;
    const visibleEnd = visibleStart + 0.14;
    if (cycle < visibleStart || cycle > visibleEnd) continue;

    const progress = (cycle - visibleStart) / (visibleEnd - visibleStart);
    const startX = width * (0.2 + seededUnit(index, 73) * 0.5);
    const startY = height * (0.035 + seededUnit(index, 74) * 0.18);
    const travelX = width * (0.28 + seededUnit(index, 75) * 0.18);
    const travelY = height * (0.12 + seededUnit(index, 76) * 0.1);
    const x = startX + travelX * progress;
    const y = startY + travelY * progress;
    const length = width * (0.055 + seededUnit(index, 77) * 0.035);
    const alpha = Math.sin(progress * Math.PI) * 0.72;

    const gradient = context.createLinearGradient(x - length, y - length * 0.35, x, y);
    gradient.addColorStop(0, "rgba(123, 211, 255, 0)");
    gradient.addColorStop(0.72, "rgba(157, 222, 255, 0.42)");
    gradient.addColorStop(1, "rgba(255, 247, 206, 0.92)");

    context.globalAlpha = alpha;
    context.strokeStyle = gradient;
    context.lineWidth = 1.4 + index * 0.45;
    context.beginPath();
    context.moveTo(x - length, y - length * 0.35);
    context.lineTo(x, y);
    context.stroke();

    context.fillStyle = "#fff3c8";
    context.beginPath();
    context.arc(x, y, 1.6 + index * 0.35, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

export function drawWorldAmbientEffects(
  context: CanvasRenderingContext2D,
  input: WorldAmbientEffectsInput,
): void {
  const profile = worldAmbientEffectsProfile(input.profile.worldId);
  if (profile === null) return;

  if (profile.galaxyDrift) drawGalaxyDrift(context, input);
  if (profile.cloudMist) drawCloudMist(context, input);
  if (profile.waterfallShimmer) drawWaterfallShimmer(context, input);
  if (profile.haloGlow) drawHaloGlow(context, input);
  if (profile.starDrift) drawStarDrift(context, input);
  drawMeteors(context, input, profile.meteorCount);
}
