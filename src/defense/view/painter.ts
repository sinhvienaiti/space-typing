import type { MapSpec } from "../rules/maps";
import { ISLAND_RADIUS, ROAD_HALF_WIDTH } from "../rules/maps";
import { RoadPath } from "../rules/path";

/**
 * Paints a map's ground until the owner's painted art exists
 * (docs/art-requests/DEFENSE_MAPS_PROMPTS_2026-10-21.md): a top-down image
 * of the island in the map's palette (rock, crystal veins, a paved road
 * with worn edges and runes, hexagonal tower pads, the Core's plaza, the
 * scorched gates), its glow, and the height field the terrain mesh is
 * built from (sunken road, raised pads, a rim and a cliff).
 *
 * `guide` paints the layout guide given to the owner with the prompts:
 * flat colours, the road, pads, Core and gates exactly where the game
 * expects them.
 */

/** Half the side of the painted square (metres): it covers the island and its rim. */
export const GROUND_HALF = 44;
/** Height-field vertices per side. */
export const GRID = 177;

export type Painted = {
  color: HTMLCanvasElement;
  glow: HTMLCanvasElement;
  /** GRID × GRID heights (metres), row by row from −z to +z. */
  height: Float32Array;
  /** The island's edge radius by angle (radians). */
  edge: (angle: number) => number;
};

// ------------------------------------------------------------------ noise

function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, seed);
  const b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed);
  const d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number, seed: number, octaves = 4): number {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let index = 0; index < octaves; index += 1) {
    sum += valueNoise(x * frequency, y * frequency, seed + index * 17) * amplitude;
    frequency *= 2.03;
    amplitude *= 0.5;
  }
  return sum / (1 - 0.5 ** octaves);
}

/** A seeded random for the painting (the same map always looks the same). */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedOf(text: string): number {
  let h = 2166136261;
  for (let index = 0; index < text.length; index += 1) h = Math.imul(h ^ text.charCodeAt(index), 16777619);
  return h >>> 0;
}

type Rgb = [number, number, number];

