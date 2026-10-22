/**
 * The hero and the helpers on the map (docs/td/TYPING_DEFENSE_DESIGN.md 5, 8.2–8.4, 25.9; 25.6 steps 3, 7): Draconis
 * flies onto the eave, Thư Đồng walk the A* path, pulled tight, to the socket; idle, the hero throws fireballs.
 */
import { ticks } from "../../content/compile";
import { ASSIST, EMIT, TICK_HZ } from "../../content/rules";
import { findPath, nearestOpen, pullPath } from "../nav/astar";
import { socketCell, type Point } from "../placement";
import { SOURCE } from "../stats";
import { MODE, PATH_MAX, type AgentStore } from "../stores/agents";
import { PROJECTILE } from "../stores/projectiles";
import type { World } from "../world";
import { fireAt, selectTargets } from "./combat";
import { restartStream } from "./stream";

const spot: Point = { x: 0, z: 0 };
const target = new Int32Array(1);
const cells = new Int32Array(16384); // the most cells findPath takes

/** Slots: the Bastion's level, and no more than the hero and the helpers brought (the sandbox brings all three). */
export const slotsOpen = (w: World): number => Math.min(w.c.content.buildings[0]!.keep!.levels[w.buildings.level[0]! - 1]!.slots, 1 + w.c.content.helpers.length);

/** Where agent a stands to assist building b, on the side facing the Bastion: the hero perched on the eave, a helper at the socket. */
function stand(w: World, a: number, b: number): Point {
  const r = w.c.buildings[w.buildings.def[b]!]!.radius;
  socketCell(w, w.buildings.x[b]!, w.buildings.z[b]!, a === 0 ? r : r + ASSIST.socketGapM, spot);
  return spot;
}

/** Where agent a waits idle (and starts): the hero where it would assist the Bastion, a helper in the row beside it. */
export function home(w: World, a: number): Point {
  if (a === 0) return stand(w, 0, 0);
  spot.x = w.map.keep[0] - ASSIST.homeSideM;
  spot.z = w.map.keep[1] + (a - (1 + w.c.content.helpers.length) / 2) * ASSIST.homeGapM;
  return spot;
}

/** Sends agent a toward building `goal` (−1: just the point). The hero takes off unless it is there; a helper finds its path. */
function go(w: World, a: number, goal: number, point: Point): void {
  const A = w.agents;
  A.goal[a] = goal;
  A.gx[a] = point.x;
  A.gz[a] = point.z;
  if (a > 0) plan(w, a);
  else if ((A.mode[a] === MODE.stand || A.mode[a] === MODE.land) && (A.x[a] !== A.gx[a] || A.z[a] !== A.gz[a])) {
    A.mode[a] = MODE.takeoff;
    A.until[a] = w.tick + ticks(w.c.content.hero.takeoffS);
  }
  w.events.rare.push({ t: "agentOrdered", tick: w.tick, agent: a, building: goal < 0 ? -1 : w.buildings.id(goal) });
}

/** Agent a goes home (Digit0; its building gone; its slot closed). */
export const recallAgent = (w: World, a: number): void => go(w, a, -1, home(w, a));

/** assignUnit (TK 5.1, 25.9): agent a goes to assist building b; an agent already sent there swaps: to a's old building, or home. */
export function orderAgent(w: World, a: number, b: number): void {
  const A = w.agents;
  const was = A.goal[a]!;
  if (was === b) return;
  const other = A.live().find((k) => A.goal[k] === b) ?? -1;
  go(w, a, b, stand(w, a, b));
  if (other >= 0 && was >= 0) go(w, other, was, stand(w, other, was));
  else if (other >= 0) recallAgent(w, other);
}

/** Agent a starts assisting b (whoever still assists either lets go): b settles, then deals; a mine's pile comes home now (TK 11.5). */
function arrive(w: World, a: number, b: number): void {
  const A = w.agents;
  const B = w.buildings;
  if (B.assist[b]! >= 0) leave(w, B.assist[b]!);
  if (A.at[a]! >= 0) leave(w, a);
  A.at[a] = b;
  B.assist[b] = a;
  const settle = ticks(a === 0 ? ASSIST.settleS : w.c.content.helpers[a - 1]!.settleS);
  B.assistAt[b] = w.tick + settle;
  B.collectAt[b] = w.tick;
  restartStream(w, b, settle + ticks(EMIT.firstDelayS));
  w.events.rare.push({ t: "agentArrived", tick: w.tick, agent: a, building: B.id(b) });
}

/** Agent a stops assisting: its building deals no more and goes into afterglow; its live words stay its own (TK 6.4, 6.7). */
function leave(w: World, a: number): void {
  const b = w.agents.at[a]!;
  w.agents.at[a] = w.buildings.assist[b] = -1;
  w.events.rare.push({ t: "agentLeft", tick: w.tick, agent: a, building: w.buildings.id(b) });
}

/** Whether agent a is more than `limit` m from where it stands to assist building b. */
function beyond(w: World, a: number, b: number, limit: number): boolean {
  const p = stand(w, a, b);
  const dx = p.x - w.agents.x[a]!;
  const dz = p.z - w.agents.z[a]!;
  return dx * dx + dz * dz > limit * limit;
}

