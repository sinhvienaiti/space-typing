import { describe, expect, it } from "vitest";
import { SLICE_1A } from "../src/td/content/slice-1a";
import type { MapDef } from "../src/td/content/types";
import { clearLine, findPath, pullPath } from "../src/td/sim/nav/astar";
import { STEPS, WalkGrid } from "../src/td/sim/nav/grid";
import { MODE, PATH_MAX } from "../src/td/sim/stores/agents";
import { createRng } from "../src/platform/rng";
import { arrive, build, ready, run, send, world } from "./td/fixtures";

/** Walking: A*, the pulled path, re-routing (docs/td/TYPING_DEFENSE_DESIGN.md 25.9; BUILD_NOW §6.1 td-nav). */
const MAP = SLICE_1A.map;
const grid = new WalkGrid(MAP);
const cells = new Int32Array(grid.cells.length);
const cellOf = (x: number, z: number) => grid.cell(x, z);
const inBridge = (x: number, z: number) => MAP.bridges.some((r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1);
const inStream = (x: number) => MAP.water.some((r) => x >= r.x0 && x <= r.x1);

/** The cells of a path, as [x, z] centres. */
const centres = (g: WalkGrid, path: Int32Array, n: number) => Array.from(path.subarray(0, n), (c) => [g.centerX(c), g.centerZ(c)] as const);

/**
 * A plain A* with the same rules: costs 10 / 14, the octile estimate, ties to
 * the smaller f, then h, then cell index; it picks the best open cell by a
 * scan, so no heap can bend its order. It searches from the goal back, as
 * findPath does, and returns the cells from start to goal.
 */
function reference(g: WalkGrid, start: number, goal: number): number[] {
  const size = g.size;
  const h = (c: number) => {
    const dx = Math.abs((c % size) - (start % size));
    const dz = Math.abs(Math.floor(c / size) - Math.floor(start / size));
    return 10 * (dx + dz) - 6 * Math.min(dx, dz);
  };
  const cost = new Map<number, number>([[goal, 0]]);
  const parent = new Map<number, number>([[goal, -1]]);
  const open = new Set([goal]);
  const done = new Set<number>();
  while (open.size > 0) {
    let best = -1;
    for (const c of open) {
      const better = best < 0 || cost.get(c)! + h(c) < cost.get(best)! + h(best) || (cost.get(c)! + h(c) === cost.get(best)! + h(best) && (h(c) < h(best) || (h(c) === h(best) && c < best)));
      if (better) best = c;
    }
    open.delete(best);
    done.add(best);
    if (best === start) {
      const out: number[] = [];
      for (let c = start; c >= 0; c = parent.get(c)!) out.push(c);
      return out;
    }
    STEPS.forEach(([dx, dz], k) => {
      const next = best + dx + dz * size;
      const step = cost.get(best)! + (k < 4 ? 10 : 14);
      if (!g.open(best, dx, dz) || done.has(next) || (open.has(next) && step >= cost.get(next)!)) return;
      cost.set(next, step);
      parent.set(next, best);
      open.add(next);
    });
  }
  return [];
}

/** Every cell a segment touches, found by fine steps; a corner crossed counts both cells beside it. */
function segmentCells(g: WalkGrid, x0: number, z0: number, x1: number, z1: number): number[] {
  const steps = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.005) + 1;
  const out = new Set<number>();
  let last = g.cell(x0, z0);
  out.add(last);
  for (let k = 1; k <= steps; k += 1) {
    const c = g.cell(x0 + ((x1 - x0) * k) / steps, z0 + ((z1 - z0) * k) / steps);
    if (c !== last && c % g.size !== last % g.size && Math.floor(c / g.size) !== Math.floor(last / g.size)) {
      out.add(Math.floor(last / g.size) * g.size + (c % g.size));
      out.add(Math.floor(c / g.size) * g.size + (last % g.size));
    }
    out.add(c);
    last = c;
  }
  return [...out];
}

