import type { CharacterId } from "./registry";
import {
  characterVisualProfile,
  type CharacterSilhouette,
  type CharacterVisualProfile,
} from "./visuals";
import { characterShipRuntimeImage } from "./ship-media-runtime";
import {
  EQUIPMENT_AURA_COLORS,
  type EquipmentAuraProfile,
} from "./equipment-aura";
import {
  drawShipHalo,
  drawShipLights,
  shipLightRig,
  type ShipLightRig,
} from "./ship-lights";
import { drawShip3D, type ShipSocketPoints } from "../render3d/ship-model";
import { shipVisualImage, shipVisualLightRig } from "./ship-art";

/** Light rig for a modelled hull: the painted rig's look on the model's sockets. */
function modelLightRig(
  characterId: CharacterId,
  profile: Readonly<CharacterVisualProfile>,
  sockets: ShipSocketPoints,
): ShipLightRig {
  const painted = shipVisualLightRig(characterId) ?? shipLightRig(characterId);
  const base: ShipLightRig = painted ?? {
    nozzles: [],
    plumeWidth: 4,
    plumeLength: 26,
    core: [0, -10],
    coreRadius: 11,
    glint: [0, -20],
    tips: [],
    hot: "#effcff",
    plume: profile.engine,
    outer: profile.secondary,
    halo: profile.glow,
    light: "#ffffff",
  };
  const core = sockets.core ?? base.core;
  return {
    ...base,
    nozzles: sockets.nozzles.length > 0 ? sockets.nozzles : base.nozzles,
    core,
    glint: [core[0], core[1] - base.coreRadius],
    tips: sockets.tips.length > 0 ? sockets.tips : base.tips,
  };
}

export type CharacterDrawOptions = {
  x: number;
  y: number;
  time: number;
  scale?: number;
  glowScale?: number;
  alpha?: number;
  aura?: EquipmentAuraProfile | null;
  detailScale?: number;
  /** Turn toward the current target, radians clockwise (0 = nose up). */
  aim?: number;
  /** 0–1 recoil of the last shot: nudges the hull back along its axis. */
  recoil?: number;
  /** 0–1 engine throttle: longer, brighter plumes. */
  boost?: number;
  /** Style Shop ship paint: a CSS filter baked once into a copy of the painted hull. */
  paint?: string | null;
  /** Style Shop engine trail colours (#rrggbb) for the drawn engines and tail. */
  trail?: { hot: string; plume: string } | null;
};

const PAINT_CACHE_LIMIT = 24;
const paintedHulls = new Map<string, HTMLCanvasElement>();

/**
 * The painted hull region recoloured by `filter`, made once and reused: the
 * filter never runs per frame. Null when the browser has no canvas filter.
 */
function paintedHull(image: HTMLImageElement, sx: number, sy: number, sw: number, sh: number, filter: string): HTMLCanvasElement | null {
  const key = image.src + "|" + sx + "," + sy + "," + sw + "," + sh + "|" + filter;
  const cached = paintedHulls.get(key);
  if (cached !== undefined) return cached;
  if (!image.complete || image.naturalWidth === 0 || typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw));
  canvas.height = Math.max(1, Math.round(sh));
  const context = canvas.getContext("2d");
  if (context === null || !("filter" in context)) return null;
  context.filter = filter;
  context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  if (paintedHulls.size >= PAINT_CACHE_LIMIT) paintedHulls.delete(paintedHulls.keys().next().value!);
  paintedHulls.set(key, canvas);
  return canvas;
}

const trailRigs = new WeakMap<Readonly<ShipLightRig>, Map<string, Readonly<ShipLightRig>>>();

/** A light rig with its plume colours swapped for a Style Shop trail (cached). */
export function withTrailRig(rig: Readonly<ShipLightRig>, trail: { hot: string; plume: string } | null | undefined): Readonly<ShipLightRig> {
  if (!trail) return rig;
  let byTrail = trailRigs.get(rig);
  if (byTrail === undefined) {
    byTrail = new Map();
    trailRigs.set(rig, byTrail);
  }
  const key = trail.hot + trail.plume;
  let next = byTrail.get(key);
  if (next === undefined) {
    next = Object.freeze({ ...rig, hot: trail.hot, plume: trail.plume, outer: trail.plume });
    byTrail.set(key, next);
  }
  return next;
}

