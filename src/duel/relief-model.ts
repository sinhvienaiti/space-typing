import type { CharacterId } from "../characters/registry";
import type { BuiltShip } from "./vanguard-model";

/**
 * Relief hull (first 3D pilot, 2026-10-03): the owner's painted top view
 * raised into a solid. scripts/bg-art/prepare-ship-3d.mjs writes the hull
 * paint, the glowing parts and an "inflated" height (a union of balls inside
 * the outline: thick fuselage, thin wings). Here big domes are flattened into
 * armour plates and a thinner, darker underside is mirrored below.
 *
 * This is the default 3D hull (owner's pick from the A/B/C demo, 2026-10-03):
 * it keeps the painting's detail, and real light, shadows, hull lights and
 * gun flashes come from ship3d.ts and the anchors in model.json.
 */
type Three = typeof import("three");
type HeightField = { width: number; height: number; data: Float32Array };

type Model = {
  aspect: number;
  heightScale: number;
  heightGrid: [number, number];
  nozzles: number[][];
  /** Light and gun anchors, 0…1 of the art (v = 0 at the nose). */
  anchors?: {
    nose?: number[];
    canopy?: number[];
    eyes?: number[][];
    guns?: number[][];
    wingtips?: number[][];
  };
  /** Engine flame colours and the hull's glow colour, from the painting. */
  colors?: { hot?: unknown; plume?: unknown; outer?: unknown; accent?: unknown };
  color: string;
  emissive?: string;
  height: string;
};

const HEX = /^#[0-9a-f]{6}$/i;

const ROOT = "/assets/space-typing/ships/3d/";
/** Height where domes flatten into plates (hull lengths), and the underside share. */
const PLATE = 0.075;
const UNDER = 0.45;

let index: Promise<ReadonlySet<string>> | null = null;

/** Ships that have relief data (manifest.json), so a missing one is never requested. */
function reliefIndex(): Promise<ReadonlySet<string>> {
  index ??= fetch(ROOT + "manifest.json", { cache: "no-cache" })
    .then((reply) => (reply.ok ? reply.json() : {}) as Promise<{ ships?: unknown }>)
    .then((manifest) => new Set(Array.isArray(manifest.ships) ? manifest.ships.filter((id): id is string => typeof id === "string") : []))
    .catch(() => new Set<string>());
  return index;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  return image.decode().then(() => image);
}

function plate(height: number): number {
  return PLATE * (1 - Math.exp(-height / PLATE));
}

/** Bilinear sample, u/v 0…1 (v = 0 at the nose). */
function sample(field: HeightField, u: number, v: number): number {
  const x = Math.max(0, Math.min(field.width - 1, u * (field.width - 1)));
  const y = Math.max(0, Math.min(field.height - 1, v * (field.height - 1)));
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = Math.min(field.width - 1, x0 + 1), y1 = Math.min(field.height - 1, y0 + 1);
  const fx = x - x0, fy = y - y0;
  const d = field.data;
  const top = d[y0 * field.width + x0]! * (1 - fx) + d[y0 * field.width + x1]! * fx;
  const bottom = d[y1 * field.width + x0]! * (1 - fx) + d[y1 * field.width + x1]! * fx;
  return top * (1 - fy) + bottom * fy;
}