/** Moves agent a `left` m straight toward (x, z), stopping there; returns what is left over, −1 short of it. */
function toward(A: AgentStore, a: number, x: number, z: number, left: number): number {
  const dx = x - A.x[a]!;
  const dz = z - A.z[a]!;
  const d = Math.sqrt(dx * dx + dz * dz);
  const short = d > left;
  A.x[a] = short ? A.x[a]! + (dx / d) * left : x;
  A.z[a] = short ? A.z[a]! + (dz / d) * left : z;
  return short ? -1 : left - d;
}

/** A* from where helper a is to its goal, pulled tight; with no way there it waits where it is. */
function plan(w: World, a: number): void {
  const A = w.agents;
  const grid = w.grid;
  const count = findPath(grid, grid.cell(A.x[a]!, A.z[a]!), grid.cell(A.gx[a]!, A.gz[a]!), cells);
  A.next[a] = 0;
  A.pathN[a] = count > 0 ? pullPath(grid, cells, count, A.x[a]!, A.z[a]!, A.gx[a]!, A.gz[a]!, A.path, a * PATH_MAX * 2, PATH_MAX) : 0;
  A.mode[a] = count > 0 ? MODE.walk : MODE.stand;
}

/** A helper walks its path at its speed, point after point. */
function walk(w: World, a: number): void {
  const A = w.agents;
  let left = w.c.content.helpers[a - 1]!.speed / TICK_HZ;
  for (; A.next[a]! < A.pathN[a]!; A.next[a] = A.next[a]! + 1) {
    const i = (a * PATH_MAX + A.next[a]!) * 2;
    left = toward(A, a, A.path[i]!, A.path[i + 1]!, left);
    if (left < 0) return;
  }
  if (A.x[a] === A.gx[a] && A.z[a] === A.gz[a]) A.mode[a] = MODE.stand;
  else plan(w, a); // the path needed more than PATH_MAX points: on from here next tick
}

/** Step 3: the hero's timed takeoff, straight flight and timed landing, the helpers' walks; an assist begins on the ground within 3 m of the spot and, the agent sent elsewhere, ends 4.5 m away or where it stops (home may lie closer). */
export function agentsStep(w: World): void {
  const A = w.agents;
  const hero = w.c.content.hero;
  for (let a = 0; a < A.top; a += 1) {
    if ((A.mode[a] === MODE.takeoff || A.mode[a] === MODE.land) && w.tick >= A.until[a]!) A.mode[a] = A.mode[a] === MODE.land ? MODE.stand : MODE.fly;
    if (A.mode[a] === MODE.fly && toward(A, a, A.gx[a]!, A.gz[a]!, hero.flySpeed / TICK_HZ) >= 0) {
      A.mode[a] = MODE.land;
      A.until[a] = w.tick + ticks(hero.landS);
    }
    if (A.mode[a] === MODE.walk) walk(w, a);
    const goal = A.goal[a]!;
    if (A.at[a]! >= 0 && A.at[a] !== goal && (A.mode[a] === MODE.stand || beyond(w, a, A.at[a]!, ASSIST.exitM))) leave(w, a);
    if (goal >= 0 && A.at[a] !== goal && A.mode[a]! <= MODE.walk && !beyond(w, a, goal, ASSIST.enterM)) arrive(w, a, goal);
  }
}

/** Step 7: the hero, idle on the ground, throws a fireball at the enemy furthest along in reach (TK 22.2); assisting, it never attacks. */
export function heroAttack(w: World): void {
  const A = w.agents;
  const level = w.c.hero.levels[0]!;
  A.atkCd[0] = Math.max(0, A.atkCd[0]! - 1);
  if (A.atkCd[0]! > 0 || A.at[0]! >= 0 || A.mode[0] !== MODE.stand || selectTargets(w, A.x[0]!, A.z[0]!, w.c.hero, level, 1, target) === 0) return;
  fireAt(w, PROJECTILE.fireball, A.x[0]!, A.z[0]!, w.c.hero, level, target[0]!, SOURCE.hero, 1, 0, 1);
  A.atkCd[0] = level.period;
}

/** A building went down (TK 25.9): a helper it covers steps to the centre of the nearest open cell that still leads to its goal, never into water or another building; it and every walker find their way again. */
export function rerouteAgents(w: World): void {
  const A = w.agents;
  const grid = w.grid;
  for (let a = 1; a < A.top; a += 1) {
    const covered = grid.cells[grid.cell(A.x[a]!, A.z[a]!)] !== 0;
    const to = covered ? nearestOpen(grid, A.x[a]!, A.z[a]!, grid.cell(A.gx[a]!, A.gz[a]!), cells) : -1;
    if (to >= 0) {
      A.x[a] = grid.centerX(to);
      A.z[a] = grid.centerZ(to);
    }
    if (covered || A.mode[a] === MODE.walk) plan(w, a);
  }
}

/** Building b is going (undo): whoever assists it lets go, whoever is sent to it goes home. */
export function releaseBuilding(w: World, b: number): void {
  for (let a = 0; a < w.agents.top; a += 1) {
    if (w.agents.at[a] === b) leave(w, a);
    if (w.agents.goal[a] === b) recallAgent(w, a);
  }
}
