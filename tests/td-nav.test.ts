import { describe, expect, it } from "vitest";
import { SLICE_1A } from "../src/td/content/slice-1a";
import type { MapDef } from "../src/td/content/types";
import { clearLine, findPath, nearestOpen, pullPath } from "../src/td/sim/nav/astar";
import { STEPS, WalkGrid } from "../src/td/sim/nav/grid";
import { canPlace } from "../src/td/sim/placement";
import { MODE, PATH_MAX } from "../src/td/sim/stores/agents";
import { stand } from "../src/td/sim/systems/agents";
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

/** The farthest a leg from (x0, z0) to (x1, z1) goes over the painted water off the painted bridges, in metres past a bridge's side (0: never), sampled every 2 cm. */
function overWater(x0: number, z0: number, x1: number, z1: number): number {
  let worst = 0;
  const steps = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.02) + 1;
  for (let k = 0; k <= steps; k += 1) {
    const [x, z] = [x0 + ((x1 - x0) * k) / steps, z0 + ((z1 - z0) * k) / steps];
    if (!MAP.water.some((r) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) || inBridge(x, z)) continue;
    worst = Math.max(worst, Math.min(...MAP.bridges.map((r) => Math.max(r.z0 - z, z - r.z1))));
  }
  return worst;
}

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

  it("finds the same path as a plain A* with the same ties (f, then h, then cell index) on 300 random fields, sparse and dense", () => {
    const rng = createRng(7).ai;
    // Dense fields make equal-cost ways meet: a parent replaced on an equal cost changes the path there.
    for (let trial = 0; trial < 300; trial += 1) {
      const [lo, hi, big] = trial < 60 ? [0, 7, 4] : [8, 20, 3];
      const water = Array.from({ length: rng.int(lo, hi) }, () => {
        const x = rng.int(-10, 8);
        const z = rng.int(-10, 8);
        return { x0: x, x1: x + rng.int(0, big), z0: z, z1: z + rng.int(0, big) };
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
        // On the picture too: never over the painted stream beside a painted bridge.
        expect(overWater(x, z, out[2 * k]!, out[2 * k + 1]!), "leg to " + out[2 * k] + ", " + out[2 * k + 1] + " over the painted water").toBe(0);
        [x, z] = [out[2 * k]!, out[2 * k + 1]!];
      }
    }
    // A segment through a blocked cell, or between two blocked cells touching at a corner, is not clear.
    expect(clearLine(g, -30, 0, -18, 0)).toBe(false);
    const corner = new WalkGrid({ ...MAP, halfM: 3, water: [{ x0: -0.6, x1: -0.4, z0: -0.6, z1: -0.4 }, { x0: 0.4, x1: 0.6, z0: 0.4, z1: 0.6 }], bridges: [] } as MapDef);
    expect([corner.cells[corner.cell(-0.5, -0.5)], corner.cells[corner.cell(0.5, 0.5)]]).toEqual([1, 1]);
    expect(clearLine(corner, -0.5, 0.5, 0.5, -0.5)).toBe(false);
    expect(clearLine(corner, -1.5, 0.5, -0.5, 1.5)).toBe(true);
    // A wall one cell thick stops every segment across it, whatever its length, slope or offset: no sample skips a cell.
    const wall = new WalkGrid({ ...MAP, halfM: 8, water: [{ x0: 0, x1: 1, z0: -8, z1: 8 }], bridges: [] } as MapDef);
    for (let k = 0; k < 400; k += 1) {
      const [x0, len, slope] = [-7.5 + (k % 20) * 0.23, 5 + (k % 7) * 0.61, ((k % 11) - 5) * 0.12];
      expect(clearLine(wall, x0, -2, x0 + len, -2 + slope * len), "from " + x0 + " length " + len).toBe(x0 + len < 0);
    }
  });

  it("walks every way across the stream on the painted bridges: 400 random crossings never leave them (cells wholly on a bridge)", () => {
    const out = new Float64Array(PATH_MAX * 2);
    const rng = createRng(11).ai;
    let crossings = 0;
    while (crossings < 400) {
      const [sx, sz, gx, gz] = [rng.float() * 90 - 45, rng.float() * 90 - 45, rng.float() * 90 - 45, rng.float() * 90 - 45];
      if (sx < -24 === gx < -24 || grid.cells[cellOf(sx, sz)] !== 0 || grid.cells[cellOf(gx, gz)] !== 0) continue;
      const n = findPath(grid, cellOf(sx, sz), cellOf(gx, gz), cells);
      expect(n).toBeGreaterThan(0);
      crossings += 1;
      const points = pullPath(grid, cells, n, sx, sz, gx, gz, out, 0, PATH_MAX);
      for (let k = 0, x = sx, z = sz; k < points; k += 1) {
        expect(overWater(x, z, out[2 * k]!, out[2 * k + 1]!), "leg " + x + ", " + z + " → " + out[2 * k] + ", " + out[2 * k + 1]).toBe(0);
        [x, z] = [out[2 * k]!, out[2 * k + 1]!];
      }
    }
    // The walkable bridge is the painted one's middle 2 m (z 25–27 of 24.5–27.5): the half cells at its sides hold water.
    expect([24.5, 25.5, 26.5, 27.5].map((z) => grid.cells[cellOf(-24, z)])).toEqual([1, 0, 0, 1]);
    expect([-25.75, -22.25].map((x) => grid.cells[cellOf(x, 26)])).toEqual([0, 0]); // the bank cells half on the bridge are open
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

  /** Agent a stands where one stands to work at building b (it was sent there). */
  const standsBy = (w: ReturnType<typeof world>, a: number, b: number): boolean => {
    const spot = { ...stand(w, b) };
    return w.agents.mode[a] === MODE.stand && w.agents.x[a] === spot.x && w.agents.z[a] === spot.z;
  };

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
    expect(standsBy(w, 1, mine)).toBe(true);
  });

  /**
   * Agent a, covered at (x, z) by the building just put down, now stands (one walking step on) by the centre of the nearest
   * open cell from which its goal can be reached: no open cell nearer (ties to the smaller index) leads there.
   */
  function steppedOut(w: ReturnType<typeof world>, a: number, x: number, z: number): void {
    const g = w.grid;
    const to = g.cell(w.agents.x[a]!, w.agents.z[a]!);
    expect(g.cells[to], "on an open cell").toBe(0);
    expect(Math.hypot(g.centerX(to) - w.agents.x[a]!, g.centerZ(to) - w.agents.z[a]!), "a walking step from its centre").toBeLessThanOrEqual(4 / 60 + 1e-9);
    const d2 = (c: number) => (g.centerX(c) - x) ** 2 + (g.centerZ(c) - z) ** 2;
    const goal = g.cell(w.agents.gx[a]!, w.agents.gz[a]!);
    for (let dz = -6; dz <= 6; dz += 1) {
      for (let dx = -6; dx <= 6; dx += 1) {
        const c = g.cell(x + dx, z + dz);
        if (c < 0 || g.cells[c] !== 0 || c === to || d2(c) > d2(to) || (d2(c) === d2(to) && c > to)) continue;
        expect(findPath(g, c, goal, cells), "a nearer open cell " + g.centerX(c) + ", " + g.centerZ(c) + " leads to the goal").toBe(0);
      }
    }
  }

  it("steps a helper the new building covers to the nearest open cell that leads on, then walks on", () => {
    const { w, mine, A } = walker();
    const [x, z] = [A.x[1]!, A.z[1]!];
    build(w, "cannon", Math.round(x * 4) / 4, Math.round(z * 4) / 4);
    steppedOut(w, 1, x, z);
    pathClear(w, 1);
    arrive(w);
    expect(standsBy(w, 1, mine)).toBe(true);
  });

  it("a helper built over beside the stream, by the bridge, never lands in the water and still reaches the mine", () => {
    // Gạch walking to N3 over the south bridge: archers put down over him (every legal half metre) while he nears the stream.
    const walking = (ticks: number) => {
      const w = world({ gold: 5000 });
      send(w, { t: "sandbox", op: { op: "keepLevel", value: 4 } });
      const mine = build(w, "gold-mine", -34, 8);
      ready(w);
      send(w, { t: "assignUnit", agent: 3, building: w.buildings.id(mine) });
      run(w, ticks);
      return { w, mine };
    };
    let cases = 0;
    let wet = 0;
    for (let ticks = 250; ticks <= 360; ticks += 10) {
      const { w } = walking(ticks);
      const [hx, hz] = [w.agents.x[3]!, w.agents.z[3]!];
      if (hx < -22 || hx > -17) continue;
      const [cx, cz] = [w.grid.centerX(w.grid.cell(hx, hz)), w.grid.centerZ(w.grid.cell(hx, hz))];
      for (let qx = Math.round(hx * 2 - 4) * 2; qx <= Math.round(hx * 2 + 4) * 2; qx += 2) {
        for (let qz = Math.round(hz * 2 - 4) * 2; qz <= Math.round(hz * 2 + 4) * 2; qz += 2) {
          const [bx, bz] = [qx / 4, qz / 4];
          if (Math.hypot(cx - bx, cz - bz) > 2 || !canPlace(w, w.c.buildingIndex("archer"), qx, qz).ok) continue;
          // Where 1A.3 backed him out (r + 0.75 m along the ray from the archer): water, here, is what left him stuck.
          const d = Math.hypot(hx - bx, hz - bz);
          wet += w.grid.cells[w.grid.cell(bx + ((hx - bx) / d) * 2.75, bz + ((hz - bz) / d) * 2.75)] === 0 ? 0 : 1;
          const fresh = walking(ticks);
          build(fresh.w, "archer", bx, bz);
          steppedOut(fresh.w, 3, hx, hz);
          arrive(fresh.w);
          expect(standsBy(fresh.w, 3, fresh.mine), "archer at " + bx + ", " + bz).toBe(true);
          cases += 1;
        }
      }
    }
    expect(cases).toBeGreaterThan(50);
    expect(wet).toBeGreaterThan(0);
  });

  it("steps a covered helper past a nearer open cell walled in, to the nearest one that leads to its goal", () => {
    // One open cell at (0.5, 0.5) with water all round: nearest to a helper standing on it, but a dead end.
    const ring = [{ x0: -1, x1: 2, z0: -1, z1: 0 }, { x0: -1, x1: 2, z0: 1, z1: 2 }, { x0: -1, x1: 0, z0: 0, z1: 1 }, { x0: 1, x1: 2, z0: 0, z1: 1 }];
    const g = new WalkGrid({ ...MAP, halfM: 8, water: ring, bridges: [] } as MapDef);
    const out = new Int32Array(g.cells.length);
    expect(g.cells[g.cell(0.5, 0.5)]).toBe(0);
    expect(nearestOpen(g, 0.5, 0.5, g.cell(0.5, 6.5), out)).toBe(g.cell(0.5, -1.5)); // two away, the smaller index of the tie
    expect(nearestOpen(g, 0.5, 0.5, g.cell(0.5, 0.5), out)).toBe(g.cell(0.5, 0.5)); // its goal in there too: it stays
  });

  it("a helper on a blocked cell walks off it when sent: A* starts from a blocked cell beside an open one", () => {
    // A water cell on the bank: a path leaves it for the open cell beside it; from mid-stream, with water all round, there is none.
    const bank = cellOf(-22.5, 0);
    expect(grid.cells[bank]).toBe(1);
    const n = findPath(grid, bank, cellOf(-10, 0), cells);
    expect(n).toBeGreaterThan(1);
    expect(Array.from(cells.subarray(1, n)).every((c) => grid.cells[c] === 0)).toBe(true);
    expect(findPath(grid, cellOf(-24, 0), cellOf(-10, 0), cells)).toBe(0);
    // Gạch stranded there (as 1A.3 could leave him) and sent to the mine across the stream gets there.
    const w = world({ gold: 5000 });
    send(w, { t: "sandbox", op: { op: "keepLevel", value: 4 } });
    const mine = build(w, "gold-mine", -34, 8);
    ready(w);
    [w.agents.x[3], w.agents.z[3]] = [-22.3, 0.4];
    send(w, { t: "assignUnit", agent: 3, building: w.buildings.id(mine) });
    expect(w.agents.mode[3]).toBe(MODE.walk);
    arrive(w);
    expect(standsBy(w, 3, mine)).toBe(true);
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
