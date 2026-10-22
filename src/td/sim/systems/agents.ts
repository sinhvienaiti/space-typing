/**
 * The hero and the helpers on the map (docs/td/TYPING_DEFENSE_DESIGN.md 5, 8.2–8.4, 25.9; 25.6 steps 3, 7;
 * BUILD_1A6 §6): Draconis flies, Thư Đồng and the NPC workers walk the A* path, pulled tight. Agents go to a
 * point or a building; their help rings light the calls inside them, and a helper near economy work speeds it.
 * The hero throws fireballs whenever it stands on the ground with an enemy in reach.
 */
import { ticks } from "../../content/compile";
import { AGENT, TICK_HZ } from "../../content/rules";
import { findPath, nearestOpen, pullPath } from "../nav/astar";
import { socketCell, type Point } from "../placement";
import { SOURCE } from "../stats";
import { NPC_KIND } from "../stores/npcs";
import { MODE, PATH_MAX, type Walkers } from "../stores/walkers";
import { PROJECTILE } from "../stores/projectiles";
import type { World } from "../world";
import { fireAt, selectTargets } from "./combat";

const spot: Point = { x: 0, z: 0 };
const target = new Int32Array(1);
const cells = new Int32Array(16384); // the most cells findPath takes

/** Agents the Bastion's level lets out (the sandbox brings all three helpers); the rest wait inside. */
export const slotsOpen = (w: World): number => Math.min(w.c.content.buildings[0]!.keep!.levels[w.buildings.level[0]! - 1]!.slots, 1 + w.c.content.helpers.length);

/** Where one stands to work at building b: a step off its rim on the side facing the Bastion (TK 8.4). */
export function stand(w: World, b: number, out: Point = spot): Point {
  socketCell(w, w.buildings.x[b]!, w.buildings.z[b]!, w.c.buildings[w.buildings.def[b]!]!.radius + AGENT.socketGapM, out);
  return out;
}

/** Where agent a waits idle (and starts): the hero south of the Bastion, a helper in the row west of it. */
export function home(w: World, a: number): Point {
  if (a === 0) {
    socketCell(w, w.map.keep[0], w.map.keep[1], w.c.buildings[0]!.radius, spot);
    return spot;
  }
  spot.x = w.map.keep[0] - AGENT.homeSideM;
  spot.z = w.map.keep[1] + (a - (1 + w.c.content.helpers.length) / 2) * AGENT.homeGapM;
  return spot;
}

/** A* from where walker k is to its goal, pulled tight; with no way there it waits where it is. */
export function plan(w: World, S: Walkers, k: number): void {
  const grid = w.grid;
  const count = findPath(grid, grid.cell(S.x[k]!, S.z[k]!), grid.cell(S.gx[k]!, S.gz[k]!), cells);
  S.next[k] = 0;
  S.pathN[k] = count > 0 ? pullPath(grid, cells, count, S.x[k]!, S.z[k]!, S.gx[k]!, S.gz[k]!, S.path, k * PATH_MAX * 2, PATH_MAX) : 0;
  S.mode[k] = count > 0 ? MODE.walk : MODE.stand;
}

/** Walker k sets off for (x, z) on the A* path. */
export function walkTo(w: World, S: Walkers, k: number, x: number, z: number): void {
  S.gx[k] = x;
  S.gz[k] = z;
  plan(w, S, k);
}

/** Moves walker k `left` m straight toward (x, z), stopping there; returns what is left over, −1 short of it. */
export function toward(S: Walkers, k: number, x: number, z: number, left: number): number {
  const dx = x - S.x[k]!;
  const dz = z - S.z[k]!;
  const d = Math.sqrt(dx * dx + dz * dz);
  const short = d > left;
  S.x[k] = short ? S.x[k]! + (dx / d) * left : x;
  S.z[k] = short ? S.z[k]! + (dz / d) * left : z;
  return short ? -1 : left - d;
}

/** Walker k walks its path `speed` m/s, point after point; at the goal it stands. */
export function walk(w: World, S: Walkers, k: number, speed: number): void {
  let left = speed / TICK_HZ;
  for (; S.next[k]! < S.pathN[k]!; S.next[k] = S.next[k]! + 1) {
    const i = (k * PATH_MAX + S.next[k]!) * 2;
    left = toward(S, k, S.path[i]!, S.path[i + 1]!, left);
    if (left < 0) return;
  }
  if (S.x[k] === S.gx[k] && S.z[k] === S.gz[k]) S.mode[k] = MODE.stand;
  else plan(w, S, k); // the path needed more than PATH_MAX points (or none was found): on from here next tick
}

