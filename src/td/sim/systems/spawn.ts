/**
 * Spawning (TK 25.6 step 2): queued spawns whose tick has come enter at the
 * gate, spread across the road by the spawn stream. When the latest wave has
 * spawned everything, the count to the next wave starts.
 */
import { ticks } from "../../content/compile";
import { ECONOMY } from "../../content/rules";
import { FX } from "../events";
import { STAT, bump } from "../stats";
import type { World } from "../world";

const spot = { x: 0, z: 0 };

export function spawnEnemies(w: World): void {
  const E = w.enemies;
  while (w.spawnQueue.length > 0 && w.spawnQueue[0]!.tick <= w.tick) {
    const next = w.spawnQueue.shift()!;
    const def = w.c.enemies[next.enemy]!;
    const flying = def.altitude > 0;
    const spread = flying ? 1 : Math.max(0, w.map.roadHalfM - def.radius);
    const lateral = (w.rng.spawn.float() * 2 - 1) * spread;
    const slot = E.add(next.enemy, def.hp, def.altitude, next.route, next.wave, lateral);
    w.waveLeft[next.wave]! -= 1;
    if (slot >= 0) {
      w.waveAlive[next.wave]! += 1;
      w.lanes[next.route]!.point(0, lateral, spot);
      E.x[slot] = spot.x;
      E.z[slot] = spot.z;
      bump(w.stats, STAT.spawned);
      w.events.ring.push(FX.spawn, spot.x, spot.z, next.enemy, w.tick);
    }
    if (next.wave === w.wave && w.waveLeft[next.wave] === 0) w.nextWaveAt = w.tick + ticks(ECONOMY.waveGapS);
  }
}

/** The sandbox's load test (TK 25.12, __td.flood): n enemies of each kind in turn on the first half of the routes, evenly spaced, in the current wave. */
export function flood(w: World, n: number): void {
  const E = w.enemies;
  const grounds = w.lanes.length - 1;
  for (let k = 0; k < n; k += 1) {
    const def = w.c.enemies[k % w.c.enemies.length]!;
    const route = def.altitude > 0 ? grounds : k % grounds;
    const spread = def.altitude > 0 ? 1 : Math.max(0, w.map.roadHalfM - def.radius);
    const slot = E.add(def.index, def.hp, def.altitude, route, w.wave, (((k * 0.618034) % 1) * 2 - 1) * spread);
    if (slot < 0) return;
    E.dist[slot] = (w.lanes[route]!.length * (k + 0.5)) / (2 * n);
    w.lanes[route]!.point(E.dist[slot]!, E.lateral[slot]!, spot);
    E.x[slot] = spot.x;
    E.z[slot] = spot.z;
    w.waveAlive[w.wave] = (w.waveAlive[w.wave] ?? 0) + 1;
    bump(w.stats, STAT.spawned);
  }
}
