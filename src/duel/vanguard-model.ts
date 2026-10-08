/**
 * NOT THE DEFAULT: only behind `?ship3d=model`. The owner found this
 * code-built hull ugly ("nhìn như mô hình", a plastic toy next to the
 * painting) and chose the painted relief hull (relief-model.ts) instead.
 *
 * Vanguard modelled in 3D (2026-10-03), after the owner's painted top view
 * (art-src/ships/vanguard-top-hd.png). The relief model built from that
 * painting kept its painted light, so it still read as a flat picture; this
 * one is real geometry with physical materials, so light, reflections and
 * bank angles all behave like a solid ship.
 *
 * Layout follows the painting (hull length 1, nose at z = −0.5, tail at
 * +0.5, x across, y up): crystal nose spike, diamond crystal canopy between
 * white shoulder plates, two side pods with glowing "eye" rings and the
 * guns at their fronts, two engines behind, swept wings with blue glass tip
 * blocks, and a glowing spine between the white tail blades.
 *
 * Parts are merged into one mesh per material (a handful of draw calls).
 * Glow strips share an animated texture: energy flows nose → tail and
 * speeds up with your typing momentum.
 */
type Three = typeof import("three");
type V3 = import("three").Vector3;

export type BuiltShip = {
  group: import("three").Group;
  /** Engine exits (model space) and their radius. */
  nozzles: Array<{ at: V3; radius: number }>;
  /** Gun muzzles: shots leave here, each with a flash light. */
  muzzles: V3[];
  /** Light anchors drawn as 2D glows over the render. */
  lights: { nose: V3 | null; canopy: V3 | null; eyes: V3[]; wingtips: V3[] };
  /** Half-width of the hull (for framing). */
  halfWidth: number;
  /** Reflection strength of the studio environment. */
  environment: number;
  /** Uploaded one per frame before the first render. */
  textures: Array<import("three").Texture>;
  /** The ship's own engine and light colours (#rrggbb); absent = Vanguard cyan. */
  colors?: { hot: string; plume: string; outer: string; accent?: string };
  /** Momentum 0…1 and effects time: glow strength and energy flow. */
  tick(time: number, heat: number): void;
};

type Section = { z: number; w: number; top: number; bottom: number; x?: number };
type Bucket = "armour" | "frame" | "glow" | "crystal" | "glass" | "tip" | "hot" | "bell";

/** Linear interpolation of key sections into a dense, smooth run. */
function densify(keys: readonly Section[], steps: number): Section[] {
  const out: Section[] = [];
  for (let k = 0; k < keys.length - 1; k += 1) {
    const a = keys[k]!, b = keys[k + 1]!;
    for (let s = 0; s < steps; s += 1) {
      const t = s / steps;
      // Smoothstep between keys: no kinks along the hull.
      const e = t * t * (3 - 2 * t);
      out.push({
        z: a.z + (b.z - a.z) * t,
        w: a.w + (b.w - a.w) * e,
        top: a.top + (b.top - a.top) * e,
        bottom: a.bottom + (b.bottom - a.bottom) * e,
        x: (a.x ?? 0) + ((b.x ?? 0) - (a.x ?? 0)) * e,
      });
    }
  }
  out.push(keys[keys.length - 1]!);
  return out;
}

/**
 * Lofts a closed profile (unit coords, x −1…1, y −1 bottom … 1 top) along
 * sections. Each profile edge is its own strip, so normals are smooth along
 * the hull but edges between facets stay crisp (hard-surface look).
 */
