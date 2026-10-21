/**
 * The road on the ground plane: a Catmull-Rom curve through the map's points,
 * sampled once into short straight pieces so that a distance along it turns
 * into a point and a heading with one table lookup (no curve maths per frame).
 */
export type Point2 = { x: number; z: number };

export class RoadPath {
  readonly length: number;
  private readonly xs: Float64Array;
  private readonly zs: Float64Array;
  private readonly at: Float64Array;
  private readonly step: number;

  constructor(points: readonly (readonly [number, number])[], samplesPerSegment = 24) {
    const raw: Point2[] = [];
    for (let index = 0; index < points.length - 1; index += 1) {
      const p0 = points[Math.max(0, index - 1)]!;
      const p1 = points[index]!;
      const p2 = points[index + 1]!;
      const p3 = points[Math.min(points.length - 1, index + 2)]!;
      for (let sample = 0; sample < samplesPerSegment; sample += 1) {
        const t = sample / samplesPerSegment;
        raw.push({ x: catmull(p0[0], p1[0], p2[0], p3[0], t), z: catmull(p0[1], p1[1], p2[1], p3[1], t) });
      }
    }
    const last = points[points.length - 1]!;
    raw.push({ x: last[0], z: last[1] });
    // Resample at an even spacing, so a distance maps straight to an index.
    const lengths = [0];
    for (let index = 1; index < raw.length; index += 1) {
      lengths.push(lengths[index - 1]! + Math.hypot(raw[index]!.x - raw[index - 1]!.x, raw[index]!.z - raw[index - 1]!.z));
    }
    this.length = lengths[lengths.length - 1]!;
    const count = Math.max(2, Math.ceil(this.length / 0.25));
    this.step = this.length / (count - 1);
    this.xs = new Float64Array(count);
    this.zs = new Float64Array(count);
    this.at = new Float64Array(count);
    let cursor = 0;
    for (let index = 0; index < count; index += 1) {
      const distance = index * this.step;
      while (cursor < lengths.length - 2 && lengths[cursor + 1]! < distance) cursor += 1;
      const span = lengths[cursor + 1]! - lengths[cursor]!;
      const f = span > 0 ? (distance - lengths[cursor]!) / span : 0;
      this.xs[index] = raw[cursor]!.x + (raw[cursor + 1]!.x - raw[cursor]!.x) * f;
      this.zs[index] = raw[cursor]!.z + (raw[cursor + 1]!.z - raw[cursor]!.z) * f;
      this.at[index] = distance;
    }
  }

  /** The point `distance` metres along, moved `lateral` metres to the right of the heading. */
  point(distance: number, lateral: number, out: Point2): Point2 {
    const index = this.index(distance);
    const f = (Math.min(this.length, Math.max(0, distance)) - index * this.step) / this.step;
    const x0 = this.xs[index] ?? 0;
    const z0 = this.zs[index] ?? 0;
    const x1 = this.xs[index + 1] ?? x0;
    const z1 = this.zs[index + 1] ?? z0;
    let dx = x1 - x0;
    let dz = z1 - z0;
    const norm = Math.hypot(dx, dz) || 1;
    dx /= norm;
    dz /= norm;
    // Right of the heading on the ground plane (x right, z toward the camera).
    out.x = x0 + (x1 - x0) * f - dz * lateral;
    out.z = z0 + (z1 - z0) * f + dx * lateral;
    return out;
  }

  /** Heading angle at `distance` (radians, atan2 of the ground direction). */
  heading(distance: number): number {
    const index = this.index(distance);
    const x0 = this.xs[index] ?? 0;
    const z0 = this.zs[index] ?? 0;
    return Math.atan2((this.xs[index + 1] ?? x0) - x0, (this.zs[index + 1] ?? z0) - z0);
  }

  /** Distance along the road of the sample nearest to (x, z), and how far away it is. */
  nearest(x: number, z: number): { distance: number; gap: number } {
    let best = 0;
    let bestGap = Infinity;
    for (let index = 0; index < this.xs.length; index += 1) {
      const gap = Math.hypot((this.xs[index] ?? 0) - x, (this.zs[index] ?? 0) - z);
      if (gap < bestGap) {
        bestGap = gap;
        best = index;
      }
    }
    return { distance: this.at[best] ?? 0, gap: bestGap };
  }

  /** Every sample, for drawing the road. */
  samples(spacing: number): Point2[] {
    const out: Point2[] = [];
    for (let distance = 0; distance <= this.length; distance += spacing) out.push(this.point(distance, 0, { x: 0, z: 0 }));
    return out;
  }

  private index(distance: number): number {
    return Math.min(this.xs.length - 2, Math.max(0, Math.floor(Math.min(this.length, Math.max(0, distance)) / this.step)));
  }
}

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