/** Loads the prepared relief data and builds the hull, or null if missing. */
/** Mesh detail: your near ship 176 cells across, the small far rival 96. */
export async function loadReliefShip(three: Three, id: CharacterId, maxAnisotropy: number, segments = 176): Promise<BuiltShip | null> {
  if (!(await reliefIndex()).has(id)) return null;
  const base = ROOT + id + "/";
  const response = await fetch(base + "model.json", { cache: "no-cache" });
  if (!response.ok) return null;
  const model = (await response.json()) as Partial<Model>;
  const grid = model.heightGrid;
  if (typeof model.aspect !== "number" || typeof model.color !== "string" || typeof model.height !== "string"
    || !Array.isArray(grid) || typeof grid[0] !== "number" || typeof grid[1] !== "number") return null;
  const [colorImage, emissiveImage, bytes] = await Promise.all([
    loadImage(base + model.color),
    typeof model.emissive === "string" ? loadImage(base + model.emissive).catch(() => null) : Promise.resolve(null),
    fetch(base + model.height).then((reply) => reply.ok ? reply.arrayBuffer() : Promise.reject(new Error("height"))),
  ]);
  const [columns, rows] = grid;
  if (bytes.byteLength !== columns * rows) return null;
  const heights: HeightField = { width: columns, height: rows, data: Float32Array.from(new Uint8Array(bytes), (value) => value / 255) };
  const aspect = model.aspect;
  const heightScale = typeof model.heightScale === "number" ? model.heightScale : 0.2;
  const nozzles = Array.isArray(model.nozzles)
    ? model.nozzles.filter((point) => Array.isArray(point) && point.length >= 2 && point.every((value) => typeof value === "number"))
    : [];

  const colorMap = new three.Texture(colorImage);
  colorMap.colorSpace = three.SRGBColorSpace;
  colorMap.anisotropy = Math.min(8, maxAnisotropy);
  colorMap.needsUpdate = true;
  const emissiveMap = emissiveImage === null ? null : new three.Texture(emissiveImage);
  if (emissiveMap !== null) {
    emissiveMap.colorSpace = three.SRGBColorSpace;
    emissiveMap.needsUpdate = true;
  }
  const top = new three.MeshStandardMaterial({
    map: colorMap, emissiveMap, emissive: emissiveMap === null ? 0x000000 : 0xffffff, emissiveIntensity: 1.2,
    metalness: 0.38, roughness: 0.38, alphaTest: 0.5, alphaToCoverage: true,
  });
  const under = new three.MeshStandardMaterial({ map: colorMap, color: 0x5a6274, metalness: 0.55, roughness: 0.45, alphaTest: 0.5, alphaToCoverage: true });
  const geometry = relief(three, aspect, heightScale, heights, segments);
  const group = new three.Group();
  const topMesh = new three.Mesh(geometry, top);
  const underMesh = new three.Mesh(geometry, under);
  underMesh.scale.y = -UNDER; // mirrored: three flips the winding for us
  group.add(topMesh, underMesh);

  const bell = new three.MeshStandardMaterial({ color: 0x2b3342, metalness: 0.8, roughness: 0.32 });
  const core = new three.MeshBasicMaterial({ color: 0xa8f0ff, toneMapped: false });
  const exits = nozzles.map(([u = 0.5, v = 1, r = 0.035]) => {
    const t = plate(sample(heights, u, Math.max(0, v - 0.025)) * heightScale);
    const radius = Math.min(r * aspect, (1 + UNDER) * t * 0.5) * 0.92;
    const at = new three.Vector3((u - 0.5) * aspect, (1 - UNDER) * t * 0.5, v - 0.5);
    const ring = new three.Mesh(new three.CylinderGeometry(radius, radius * 1.08, 0.05, 20, 1, true), bell);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(at.x, at.y, at.z - 0.01);
    const glow = new three.Mesh(new three.CircleGeometry(radius * 0.8, 20), core);
    glow.position.set(at.x, at.y, at.z + 0.008);
    group.add(ring, glow);
    return { at: at.setZ(at.z + 0.012), radius };
  });
  // Anchors sit on the painted surface (its relief height at that point).
  const surface = (point: number[] | undefined, lift = 0.008): import("three").Vector3 | null => {
    if (!Array.isArray(point) || typeof point[0] !== "number" || typeof point[1] !== "number") return null;
    const [u, v] = point as [number, number];
    return new three.Vector3((u - 0.5) * aspect, plate(sample(heights, u, v) * heightScale) + lift, v - 0.5);
  };
  const many = (points: number[][] | undefined, lift?: number): import("three").Vector3[] =>
    (Array.isArray(points) ? points : []).map((point) => surface(point, lift)).filter((point): point is import("three").Vector3 => point !== null);
  const anchors = model.anchors ?? {};
  const c = model.colors;
  const colors = c !== undefined && [c.hot, c.plume, c.outer].every((value) => typeof value === "string" && HEX.test(value))
    ? { hot: c.hot as string, plume: c.plume as string, outer: c.outer as string, ...(typeof c.accent === "string" && HEX.test(c.accent) ? { accent: c.accent } : {}) }
    : undefined;
  return {
    ...(colors === undefined ? {} : { colors }),
    group,
    nozzles: exits,
    // Guns sit in the pod fronts, a little forward of the painted tip.
    muzzles: many(anchors.guns, -0.01).map((point) => point.setZ(point.z - 0.02)),
    lights: { nose: surface(anchors.nose), canopy: surface(anchors.canopy, 0.012), eyes: many(anchors.eyes), wingtips: many(anchors.wingtips) },
    halfWidth: aspect / 2,
    environment: 0.3,
    textures: emissiveMap === null ? [colorMap] : [colorMap, emissiveMap],
    tick(_time, heat) {
      top.emissiveIntensity = 1.6 + heat * 1.4;
    },
  };
}