const trailProfiles = new WeakMap<Readonly<CharacterVisualProfile>, Map<string, Readonly<CharacterVisualProfile>>>();

/** The visual profile with the engine colours swapped for a Style Shop trail (cached). */
function withTrail(profile: Readonly<CharacterVisualProfile>, trail: { hot: string; plume: string } | null | undefined): Readonly<CharacterVisualProfile> {
  if (!trail) return profile;
  let byTrail = trailProfiles.get(profile);
  if (byTrail === undefined) {
    byTrail = new Map();
    trailProfiles.set(profile, byTrail);
  }
  const key = trail.hot + trail.plume;
  let next = byTrail.get(key);
  if (next === undefined) {
    // Only `engine` changes: it feeds the drawn engines, the tail and the model's engine lights, never the hull.
    next = Object.freeze({ ...profile, engine: trail.plume });
    byTrail.set(key, next);
  }
  return next;
}

/** Hull kick-back at full recoil, px along the ship's axis. */
export const SHIP_RECOIL_PX = 2.4;
/** Painted hull size on screen at scale 1. */
const ILLUSTRATED_SHIP_SIZE = 78;

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

export function hasCharacterShipImage(id: CharacterId): boolean {
  return characterShipRuntimeImage(id) !== null || shipVisualImage(id) !== null || characterShipSheet !== null;
}

/**
 * The light rig drawn with this ship right now: only over the V3 painted
 * sheet, whose sprite cells its anchor points were measured on. Exact-version
 * per-Ship images deliberately do not inherit those atlas-specific anchors.
 */
export function activeShipLightRig(id: CharacterId): Readonly<ShipLightRig> | null {
  if (characterShipRuntimeImage(id) !== null) return null;
  if (shipVisualImage(id) !== null) return shipVisualLightRig(id);
  if (characterShipSheet === null || characterShipSource !== "v3") return null;
  return shipLightRig(id);
}

/** The ship's total turn as drawn: idle banking plus its aim. */
export function characterShipAngle(options: CharacterDrawOptions): number {
  return characterFlightPose(options.time).banking + (options.aim ?? 0);
}

/**
 * A ship-local point (muzzle, nozzle, nose) in canvas px, through the same
 * transform drawCharacterShip applies, so shots and exhaust leave the hull
 * exactly where it is drawn.
 */
