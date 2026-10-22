/**
 * Enemies walk their lane (TK 25.6 step 4, 13). Blocked by enough soldiers
 * they stop; blocked by fewer than their weight they push on at half speed.
 * One that reaches the Bastion is marked leaked; the deaths system takes
 * the lives.
 */
import type { World } from "../world";

export const LEAKED = 2;
const spot = { x: 0, z: 0 };

export function moveEnemies(w: World): void {
  const E = w.enemies;
  for (let e = 0; e < E.top; e += 1) {
    if (E.used[e] === 0 || E.dying[e] !== 0) continue;
    const def = w.c.enemies[E.def[e]!]!;
    const block = E.block[e]!;
    const pace = block === 0 ? 1 : block >= def.weight ? 0 : 0.5;
    const lane = w.lanes[E.route[e]!]!;
    const dist = E.dist[e]! + def.speed * pace;
    E.dist[e] = dist;
    if (dist >= lane.length) E.dying[e] = LEAKED;
    lane.point(dist, E.lateral[e]!, spot);
    E.x[e] = spot.x;
    E.z[e] = spot.z;
  }
}