describe("A* on the walking grid (TK 25.9)", () => {
  it("crosses the Silver Stream only on a bridge, never through water; water cannot be reached", () => {
    for (const [from, to] of [[[0, 40], [-31, 10]], [[-10, 0], [-40, 0]], [[20, -40], [-40, -40]], [[-40, 40], [10, -10]]] as const) {
      const n = findPath(grid, cellOf(from[0], from[1]), cellOf(to[0], to[1]), cells);
      expect(n, from + " → " + to).toBeGreaterThan(0);
      const path = centres(grid, cells, n);
      expect(path[0]).toEqual([grid.centerX(cellOf(from[0], from[1])), grid.centerZ(cellOf(from[0], from[1]))]);
      expect(path[n - 1]).toEqual([grid.centerX(cellOf(to[0], to[1])), grid.centerZ(cellOf(to[0], to[1]))]);
      for (const [x, z] of path) {
        expect(grid.cells[cellOf(x, z)]).toBe(0);
        if (inStream(x)) expect(inBridge(x, z), "in the stream off a bridge at " + x + ", " + z).toBe(true);
      }
      expect(path.some(([x]) => inStream(x))).toBe(true);
    }
    expect(findPath(grid, cellOf(0, 40), cellOf(-24, 0), cells)).toBe(0);
  });

  it("finds the same path as a plain A* with the same ties (f, then h, then cell index) on 60 random fields", () => {
    const rng = createRng(7).ai;
    for (let trial = 0; trial < 60; trial += 1) {
      const water = Array.from({ length: rng.int(0, 7) }, () => {
        const x = rng.int(-10, 8);
        const z = rng.int(-10, 8);
        return { x0: x, x1: x + rng.int(0, 4), z0: z, z1: z + rng.int(0, 4) };
      });
      const small = new WalkGrid({ ...MAP, halfM: 10, water, bridges: [] } as MapDef);
      const out = new Int32Array(small.cells.length);
      const start = rng.int(0, small.cells.length - 1);
      const goal = rng.int(0, small.cells.length - 1);
      if (small.cells[start] !== 0 || small.cells[goal] !== 0) continue;
      const n = findPath(small, start, goal, out);
      expect(Array.from(out.subarray(0, n)), "trial " + trial).toEqual(reference(small, start, goal));
    }
  });

  it("pulls the path tight without cutting a blocked cell or a blocked corner: at most 64 points, the goal last", () => {
    const w = world({ gold: 5000 });
    for (const [id, x, z] of [["archer", -16, -4], ["cannon", 10, -16], ["barracks", 2, 18], ["gold-mine", -34, 8], ["archer", -8, 12], ["cannon", 7, 12]] as const) build(w, id, x, z);
    const g = w.grid;
    const out = new Float64Array(PATH_MAX * 2);
    const rng = createRng(3).ai;
    let tried = 0;
    while (tried < 150) {
      const sx = rng.float() * 90 - 45;
      const sz = rng.float() * 90 - 45;
      const gx = rng.float() * 90 - 45;
      const gz = rng.float() * 90 - 45;
      if (g.cells[g.cell(sx, sz)] !== 0 || g.cells[g.cell(gx, gz)] !== 0) continue;
      const n = findPath(g, g.cell(sx, sz), g.cell(gx, gz), cells);
      if (n === 0) continue;
      tried += 1;
      const points = pullPath(g, cells, n, sx, sz, gx, gz, out, 0, PATH_MAX);
      expect(points).toBeLessThanOrEqual(Math.max(1, n - 1));
      expect([out[2 * points - 2], out[2 * points - 1]]).toEqual([gx, gz]);
      for (let k = 0, x = sx, z = sz; k < points; k += 1) {
        for (const c of segmentCells(g, x, z, out[2 * k]!, out[2 * k + 1]!)) expect(g.cells[c], "cuts a blocked cell near " + g.centerX(c) + ", " + g.centerZ(c)).toBe(0);
        expect(clearLine(g, x, z, out[2 * k]!, out[2 * k + 1]!)).toBe(true);
        [x, z] = [out[2 * k]!, out[2 * k + 1]!];
      }
    }
    // A segment through a blocked cell, or between two blocked cells touching at a corner, is not clear.
    expect(clearLine(g, -30, 0, -18, 0)).toBe(false);
    const corner = new WalkGrid({ ...MAP, halfM: 3, water: [{ x0: -0.6, x1: -0.4, z0: -0.6, z1: -0.4 }, { x0: 0.4, x1: 0.6, z0: 0.4, z1: 0.6 }], bridges: [] } as MapDef);
    expect([corner.cells[corner.cell(-0.5, -0.5)], corner.cells[corner.cell(0.5, 0.5)]]).toEqual([1, 1]);
    expect(clearLine(corner, -0.5, 0.5, 0.5, -0.5)).toBe(false);
    expect(clearLine(corner, -1.5, 0.5, -0.5, 1.5)).toBe(true);
  });

  /** A sandbox world where Phẩy (agent 1) has walked 2 s from beside the Bastion toward a mine on N3, across the stream. */
  function walker() {
    const w = world({ gold: 5000 });
    send(w, { t: "sandbox", op: { op: "keepLevel", value: 2 } });
    const mine = build(w, "gold-mine", -34, 8);
    ready(w);
    send(w, { t: "assignUnit", agent: 1, building: w.buildings.id(mine) });
    run(w, 120);
    expect(w.agents.mode[1]).toBe(MODE.walk);
    return { w, mine, A: w.agents };
  }

  /** Every leg left of agent a's path crosses open cells only. */
  function pathClear(w: ReturnType<typeof world>, a: number): void {
    const A = w.agents;
    for (let k = A.next[a]!, x = A.x[a]!, z = A.z[a]!; k < A.pathN[a]!; k += 1) {
      const p = (a * PATH_MAX + k) * 2;
      for (const c of segmentCells(w.grid, x, z, A.path[p]!, A.path[p + 1]!)) expect(w.grid.cells[c], "leg crosses a blocked cell").toBe(0);
      [x, z] = [A.path[p]!, A.path[p + 1]!];
    }
  }

  it("finds the way again when a building goes down across a walker's path", () => {
    const { w, mine, A } = walker();
    const i = (1 * PATH_MAX + A.next[1]!) * 2;
    const d = Math.hypot(A.path[i]! - A.x[1]!, A.path[i + 1]! - A.z[1]!);
    expect(d).toBeGreaterThan(6);
    // A tower 4 m ahead on its leg.
    const tx = Math.round((A.x[1]! + ((A.path[i]! - A.x[1]!) / d) * 4) * 4) / 4;
    const tz = Math.round((A.z[1]! + ((A.path[i + 1]! - A.z[1]!) / d) * 4) * 4) / 4;
    const before = Array.from(A.path.subarray(PATH_MAX * 2, PATH_MAX * 2 + A.pathN[1]! * 2));
    build(w, "archer", tx, tz);
    expect(Array.from(A.path.subarray(PATH_MAX * 2, PATH_MAX * 2 + A.pathN[1]! * 2))).not.toEqual(before);
    pathClear(w, 1);
    arrive(w);
    expect(A.at[1]).toBe(mine);
  });

  it("steps a helper the new building covers out past the rim (r + 0.75 m), then walks on", () => {
    const { w, mine, A } = walker();
    const [hx, hz] = [Math.round(A.x[1]! * 4) / 4, Math.round(A.z[1]! * 4) / 4];
    build(w, "cannon", hx, hz);
    expect(w.grid.cells[w.grid.cell(A.x[1]!, A.z[1]!)]).toBe(0);
    // The build's tick also walks it one step (4 m/s) on from there.
    expect(Math.abs(Math.hypot(A.x[1]! - hx, A.z[1]! - hz) - (2.3 + 0.75))).toBeLessThanOrEqual(4 / 60 + 1e-9);
    pathClear(w, 1);
    arrive(w);
    expect(A.at[1]).toBe(mine);
  });

  it("one search takes ≤ 0.5 ms (TK 25.12): the longest ways on the sandbox field, across the stream", () => {
    const pairs = [[[44, -44], [-44, 44]], [[44, 44], [-44, -44]], [[0, 40], [-31, 10]], [[-44, -44], [44, 44]]].map(([a, b]) => [cellOf(a![0]!, a![1]!), cellOf(b![0]!, b![1]!)] as const);
    for (let warm = 0; warm < 50; warm += 1) for (const [s, g] of pairs) findPath(grid, s, g, cells);
    const times: number[] = [];
    for (let round = 0; round < 100; round += 1) {
      for (const [s, g] of pairs) {
        const start = performance.now();
        expect(findPath(grid, s, g, cells)).toBeGreaterThan(0);
        times.push(performance.now() - start);
      }
    }
    times.sort((a, b) => a - b);
    const median = times[times.length >> 1]!;
    console.log("td A*: median " + median.toFixed(3) + " ms, p95 " + times[Math.floor(times.length * 0.95)]!.toFixed(3) + " ms");
    expect(median).toBeLessThanOrEqual(0.5);
  });
});