function loft(three: Three, keys: readonly Section[], profile: ReadonlyArray<readonly [number, number]>, steps = 6): import("three").BufferGeometry {
  const sections = densify(keys, steps);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const point = (section: Section, p: readonly [number, number]): [number, number, number] => [
    (section.x ?? 0) + p[0] * section.w,
    section.bottom + (p[1] + 1) / 2 * (section.top - section.bottom),
    section.z,
  ];
  for (let e = 0; e < profile.length; e += 1) {
    const p0 = profile[e]!, p1 = profile[(e + 1) % profile.length]!;
    // Outward winding, decided once per strip at its widest section.
    let widest = sections[0]!;
    for (const section of sections) if (section.w > widest.w) widest = section;
    const next = sections[Math.min(sections.length - 1, sections.indexOf(widest) + 1)]!;
    const prev = sections[Math.max(0, sections.indexOf(widest) - 1)]!;
    const a = point(prev, p0), b = point(prev, p1), c = point(next, p0);
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz;
    const mx = (a[0] + b[0]) / 2 - (widest.x ?? 0), my = (a[1] + b[1]) / 2 - (widest.top + widest.bottom) / 2;
    const flip = nx * mx + ny * my < 0;
    const base = positions.length / 3;
    for (const section of sections) {
      for (const q of [point(section, p0), point(section, p1)]) {
        positions.push(q[0], q[1], q[2]);
        uvs.push(q[0] + 0.5, q[2] + 0.5);
      }
    }
    for (let j = 0; j < sections.length - 1; j += 1) {
      const i0 = base + j * 2, i1 = i0 + 1, i2 = i0 + 2, i3 = i0 + 3;
      if (flip) indices.push(i0, i2, i1, i1, i2, i3);
      else indices.push(i0, i1, i2, i1, i3, i2);
    }
  }
  const geometry = new three.BufferGeometry();
  geometry.setAttribute("position", new three.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new three.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  // Shared only within a strip: smooth along the hull, crisp facet edges.
  geometry.computeVertexNormals();
  return geometry;
}

/** Octagon with a wide flat top and a narrower keel: armour cross-section. */
const HULL: ReadonlyArray<readonly [number, number]> = [
  [-0.62, 1], [0.62, 1], [1, 0.45], [1, -0.2], [0.6, -1], [-0.6, -1], [-1, -0.2], [-1, 0.45],
];
/** Rounder 12-gon for pods and fairings. */
const ROUND: ReadonlyArray<readonly [number, number]> = Array.from({ length: 12 }, (_, i) => {
  const a = Math.PI / 2 - (i / 12) * Math.PI * 2;
  return [Math.cos(a), Math.sin(a)] as const;
});
/** A flat-topped plate with chamfered upper edges. */
const PLATE: ReadonlyArray<readonly [number, number]> = [[-0.7, 1], [0.7, 1], [1, 0.2], [1, -1], [-1, -1], [-1, 0.2]];

/** Panel seams and rivets for the white armour (also a faint bump). */
function panelTexture(three: Three): import("three").Texture | null {
  if (typeof document === "undefined") return null;
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d");
  if (g === null) return null;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, size, size);
  let seed = 0x1d3a;
  const random = (): number => (seed = (seed * 48271) % 2147483647) / 2147483647;
  // Soft grime so large plates are not flat white.
  for (let i = 0; i < 70; i += 1) {
    const x = random() * size, y = random() * size, r = 20 + random() * 70;
    const grime = g.createRadialGradient(x, y, 0, x, y, r);
    grime.addColorStop(0, "rgba(150,160,175,0.10)");
    grime.addColorStop(1, "rgba(150,160,175,0)");
    g.fillStyle = grime;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Panel seams: angled cuts like the painting, plus a few straight ones.
  g.strokeStyle = "rgba(70,80,95,0.85)";
  g.lineWidth = 2;
  for (let i = 0; i < 26; i += 1) {
    const x = random() * size, y = random() * size, length = 40 + random() * 120;
    const angle = [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4][Math.floor(random() * 4)]!;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    g.stroke();
  }
  g.fillStyle = "rgba(60,70,85,0.7)";
  for (let i = 0; i < 90; i += 1) {
    g.beginPath();
    g.arc(random() * size, random() * size, 1.6, 0, Math.PI * 2);
    g.fill();
  }
  const texture = new three.CanvasTexture(canvas);
  texture.colorSpace = three.SRGBColorSpace;
  texture.wrapS = texture.wrapT = three.RepeatWrapping;
  texture.repeat.set(2.2, 2.2);
  return texture;
}

/** A bright band on dark: scrolled along glow strips as flowing energy. */
function flowTexture(three: Three): import("three").Texture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 128;
  const g = canvas.getContext("2d");
  if (g === null) return null;
  const band = g.createLinearGradient(0, 0, 0, 128);
  band.addColorStop(0, "#5a6a78");
  band.addColorStop(0.42, "#6f8090");
  band.addColorStop(0.5, "#ffffff");
  band.addColorStop(0.58, "#6f8090");
  band.addColorStop(1, "#5a6a78");
  g.fillStyle = band;
  g.fillRect(0, 0, 4, 128);
  const texture = new three.CanvasTexture(canvas);
  texture.colorSpace = three.SRGBColorSpace;
  texture.wrapS = texture.wrapT = three.RepeatWrapping;
  return texture;
}

