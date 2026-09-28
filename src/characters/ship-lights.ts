import type { CharacterId } from "./registry";

/**
 * Ship light rig: engine plumes, energy core, wing-tip lights and a rim halo
 * laid over the painted hull sprite (V3 sheet). Everything is additive light
 * drawn from cached gradient textures (no shadowBlur), animated by time
 * alone, so menus can draw a still frame and the game a live one.
 *
 * Anchor points are measured on the V3 sprite cell (256 px, drawn 78 px wide:
 * local = (pixel - 128) * 78 / 256).
 *
 * Pilot: Vanguard only. The other ships keep the older exhaust until the
 * owner approves this look.
 */

export type ShipLightRig = {
  /** Nozzle exits, ship-local px. Plumes point down the ship's axis. */
  nozzles: readonly (readonly [number, number])[];
  /** Plume half-width at the nozzle and idle length, px. */
  plumeWidth: number;
  plumeLength: number;
  /** Energy core (the crystal) centre, its glow radius and its highlight. */
  core: readonly [number, number];
  coreRadius: number;
  glint: readonly [number, number];
  /** Wing-tip navigation lights. */
  tips: readonly (readonly [number, number])[];
  /** Hot core → plume → outer flame colours, halo and light colours (#rrggbb). */
  hot: string;
  plume: string;
  outer: string;
  halo: string;
  light: string;
};

const RIGS: Readonly<Partial<Record<CharacterId, ShipLightRig>>> = {
  vanguard: {
    // Painted flames centre on sprite x 85 / 171 and leave the nozzles at y 204.
    nozzles: [[-13, 23.5], [13, 23.5]],
    plumeWidth: 4.2,
    plumeLength: 30,
    // Crystal spine: body centred near sprite y 90, bright tip near y 42.
    core: [0, -12],
    coreRadius: 13,
    glint: [0, -25],
    // Outer wing tips near sprite (10, 190) and (246, 190).
    tips: [[-33, 17.5], [33, 17.5]],
    hot: "#effcff",
    plume: "#5fdcff",
    outer: "#3f6dff",
    halo: "#3fd2ff",
    light: "#d9fbff",
  },
};

export function shipLightRig(characterId: CharacterId): Readonly<ShipLightRig> | null {
  return RIGS[characterId] ?? null;
}

// ---------------------------------------------------------------------------
// Cached textures.
// ---------------------------------------------------------------------------

type Rgb = readonly [number, number, number];

function hexRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1, 7), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgba(color: Rgb, alpha: number): string {
  return "rgba(" + color[0] + "," + color[1] + "," + color[2] + "," + alpha.toFixed(3) + ")";
}

function makeCanvas(width: number, height: number): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas.getContext("2d") === null ? null : canvas;
}

const glowCache = new Map<string, HTMLCanvasElement | null>();

/** Soft round light, 64 px. */
function glowTexture(hex: string): HTMLCanvasElement | null {
  const cached = glowCache.get(hex);
  if (cached !== undefined) return cached;
  const canvas = makeCanvas(64, 64);
  if (canvas !== null) {
    const context = canvas.getContext("2d")!;
    const color = hexRgb(hex);
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, rgba(color, 1));
    gradient.addColorStop(0.2, rgba(color, 0.66));
    gradient.addColorStop(0.5, rgba(color, 0.2));
    gradient.addColorStop(1, rgba(color, 0));
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
  }
  glowCache.set(hex, canvas);
  return canvas;
}

const flameCache = new Map<string, HTMLCanvasElement | null>();

/**
 * Flame: brightest at the top edge (the nozzle), narrowing and fading to a
 * soft tip at the bottom. 32 x 128 px; `sharp` keeps a hotter, tighter core.
 */
function flameTexture(hex: string, sharp: boolean): HTMLCanvasElement | null {
  const key = hex + (sharp ? "#core" : "");
  const cached = flameCache.get(key);
  if (cached !== undefined) return cached;
  const canvas = makeCanvas(32, 128);
  if (canvas !== null) {
    const context = canvas.getContext("2d")!;
    const color = hexRgb(hex);
    context.translate(16, 0);
    context.scale(1, 8);
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 16);
    if (sharp) {
      gradient.addColorStop(0, rgba(color, 1));
      gradient.addColorStop(0.3, rgba(color, 0.92));
      gradient.addColorStop(0.55, rgba(color, 0.4));
      gradient.addColorStop(1, rgba(color, 0));
    } else {
      gradient.addColorStop(0, rgba(color, 0.95));
      gradient.addColorStop(0.2, rgba(color, 0.72));
      gradient.addColorStop(0.5, rgba(color, 0.3));
      gradient.addColorStop(0.78, rgba(color, 0.08));
      gradient.addColorStop(1, rgba(color, 0));
    }
    context.fillStyle = gradient;
    context.fillRect(-16, 0, 32, 16);
  }
  flameCache.set(key, canvas);
  return canvas;
}

