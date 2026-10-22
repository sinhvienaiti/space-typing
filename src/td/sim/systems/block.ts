/**
 * Soldiers find and block enemies (docs/td/TYPING_DEFENSE_DESIGN.md 13;
 * 25.6 step 5). A free soldier takes the nearest ground enemy within 3 m of
 * its flag that is not yet held by enough soldiers; it lets go past the 5 m
 * leash, and at most 3 soldiers fight one enemy. Each soldier in contact
 * holds one blocking place; the move system reads the sum next tick.
 */
import { ticks } from "../../content/compile";
import { SOLDIER, TICK_HZ } from "../../content/rules";
import { FX } from "../events";
import { STAT, bump } from "../stats";
import type { World } from "../world";

// The triangle around the flag, corners SOLDIER.spacingM apart.
const RADIUS = SOLDIER.spacingM / Math.sqrt(3);
const POSTS = [[0, -RADIUS], [-SOLDIER.spacingM / 2, RADIUS / 2], [SOLDIER.spacingM / 2, RADIUS / 2]] as const;
const STEP = SOLDIER.speed / TICK_HZ;

export function soldiersStep(w: World): void {
  const E = w.enemies;
  const U = w.units;
  const B = w.buildings;
  for (let e = 0; e < E.top; e += 1) {
    E.block[e] = 0;
    E.engaged[e] = 0;
    E.blocker[e] = -1;
  }
  for (let s = 0; s < U.top; s += 1) {
    if (U.used[s] === 0) continue;
    if (U.temp[s] === 2 && w.tick >= U.expireAt[s]!) {
      U.release(s);
      continue;
    }
    const b = U.barracks[s]!;
    const level = w.c.buildings[B.def[b]!]!.barracks!.levels[B.level[b]! - 1]!;
    if (U.hp[s]! <= 0) {
      if (U.respawnAt[s]! < 0 || w.tick < U.respawnAt[s]!) continue;
      U.stand(s, level.hp, B.x[b]!, B.z[b]!, w.tick);
    }
    const rx = B.rallyX[b]!;
    const rz = B.rallyZ[b]!;
    let t = U.target[s]!;
    if (t >= 0 && (E.used[t] === 0 || E.dying[t] !== 0 || E.engaged[t]! >= SOLDIER.maxPerEnemy || far(E.x[t]! - rx, E.z[t]! - rz, SOLDIER.leashM))) t = -1;
    // Held already by soldiers before it: free to block one that is not.
    if (t < 0 || E.engaged[t]! >= w.c.enemies[E.def[t]!]!.weight) t = pick(w, s, rx, rz);
    U.target[s] = t;

    let gx: number;
    let gz: number;
    let reach = 0;
    if (t >= 0) {
      E.engaged[t] = E.engaged[t]! + 1;
      gx = E.x[t]!;
      gz = E.z[t]!;
      reach = w.c.enemies[E.def[t]!]!.radius + SOLDIER.contactM;
    } else {
      const post = POSTS[U.post[s]! % POSTS.length]!;
      gx = rx + post[0];
      gz = rz + post[1];
    }
    const dx = gx - U.x[s]!;
    const dz = gz - U.z[s]!;
    const d = Math.sqrt(dx * dx + dz * dz);
    const moved = d > reach ? Math.min(STEP, d - reach) : 0;
    if (moved > 0) {
      U.x[s] = U.x[s]! + (dx / d) * moved;
      U.z[s] = U.z[s]! + (dz / d) * moved;
    }
    const touching = t >= 0 && d - moved <= reach;
    if (touching) {
      if (U.contact[s] === 0) {
        bump(w.stats, STAT.blocks);
        w.events.ring.push(FX.block, U.x[s]!, U.z[s]!, s, w.tick);
      }
      E.block[t] = E.block[t]! + 1;
      if (E.blocker[t]! < 0) E.blocker[t] = s;
    }
    U.contact[s] = touching ? 1 : 0;

    if (U.hp[s]! < level.hp && w.tick - U.lastFight[s]! >= ticks(SOLDIER.regenDelayS)) {
      const regen = U.regen[s]! + (level.hp * SOLDIER.regenPctS) / TICK_HZ;
      const whole = Math.floor(regen);
      U.hp[s] = Math.min(level.hp, U.hp[s]! + whole);
      U.regen[s] = regen - whole;
    }
  }
}

/** A soldier beyond the squad at barracks b (TK 6.10, 6.11): kind 1 while Flow holds, kind 2 until `until`. */
export function addTempSoldier(w: World, b: number, kind: number, until: number): void {
  const B = w.buildings;
  const s = w.units.add(b, POSTS.length + kind, w.c.buildings[B.def[b]!]!.barracks!.levels[B.level[b]! - 1]!.hp, B.x[b]!, B.z[b]!);
  if (s < 0) return;
  w.units.temp[s] = kind;
  w.units.expireAt[s] = until;
}

/** The slot of barracks b's extra soldier of `kind` after skipping `skip` of them; −1 when there are not that many. */
export function findTempSoldier(w: World, b: number, kind: number, skip = 0): number {
  const U = w.units;
  let left = skip;
  for (let s = 0; s < U.top; s += 1) if (U.used[s] === 1 && U.barracks[s] === b && U.temp[s] === kind && left-- === 0) return s;
  return -1;
}

const far = (dx: number, dz: number, limit: number) => dx * dx + dz * dz > limit * limit;

/**
 * The nearest ground enemy around the flag that still needs a blocker; with
 * none, the nearest that fewer than 3 soldiers fight (to help); −1 none.
 * Equal distances go to the lower id (TK 25.5).
 */
function pick(w: World, s: number, rx: number, rz: number): number {
  const E = w.enemies;
  let need = -1;
  let needD2 = Infinity;
  let help = -1;
  let helpD2 = Infinity;
  for (let e = 0; e < E.top; e += 1) {
    if (E.used[e] === 0 || E.dying[e] !== 0 || E.altitude[e] !== 0 || E.engaged[e]! >= SOLDIER.maxPerEnemy) continue;
    if (far(E.x[e]! - rx, E.z[e]! - rz, SOLDIER.engageM)) continue;
    const dx = E.x[e]! - w.units.x[s]!;
    const dz = E.z[e]! - w.units.z[s]!;
    const d2 = dx * dx + dz * dz;
    if (E.engaged[e]! < w.c.enemies[E.def[e]!]!.weight) {
      if (d2 < needD2 || (d2 === needD2 && E.id(e) < E.id(need))) {
        needD2 = d2;
        need = e;
      }
    } else if (d2 < helpD2 || (d2 === helpD2 && E.id(e) < E.id(help))) {
      helpD2 = d2;
      help = e;
    }
  }
  return need >= 0 ? need : help;
}