/**
 * A grid over the hull's footprint (x across, z nose → tail), raised by the
 * plated height (hull lengths). Cells fully outside the outline are skipped.
 */
function relief(three: Three, aspect: number, heightScale: number, field: HeightField, segments: number): import("three").BufferGeometry {
  const sx = segments, sz = Math.max(8, Math.round(segments / aspect));
  const columns = sx + 1, rows = sz + 1, count = columns * rows;
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const lift = new Float32Array(count);
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < columns; i += 1) {
      const at = j * columns + i, u = i / sx, v = j / sz;
      const t = sample(field, u, v);
      lift[at] = t > 0.002 ? plate(t * heightScale) : 0;
      positions[at * 3] = (u - 0.5) * aspect;
      positions[at * 3 + 1] = lift[at]!;
      positions[at * 3 + 2] = v - 0.5;
      uvs[at * 2] = u;
      uvs[at * 2 + 1] = 1 - v;
    }
  }
  // Normals straight from the height grid (central differences).
  const dx = aspect / sx, dz = 1 / sz;
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < columns; i += 1) {
      const at = j * columns + i;
      const gx = (lift[j * columns + Math.min(sx, i + 1)]! - lift[j * columns + Math.max(0, i - 1)]!) / (dx * (i > 0 && i < sx ? 2 : 1));
      const gz = (lift[Math.min(sz, j + 1) * columns + i]! - lift[Math.max(0, j - 1) * columns + i]!) / (dz * (j > 0 && j < sz ? 2 : 1));
      const length = Math.hypot(gx, 1, gz);
      normals[at * 3] = -gx / length;
      normals[at * 3 + 1] = 1 / length;
      normals[at * 3 + 2] = -gz / length;
    }
  }
  // Keep cells within two cells of the hull (alphaTest trims to the paint).
  const near = new Uint8Array(count);
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < columns; i += 1) {
      if (lift[j * columns + i] === 0) continue;
      for (let nj = Math.max(0, j - 2); nj <= Math.min(sz, j + 2); nj += 1) {
        near.fill(1, nj * columns + Math.max(0, i - 2), nj * columns + Math.min(sx, i + 2) + 1);
      }
    }
  }
  let cells = 0;
  for (let j = 0; j < sz; j += 1) for (let i = 0; i < sx; i += 1) if (near[j * columns + i] === 1) cells += 1;
  const indices = count > 65535 ? new Uint32Array(cells * 6) : new Uint16Array(cells * 6);
  let at = 0;
  for (let j = 0; j < sz; j += 1) {
    for (let i = 0; i < sx; i += 1) {
      if (near[j * columns + i] !== 1) continue;
      const a = j * columns + i, b = a + 1, c = a + columns, d = c + 1;
      indices[at++] = a; indices[at++] = c; indices[at++] = b;
      indices[at++] = b; indices[at++] = c; indices[at++] = d;
    }
  }
  const geometry = new three.BufferGeometry();
  geometry.setAttribute("position", new three.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new three.BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new three.BufferAttribute(uvs, 2));
  geometry.setIndex(new three.BufferAttribute(indices, 1));
  return geometry;
}
