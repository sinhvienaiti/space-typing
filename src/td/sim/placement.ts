/**
 * Free placement (docs/td/TYPING_DEFENSE_DESIGN.md 12.5–12.6), shared by the
 * build menu's red ring and the `build` command. The checks run in the
 * design's fixed order and the first failure is the reason shown; 1A has no
 * slopes or scenery, so those two steps are absent.
 */
import { ASSIST, BUILD, RALLY } from "../content/rules";
import { CELL } from "./nav/grid";
import { reachesAll } from "./nav/connectivity";
import type { World } from "./world";

export const PLACE_CHECKS = ["phase", "capTotal", "capType", "bounds", "node", "water", "road", "keep", "overlap", "rally", "path", "gold"] as const;
export type PlaceReason = (typeof PLACE_CHECKS)[number];
export type Placement = { ok: true; x: number; z: number; node: number } | { ok: false; reason: PlaceReason };

const no = (reason: PlaceReason): Placement => ({ ok: false, reason });

export type Point = { x: number; z: number };
const socket: Point = { x: 0, z: 0 };

/** The cell `reach` m from (x, z) toward the Bastion (from the Bastion itself, south, off the road), the point into `out`: a socket is a step off the rim (TK 8.4). */
export function socketCell(w: World, x: number, z: number, reach: number, out = socket): number {
  const dx = w.map.keep[0] - x;
  const dz = w.map.keep[1] - z;
  const norm = Math.sqrt(dx * dx + dz * dz);
  out.x = norm > 0 ? x + (dx / norm) * reach : x;
  out.z = norm > 0 ? z + (dz / norm) * reach : z + reach;
  return w.grid.cell(out.x, out.z);
}

/** `free`: the gold check is left out (the sandbox preset; the spots the keyboard offers). */
export function canPlace(w: World, def: number, qx: number, qz: number, free = false): Placement {
  const spec = Number.isInteger(def) ? w.c.buildings[def] : undefined;
  if (w.phase === "defeat") return no("phase");
  const B = w.buildings;
  const others = B.live(1);
  if (others.length >= BUILD.caps.total) return no("capTotal");
  if (spec === undefined || spec.placement === "fixed") return no("capType");
  const sameKind = others.filter((slot) => {
    const other = w.c.buildings[B.def[slot]!]!;
    return spec.family === "attack" ? other.family === "attack" : other.index === def;
  }).length;
  if ((spec.family === "attack" && sameKind >= BUILD.caps.attack) || (spec.barracks !== null && sameKind >= BUILD.caps.barracks)) return no("capType");

  // Positions are whole quarter metres; anything else (NaN included) is off the map.
  if (!Number.isInteger(qx) || !Number.isInteger(qz)) return no("bounds");
  let x = qx * BUILD.snapM;
  let z = qz * BUILD.snapM;
  const r = spec.radius;
  const half = w.map.buildHalfM;
  if (Math.abs(x) + r > half || Math.abs(z) + r > half) return no("bounds");

  let node = -1;
  if (spec.placement === "node") {
    node = w.map.nodes.findIndex((n) => (n.x - x) * (n.x - x) + (n.z - z) * (n.z - z) <= BUILD.nodeSnapM * BUILD.nodeSnapM);
    if (node < 0 || others.some((slot) => B.node[slot] === node)) return no("node");
    x = w.map.nodes[node]!.x;
    z = w.map.nodes[node]!.z;
  }

  for (const rect of [...w.map.water, ...w.map.bridges]) {
    const nx = Math.max(rect.x0, Math.min(rect.x1, x)) - x;
    const nz = Math.max(rect.z0, Math.min(rect.z1, z)) - z;
    if (nx * nx + nz * nz < r * r) return no("water");
  }

  const clear = BUILD.roadClearM + r;
  for (let lane = 0; lane < w.lanes.length - 1; lane += 1) if (w.lanes[lane]!.gap2(x, z) < clear * clear) return no("road");

  const kx = w.map.keep[0] - x;
  const kz = w.map.keep[1] - z;
  if (kx * kx + kz * kz < (BUILD.keepClearM + r) * (BUILD.keepClearM + r)) return no("keep");

  for (const slot of others) {
    const gap = r + w.c.buildings[B.def[slot]!]!.radius + BUILD.gapM;
    const dx = B.x[slot]! - x;
    const dz = B.z[slot]! - z;
    if (dx * dx + dz * dz < gap * gap) return no("overlap");
  }

  if (spec.barracks !== null && !w.lanes.slice(0, -1).some((lane) => lane.gap2(x, z) <= RALLY.radiusM * RALLY.radiusM)) return no("rally");

  // With the building down, a walker must still get from the Bastion to every socket.
  const sockets = others.map((slot) => socketCell(w, B.x[slot]!, B.z[slot]!, w.c.buildings[B.def[slot]!]!.radius + ASSIST.socketGapM));
  sockets.push(socketCell(w, x, z, r + ASSIST.socketGapM));
  w.grid.stamp(x, z, r, CELL.probe, true);
  const reachable = reachesAll(w.grid, w.keepCell, sockets);
  w.grid.stamp(x, z, r, CELL.probe, false);
  if (!reachable) return no("path");

  if (!free && w.gold < spec.costs[0] * 1000) return no("gold");
  return { ok: true, x, z, node };
}

/**
 * Where Insert may offer to build `def` (BUILD_NOW §5.4), from the map alone: a mine's nodes; else the points of a
 * 2 m grid within 2 m of the road's clearance, nearest a bend of the road first. nextSpot picks those canPlace allows.
 */
export function spotCandidates(w: World, def: number): Point[] {
  const spec = w.c.buildings[def]!;
  if (spec.placement === "node") return w.map.nodes.map((node) => ({ x: node.x, z: node.z }));
  const reach = BUILD.roadClearM + spec.radius + 2;
  const spots: Point[] = [];
  for (let x = -w.map.buildHalfM; x <= w.map.buildHalfM; x += 2) {
    for (let z = -w.map.buildHalfM; z <= w.map.buildHalfM; z += 2) if (w.lanes.slice(0, -1).some((lane) => lane.gap2(x, z) <= reach * reach)) spots.push({ x, z });
  }
  const bends = w.map.routes.flatMap((route) => route.slice(1, -1));
  const bend = (p: Point): number => Math.min(...bends.map(([x, z]) => (x - p.x) * (x - p.x) + (z - p.z) * (z - p.z)));
  return spots.sort((p, q) => bend(p) - bend(q) || p.x - q.x || p.z - q.z);
}

/** The first of `spots` from `k` on, going `dir` round, that `def` may take (gold aside), −1 none: a few canPlace a press, not ~500 (~40 ms). */
export function nextSpot(w: World, def: number, spots: readonly Point[], k: number, dir: 1 | -1): number {
  for (let n = 0; n < spots.length; n += 1, k = (k + dir + spots.length) % spots.length) {
    if (canPlace(w, def, Math.round(spots[k]!.x / BUILD.snapM), Math.round(spots[k]!.z / BUILD.snapM), true).ok) return k;
  }
  return -1;
}
