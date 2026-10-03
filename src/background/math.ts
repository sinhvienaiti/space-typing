import type { GradeSpec } from "./types";

export const TAU = Math.PI * 2;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** FNV-1a 32-bit hash; stable seeds for Worlds and stages. */
export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Small deterministic PRNG (mulberry32) returning values in [0, 1). */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomIn(
  random: () => number,
  range: readonly [number, number],
): number {
  return lerp(range[0], range[1], random());
}

/**
 * Texture-space centre of the plate window on one axis. `visible` is the
 * cover-fit share of that axis and `focus` picks which part of a cropped
 * plate stays in view (0 = left/top, 0.5 = centre, 1 = right/bottom). The
 * drift margin is kept, so the drifting window never leaves the texture.
 */
export function plateAxisCenter(
  visible: number,
  zoom: number,
  drift: number,
  focus: number,
): number {
  const room = Math.max(0, 0.5 - visible / (2 * zoom) - (drift * visible) / zoom);
  return 0.5 + (clamp(focus, 0, 1) - 0.5) * 2 * room;
}

/**
 * Column-major 3x3 matrix applying saturation, hue rotation (YIQ) and tint,
 * ready for a GLSL `mat3` uniform.
 */
export function gradeColorMatrix(grade: GradeSpec): Float32Array {
  const angle = (grade.hueShift * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const toYiq = [
    [0.299, 0.587, 0.114],
    [0.596, -0.274, -0.322],
    [0.211, -0.523, 0.312],
  ] as const;
  const toRgb = [
    [1, 0.956, 0.621],
    [1, -0.272, -0.647],
    [1, -1.106, 1.703],
  ] as const;
  const s = grade.saturation;
  // In YIQ space saturation scales I/Q and hue rotates the I/Q plane.
  const yiqOp = [
    [1, 0, 0],
    [0, s * cos, -s * sin],
    [0, s * sin, s * cos],
  ] as const;

  const multiply = (
    a: readonly (readonly number[])[],
    b: readonly (readonly number[])[],
  ): number[][] =>
    a.map((row) =>
      [0, 1, 2].map((column) =>
        row.reduce((sum, value, k) => sum + value * b[k]![column]!, 0),
      ),
    );

  const rowMajor = multiply(multiply(toRgb, yiqOp), toYiq);
  const tint = grade.tint;
  const out = new Float32Array(9);
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      out[column * 3 + row] = rowMajor[row]![column]! * tint[row]!;
    }
  }
  return out;
}