/** Sends agent a toward building `goal` (−1: just the point). The hero takes off unless it is there; a helper finds its path. */
function go(w: World, a: number, goal: number, point: Point): void {
  const A = w.agents;
  A.goal[a] = goal;
  if (a > 0) walkTo(w, A, a, point.x, point.z);
  else {
    A.gx[a] = point.x;
    A.gz[a] = point.z;
    if ((A.mode[a] === MODE.stand || A.mode[a] === MODE.land) && (A.x[a] !== A.gx[a] || A.z[a] !== A.gz[a])) {
      A.mode[a] = MODE.takeoff;
      A.until[a] = w.tick + ticks(w.c.content.hero.takeoffS);
    }
  }
  w.events.rare.push({ t: "agentOrdered", tick: w.tick, agent: a, building: goal < 0 ? -1 : w.buildings.id(goal) });
}

/** Agent a goes home (Digit0; its building gone; its slot closed). */
export const recallAgent = (w: World, a: number): void => go(w, a, -1, home(w, a));

/** move (TK 8.3, a right click; a tree, an NPC): agent a goes to stand at (x, z) on the field; a helper needs an open cell there. */
export function moveAgent(w: World, a: number, x: number, z: number): boolean {
  const cell = w.grid.cell(x, z);
  if (cell < 0 || (a > 0 && w.grid.cells[cell] !== 0)) return false;
  go(w, a, -1, { x, z });
  return true;
}

/** assignUnit (TK 5.1, 25.9): agent a goes to stand by building b. */
export const orderAgent = (w: World, a: number, b: number): void => go(w, a, b, stand(w, b));

/** Step 3: the hero's timed takeoff, straight flight and timed landing; the helpers' walks. */
export function agentsStep(w: World): void {
  const A = w.agents;
  const hero = w.c.content.hero;
  for (let a = 0; a < A.top; a += 1) {
    if ((A.mode[a] === MODE.takeoff || A.mode[a] === MODE.land) && w.tick >= A.until[a]!) A.mode[a] = A.mode[a] === MODE.land ? MODE.stand : MODE.fly;
    if (A.mode[a] === MODE.fly && toward(A, a, A.gx[a]!, A.gz[a]!, hero.flySpeed / TICK_HZ) >= 0) {
      A.mode[a] = MODE.land;
      A.until[a] = w.tick + ticks(hero.landS);
    }
    if (A.mode[a] === MODE.walk) walk(w, A, a, w.c.content.helpers[a - 1]!.speed);
  }
}

const within = (w: World, a: number, x: number, z: number, r: number): boolean =>
  (w.agents.x[a]! - x) * (w.agents.x[a]! - x) + (w.agents.z[a]! - z) * (w.agents.z[a]! - z) <= r * r;

/** §6: (x, z) lies in a help ring: the hero's 10 m, an out helper's 6 m. */
export function inRing(w: World, x: number, z: number): boolean {
  if (within(w, 0, x, z, AGENT.heroRingM)) return true;
  for (let a = 1; a < slotsOpen(w); a += 1) if (within(w, a, x, z, AGENT.helperRingM)) return true;
  return false;
}

/** §6: economy work at (x, z) runs ×1.5 with an out helper within 6 m (never more for two). */
export function passive(w: World, x: number, z: number): number {
  for (let a = 1; a < slotsOpen(w); a += 1) if (within(w, a, x, z, AGENT.helperRingM)) return AGENT.passive;
  return 1;
}

/** Step 7: the hero, standing on the ground, throws a fireball at the enemy furthest along in reach (TK 22.2). */
export function heroAttack(w: World): void {
  const A = w.agents;
  const level = w.c.hero.levels[0]!;
  A.atkCd[0] = Math.max(0, A.atkCd[0]! - 1);
  if (A.atkCd[0]! > 0 || A.mode[0] !== MODE.stand || selectTargets(w, A.x[0]!, A.z[0]!, w.c.hero, level, 1, target) === 0) return;
  fireAt(w, PROJECTILE.fireball, A.x[0]!, A.z[0]!, w.c.hero, level, target[0]!, SOURCE.hero, 1, 1);
  A.atkCd[0] = level.period;
}

/**
 * A building went down (TK 25.9): a walker it covers steps to the centre of the nearest open cell that still
 * leads to its goal, and walkers find their way again. Farmers walk inside their farm, off the grid.
 */
export function reroute(w: World): void {
  const grid = w.grid;
  for (const S of [w.agents, w.npcs] as Walkers[]) {
    for (let k = S === w.agents ? 1 : 0; k < S.top; k += 1) {
      if (S.used[k] === 0 || (S === w.npcs && w.npcs.kind[k] === NPC_KIND.farmer)) continue;
      const covered = grid.cells[grid.cell(S.x[k]!, S.z[k]!)] !== 0;
      const to = covered ? nearestOpen(grid, S.x[k]!, S.z[k]!, grid.cell(S.gx[k]!, S.gz[k]!), cells) : -1;
      if (to >= 0) {
        S.x[k] = grid.centerX(to);
        S.z[k] = grid.centerZ(to);
      }
      if (covered || S.mode[k] === MODE.walk) plan(w, S, k);
    }
  }
}

/** Building b is going (undo): whoever was sent to it goes home. */
export function releaseBuilding(w: World, b: number): void {
  for (let a = 0; a < w.agents.top; a += 1) if (w.agents.goal[a] === b) recallAgent(w, a);
}
