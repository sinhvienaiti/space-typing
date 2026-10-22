/**
 * Breadth-first reach on the walking grid (TK 12.5 "lối đi"): after a
 * building goes down, every work socket must still be reachable from the
 * Bastion. Scratch arrays are allocated once per grid size.
 */
import { STEPS, type WalkGrid } from "./grid";

let seen = new Uint8Array(0);
let queue = new Int32Array(0);

/** Whether every target cell can be walked to from `from` (a blocked target cannot). */
export function reachesAll(grid: WalkGrid, from: number, targets: readonly number[]): boolean {
  const total = grid.cells.length;
  if (seen.length !== total) {
    seen = new Uint8Array(total);
    queue = new Int32Array(total);
  }
  if (from < 0 || grid.cells[from] !== 0) return targets.length === 0;
  for (const target of targets) if (target < 0 || grid.cells[target] !== 0) return false;
  seen.fill(0);
  for (const target of targets) seen[target] = 2;
  let left = targets.filter((target, index) => targets.indexOf(target) === index && target !== from).length;
  seen[from] = 1;
  queue[0] = from;
  let head = 0;
  let tail = 1;
  while (head < tail && left > 0) {
    const index = queue[head++]!;
    for (const [dx, dz] of STEPS) {
      if (!grid.open(index, dx, dz)) continue;
      const next = index + dx + dz * grid.size;
      if (seen[next] === 1) continue;
      if (seen[next] === 2) left -= 1;
      seen[next] = 1;
      queue[tail++] = next;
    }
  }
  return left === 0;
}