/**
 * A cut gem along z: two pyramids of `sides` facets meeting at a girdle,
 * flat-shaded so every facet catches its own reflection.
 */
function gem(three: Three, sides: number): import("three").BufferGeometry {
  const geometry = new three.LatheGeometry([new three.Vector2(0, -1), new three.Vector2(1, -0.15), new three.Vector2(0.86, 0.35), new three.Vector2(0, 1)], sides);
  // Lathe axis is y: lay it along z (nose → tail), one facet edge on top.
  geometry.rotateX(Math.PI / 2);
  geometry.rotateZ(Math.PI / sides);
  return geometry.toNonIndexed();
}

/** Concatenates non-indexed geometries (position, normal, uv). */
function merge(three: Three, parts: import("three").BufferGeometry[]): import("three").BufferGeometry {
  const flat = parts.map((part) => (part.index === null ? part : part.toNonIndexed()));
  let count = 0;
  for (const part of flat) count += part.getAttribute("position").count;
  const position = new Float32Array(count * 3), normal = new Float32Array(count * 3), uv = new Float32Array(count * 2);
  let at = 0;
  for (const part of flat) {
    const p = part.getAttribute("position"), n = part.getAttribute("normal"), t = part.getAttribute("uv");
    position.set(p.array as Float32Array, at * 3);
    if (n !== undefined) normal.set(n.array as Float32Array, at * 3);
    if (t !== undefined) uv.set(t.array as Float32Array, at * 2);
    at += p.count;
  }
  const geometry = new three.BufferGeometry();
  geometry.setAttribute("position", new three.BufferAttribute(position, 3));
  geometry.setAttribute("normal", new three.BufferAttribute(normal, 3));
  geometry.setAttribute("uv", new three.BufferAttribute(uv, 2));
  return geometry;
}

/** Splits an extrude (caps = group 0, sides = group 1) into two geometries. */
function splitGroups(three: Three, geometry: import("three").BufferGeometry): import("three").BufferGeometry[] {
  const flat = geometry.index === null ? geometry : geometry.toNonIndexed();
  return flat.groups.map((group) => {
    const part = new three.BufferGeometry();
    for (const name of ["position", "normal", "uv"] as const) {
      const attribute = flat.getAttribute(name);
      if (attribute === undefined) continue;
      const size = attribute.itemSize;
      part.setAttribute(name, new three.BufferAttribute(
        (attribute.array as Float32Array).slice(group.start * size, (group.start + group.count) * size), size));
    }
    return part;
  });
}