const HALO_SIZE = 128;
const HALO_SPRITE = 92;
const haloCache = new WeakMap<object, Map<string, HTMLCanvasElement | null>>();

/**
 * Rim halo: the hull's own silhouette, tinted and blurred once. Drawn a bit
 * larger than the hull and under it, it leaves a glow that hugs the outline.
 */
function haloTexture(
  sheet: CanvasImageSource & { naturalWidth: number; naturalHeight: number },
  cell: readonly [number, number, number, number],
  hex: string,
): HTMLCanvasElement | null {
  let perSheet = haloCache.get(sheet);
  if (perSheet === undefined) {
    perSheet = new Map();
    haloCache.set(sheet, perSheet);
  }
  const key = cell.join(",") + hex;
  const cached = perSheet.get(key);
  if (cached !== undefined) return cached;
  const canvas = makeCanvas(HALO_SIZE, HALO_SIZE);
  if (canvas !== null) {
    const context = canvas.getContext("2d")!;
    const offset = (HALO_SIZE - HALO_SPRITE) / 2;
    // Blur by stamping the silhouette around two rings (works everywhere,
    // unlike ctx.filter), then tint the result.
    context.globalAlpha = 0.07;
    for (const radius of [3, 6, 10]) {
      for (let step = 0; step < 12; step += 1) {
        const angle = ((step + radius * 0.37) / 12) * Math.PI * 2;
        context.drawImage(
          sheet,
          cell[0],
          cell[1],
          cell[2],
          cell[3],
          offset + Math.cos(angle) * radius,
          offset + Math.sin(angle) * radius,
          HALO_SPRITE,
          HALO_SPRITE,
        );
      }
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-in";
    context.fillStyle = hex;
    context.fillRect(0, 0, HALO_SIZE, HALO_SIZE);
  }
  perSheet.set(key, canvas);
  return canvas;
}

// ---------------------------------------------------------------------------
// Drawing, in the ship's local space (after its translate / rotate / scale).
// ---------------------------------------------------------------------------

export type ShipLightState = {
  time: number;
  /** 0–1 engine throttle (typing speed). */
  boost: number;
  /** 0–1 recoil of the last shot: nozzle and core flash. */
  recoil: number;
  /** Quality: < 0.7 drops the finest details (shock diamonds, glints). */
  detail: number;
};

function stamp(
  context: CanvasRenderingContext2D,
  texture: HTMLCanvasElement | null,
  x: number,
  y: number,
  rx: number,
  ry: number,
  alpha: number,
  base: number,
): void {
  if (texture === null || rx <= 0.1 || ry <= 0.1 || alpha <= 0.004) return;
  context.globalAlpha = Math.min(1, alpha) * base;
  context.drawImage(texture, x - rx, y - ry, rx * 2, ry * 2);
}

/** Flame texture hung from (x, y) downward: `halfWidth` wide, `length` long. */
function hangFlame(
  context: CanvasRenderingContext2D,
  texture: HTMLCanvasElement | null,
  x: number,
  y: number,
  halfWidth: number,
  length: number,
  alpha: number,
  base: number,
): void {
  if (texture === null || halfWidth <= 0.1 || length <= 0.5 || alpha <= 0.004) return;
  context.globalAlpha = Math.min(1, alpha) * base;
  context.drawImage(texture, x - halfWidth, y, halfWidth * 2, length);
}

/** Under the hull: the rim halo. `cell` is the ship's source rect on the sheet. */
export function drawShipHalo(
  context: CanvasRenderingContext2D,
  rig: Readonly<ShipLightRig>,
  sheet: CanvasImageSource & { naturalWidth: number; naturalHeight: number },
  cell: readonly [number, number, number, number],
  hullSize: number,
  state: ShipLightState,
): void {
  const texture = haloTexture(sheet, cell, rig.halo);
  if (texture === null) return;
  const base = context.globalAlpha;
  const breath = Math.sin(state.time * 1.7);
  const size = hullSize * (HALO_SIZE / HALO_SPRITE) * (1.04 + breath * 0.012 + state.boost * 0.02);
  context.save();
  context.globalCompositeOperation = "lighter";
  // Light bleeding round the hull, not an outline: keep it faint.
  context.globalAlpha = base * Math.min(1, 0.24 + breath * 0.05 + state.boost * 0.1 + state.recoil * 0.06);
  context.drawImage(texture, -size / 2, -size / 2 + 1, size, size);
  context.restore();
}

/** Over the hull: plumes, nozzle heat, energy core, glint and wing lights. */
export function drawShipLights(
  context: CanvasRenderingContext2D,
  rig: Readonly<ShipLightRig>,
  state: ShipLightState,
): void {
  const base = context.globalAlpha;
  const time = state.time;
  const boost = state.boost;
  const fine = state.detail >= 0.7;
  const outer = flameTexture(rig.outer, false);
  const plume = flameTexture(rig.plume, false);
  const core = flameTexture(rig.hot, true);
  const hotGlow = glowTexture(rig.hot);
  const plumeGlow = glowTexture(rig.plume);
  const lightGlow = glowTexture(rig.light);

  context.save();
  context.globalCompositeOperation = "lighter";

  rig.nozzles.forEach(([x, y], index) => {
    // Layered flicker at unrelated rates so the flames never pulse in step.
    const flicker =
      1 +
      Math.sin(time * 37 + index * 1.9) * 0.07 +
      Math.sin(time * 23.3 + index * 4.1) * 0.05 +
      Math.sin(time * 61 + index * 0.7) * 0.035;
    const length = rig.plumeLength * flicker * (1 + boost * 0.65 + state.recoil * 0.12);
    const width = rig.plumeWidth * (1 + Math.sin(time * 29 + index * 2.3) * 0.06) * (1 + boost * 0.22);

    hangFlame(context, outer, x, y - 1.5, width * 2.4, length * 1.55, 0.55 + boost * 0.2, base);
    hangFlame(context, plume, x, y - 1, width * 1.35, length, 0.85, base);
    hangFlame(context, core, x, y - 0.5, width * 0.62, length * 0.52, 0.95, base);

    if (fine) {
      // Shock diamonds: bright knots riding down the jet, like a real engine.
      for (let knot = 0; knot < 3; knot += 1) {
        const along = y + length * (0.3 + knot * 0.2);
        const pulse = 0.7 + Math.sin(time * 47 + knot * 2.1 + index * 1.3) * 0.3;
        const rx = width * (0.72 - knot * 0.14);
        stamp(context, hotGlow, x, along, rx, rx * 1.5, (0.7 - knot * 0.16) * pulse, base);
      }
    }

    // Nozzle heat: always lit, flares on each shot.
    const heat = width * (2.3 + state.recoil * 0.9 + boost * 0.4);
    stamp(context, plumeGlow, x, y + 1, heat, heat * 0.8, 0.5 + state.recoil * 0.35 + boost * 0.15, base);
    stamp(context, hotGlow, x, y + 1.5, width * 1.05, width * 0.9, 0.7 + state.recoil * 0.3, base);
  });

  // Energy core: slow breathing light inside the crystal, flashes on shots.
  const breath = 0.5 + Math.sin(time * 2.4) * 0.5;
  const [coreX, coreY] = rig.core;
  stamp(
    context,
    plumeGlow,
    coreX,
    coreY,
    rig.coreRadius * (0.95 + breath * 0.12),
    rig.coreRadius * (1.25 + breath * 0.14),
    0.22 + breath * 0.12 + boost * 0.16 + state.recoil * 0.22,
    base,
  );
  stamp(context, hotGlow, coreX, coreY - 2, rig.coreRadius * 0.28, rig.coreRadius * 1.05, 0.28 + breath * 0.14 + state.recoil * 0.3, base);

  if (fine) {
    // Glint: a star flare on the crystal tip every ~3 s.
    const glint = Math.pow(Math.max(0, Math.sin(time * 2.03)), 14);
    if (glint > 0.01) {
      const [glintX, glintY] = rig.glint;
      stamp(context, hotGlow, glintX, glintY, 13 * glint + 2, 1.1, glint * 0.95, base);
      stamp(context, hotGlow, glintX, glintY, 1.1, 9 * glint + 2, glint * 0.9, base);
      stamp(context, hotGlow, glintX, glintY, 3.2, 3.2, glint, base);
    }
  }

  // Wing-tip lights: soft steady glow plus a short strobe, left then right.
  rig.tips.forEach(([x, y], index) => {
    const phase = (time * 0.7 + index * 0.5) % 1;
    const strobe = phase < 0.09 ? Math.sin((phase / 0.09) * Math.PI) : 0;
    stamp(context, lightGlow, x, y, 4.2, 4.2, 0.38 + boost * 0.12, base);
    if (strobe > 0.01) {
      stamp(context, lightGlow, x, y, 11 * strobe + 3, 11 * strobe + 3, strobe * 0.9, base);
      if (fine) stamp(context, hotGlow, x, y, 12 * strobe, 0.9, strobe * 0.8, base);
    }
  });

  context.restore();
}