function rgb(hex: string): Rgb {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function css(color: Rgb, alpha = 1): string {
  return "rgba(" + Math.round(color[0]) + "," + Math.round(color[1]) + "," + Math.round(color[2]) + "," + alpha + ")";
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function shade(color: Rgb, k: number): Rgb {
  return [Math.min(255, color[0] * k), Math.min(255, color[1] * k), Math.min(255, color[2] * k)];
}

function canvas(size: number): HTMLCanvasElement {
  const element = document.createElement("canvas");
  element.width = element.height = size;
  return element;
}

// ------------------------------------------------------------------ shapes

export function islandEdge(map: MapSpec): (angle: number) => number {
  const seed = seedOf(map.id);
  return (angle: number) => {
    const a = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    // Wrap the noise round the circle.
    const x = Math.cos(a) * 1.6;
    const y = Math.sin(a) * 1.6;
    return ISLAND_RADIUS - 2.5 + (fbm(x + 3, y + 3, seed, 3) - 0.5) * 4.4;
  };
}

function hexPath(context: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  context.beginPath();
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2 + Math.PI / 6;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (index === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.closePath();
}

/** Points every `step` metres along every road (shared ends painted once is fine). */
function roadPoints(map: MapSpec, step: number): { x: number; z: number; heading: number; along: number; path: number }[] {
  const out: { x: number; z: number; heading: number; along: number; path: number }[] = [];
  map.paths.forEach((points, path) => {
    const road = new RoadPath(points);
    for (let along = 0; along <= road.length; along += step) {
      const at = road.point(along, 0, { x: 0, z: 0 });
      out.push({ x: at.x, z: at.z, heading: road.heading(along), along, path });
    }
  });
  return out;
}

// ------------------------------------------------------------------ height

/** The ground's height field: undulating rock, the road sunk in, pads and the Core's plaza raised, a rim at the edge. */
export function heightField(map: MapSpec, edge: (angle: number) => number): Float32Array {
  const seed = seedOf(map.id) + 7;
  const heights = new Float32Array(GRID * GRID);
  const roadGap = new Float32Array(GRID * GRID).fill(99);
  const cell = (GROUND_HALF * 2) / (GRID - 1);
  for (const point of roadPoints(map, 0.5)) {
    const cx = Math.round((point.x + GROUND_HALF) / cell);
    const cz = Math.round((point.z + GROUND_HALF) / cell);
    const reach = Math.ceil(4.5 / cell);
    for (let dz = -reach; dz <= reach; dz += 1) {
      for (let dx = -reach; dx <= reach; dx += 1) {
        const ix = cx + dx;
        const iz = cz + dz;
        if (ix < 0 || iz < 0 || ix >= GRID || iz >= GRID) continue;
        const x = ix * cell - GROUND_HALF;
        const z = iz * cell - GROUND_HALF;
        const gap = Math.hypot(x - point.x, z - point.z);
        const index = iz * GRID + ix;
        if (gap < roadGap[index]!) roadGap[index] = gap;
      }
    }
  }
  const smooth = (edge0: number, edge1: number, value: number): number => {
    const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  };
  for (let iz = 0; iz < GRID; iz += 1) {
    for (let ix = 0; ix < GRID; ix += 1) {
      const x = ix * cell - GROUND_HALF;
      const z = iz * cell - GROUND_HALF;
      const index = iz * GRID + ix;
      let h = (fbm(x * 0.045, z * 0.045, seed) - 0.5) * 1.1 + (fbm(x * 0.2, z * 0.2, seed + 3, 2) - 0.5) * 0.18;
      // The road: a flat bed sunk below the ground, with a soft shoulder.
      const gap = roadGap[index]!;
      h = h + (-0.38 - h) * smooth(ROAD_HALF_WIDTH + 1.4, ROAD_HALF_WIDTH + 0.2, gap);
      // The Core's plaza and the tower pads stand up out of the rock.
      const core = Math.hypot(x - map.core[0], z - map.core[1]);
      h = h + (0.12 - h) * smooth(6.2, 5.2, core);
      for (const pad of map.pads) {
        const d = Math.hypot(x - pad.x, z - pad.z);
        if (d < 3) h = h + ((pad.trait === "high" ? 0.95 : 0.5) - h) * smooth(2.65, 2.2, d);
      }
      // A rim at the edge, then the cliff.
      const r = Math.hypot(x, z);
      const rim = edge(Math.atan2(z, x));
      h += smooth(rim - 3.5, rim - 0.6, r) * 0.45;
      heights[index] = h;
    }
  }
  return heights;
}

// ------------------------------------------------------------------ paint

/**
 * The ground image (`size` px) and its glow (`size / 2` px). `guide`: the
 * owner's layout guide instead (flat colours, nothing random).
 */
export function paintGround(map: MapSpec, size: number, guide = false): Painted {
  const edge = islandEdge(map);
  const height = heightField(map, edge);
  const color = canvas(size);
  const glow = canvas(Math.max(256, size >> 1));
  const c = color.getContext("2d")!;
  const g = glow.getContext("2d")!;
  const k = size / (GROUND_HALF * 2);
  const gk = glow.width / (GROUND_HALF * 2);
  const px = (x: number): number => (x + GROUND_HALF) * k;
  const gx = (x: number): number => (x + GROUND_HALF) * gk;
  const palette = map.palette;
  const ground = rgb(palette.ground);
  const ground2 = rgb(palette.ground2);
  const vein = rgb(palette.vein);
  const roadColor = rgb(palette.road);
  const roadEdge = rgb(palette.roadEdge);
  const rune = rgb(palette.rune);
  const padColor = rgb(palette.pad);
  const rimColor = rgb(palette.rim);
  const rand = random(seedOf(map.id) + 11);
  const seed = seedOf(map.id);
  g.fillStyle = "#000";
  g.fillRect(0, 0, glow.width, glow.height);

  const islandClip = (context: CanvasRenderingContext2D, scale: number): void => {
    context.beginPath();
    for (let index = 0; index <= 180; index += 1) {
      const angle = (index / 180) * Math.PI * 2;
      const r = edge(angle);
      const x = (Math.cos(angle) * r + GROUND_HALF) * scale;
      const y = (Math.sin(angle) * r + GROUND_HALF) * scale;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
  };

  if (guide) {
    // Layout guide: dark ground, magenta road, cyan pads, gold Core, red gates.
    c.fillStyle = "#101010";
    c.fillRect(0, 0, size, size);
    islandClip(c, k);
    c.fillStyle = "#3a3a3a";
    c.fill();
  } else {
    // ---- rock: two tones of mottled stone (computed small, drawn large)
    const small = 384;
    const base = canvas(small);
    const b = base.getContext("2d")!;
    const image = b.createImageData(small, small);
    for (let y = 0; y < small; y += 1) {
      for (let x = 0; x < small; x += 1) {
        const wx = (x / small) * GROUND_HALF * 2 - GROUND_HALF;
        const wz = (y / small) * GROUND_HALF * 2 - GROUND_HALF;
        const n = fbm(wx * 0.08, wz * 0.08, seed + 1);
        const m = fbm(wx * 0.32, wz * 0.32, seed + 2, 3);
        const tone = mix(ground, ground2, Math.min(1, Math.max(0, (n - 0.35) * 2.2)));
        const lit = 0.78 + m * 0.42;
        const offset = (y * small + x) * 4;
        image.data[offset] = Math.min(255, tone[0] * lit);
        image.data[offset + 1] = Math.min(255, tone[1] * lit);
        image.data[offset + 2] = Math.min(255, tone[2] * lit);
        image.data[offset + 3] = 255;
      }
    }
    b.putImageData(image, 0, 0);
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
    c.drawImage(base, 0, 0, size, size);

    // ---- grain: a small tile of fine speckle over everything
    const tile = canvas(128);
    const t = tile.getContext("2d")!;
    const grain = t.createImageData(128, 128);
    for (let index = 0; index < 128 * 128; index += 1) {
      const value = 128 + (rand() - 0.5) * 90;
      grain.data[index * 4] = grain.data[index * 4 + 1] = grain.data[index * 4 + 2] = value;
      grain.data[index * 4 + 3] = 255;
    }
    t.putImageData(grain, 0, 0);
    c.save();
    c.globalCompositeOperation = "overlay";
    c.globalAlpha = 0.35;
    c.fillStyle = c.createPattern(tile, "repeat")!;
    c.fillRect(0, 0, size, size);
    c.restore();

    // ---- slabs: broken flagstones with dark seams
    c.save();
    c.lineJoin = "round";
    for (let index = 0; index < 520; index += 1) {
      const x = (rand() * 2 - 1) * GROUND_HALF;
      const z = (rand() * 2 - 1) * GROUND_HALF;
      const r = (1.2 + rand() * 2.8) * k;
      const sides = 5 + Math.floor(rand() * 3);
      c.beginPath();
      for (let side = 0; side < sides; side += 1) {
        const angle = (side / sides) * Math.PI * 2 + rand() * 0.5;
        const radius = r * (0.7 + rand() * 0.35);
        const sx = px(x) + Math.cos(angle) * radius;
        const sy = px(z) + Math.sin(angle) * radius;
        if (side === 0) c.moveTo(sx, sy);
        else c.lineTo(sx, sy);
      }
      c.closePath();
      c.fillStyle = css(shade(mix(ground, ground2, rand()), 0.85 + rand() * 0.35), 0.28);
      c.fill();
      c.strokeStyle = css(shade(ground, 0.45), 0.35);
      c.lineWidth = Math.max(1, k * 0.08);
      c.stroke();
    }
    c.restore();

    // ---- veins: branching cracks that glow in the map's colour
    const crack = (x: number, z: number, angle: number, length: number, width: number, depth: number): void => {
      let cx = x;
      let cz = z;
      let heading = angle;
      const steps = Math.floor(length / 0.7);
      c.beginPath();
      g.beginPath();
      c.moveTo(px(cx), px(cz));
      g.moveTo(gx(cx), gx(cz));
      for (let step = 0; step < steps; step += 1) {
        heading += (rand() - 0.5) * 0.9;
        cx += Math.cos(heading) * 0.7;
        cz += Math.sin(heading) * 0.7;
        c.lineTo(px(cx), px(cz));
        g.lineTo(gx(cx), gx(cz));
        if (depth < 2 && rand() < 0.08) crack(cx, cz, heading + (rand() < 0.5 ? 0.9 : -0.9), length * 0.45, width * 0.6, depth + 1);
      }
      c.strokeStyle = css(shade(ground, 0.35), 0.8);
      c.lineWidth = width * k * 0.12 + 1;
      c.stroke();
      c.strokeStyle = css(vein, 0.75);
      c.lineWidth = width * k * 0.05 + 0.6;
      c.stroke();
      g.strokeStyle = css(vein, 0.9);
      g.lineWidth = width * gk * 0.09 + 0.8;
      g.shadowColor = css(vein, 1);
      g.shadowBlur = 6;
      g.stroke();
      g.shadowBlur = 0;
    };
    for (let index = 0; index < 26; index += 1) {
      const angle = rand() * Math.PI * 2;
      const r = rand() * (ISLAND_RADIUS - 6);
      crack(Math.cos(angle) * r, Math.sin(angle) * r, rand() * Math.PI * 2, 6 + rand() * 12, 1 + rand() * 1.4, 0);
    }

    // ---- pebbles
    for (let index = 0; index < 2400; index += 1) {
      const x = (rand() * 2 - 1) * GROUND_HALF;
      const z = (rand() * 2 - 1) * GROUND_HALF;
      const r = (0.06 + rand() * 0.22) * k;
      const tone = shade(mix(ground, ground2, rand()), 0.6 + rand() * 0.8);
      c.fillStyle = css(shade(tone, 0.5), 0.5);
      c.beginPath();
      c.ellipse(px(x) + r * 0.25, px(z) + r * 0.3, r, r * 0.8, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = css(tone, 0.8);
      c.beginPath();
      c.ellipse(px(x), px(z), r, r * 0.8, 0, 0, Math.PI * 2);
      c.fill();
    }
  }

  // ---- the road: worn shoulder, edging stones, a bed of cobbles, runes on the edges
  const points = roadPoints(map, 0.5);
  const strokeRoad = (context: CanvasRenderingContext2D, scale: number, width: number, style: string, blur = 0): void => {
    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = style;
    context.lineWidth = width * scale;
    if (blur > 0) context.filter = "blur(" + blur + "px)";
    map.paths.forEach((pathPoints) => {
      const road = new RoadPath(pathPoints);
      context.beginPath();
      for (let along = 0; along <= road.length; along += 0.5) {
        const at = road.point(along, 0, { x: 0, z: 0 });
        const x = (at.x + GROUND_HALF) * scale;
        const y = (at.z + GROUND_HALF) * scale;
        if (along === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    });
    context.restore();
  };
  if (guide) {
    strokeRoad(c, k, ROAD_HALF_WIDTH * 2, "#ff00ff");
  } else {
    strokeRoad(c, k, ROAD_HALF_WIDTH * 2 + 3.2, css(shade(ground, 0.55), 0.55), Math.max(2, k * 0.6));
    strokeRoad(c, k, ROAD_HALF_WIDTH * 2 + 0.9, css(shade(roadEdge, 0.55), 1));
    strokeRoad(c, k, ROAD_HALF_WIDTH * 2 + 0.5, css(roadEdge, 1));
    strokeRoad(c, k, ROAD_HALF_WIDTH * 2 - 0.1, css(shade(roadColor, 0.7), 1));
    // Cobbles in staggered rows across the road.
    c.save();
    for (const point of points) {
      const row = Math.round(point.along / 0.55);
      if (Math.abs(point.along - row * 0.55) > 0.26) continue;
      const across = [-1.1, -0.37, 0.37, 1.1];
      const offset = row % 2 === 0 ? 0 : 0.36;
      for (const lane of across) {
        const lateral = lane + offset;
        if (Math.abs(lateral) > ROAD_HALF_WIDTH - 0.25) continue;
        const sx = point.x + Math.cos(point.heading) * lateral;
        const sz = point.z - Math.sin(point.heading) * lateral;
        c.save();
        c.translate(px(sx), px(sz));
        c.rotate(-point.heading);
        const tone = shade(roadColor, 0.78 + rand() * 0.42);
        c.fillStyle = css(shade(tone, 0.55), 0.9);
        c.beginPath();
        c.roundRect(-0.36 * k, -0.25 * k, 0.72 * k, 0.5 * k, 0.12 * k);
        c.fill();
        c.fillStyle = css(tone, 1);
        c.beginPath();
        c.roundRect(-0.32 * k, -0.22 * k, 0.62 * k, 0.42 * k, 0.1 * k);
        c.fill();
        c.restore();
      }
    }
    c.restore();
    // Worn middle, where the most feet go.
    strokeRoad(c, k, 1.2, css(shade(roadColor, 0.5), 0.18), Math.max(2, k * 0.5));
    // Runes along both edges, in the glow too.
    for (const point of points) {
      if (Math.abs(point.along % 3) > 0.25) continue;
      for (const side of [-1, 1]) {
        const lateral = side * (ROAD_HALF_WIDTH + 0.25);
        const sx = point.x + Math.cos(point.heading) * lateral;
        const sz = point.z - Math.sin(point.heading) * lateral;
        c.fillStyle = css(rune, 0.85);
        c.beginPath();
        c.arc(px(sx), px(sz), 0.13 * k, 0, Math.PI * 2);
        c.fill();
        g.fillStyle = css(rune, 1);
        g.beginPath();
        g.arc(gx(sx), gx(sz), 0.2 * gk + 0.8, 0, Math.PI * 2);
        g.fill();
      }
    }
    // Ice on the long straights (Frost Veil).
    for (const [x0, z0, x1, z1] of map.ice ?? []) {
      c.save();
      const gradient = c.createLinearGradient(px(x0), px(z0), px(x1), px(z1));
      gradient.addColorStop(0, "rgba(220,245,255,0.35)");
      gradient.addColorStop(0.5, "rgba(190,235,255,0.5)");
      gradient.addColorStop(1, "rgba(220,245,255,0.35)");
      c.fillStyle = gradient;
      c.fillRect(px(x0), px(z0), px(x1) - px(x0), px(z1) - px(z0));
      c.strokeStyle = "rgba(255,255,255,0.55)";
      c.lineWidth = Math.max(1, k * 0.05);
      for (let streak = 0; streak < 26; streak += 1) {
        const sx = x0 + rand() * (x1 - x0);
        const sz = z0 + rand() * (z1 - z0);
        c.beginPath();
        c.moveTo(px(sx), px(sz));
        c.lineTo(px(sx + 1 + rand() * 3), px(sz + (rand() - 0.5) * 0.4));
        c.stroke();
      }
      c.restore();
    }
  }

  // ---- gates: scorched rock round a crack of light
  const gates = new Set(map.paths.map((path) => path[0]!.join(",")));
  for (const key of gates) {
    const [x, z] = key.split(",").map(Number) as [number, number];
    if (guide) {
      c.fillStyle = "#ff2020";
      c.beginPath();
      c.arc(px(x), px(z), 3 * k, 0, Math.PI * 2);
      c.fill();
      continue;
    }
    const burn = c.createRadialGradient(px(x), px(z), 0, px(x), px(z), 5.5 * k);
    burn.addColorStop(0, "rgba(0,0,0,0.75)");
    burn.addColorStop(0.6, "rgba(0,0,0,0.4)");
    burn.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = burn;
    c.beginPath();
    c.arc(px(x), px(z), 5.5 * k, 0, Math.PI * 2);
    c.fill();
    const light = g.createRadialGradient(gx(x), gx(z), 0, gx(x), gx(z), 4 * gk);
    light.addColorStop(0, css(rimColor, 0.9));
    light.addColorStop(1, css(rimColor, 0));
    g.fillStyle = light;
    g.beginPath();
    g.arc(gx(x), gx(z), 4 * gk, 0, Math.PI * 2);
    g.fill();
  }

  // ---- the Core's plaza: a round floor of radial tiles inside a ring of runes
  {
    const [x, z] = map.core;
    if (guide) {
      c.fillStyle = "#ffd700";
      c.beginPath();
      c.arc(px(x), px(z), 4.5 * k, 0, Math.PI * 2);
      c.fill();
    } else {
      c.fillStyle = css(shade(padColor, 0.7), 1);
      c.beginPath();
      c.arc(px(x), px(z), 5.6 * k, 0, Math.PI * 2);
      c.fill();
      for (let ring = 0; ring < 3; ring += 1) {
        const inner = 1.4 + ring * 1.35;
        const pieces = 8 + ring * 6;
        for (let piece = 0; piece < pieces; piece += 1) {
          const a0 = (piece / pieces) * Math.PI * 2 + 0.03;
          const a1 = ((piece + 1) / pieces) * Math.PI * 2 - 0.03;
          c.fillStyle = css(shade(padColor, 0.85 + rand() * 0.4), 1);
          c.beginPath();
          c.arc(px(x), px(z), (inner + 1.2) * k, a0, a1);
          c.arc(px(x), px(z), inner * k, a1, a0, true);
          c.closePath();
          c.fill();
        }
      }
      for (const context of [c, g]) {
        const scale = context === c ? k : gk;
        const ox = (x + GROUND_HALF) * scale;
        const oy = (z + GROUND_HALF) * scale;
        context.strokeStyle = css(rune, context === c ? 0.85 : 1);
        context.lineWidth = Math.max(1.2, 0.16 * scale);
        context.beginPath();
        context.arc(ox, oy, 5.3 * scale, 0, Math.PI * 2);
        context.stroke();
        for (let index = 0; index < 16; index += 1) {
          const angle = (index / 16) * Math.PI * 2;
          context.beginPath();
          context.arc(ox + Math.cos(angle) * 5.3 * scale, oy + Math.sin(angle) * 5.3 * scale, 0.22 * scale, 0, Math.PI * 2);
          context.fillStyle = css(rune, 1);
          context.fill();
        }
      }
    }
  }

  // ---- tower pads: hexagonal platforms; high ground in gold, ley pads with violet circuits, rubble heaped
  map.pads.forEach((pad) => {
    const x = px(pad.x);
    const y = px(pad.z);
    if (guide) {
      c.fillStyle = pad.trait === "high" ? "#00ffff" : pad.trait === "ley" ? "#00ff80" : pad.trait === "rubble" ? "#808000" : "#00a0ff";
      hexPath(c, x, y, 2.3 * k);
      c.fill();
      return;
    }
    const trim = pad.trait === "high" ? rgb("#ffd36b") : pad.trait === "ley" ? rgb("#c08bff") : roadEdge;
    // Drop shadow, then the bevelled top.
    c.fillStyle = "rgba(0,0,0,0.45)";
    hexPath(c, x + 0.25 * k, y + 0.3 * k, 2.45 * k);
    c.fill();
    c.fillStyle = css(shade(padColor, 0.6), 1);
    hexPath(c, x, y, 2.4 * k);
    c.fill();
    const bevel = c.createLinearGradient(x - 2.4 * k, y - 2.4 * k, x + 2.4 * k, y + 2.4 * k);
    bevel.addColorStop(0, css(shade(padColor, 1.5), 1));
    bevel.addColorStop(1, css(shade(padColor, 0.75), 1));
    c.fillStyle = bevel;
    hexPath(c, x, y, 2.1 * k);
    c.fill();
    c.strokeStyle = css(trim, 0.9);
    c.lineWidth = Math.max(1.2, 0.12 * k);
    hexPath(c, x, y, 2.0 * k);
    c.stroke();
    c.fillStyle = css(shade(padColor, 0.5), 1);
    c.beginPath();
    c.arc(x, y, 0.9 * k, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = css(trim, 0.7);
    c.beginPath();
    c.arc(x, y, 0.9 * k, 0, Math.PI * 2);
    c.stroke();
    // Glow: the trim, and circuit lines on a ley pad.
    const gxx = gx(pad.x);
    const gyy = gx(pad.z);
    g.strokeStyle = css(trim, pad.trait === "normal" ? 0.5 : 1);
    g.lineWidth = Math.max(1, 0.14 * gk);
    hexPath(g, gxx, gyy, 2.0 * gk);
    g.stroke();
    if (pad.trait === "ley") {
      for (let line = 0; line < 6; line += 1) {
        const angle = (line / 6) * Math.PI * 2;
        for (const context of [c, g]) {
          const scale = context === c ? k : gk;
          const ox = (pad.x + GROUND_HALF) * scale;
          const oy = (pad.z + GROUND_HALF) * scale;
          context.strokeStyle = css(trim, context === c ? 0.75 : 1);
          context.lineWidth = Math.max(1, 0.08 * scale);
          context.beginPath();
          context.moveTo(ox + Math.cos(angle) * 0.95 * scale, oy + Math.sin(angle) * 0.95 * scale);
          context.lineTo(ox + Math.cos(angle) * 1.6 * scale, oy + Math.sin(angle) * 1.6 * scale);
          context.lineTo(ox + Math.cos(angle + 0.35) * 1.85 * scale, oy + Math.sin(angle + 0.35) * 1.85 * scale);
          context.stroke();
        }
      }
    }
    if (pad.trait === "high") {
      for (let mark = 0; mark < 3; mark += 1) {
        const angle = (mark / 3) * Math.PI * 2 - Math.PI / 2;
        c.fillStyle = css(trim, 0.9);
        c.beginPath();
        const mx = x + Math.cos(angle) * 1.45 * k;
        const my = y + Math.sin(angle) * 1.45 * k;
        c.moveTo(mx, my - 0.25 * k);
        c.lineTo(mx + 0.22 * k, my + 0.18 * k);
        c.lineTo(mx - 0.22 * k, my + 0.18 * k);
        c.fill();
      }
    }
  });

  if (!guide) {
    // ---- light and shadow from the height field (sun from the upper left)
    const shadeCanvas = canvas(GRID);
    const s = shadeCanvas.getContext("2d")!;
    const shadeImage = s.createImageData(GRID, GRID);
    const cell = (GROUND_HALF * 2) / (GRID - 1);
    for (let iz = 0; iz < GRID; iz += 1) {
      for (let ix = 0; ix < GRID; ix += 1) {
        const h = (x: number, z: number): number => height[Math.min(GRID - 1, Math.max(0, z)) * GRID + Math.min(GRID - 1, Math.max(0, x))]!;
        const dx = (h(ix + 1, iz) - h(ix - 1, iz)) / (2 * cell);
        const dz = (h(ix, iz + 1) - h(ix, iz - 1)) / (2 * cell);
        // Normal (−dx, 1, −dz) against a light from (−1, 1.6, −1).
        const length = Math.hypot(dx, 1, dz);
        const lit = (dx * 1 + 1.6 + dz * 1) / (length * Math.hypot(1, 1.6, 1));
        const value = Math.min(255, Math.max(0, 128 + (lit - 0.82) * 520));
        const offset = (iz * GRID + ix) * 4;
        shadeImage.data[offset] = shadeImage.data[offset + 1] = shadeImage.data[offset + 2] = value;
        shadeImage.data[offset + 3] = 255;
      }
    }
    s.putImageData(shadeImage, 0, 0);
    c.save();
    c.globalCompositeOperation = "overlay";
    c.globalAlpha = 0.75;
    c.drawImage(shadeCanvas, 0, 0, size, size);
    c.restore();

    // ---- the rim: darker toward the edge, a lit lip along it
    c.save();
    islandClip(c, k);
    c.lineWidth = 2.2 * k;
    c.strokeStyle = "rgba(0,0,0,0.45)";
    c.filter = "blur(" + Math.max(2, k * 0.8) + "px)";
    c.stroke();
    c.filter = "none";
    c.lineWidth = Math.max(1.5, 0.25 * k);
    c.strokeStyle = css(shade(ground2, 1.6), 0.6);
    c.stroke();
    c.restore();
    g.save();
    islandClip(g, gk);
    g.lineWidth = Math.max(1, 0.3 * gk);
    g.strokeStyle = css(rimColor, 0.55);
    g.stroke();
    g.restore();
  }
  return { color, glow, height, edge };
}
