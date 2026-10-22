/**
 * Small builders for Typing Defense simulation tests: a world, commands that
 * act this tick, and enemies dropped straight onto a route.
 */
import type { CommandBody } from "../../src/td/sim/commands";
import { createWorld, step, type World, type WorldOptions } from "../../src/td/sim/world";

export function world(options: Partial<WorldOptions> = {}): World {
  return createWorld({ seed: 1, ...options });
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

/** Finishes every construction. */
export function ready(w: World): void {
  run(w, 151);
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