export function buildVanguard(three: Three): BuiltShip {
  const buckets = new Map<Bucket, import("three").BufferGeometry[]>();
  const put = (bucket: Bucket, geometry: import("three").BufferGeometry, matrix?: import("three").Matrix4): void => {
    if (matrix !== undefined) geometry.applyMatrix4(matrix);
    let list = buckets.get(bucket);
    if (list === undefined) buckets.set(bucket, (list = []));
    list.push(geometry);
  };
  const m = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1): import("three").Matrix4 =>
    new three.Matrix4().compose(new three.Vector3(x, y, z), new three.Quaternion().setFromEuler(new three.Euler(rx, ry, rz)), new three.Vector3(sx, sy, sz));
  const mirror = new three.Matrix4().makeScale(-1, 1, 1);
  /** The x → −x copy, with the winding put back (mirroring flips it). */
  const mirrored = (source: import("three").BufferGeometry): import("three").BufferGeometry => {
    const flipped = (source.index === null ? source.clone() : source.toNonIndexed()).applyMatrix4(mirror);
    for (const name of ["position", "normal", "uv"] as const) {
      const attribute = flipped.getAttribute(name);
      if (attribute === undefined) continue;
      for (let i = 0; i < attribute.count; i += 3) {
        for (let c = 0; c < attribute.itemSize; c += 1) {
          const a = attribute.getComponent(i + 1, c);
          attribute.setComponent(i + 1, c, attribute.getComponent(i + 2, c));
          attribute.setComponent(i + 2, c, a);
        }
      }
    }
    return flipped;
  };
  /** Adds a part and its mirror image. */
  const pair = (bucket: Bucket, make: () => import("three").BufferGeometry): void => {
    const part = make();
    put(bucket, mirrored(part));
    put(bucket, part);
  };
  const extrude = (points: ReadonlyArray<readonly [number, number]>, depth: number, bevel: number): import("three").BufferGeometry => {
    const shape = new three.Shape(points.map(([x, z]) => new three.Vector2(x, z)));
    const geometry = new three.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 4 });
    // Shape (x, z) lies flat; the extrusion runs down from y = 0.
    geometry.rotateX(Math.PI / 2);
    return geometry;
  };
  /** An extruded plate: caps and bevelled sides take different materials. */
  const plate = (caps: Bucket, sides: Bucket, points: ReadonlyArray<readonly [number, number]>, depth: number, bevel: number, matrix: import("three").Matrix4): void => {
    const [cap, side] = splitGroups(three, extrude(points, depth, bevel).applyMatrix4(matrix));
    if (cap !== undefined) { put(caps, mirrored(cap)); put(caps, cap); }
    if (side !== undefined) { put(sides, mirrored(side)); put(sides, side); }
  };

  // --- Fuselage: dark core, white shoulders and tail blades, glowing spine.
  put("frame", loft(three, [
    { z: -0.5, w: 0.002, top: 0.012, bottom: 0.004 },
    { z: -0.42, w: 0.034, top: 0.046, bottom: -0.012 },
    { z: -0.3, w: 0.078, top: 0.07, bottom: -0.026 },
    { z: -0.17, w: 0.122, top: 0.078, bottom: -0.036 },
    { z: -0.04, w: 0.15, top: 0.084, bottom: -0.04 },
    { z: 0.1, w: 0.128, top: 0.076, bottom: -0.04 },
    { z: 0.26, w: 0.088, top: 0.06, bottom: -0.034 },
    { z: 0.41, w: 0.038, top: 0.034, bottom: -0.018 },
    { z: 0.49, w: 0.004, top: 0.01, bottom: -0.002 },
  ], HULL));
  pair("armour", () => loft(three, [
    { z: -0.34, x: 0.06, w: 0.004, top: 0.05, bottom: 0.03 },
    { z: -0.24, x: 0.088, w: 0.042, top: 0.078, bottom: 0.03 },
    { z: -0.1, x: 0.104, w: 0.058, top: 0.088, bottom: 0.028 },
    { z: 0.0, x: 0.1, w: 0.048, top: 0.086, bottom: 0.03 },
    { z: 0.05, x: 0.085, w: 0.006, top: 0.075, bottom: 0.04 },
  ], PLATE, 7));
  pair("armour", () => loft(three, [
    { z: -0.02, x: 0.05, w: 0.004, top: 0.08, bottom: 0.05 },
    { z: 0.06, x: 0.05, w: 0.03, top: 0.09, bottom: 0.04 },
    { z: 0.26, x: 0.042, w: 0.026, top: 0.072, bottom: 0.03 },
    { z: 0.43, x: 0.016, w: 0.01, top: 0.04, bottom: 0.016 },
    { z: 0.47, x: 0.006, w: 0.002, top: 0.025, bottom: 0.012 },
  ], PLATE, 7));
  put("glow", loft(three, [
    { z: -0.02, w: 0.008, top: 0.09, bottom: 0.07 },
    { z: 0.2, w: 0.009, top: 0.08, bottom: 0.06 },
    { z: 0.44, w: 0.004, top: 0.04, bottom: 0.02 },
  ], PLATE, 6));

  // Crystal nose spike and the diamond canopy.
  const noseCone = new three.ConeGeometry(0.046, 0.27, 4, 1);
  noseCone.rotateY(Math.PI / 4);
  noseCone.rotateX(-Math.PI / 2);
  noseCone.scale(1, 0.75, 1);
  put("crystal", noseCone, m(0, 0.062, -0.372));
  // The canopy is the painting's centrepiece: a big faceted crystal, the
  // highest point of the hull, in a dark frame.
  put("glass", gem(three, 6), m(0, 0.1, -0.17, 0, 0, 0, 0.064, 0.048, 0.17));
  put("frame", new three.OctahedronGeometry(1, 0), m(0, 0.084, -0.168, 0, 0, 0, 0.086, 0.04, 0.205));
  // Glowing ridge from the nose crystal to the canopy.
  put("glow", loft(three, [
    { z: -0.33, w: 0.004, top: 0.084, bottom: 0.07 },
    { z: -0.27, w: 0.008, top: 0.09, bottom: 0.074 },
    { z: -0.21, w: 0.006, top: 0.094, bottom: 0.078 },
  ], PLATE, 4));

  // --- Side pods: dark body, white cap, glowing strip, eye ring, gun.
  const PX = 0.255;
  pair("frame", () => loft(three, [
    { z: -0.18, x: PX, w: 0.004, top: 0.012, bottom: 0.004 },
    { z: -0.16, x: PX, w: 0.03, top: 0.04, bottom: -0.02 },
    { z: -0.12, x: PX, w: 0.046, top: 0.058, bottom: -0.034 },
    { z: 0.06, x: PX, w: 0.05, top: 0.064, bottom: -0.036 },
    { z: 0.17, x: PX, w: 0.04, top: 0.05, bottom: -0.028 },
    { z: 0.2, x: PX, w: 0.02, top: 0.03, bottom: -0.01 },
  ], ROUND, 5));
  pair("armour", () => loft(three, [
    { z: -0.15, x: PX, w: 0.02, top: 0.05, bottom: 0.03 },
    { z: -0.1, x: PX, w: 0.042, top: 0.072, bottom: 0.03 },
    { z: 0.0, x: PX, w: 0.044, top: 0.074, bottom: 0.03 },
    { z: 0.02, x: PX, w: 0.03, top: 0.07, bottom: 0.04 },
  ], PLATE, 5));
  pair("glow", () => loft(three, [
    { z: -0.135, x: PX, w: 0.006, top: 0.072, bottom: 0.06 },
    { z: -0.03, x: PX, w: 0.009, top: 0.08, bottom: 0.066 },
  ], PLATE, 4));
  pair("glow", () => {
    const ring = new three.TorusGeometry(0.028, 0.0065, 8, 28);
    ring.rotateX(Math.PI / 2);
    return ring.applyMatrix4(m(PX, 0.068, 0.07));
  });
  pair("hot", () => new three.CircleGeometry(0.019, 20).rotateX(-Math.PI / 2).applyMatrix4(m(PX, 0.069, 0.07)));
  pair("bell", () => {
    const gun = new three.CylinderGeometry(0.009, 0.011, 0.07, 10, 1);
    gun.rotateX(Math.PI / 2);
    return gun.applyMatrix4(m(PX, 0.012, -0.19));
  });

  // --- Engines: cylinders with bands, open bells and hot cores.
  const EX = 0.128;
  pair("frame", () => {
    const body = new three.CylinderGeometry(0.044, 0.046, 0.22, 24, 1);
    body.rotateX(Math.PI / 2);
    return body.applyMatrix4(m(EX, 0.002, 0.225));
  });
  for (const z of [0.17, 0.27]) {
    pair("glow", () => {
      const band = new three.TorusGeometry(0.047, 0.004, 6, 28);
      return band.applyMatrix4(m(EX, 0.002, z));
    });
  }
  pair("bell", () => {
    const bell = new three.CylinderGeometry(0.046, 0.038, 0.045, 24, 1, true);
    bell.rotateX(Math.PI / 2);
    return bell.applyMatrix4(m(EX, 0.002, 0.355));
  });
  pair("hot", () => new three.CircleGeometry(0.034, 24).applyMatrix4(m(EX, 0.002, 0.35)));

  // --- Wings: white panels with dark bevelled edges, blue glass tip blocks,
  // glowing leading edges, a little dihedral.
  const wing: ReadonlyArray<readonly [number, number]> = [
    [-0.2, -0.012], [-0.44, 0.086], [-0.44, 0.318], [-0.2, 0.29],
  ];
  // Blue glass tip block in a dark frame, along the outer edge.
  const tipFrame: ReadonlyArray<readonly [number, number]> = [
    [-0.428, 0.07], [-0.47, 0.098], [-0.499, 0.145], [-0.489, 0.31], [-0.452, 0.33], [-0.428, 0.326],
  ];
  const tipGlass: ReadonlyArray<readonly [number, number]> = [
    [-0.44, 0.11], [-0.468, 0.122], [-0.486, 0.158], [-0.478, 0.29], [-0.452, 0.305], [-0.44, 0.302],
  ];
  // Dark inner wing between the fuselage and the pod.
  const root: ReadonlyArray<readonly [number, number]> = [[-0.12, -0.02], [-0.215, -0.04], [-0.215, 0.27], [-0.12, 0.23]];
  const dihedral = m(0, 0.004, 0, 0, 0, -0.07);
  plate("armour", "frame", wing, 0.016, 0.006, dihedral.clone().multiply(m(0, 0.012, 0)));
  plate("frame", "frame", tipFrame, 0.026, 0.005, dihedral.clone().multiply(m(0, 0.026, 0)));
  plate("tip", "frame", tipGlass, 0.008, 0.002, dihedral.clone().multiply(m(0, 0.034, 0)));
  plate("frame", "frame", root, 0.03, 0.004, m(0, 0.016, 0));
  pair("glow", () => {
    const edge = new three.BoxGeometry(0.255, 0.01, 0.012);
    const angle = Math.atan2(0.086 + 0.012, 0.44 - 0.2);
    return edge.applyMatrix4(dihedral.clone().multiply(m(-0.32, 0.024, 0.036, 0, angle, 0)));
  });
  // Dark spar across the wing and a small vent, as in the painting.
  pair("frame", () => new three.BoxGeometry(0.23, 0.012, 0.02).applyMatrix4(dihedral.clone().multiply(m(-0.325, 0.022, 0.27))));
  pair("frame", () => new three.CapsuleGeometry(0.008, 0.03, 4, 8).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).applyMatrix4(dihedral.clone().multiply(m(-0.31, 0.022, 0.17))));
  // Shoulder fins: small glowing blades beside the canopy.
  pair("glow", () => {
    const fin = extrude([[0, 0], [0.13, 0], [0.09, 0.045]], 0.006, 0.002);
    // Flat (along = x, up = z) → stand it up: along → +z, up → +y, then lean out.
    const stand = new three.Matrix4().makeBasis(new three.Vector3(0, 0, 1), new three.Vector3(1, 0, 0), new three.Vector3(0, 1, 0));
    return fin.applyMatrix4(m(0.16, 0.06, -0.28, 0, 0, -0.5).multiply(stand));
  });
  // Inner strips between the fuselage and the engines.
  pair("glow", () => new three.BoxGeometry(0.01, 0.008, 0.22).applyMatrix4(m(0.118, 0.062, 0.05, 0, -0.18, 0)));

  // --- Materials.
  const panel = panelTexture(three);
  const flow = flowTexture(three);
  const materials: Record<Bucket, import("three").Material> = {
    armour: new three.MeshPhysicalMaterial({
      color: 0xd9dfe8, map: panel, bumpMap: panel, bumpScale: 0.35,
      metalness: 0.22, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.2,
    }),
    frame: new three.MeshStandardMaterial({ color: 0x1b222d, metalness: 0.86, roughness: 0.3 }),
    glow: new three.MeshStandardMaterial({
      color: 0x08263a, emissive: 0x39d4ff, emissiveMap: flow, emissiveIntensity: 2.4, metalness: 0.2, roughness: 0.3,
    }),
    crystal: new three.MeshPhysicalMaterial({
      color: 0x0b3d8a, emissive: 0x1a9cff, emissiveIntensity: 0.9, metalness: 0.05, roughness: 0.06,
      clearcoat: 1, clearcoatRoughness: 0.05, flatShading: true,
    }),
    tip: new three.MeshPhysicalMaterial({
      color: 0x0a2a5c, emissive: 0x1d8fff, emissiveIntensity: 0.75, metalness: 0.1, roughness: 0.08,
      clearcoat: 1, clearcoatRoughness: 0.05,
    }),
    glass: new three.MeshPhysicalMaterial({
      color: 0x0c3c9e, emissive: 0x2a8cff, emissiveIntensity: 1.2, metalness: 0.35, roughness: 0.02,
      clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.8, flatShading: true,
    }),
    hot: new three.MeshBasicMaterial({ color: 0xc8f6ff, toneMapped: false }),
    bell: new three.MeshStandardMaterial({ color: 0x2a3240, metalness: 0.9, roughness: 0.25, side: three.DoubleSide }),
  };
  const group = new three.Group();
  for (const [bucket, parts] of buckets) {
    group.add(new three.Mesh(merge(three, parts), materials[bucket]));
  }

  const V = (x: number, y: number, z: number): V3 => new three.Vector3(x, y, z);
  const glow = materials.glow as import("three").MeshStandardMaterial;
  const glass = materials.glass as import("three").MeshPhysicalMaterial;
  const crystal = materials.crystal as import("three").MeshPhysicalMaterial;
  const tipGlow = materials.tip as import("three").MeshPhysicalMaterial;
  return {
    group,
    nozzles: [-1, 1].map((side) => ({ at: V(side * EX, 0.002, 0.378), radius: 0.036 })),
    muzzles: [-1, 1].map((side) => V(side * PX, 0.012, -0.225)),
    lights: {
      nose: V(0, 0.062, -0.505),
      canopy: V(0, 0.12, -0.17),
      eyes: [-1, 1].map((side) => V(side * PX, 0.07, 0.07)),
      wingtips: [-1, 1].map((side) => V(side * 0.49, 0.045, 0.31)),
    },
    halfWidth: 0.5,
    environment: 0.45,
    textures: [panel, flow].filter((texture): texture is import("three").Texture => texture !== null),
    tick(time, heat) {
      if (flow !== null) flow.offset.y = -time * (0.45 + heat * 1.6);
      glow.emissiveIntensity = 2.2 + heat * 2;
      glass.emissiveIntensity = 1.1 + heat * 1.1;
      crystal.emissiveIntensity = 0.85 + heat * 0.7;
      tipGlow.emissiveIntensity = 0.7 + heat * 0.9;
    },
  };
}
