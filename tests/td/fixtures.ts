/**
 * Small builders for Typing Defense simulation tests: a world, commands that
 * act this tick, buildings built at once, and enemies dropped straight onto a route.
 */
import { placeBuilding, type CommandBody } from "../../src/td/sim/commands";
import { TASK } from "../../src/td/sim/stores/npcs";
import { MODE } from "../../src/td/sim/stores/walkers";
import { closeCall } from "../../src/td/sim/systems/calls";
import { finishSite } from "../../src/td/sim/systems/economy";
import { createWorld, step, type World, type WorldOptions } from "../../src/td/sim/world";

/** A world on seed 1; asking for `gold` brings as much wood (a test's building budget), unless `wood` is given. */
export function world(options: Partial<WorldOptions> = {}): World {
  return createWorld({ seed: 1, wood: options.gold, ...options });
}

/** Runs one tick with the given commands and returns its rare events. */
export function send(w: World, ...bodies: CommandBody[]) {
  const from = w.events.rare.length;
  step(w, bodies.map((body) => ({ ...body, tick: w.tick })));
  return w.events.rare.slice(from);
}

export function run(w: World, ticks: number): void {
  for (let index = 0; index < ticks; index += 1) step(w);
}

export const def = (w: World, id: string) => w.c.buildingIndex(id);
export const q = (metres: number) => Math.round(metres * 4);

/** Builds `id` at (x, z); returns its building slot (throws when refused). */
export function build(w: World, id: string, x: number, z: number): number {
  const events = send(w, { t: "build", def: def(w, id), qx: q(x), qz: q(z) });
  const built = events.find((event) => event.t === "built");
  if (built === undefined || built.t !== "built") throw new Error("not built at " + x + ", " + z + ": " + JSON.stringify(events));
  return built.building & 1023;
}

/** Finishes every site at once, as if its builder were done (no call, no bonus): a test shortcut. */
export function ready(w: World): void {
  const B = w.buildings;
  for (const b of B.live()) {
    if (B.upTo[b] === 0) continue;
    const n = B.builder[b]!;
    if (n >= 0) {
      if (w.npcs.call[n]! >= 0) closeCall(w, w.npcs.call[n]!);
      w.npcs.task[n] = TASK.idle;
      w.npcs.job[n] = -1;
    }
    finishSite(w, b);
  }
}

/** Puts `id` down at (x, z) already built (the sandbox preset's way), free; returns its slot. */
export function built(w: World, id: string, x: number, z: number): number {
  const node = w.map.nodes.findIndex((n) => n.x === x && n.z === z);
  const slot = placeBuilding(w, def(w, id), x, z, node, true);
  if (slot < 0) throw new Error("no room for " + id);
  return slot;
}

/** Steps until every agent stands where it was sent (walking and flying take time); returns on the tick after the last arrives. */
export function arrive(w: World, limit = 60 * 60): void {
  const A = w.agents;
  const pending = () => A.live().some((a) => A.mode[a] !== MODE.stand || A.x[a] !== A.gx[a] || A.z[a] !== A.gz[a]);
  for (let tick = 0; tick < limit && pending(); tick += 1) step(w);
  if (pending()) throw new Error("agents still on their way after " + limit + " ticks");
}

/** Sends agent a to stand at (x, z) and steps until it is there. */
export function goTo(w: World, a: number, x: number, z: number): void {
  send(w, { t: "move", agent: a, qx: q(x), qz: q(z) });
  arrive(w);
}

/**
 * Puts an enemy `dist` metres along route `route` (0, 1 ground; last: flying)
 * at lateral 0, as the spawn system would; returns its slot.
 */
export function enemyAt(w: World, id: string, route: number, dist: number, wave = 0): number {
  const index = w.c.enemyIndex(id);
  const enemy = w.c.enemies[index]!;
  const slot = w.enemies.add(index, enemy.hp, enemy.altitude, route, wave, 0);
  w.enemies.dist[slot] = dist;
  const spot = w.lanes[route]!.point(dist, 0, { x: 0, z: 0 });
  w.enemies.x[slot] = spot.x;
  w.enemies.z[slot] = spot.z;
  w.waveAlive[wave] = (w.waveAlive[wave] ?? 0) + 1;
  return slot;
}

/** Puts an enemy at an exact point (it stays there unless something moves it). */
export function enemyPoint(w: World, id: string, x: number, z: number): number {
  const slot = enemyAt(w, id, 0, 10);
  w.enemies.x[slot] = x;
  w.enemies.z[slot] = z;
  return slot;
}
