/**
 * The walking grid (docs/td/TYPING_DEFENSE_DESIGN.md 25.9): 1 m cells over
 * the 96 × 96 m field. A cell is blocked by any painted water not on a bridge
 * or by a building disc; Thư Đồng walk it, and placement checks that every
 * work socket stays reachable from the Bastion on it.
 */
import type { MapDef } from "../../content/types";

export const CELL = { water: 1, building: 2, probe: 4 } as const;

/** 8 neighbours as [dx, dz]; a diagonal needs both of its sides open. */
export const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const;

/** Whether the 1 m cell from (x, z) to (x + 1, z + 1) holds painted water no one bridge covers: the whole cell, not its centre, so a walker anywhere in an open cell stays on grass or on a bridge as drawn. */
function wet(map: MapDef, x: number, z: number): boolean {
  return map.water.some((rect) => {
    const [x0, x1, z0, z1] = [Math.max(x, rect.x0), Math.min(x + 1, rect.x1), Math.max(z, rect.z0), Math.min(z + 1, rect.z1)];
    return x0 < x1 && z0 < z1 && !map.bridges.some((b) => b.x0 <= x0 && x1 <= b.x1 && b.z0 <= z0 && z1 <= b.z1);
  });
}

export class WalkGrid {
  readonly size: number;
  readonly origin: number;
  readonly cells: Uint8Array;

  constructor(map: MapDef) {
    this.size = Math.round(map.halfM * 2);
    this.origin = -map.halfM;
    this.cells = new Uint8Array(this.size * this.size);
    for (let index = 0; index < this.cells.length; index += 1) {
      if (wet(map, this.centerX(index) - 0.5, this.centerZ(index) - 0.5)) this.cells[index] = CELL.water;
    }
  }

  /** The cell holding (x, z), −1 off the grid. */
  cell(x: number, z: number): number {
    const col = Math.floor(x - this.origin);
    const row = Math.floor(z - this.origin);
    return col < 0 || row < 0 || col >= this.size || row >= this.size ? -1 : row * this.size + col;
  }

  centerX(index: number): number {
    return this.origin + (index % this.size) + 0.5;
  }

  centerZ(index: number): number {
    return this.origin + Math.floor(index / this.size) + 0.5;
  }

  /** Sets or clears `flag` on every cell whose centre lies within r of (x, z). */
  stamp(x: number, z: number, r: number, flag: number, on: boolean): void {
    const r2 = r * r;
    for (let row = Math.max(0, Math.floor(z - r - this.origin)); row <= Math.min(this.size - 1, Math.floor(z + r - this.origin)); row += 1) {
      for (let col = Math.max(0, Math.floor(x - r - this.origin)); col <= Math.min(this.size - 1, Math.floor(x + r - this.origin)); col += 1) {
        const dx = this.origin + col + 0.5 - x;
        const dz = this.origin + row + 0.5 - z;
        if (dx * dx + dz * dz > r2) continue;
        const index = row * this.size + col;
        this.cells[index] = on ? this.cells[index]! | flag : this.cells[index]! & ~flag;
      }
    }
  }

  /** Whether a step from `index` by (dx, dz) lands on an open cell (or on `pass`) without cutting a corner. */
  open(index: number, dx: number, dz: number, pass = -1): boolean {
    const col = (index % this.size) + dx;
    const row = Math.floor(index / this.size) + dz;
    if (col < 0 || row < 0 || col >= this.size || row >= this.size) return false;
    if (this.cells[row * this.size + col] !== 0 && row * this.size + col !== pass) return false;
    return dx === 0 || dz === 0 || (this.cells[index + dx] === 0 && this.cells[index + dz * this.size] === 0);
  }
}
