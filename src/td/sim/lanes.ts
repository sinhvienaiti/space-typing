/**
 * A lane on the ground plane: a Catmull-Rom curve through the map's points,
 * sampled once into short straight pieces so that a distance along it turns
 * into a point with one table lookup (no curve maths per tick).
 *
 * Copied from Rift Defense V4 (src/defense/rules/path.ts, RoadPath), which
 * Typing Defense may not import (TK 25.1 rule 3). Changes: Math.hypot became
 * Math.sqrt (the rules' allowed maths, TK 25.5), the atan2 heading is gone,
 * and the curve is in Hermite form so that routes can share tangents
 * (groundLanes).
 */
export type Point2 = { x: number; z: number };
type Knot = readonly [number, number];

/**
 * Lanes for routes that share points (a fork, a merge). A knot's tangent is
 * the mean of its Catmull-Rom tangents over every route through it, so where
 * routes split or join they still trace one curve on the shared stretch and
 * each bends off it smoothly; elsewhere the mean is the plain tangent.
 */
export function groundLanes(routes: readonly (readonly Knot[])[]): Lane[] {
  const sums = new Map<string, [number, number, number]>();
  for (const points of routes) {
    points.forEach((p, i) => {
      const [mx, mz] = catmullTangent(points, i);
      const [x, z, n] = sums.get(p.join()) ?? [0, 0, 0];
      sums.set(p.join(), [x + mx, z + mz, n + 1]);
    });
  }
  return routes.map((points) => new Lane(points, points.map((p) => {
    const [x, z, n] = sums.get(p.join())!;
    return [x / n, z / n] as const;
  })));
}

/** Half the step from the previous knot to the next (one-sided at the ends). */
const catmullTangent = (points: readonly Knot[], i: number): Knot => {
  const a = points[Math.max(0, i - 1)]!;
  const b = points[Math.min(points.length - 1, i + 1)]!;
  return [(b[0] - a[0]) / 2, (b[1] - a[1]) / 2];
};

export class Lane {
  readonly length: number;
  readonly xs: Float64Array;
  readonly zs: Float64Array;
  private readonly step: number;

  constructor(points: readonly Knot[], tangents: readonly Knot[] = points.map((_, i) => catmullTangent(points, i)), samplesPerSegment = 24) {
    const raw: Point2[] = [];
    for (let index = 0; index < points.length - 1; index += 1) {
      const p1 = points[index]!;
      const p2 = points[index + 1]!;
      const m1 = tangents[index]!;
      const m2 = tangents[index + 1]!;
      for (let sample = 0; sample < samplesPerSegment; sample += 1) {
        const t = sample / samplesPerSegment;
        raw.push({ x: hermite(p1[0], m1[0], p2[0], m2[0], t), z: hermite(p1[1], m1[1], p2[1], m2[1], t) });
      }
    }
    const last = points[points.length - 1]!;
    raw.push({ x: last[0], z: last[1] });
    // Resample at an even spacing, so a distance maps straight to an index.
    const lengths = [0];
    for (let index = 1; index < raw.length; index += 1) {
      const dx = raw[index]!.x - raw[index - 1]!.x;
      const dz = raw[index]!.z - raw[index - 1]!.z;
      lengths.push(lengths[index - 1]! + Math.sqrt(dx * dx + dz * dz));
    }
    this.length = lengths[lengths.length - 1]!;
    const count = Math.max(2, Math.ceil(this.length / 0.25));
    this.step = this.length / (count - 1);
    this.xs = new Float64Array(count);
    this.zs = new Float64Array(count);
    let cursor = 0;
    for (let index = 0; index < count; index += 1) {
      const distance = index * this.step;
      while (cursor < lengths.length - 2 && lengths[cursor + 1]! < distance) cursor += 1;
      const span = lengths[cursor + 1]! - lengths[cursor]!;
      const f = span > 0 ? (distance - lengths[cursor]!) / span : 0;
      this.xs[index] = raw[cursor]!.x + (raw[cursor + 1]!.x - raw[cursor]!.x) * f;
      this.zs[index] = raw[cursor]!.z + (raw[cursor + 1]!.z - raw[cursor]!.z) * f;
    }
  }

  /** The point `distance` metres along, moved `lateral` metres to the right of the heading. */
  point(distance: number, lateral: number, out: Point2): Point2 {
    const index = this.index(distance);
    const f = (Math.min(this.length, Math.max(0, distance)) - index * this.step) / this.step;
    const x0 = this.xs[index]!;
    const z0 = this.zs[index]!;
    const x1 = this.xs[index + 1]!;
    const z1 = this.zs[index + 1]!;
    let dx = x1 - x0;
    let dz = z1 - z0;
    const norm = Math.sqrt(dx * dx + dz * dz) || 1;
    dx /= norm;
    dz /= norm;
    // Right of the heading on the ground plane (x right, z toward the Bastion in the south).
    out.x = x0 + (x1 - x0) * f - dz * lateral;
    out.z = z0 + (z1 - z0) * f + dx * lateral;
    return out;
  }

  /** Squared distance from (x, z) to the nearest sample of the centre line; that sample goes to `out`. */
  gap2(x: number, z: number, out?: Point2): number {
    let best = Infinity;
    for (let index = 0; index < this.xs.length; index += 1) {
      const dx = this.xs[index]! - x;
      const dz = this.zs[index]! - z;
      const d2 = dx * dx + dz * dz;
      if (d2 >= best) continue;
      best = d2;
      if (out !== undefined) {
        out.x = this.xs[index]!;
        out.z = this.zs[index]!;
      }
    }
    return best;
  }

  private index(distance: number): number {
    return Math.min(this.xs.length - 2, Math.max(0, Math.floor(Math.min(this.length, Math.max(0, distance)) / this.step)));
  }
}

function hermite(p1: number, m1: number, p2: number, m2: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p1 + (t3 - 2 * t2 + t) * m1 + (3 * t2 - 2 * t3) * p2 + (t3 - t2) * m2;
}
