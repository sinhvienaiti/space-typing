/**
 * Shots fly and land (TK 25.6 step 8). A shot follows its target while it
 * lives, then flies on to the last point it saw. On arrival a blast hurts
 * every ground and low enemy in its radius, from full damage at the centre
 * down to the rim's share (cannon: 50 %), times the enemy's blast multiplier
 * (Ma Trơi ×1.5); a single shot hurts its target if it still lives.
 */
import { FX } from "../events";
import type { World } from "../world";
import { damageEnemy } from "./combat";

export function projectilesStep(w: World): void {
  const P = w.projectiles;
  const E = w.enemies;
  for (let p = 0; p < P.top; p += 1) {
    if (P.used[p] === 0) continue;
    const t = E.slotOf(P.target[p]!);
    const alive = t >= 0 && E.dying[t] === 0;
    if (alive) {
      P.tx[p] = E.x[t]!;
      P.tz[p] = E.z[t]!;
    }
    const dx = P.tx[p]! - P.x[p]!;
    const dz = P.tz[p]! - P.z[p]!;
    const d = Math.sqrt(dx * dx + dz * dz);
    const speed = P.speed[p]!;
    if (d > speed) {
      P.x[p] = P.x[p]! + (dx / d) * speed;
      P.z[p] = P.z[p]! + (dz / d) * speed;
      continue;
    }
    const x = (P.x[p] = P.tx[p]!);
    const z = (P.z[p] = P.tz[p]!);
    const splash = P.splash[p]!;
    if (splash > 0) {
      const fade = 1 - P.edge[p]!;
      for (let e = 0; e < E.top; e += 1) {
        if (E.used[e] === 0 || E.dying[e] !== 0 || E.altitude[e]! > 1) continue;
        const ex = E.x[e]! - x;
        const ez = E.z[e]! - z;
        const d2 = ex * ex + ez * ez;
        if (d2 > splash * splash) continue;
        const share = 1 - (fade * Math.sqrt(d2)) / splash;
        damageEnemy(w, e, P.power[p]! * share * w.c.enemies[E.def[e]!]!.splashMul, P.damageType[p]!, P.source[p]!);
      }
      w.events.ring.push(FX.burst, x, z, Math.round(splash * 100), w.tick);
    } else if (alive) {
      damageEnemy(w, t, P.power[p]!, P.damageType[p]!, P.source[p]!);
      w.events.ring.push(FX.hit, x, z, P.crit[p]!, w.tick);
    }
    P.release(p);
  }
}