export function characterShipPoint(
  options: CharacterDrawOptions,
  localX: number,
  localY: number,
  out: { x: number; y: number },
): void {
  const pose = characterFlightPose(options.time);
  const angle = pose.banking + (options.aim ?? 0);
  const scale = options.scale ?? 1;
  const x = localX * scale;
  const y = localY * scale + (options.recoil ?? 0) * SHIP_RECOIL_PX;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  out.x = options.x + pose.driftX + x * cos - y * sin;
  out.y = options.y + pose.bob + x * sin + y * cos;
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
    const stormPhases = detailScale < 0.7 ? [0] : [0, Math.PI];
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

/** The ship's source rect on the 4 x 3 sheet: x, y, width, height. */
function shipCell(
  image: HTMLImageElement,
  characterId: CharacterId,
): [number, number, number, number] {
  const index = CHARACTER_SHIP_SPRITE_INDEX[characterId];
  const columns = 4;
  const rows = 3;
  const cellWidth = image.naturalWidth / columns;
  const cellHeight = image.naturalHeight / rows;
  return [
    (index % columns) * cellWidth,
    Math.floor(index / columns) * cellHeight,
    cellWidth,
    cellHeight,
  ];
}

function drawIllustratedShip(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  characterId: CharacterId,
  profile: Readonly<CharacterVisualProfile>,
  glowScale: number,
  bloom = true,
  paint: string | null = null,
): void {
  const size = ILLUSTRATED_SHIP_SIZE;
  const [sourceX, sourceY, cellWidth, cellHeight] = shipCell(image, characterId);
  const painted = paint === null ? null : paintedHull(image, sourceX, sourceY, cellWidth, cellHeight, paint);
  if (bloom) {
    context.save();
    context.globalCompositeOperation = "lighter";
    context.globalAlpha *= characterShipSource === "v3" ? 0.05 : 0.12;
    context.fillStyle = profile.glow;
    context.shadowBlur = (characterShipSource === "v3" ? 4 : 24) * glowScale;
    context.shadowColor = profile.glow;
    context.beginPath();
    context.ellipse(0, 2, 31, 27, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  context.save();
  context.shadowBlur = (characterShipSource === "v3" ? 0 : 9 * glowScale);
  context.shadowColor = profile.glow;
  if (painted !== null) context.drawImage(painted, -size / 2, -size / 2, size, size);
  else context.drawImage(
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

function drawAssignedShipImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  profile: Readonly<CharacterVisualProfile>,
  glowScale: number,
  paint: string | null = null,
): void {
  const maxSize = ILLUSTRATED_SHIP_SIZE;
  const aspect = image.naturalWidth / image.naturalHeight;
  const width = aspect >= 1 ? maxSize : maxSize * aspect;
  const height = aspect >= 1 ? maxSize / aspect : maxSize;

  context.save();
  context.globalCompositeOperation = "lighter";
  context.globalAlpha *= 0.1;
  context.fillStyle = profile.glow;
  context.shadowBlur = 18 * glowScale;
  context.shadowColor = profile.glow;
  context.beginPath();
  context.ellipse(0, 2, Math.max(18, width * 0.42), Math.max(16, height * 0.38), 0, 0, Math.PI * 2);
  context.fill();
  context.restore();

  context.save();
  context.shadowBlur = 7 * glowScale;
  context.shadowColor = profile.glow;
  const painted = paint === null ? null : paintedHull(image, 0, 0, image.naturalWidth, image.naturalHeight, paint);
  context.drawImage(painted ?? image, -width / 2, -height / 2, width, height);
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

export function characterFlightPose(time: number): {
  bob: number;
  banking: number;
  driftX: number;
  thrust: number;
} {
  return {
    bob:
      Math.sin(time * 2.1) * 6.4 +
      Math.sin(time * 0.75 + 0.6) * 2.2,
    banking:
      Math.sin(time * 1.8) * 0.05 +
      Math.sin(time * 0.52 + 0.4) * 0.015,
    driftX: Math.sin(time * 0.82) * 7.5,
    thrust:
      0.92 +
      (Math.sin(time * 9.2) + 1) * 0.1 +
      (Math.sin(time * 2.4 + 0.8) + 1) * 0.05,
  };
}

function drawFlightTail(
  context: CanvasRenderingContext2D,
  profile: Readonly<CharacterVisualProfile>,
  time: number,
  glowScale: number,
  strength: number,
): void {
  const pulse =
    0.88 +
    Math.sin(time * 7.6) * 0.08 +
    Math.sin(time * 2.3 + 0.4) * 0.04;
  const tailLength = (48 + pulse * 24) * strength;
  const gradient = context.createLinearGradient(0, 16, 0, 16 + tailLength);
  gradient.addColorStop(0, profile.engine);
  gradient.addColorStop(0.34, profile.glow);
  gradient.addColorStop(1, "rgba(255,255,255,0)");

  context.save();
  context.globalCompositeOperation = "lighter";
  context.globalAlpha *= 0.28 + strength * 0.28;
  context.strokeStyle = gradient;
  context.lineCap = "round";
  context.lineWidth = 4.2 + strength * 2.8;
  context.shadowBlur = 10 * glowScale;
  context.shadowColor = profile.glow;
  context.beginPath();
  context.moveTo(0, 16);
  context.quadraticCurveTo(
    Math.sin(time * 3.1) * 3.5,
    16 + tailLength * 0.52,
    Math.sin(time * 2.2 + 1.4) * 5.5,
    16 + tailLength,
  );
  context.stroke();
  context.restore();
}

function drawEngine(
  context: CanvasRenderingContext2D,
  profile: Readonly<CharacterVisualProfile>,
  x: number,
  time: number,
  index: number,
  strength = 1,
): void {
  const pulse = 0.88 + Math.sin(time * 13 + index * 1.7) * 0.12;
  const length = (12 + pulse * 8) * (0.82 + strength * 0.34);

  context.save();
  context.translate(x, 17);
  context.globalCompositeOperation = "lighter";
  context.fillStyle = profile.engine;
  context.shadowBlur = 13;
  context.shadowColor = profile.glow;
  context.globalAlpha *= 0.46 + strength * 0.32;

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
  const hullProfile = characterVisualProfile(characterId);
  const profile = withTrail(hullProfile, options.trail);
  const paint = options.paint ?? null;
  const scale = options.scale ?? 1;
  const glowScale = options.glowScale ?? 1;
  const alpha = options.alpha ?? 1;
  const detailScale = options.detailScale ?? 1;
  const flightPose = characterFlightPose(options.time);

  context.save();
  context.translate(
    options.x + flightPose.driftX,
    options.y + flightPose.bob,
  );
  context.rotate(flightPose.banking + (options.aim ?? 0));
  context.translate(0, (options.recoil ?? 0) * SHIP_RECOIL_PX);
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

  // Modelled hull (models/ships/<id> prepared): real 3D with the light rig on its sockets.
  // An exact image from Admin (published, or the candidate under preview) wins over it.
  const assigned = characterShipRuntimeImage(characterId);
  const modelled = assigned !== null ? null : drawShip3D(context, characterId, {
    size: ILLUSTRATED_SHIP_SIZE,
    banking: flightPose.banking,
    time: options.time,
    boost: options.boost ?? 0,
    recoil: options.recoil ?? 0,
  });
  if (modelled !== null) {
    drawShipLights(context, withTrailRig(modelLightRig(characterId, profile, modelled), options.trail), {
      time: options.time,
      boost: options.boost ?? 0,
      recoil: options.recoil ?? 0,
      detail: detailScale,
    });
    context.restore();
    return;
  }

  if (assigned !== null) {
    drawFlightTail(context, profile, options.time, glowScale, 0.92);
    for (const [index, x] of engineOffsets(profile.engineCount).entries()) {
      drawEngine(
        context,
        profile,
        x,
        options.time,
        index,
        flightPose.thrust,
      );
    }
    drawAssignedShipImage(context, assigned, hullProfile, glowScale, paint);
    context.restore();
    return;
  }

  // Low quality, unavailable WebGL, and GLB load failures keep the same
  // selected hull identity through its generated transparent top view.
  const canonical = shipVisualImage(characterId);
  if (canonical !== null) {
    drawAssignedShipImage(context, canonical, hullProfile, glowScale, paint);
    const canonicalRig = shipVisualLightRig(characterId);
    if (canonicalRig !== null) drawShipLights(context, withTrailRig(canonicalRig, options.trail), {
      time: options.time, boost: options.boost ?? 0, recoil: options.recoil ?? 0, detail: detailScale,
    });
    context.restore();
    return;
  }

  const illustrated = characterShipSheet;
  const rig = activeShipLightRig(characterId);
  if (illustrated !== null && rig !== null) {
    const lights = {
      time: options.time,
      boost: options.boost ?? 0,
      recoil: options.recoil ?? 0,
      detail: detailScale,
    };
    drawShipHalo(
      context,
      rig,
      illustrated,
      shipCell(illustrated, characterId),
      ILLUSTRATED_SHIP_SIZE,
      lights,
    );
    drawIllustratedShip(context, illustrated, characterId, hullProfile, glowScale, false, paint);
    drawShipLights(context, withTrailRig(rig, options.trail), lights);
    context.restore();
    return;
  }
  if (illustrated !== null) {
    const engineStrength = characterShipSource === "v3" ? 0.62 : 0.96;
    drawFlightTail(
      context,
      profile,
      options.time,
      glowScale,
      characterShipSource === "v3" ? 0.72 : 0.92,
    );
    for (const [index, x] of engineOffsets(profile.engineCount).entries()) {
      drawEngine(
        context,
        profile,
        x,
        options.time,
        index,
        engineStrength * flightPose.thrust,
      );
    }

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

  drawFlightTail(
    context,
    profile,
    options.time,
    glowScale,
    0.92,
  );
  for (const [index, x] of engineOffsets(profile.engineCount).entries()) {
    drawEngine(
      context,
      profile,
      x,
      options.time,
      index,
      flightPose.thrust,
    );
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
