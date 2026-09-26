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
  waterfallSpray: boolean;
  starDrift: boolean;
  galaxyDrift: boolean;
  haloGlow: boolean;
  lightRays: boolean;
  meteorCount: number;
};

const HALO_GARDEN_EFFECTS: WorldAmbientEffectsProfile = {
  worldId: "world-02",
  cloudMist: true,
  waterfallShimmer: true,
  waterfallSpray: true,
  starDrift: true,
  galaxyDrift: true,
  haloGlow: true,
  lightRays: true,
  meteorCount: 2,
};

const EFFECT_PROFILES: Readonly<Record<string, WorldAmbientEffectsProfile>> = {
  "world-02": HALO_GARDEN_EFFECTS,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
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
  const { width, height, time, quality } = input;
  const qualityScale =
    quality === "low" ? 0.72 : quality === "medium" ? 0.86 : 1;
  const x = width * 0.38 + Math.sin(time * 0.12) * width * 0.028;
  const y = height * 0.125 + Math.cos(time * 0.09) * height * 0.018;
  const radius = Math.max(width, height) * 0.34;
  const pulse = 0.88 + Math.sin(time * 0.42) * 0.12;

  context.save();
  context.globalCompositeOperation = "screen";
  context.translate(x, y);
  context.rotate(time * 0.075);

  const glow = context.createRadialGradient(0, 0, 0, 0, 0, radius);
  glow.addColorStop(0, "rgba(170, 118, 255, 0.17)");
  glow.addColorStop(0.3, "rgba(94, 154, 255, 0.11)");
  glow.addColorStop(0.72, "rgba(70, 126, 255, 0.035)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.globalAlpha = pulse * qualityScale;
  context.fillStyle = glow;
  context.fillRect(-radius, -radius, radius * 2, radius * 2);

  context.lineCap = "round";
  for (let arm = 0; arm < 3; arm += 1) {
    const armRadius = radius * (0.2 + arm * 0.105);
    context.globalAlpha = (0.08 - arm * 0.012) * qualityScale;
    context.strokeStyle = arm % 2 === 0 ? "#bda5ff" : "#78cfff";
    context.lineWidth = Math.max(
      1.4,
      width * (0.0016 - arm * 0.00018),
    );
    context.beginPath();
    context.ellipse(
      0,
      0,
      armRadius * 1.42,
      armRadius * 0.46,
      arm * 0.43,
      Math.PI * 0.1,
      Math.PI * 1.65,
    );
    context.stroke();
  }

  context.restore();
}


function drawCloudMist(
  context: CanvasRenderingContext2D,
  input: WorldAmbientEffectsInput,
): void {
  const { width, height, time, quality } = input;
  const factor = qualityFactor(quality);
  const farCount = Math.max(3, Math.round(6 * factor));
  const nearCount = Math.max(2, Math.round(4 * factor));

  const drawBand = (
    count: number,
    baseY: number,
    speedPixelsPerSecond: number,
    alpha: number,
    scale: number,
    salt: number,
  ): void => {
    context.save();
    context.globalCompositeOperation = "screen";

    for (let index = 0; index < count; index += 1) {
      const phase = seededUnit(index, salt);
      const widthRatio =
        0.1 + seededUnit(index, salt + 1) * 0.11;
      const rx = width * widthRatio * scale;
      const ry =
        height * (0.03 + widthRatio * 0.065) * scale;
      const travelWidth = width + rx * 2;
      const seededX =
        phase * travelWidth +
        index * (travelWidth / Math.max(1, count));
      const x =
        positiveModulo(
          seededX + time * speedPixelsPerSecond,
          travelWidth,
        ) - rx;
      const y =
        height *
        (baseY +
          (seededUnit(index, salt + 2) - 0.5) * 0.065 +
          Math.sin(time * 0.23 + phase * Math.PI * 2) * 0.009);

      context.globalAlpha =
        alpha * (0.76 + seededUnit(index, salt + 3) * 0.24);
      const mist =
        context.createRadialGradient(x, y, 0, x, y, rx);
      mist.addColorStop(0, "rgba(241, 249, 255, 0.5)");
      mist.addColorStop(0.46, "rgba(193, 224, 255, 0.25)");
      mist.addColorStop(1, "rgba(193, 224, 255, 0)");
      context.fillStyle = mist;
      context.beginPath();
      context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      context.fill();
    }

    context.restore();
  };

  // Use pixels/second so motion is visible in normal gameplay captures.
  drawBand(farCount, 0.52, 8, 0.15, 0.86, 11);
  if (quality !== "low") {
    drawBand(nearCount, 0.76, -17, 0.12, 1.1, 29);
  }
}

// Coordinates are authored against the World 02 2560x1440 production master.
// Strongest/clearest falls come first so reduced-quality modes preserve identity.
const WATERFALLS = [
  { x: 0.72, y0: 0.38, y1: 0.54, width: 0.012 },
  { x: 0.294, y0: 0.4, y1: 0.56, width: 0.013 },
  { x: 0.16, y0: 0.18, y1: 0.32, width: 0.011 },
  { x: 0.765, y0: 0.38, y1: 0.53, width: 0.009 },
  { x: 0.276, y0: 0.41, y1: 0.53, width: 0.009 },
] as const;

type Waterfall = (typeof WATERFALLS)[number];

function traceWaterfallClip(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  fall: Waterfall,
): void {
  const x = width * fall.x;
  const y0 = height * fall.y0;
  const y1 = height * fall.y1;
  const topHalf = Math.max(3, width * fall.width * 0.62);
  const bottomHalf = Math.max(2, width * fall.width * 0.43);

  context.beginPath();
  context.moveTo(x - topHalf, y0);
  context.lineTo(x + topHalf, y0);
  context.lineTo(x + bottomHalf, y1);
  context.lineTo(x - bottomHalf, y1);
  context.closePath();
  context.clip();
}


function drawWaterfallShimmer(
  context: CanvasRenderingContext2D,
  input: WorldAmbientEffectsInput,
): void {
  const { width, height, time, quality } = input;
  const count =
    quality === "low"
      ? 1
      : quality === "medium"
        ? 3
        : quality === "high"
          ? 4
          : WATERFALLS.length;

  for (let index = 0; index < count; index += 1) {
    const fall = WATERFALLS[index]!;
    const x = width * fall.x;
    const y0 = height * fall.y0;
    const y1 = height * fall.y1;
    const fallWidth = Math.max(5, width * fall.width);
    const fallHeight = Math.max(20, y1 - y0);

    context.save();
    traceWaterfallClip(context, width, height, fall);

    // Dark cyan flow channels remain visible even over the near-white baked
    // waterfall. Moving these channels makes the water itself read as flowing.
    context.globalCompositeOperation = "multiply";
    for (let lane = 0; lane < 3; lane += 1) {
      const laneX =
        x +
        (lane - 1) * fallWidth * 0.24 +
        Math.sin(time * 1.15 + lane + index) *
          fallWidth *
          0.08;
      const segment =
        Math.max(30, fallHeight * (0.24 + lane * 0.035));
      const offset =
        positiveModulo(
          time * (115 + lane * 24 + index * 8) + lane * 31,
          segment,
        );

      context.fillStyle =
        lane === 1
          ? "rgba(72, 164, 224, 0.2)"
          : "rgba(84, 184, 236, 0.14)";
      for (
        let y = y0 - segment + offset;
        y < y1 + segment;
        y += segment
      ) {
        context.fillRect(
          laneX - fallWidth * 0.11,
          y,
          fallWidth * 0.22,
          segment * 0.52,
        );
      }
    }

    // Faster white highlights provide a second flow velocity.
    context.globalCompositeOperation = "screen";
    const highlightSegment =
      Math.max(42, fallHeight * 0.28);
    const highlightOffset =
      positiveModulo(
        time * (168 + index * 11),
        highlightSegment,
      );
    const highlight =
      context.createLinearGradient(0, y0, 0, y1);
    highlight.addColorStop(0, "rgba(224, 250, 255, 0)");
    highlight.addColorStop(
      0.45,
      "rgba(234, 253, 255, 0.74)",
    );
    highlight.addColorStop(1, "rgba(255, 255, 255, 0)");
    context.fillStyle = highlight;

    for (
      let y = y0 - highlightSegment + highlightOffset;
      y < y1 + highlightSegment;
      y += highlightSegment
    ) {
      context.globalAlpha = 0.82;
      context.fillRect(
        x - fallWidth * 0.28,
        y,
        fallWidth * 0.56,
        highlightSegment * 0.38,
      );
    }

    context.restore();
  }
}

function drawWaterfallSpray(
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
    const y = height * fall.y1;
    const radiusX = Math.max(18, width * (0.018 + index * 0.002));
    const radiusY = Math.max(8, height * (0.011 + index * 0.0015));
    const pulse = 0.74 + Math.sin(time * 1.45 + index * 1.1) * 0.18;

    const mist = context.createRadialGradient(
      x,
      y,
      0,
      x,
      y,
      radiusX,
    );
    mist.addColorStop(0, "rgba(235, 252, 255, 0.38)");
    mist.addColorStop(0.42, "rgba(174, 226, 255, 0.18)");
    mist.addColorStop(1, "rgba(174, 226, 255, 0)");

    context.globalAlpha = pulse;
    context.fillStyle = mist;
    context.beginPath();
    context.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}


function drawHaloGlow(
  context: CanvasRenderingContext2D,
  input: WorldAmbientEffectsInput,
): void {
  const { width, height, time } = input;
  const x = width * 0.855;
  const y = height * 0.165;
  const pulse = 0.86 + Math.sin(time * 1.35) * 0.14;
  const radius = Math.min(width, height) * 0.18;

  context.save();
  context.globalCompositeOperation = "screen";

  const glow =
    context.createRadialGradient(x, y, 0, x, y, radius * 1.42);
  glow.addColorStop(0, "rgba(255, 247, 198, 0.24)");
  glow.addColorStop(0.34, "rgba(255, 215, 115, 0.12)");
  glow.addColorStop(1, "rgba(255, 226, 150, 0)");
  context.globalAlpha = pulse;
  context.fillStyle = glow;
  context.fillRect(
    x - radius * 1.5,
    y - radius * 1.5,
    radius * 3,
    radius * 3,
  );

  context.translate(x, y);
  context.rotate(time * 0.19);
  context.globalAlpha = 0.22 + (pulse - 0.72) * 0.35;
  context.strokeStyle = "#ffe7a5";
  context.lineWidth = Math.max(1.5, width * 0.00135);
  context.setLineDash([
    Math.max(12, radius * 0.18),
    Math.max(15, radius * 0.22),
  ]);
  context.beginPath();
  context.arc(0, 0, radius * 0.73, 0, Math.PI * 2);
  context.stroke();

  context.rotate(-time * 0.31);
  context.globalAlpha = 0.14;
  context.strokeStyle = "#bdeaff";
  context.lineWidth = Math.max(1, width * 0.0009);
  context.setLineDash([
    Math.max(8, radius * 0.12),
    Math.max(18, radius * 0.28),
  ]);
  context.beginPath();
  context.arc(0, 0, radius * 0.9, 0, Math.PI * 2);
  context.stroke();

  context.restore();
}

function drawLightRays(
  context: CanvasRenderingContext2D,
  input: WorldAmbientEffectsInput,
): void {
  if (input.quality === "low") return;

  const { width, height, time, quality } = input;
  const count = quality === "medium" ? 2 : 3;
  const originX = width * 0.84;
  const originY = height * 0.09;

  context.save();
  context.globalCompositeOperation = "screen";

  for (let index = 0; index < count; index += 1) {
    const sway = Math.sin(time * (0.07 + index * 0.012) + index * 1.7);
    const endX =
      width * (0.56 + index * 0.11) + sway * width * (0.018 + index * 0.004);
    const endY = height * (0.58 + index * 0.07);
    const halfWidth = width * (0.018 + index * 0.004);
    const alpha = 0.04 + index * 0.01;

    const beam = context.createLinearGradient(
      originX,
      originY,
      endX,
      endY,
    );
    beam.addColorStop(0, "rgba(255, 245, 190, " + String(alpha * 1.8) + ")");
    beam.addColorStop(0.48, "rgba(197, 229, 255, " + String(alpha) + ")");
    beam.addColorStop(1, "rgba(146, 205, 255, 0)");

    context.fillStyle = beam;
    context.beginPath();
    context.moveTo(originX - halfWidth * 0.18, originY);
    context.lineTo(originX + halfWidth * 0.18, originY);
    context.lineTo(endX + halfWidth, endY);
    context.lineTo(endX - halfWidth, endY);
    context.closePath();
    context.fill();
  }

  context.restore();
}


function drawStarDrift(
  context: CanvasRenderingContext2D,
  input: WorldAmbientEffectsInput,
): void {
  const { width, height, time, quality } = input;
  const count =
    quality === "low"
      ? 18
      : quality === "medium"
        ? 30
        : quality === "high"
          ? 46
          : 60;

  context.save();
  context.globalCompositeOperation = "screen";

  for (let index = 0; index < count; index += 1) {
    const ux = seededUnit(index, 51);
    const uy = seededUnit(index, 52);
    const depth =
      0.35 + seededUnit(index, 56) * 0.65;
    const phase = seededUnit(index, 53) * Math.PI * 2;
    const speed = 3 + depth * 8.5;
    const x =
      positiveModulo(
        ux * width + time * speed + index * 1.7,
        width,
      );
    const y =
      (uy +
        Math.sin(
          time * (0.18 + depth * 0.08) + phase,
        ) *
          0.0045) *
      height *
      0.58;
    const twinkle =
      0.45 +
      (Math.sin(
        time * (1.05 + ux * 0.7) + phase,
      ) +
        1) *
        0.25;
    const radius = 0.65 + depth * 1.45;

    context.globalAlpha =
      clamp(twinkle, 0.28, 0.94);
    context.fillStyle =
      index % 5 === 0 ? "#ffe6a8" : "#d9f5ff";
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
  const count =
    quality === "ultra"
      ? Math.min(maxCount, 2)
      : Math.min(maxCount, 1);
  const periodSeconds = 4.8;
  const visibleSeconds = 1.05;

  context.save();
  context.globalCompositeOperation = "screen";
  context.lineCap = "round";

  for (let index = 0; index < count; index += 1) {
    const offsetSeconds =
      index * (periodSeconds * 0.5);
    const local =
      positiveModulo(
        time - offsetSeconds,
        periodSeconds,
      );
    if (local > visibleSeconds) continue;

    const slot =
      Math.floor(
        (time - offsetSeconds) / periodSeconds,
      );
    const seedIndex =
      Math.abs(slot * 3 + index);
    const progress =
      clamp(local / visibleSeconds, 0, 1);
    const startX =
      width *
      (0.12 + seededUnit(seedIndex, 73) * 0.42);
    const startY =
      height *
      (0.045 + seededUnit(seedIndex, 74) * 0.17);
    const travelX =
      width *
      (0.24 + seededUnit(seedIndex, 75) * 0.15);
    const travelY =
      height *
      (0.1 + seededUnit(seedIndex, 76) * 0.08);
    const x = startX + travelX * progress;
    const y = startY + travelY * progress;
    const length =
      width *
      (0.075 + seededUnit(seedIndex, 77) * 0.035);
    const alpha =
      Math.sin(progress * Math.PI) * 0.96;

    const gradient =
      context.createLinearGradient(
        x - length,
        y - length * 0.34,
        x,
        y,
      );
    gradient.addColorStop(
      0,
      "rgba(112, 202, 255, 0)",
    );
    gradient.addColorStop(
      0.62,
      "rgba(142, 218, 255, 0.46)",
    );
    gradient.addColorStop(
      1,
      "rgba(255, 248, 205, 0.98)",
    );

    context.globalAlpha = alpha;
    context.strokeStyle = gradient;
    context.lineWidth = 2.2 + index * 0.55;
    context.beginPath();
    context.moveTo(
      x - length,
      y - length * 0.34,
    );
    context.lineTo(x, y);
    context.stroke();

    context.globalAlpha =
      Math.min(1, alpha + 0.12);
    context.fillStyle = "#fff6cf";
    context.shadowBlur = 12;
    context.shadowColor = "#9be7ff";
    context.beginPath();
    context.arc(
      x,
      y,
      2.3 + index * 0.45,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.shadowBlur = 0;
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
  if (profile.waterfallSpray) drawWaterfallSpray(context, input);
  if (profile.haloGlow) drawHaloGlow(context, input);
  if (profile.lightRays) drawLightRays(context, input);
  if (profile.starDrift) drawStarDrift(context, input);
  drawMeteors(context, input, profile.meteorCount);
}
