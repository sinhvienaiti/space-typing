/**
 * A* on the walking grid (docs/td/TYPING_DEFENSE_DESIGN.md 25.9): whole-number
 * costs (10 straight, 14 diagonal), the octile estimate, ties to the smaller
 * f, then the smaller h, then the smaller cell index; a binary heap on arrays
 * allocated once per grid size, so a search allocates nothing. The cell path
 * is then pulled tight by line of sight on the cells.
 */
import { STEPS, type WalkGrid } from "./grid";

const COST = [10, 10, 10, 10, 14, 14, 14, 14]; // by STEPS index
let g = new Int32Array(0);
let parent = new Int32Array(0);
let opened = new Uint32Array(0);
let closed = new Uint32Array(0);
let heap = new Float64Array(0);
let search = 0;

/** Octile distance in cost units from `cell` to (col, row). */
function estimate(cell: number, size: number, col: number, row: number): number {
  const dx = Math.abs((cell % size) - col);
  const dz = Math.abs(Math.floor(cell / size) - row);
  return 10 * (dx + dz) - 6 * Math.min(dx, dz);
}

/** f, then h, then the cell, as one exact integer: f < 2^20, h < 2^11, cell < 2^14. */
const key = (f: number, h: number, cell: number): number => (f * 2048 + h) * 16384 + cell;

/** Writes the cells from `start` to `goal` into `out` and returns how many (0: no way). It searches from the goal, so parents read from the start walk forward. */
export function findPath(grid: WalkGrid, start: number, goal: number, out: Int32Array): number {
  const total = grid.cells.length;
  if (total > 16384) throw new Error("td nav: heap keys hold 14 cell bits, " + total + " cells asked");
  if (g.length !== total) {
    [g, parent, opened, closed] = [new Int32Array(total), new Int32Array(total), new Uint32Array(total), new Uint32Array(total)];
    heap = new Float64Array(total * 8 + 1); // the estimate is consistent: a cell closes once, after at most 8 pushes
  }
  if (start < 0 || goal < 0) return 0;
  const size = grid.size;
  const col = start % size;
  const row = Math.floor(start / size);
  search += 1;
  g[goal] = 0;
  parent[goal] = -1;
  opened[goal] = search;
  heap[0] = key(estimate(goal, size, col, row), estimate(goal, size, col, row), goal);
  for (let n = 1; n > 0; ) {
    const cell: number = heap[0]! % 16384;
    const last = heap[--n]!;
    let hole = 0;
    for (let child = 1; child < n; hole = child, child = 2 * child + 1) {
      if (child + 1 < n && heap[child + 1]! < heap[child]!) child += 1;
      if (heap[child]! >= last) break;
      heap[hole] = heap[child]!;
    }
    heap[hole] = last;
    if (closed[cell] === search) continue;
    closed[cell] = search;
    if (cell === start) {
      let count = 0;
      for (let at = start; at >= 0; at = parent[at]!) out[count++] = at;
      return count;
    }
    for (let k = 0; k < STEPS.length; k += 1) {
      const [dx, dz] = STEPS[k]!;
      const next = cell + dx + dz * size;
      const cost = g[cell]! + COST[k]!;
      if (!grid.open(cell, dx, dz) || closed[next] === search || (opened[next] === search && cost >= g[next]!)) continue;
      g[next] = cost;
      parent[next] = cell;
      opened[next] = search;
      const h = estimate(next, size, col, row);
      const value = key(cost + h, h, next);
      let up = n++;
      for (; up > 0 && heap[(up - 1) >> 1]! > value; up = (up - 1) >> 1) heap[up] = heap[(up - 1) >> 1]!;
      heap[up] = value;
    }
  }
  return 0;
}

/** Whether the segment from (x0, z0) to (x1, z1) crosses open cells only: samples under 1 m apart, each step to a neighbouring cell passing grid.open (a corner needs both cells beside it). */
export function clearLine(grid: WalkGrid, x0: number, z0: number, x1: number, z1: number): boolean {
  const steps = Math.ceil(Math.sqrt((x1 - x0) * (x1 - x0) + (z1 - z0) * (z1 - z0)) * 2);
  let cell = grid.cell(x0, z0);
  if (cell < 0 || grid.cells[cell] !== 0) return false;
  for (let k = 1; k <= steps; k += 1) {
    const next = grid.cell(x0 + ((x1 - x0) * k) / steps, z0 + ((z1 - z0) * k) / steps);
    if (next !== cell && (next < 0 || !grid.open(cell, (next % grid.size) - (cell % grid.size), Math.floor(next / grid.size) - Math.floor(cell / grid.size)))) return false;
    cell = next;
  }
  return true;
}

/** The path pulled tight from (sx, sz) to (gx, gz) (TK 25.9 "kéo dây"): from each corner on to the furthest cell in a clear straight line. Writes ≤ max (x, z) points into `out` from `at`; returns how many, the goal last unless cut short. */
export function pullPath(grid: WalkGrid, cells: Int32Array, count: number, sx: number, sz: number, gx: number, gz: number, out: Float64Array, at: number, max: number): number {
  const last = Math.max(1, count - 1); // the goal point stands in for the goal cell
  const px = (k: number): number => (k === last ? gx : grid.centerX(cells[k]!));
  const pz = (k: number): number => (k === last ? gz : grid.centerZ(cells[k]!));
  let n = 0;
  for (let from = 0, x = sx, z = sz; from < last && n < max; n += 1) {
    let to = from + 1;
    while (to < last && clearLine(grid, x, z, px(to + 1), pz(to + 1))) to += 1;
    x = out[at + 2 * n] = px(to);
    z = out[at + 2 * n + 1] = pz(to);
    from = to;
  }
  return n;
}
