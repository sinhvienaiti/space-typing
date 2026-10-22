/**
 * Damage, targeting, and the attacks of towers, the Bastion's crossbow,
 * soldiers and enemies (docs/td/TYPING_DEFENSE_DESIGN.md 10, 11.3, 12.4, 13;
 * 25.6 steps 6–7; BUILD_1A6 §4.5).
 *
 *   dmg = round(base × power × (1 − armour) × crit), at least 1
 *
 * `base` is uniform in [min, max] on the "combat" stream, a crit is drawn on
 * the "crit" stream, and rounding happens once, on impact. A tower aims at
 * the enemy furthest along its route (least distance left); ties go to the
 * lower id. A tower with a power charge fires a powered volley and spends it.
 */
import { ticks, type CompiledAttack, type CompiledAttackLevel } from "../../content/compile";
import { COMBAT, TICK_HZ } from "../../content/rules";
import { FX } from "../events";
import { SOURCE, STAT, bump } from "../stats";
import { PROJECTILE } from "../stores/projectiles";
import type { World } from "../world";

export function damageEnemy(w: World, e: number, power: number, damageType: number, source: number): number {
  const E = w.enemies;
  if (E.dying[e] !== 0) return 0;
  const def = w.c.enemies[E.def[e]!]!;
  const armour = damageType === 0 ? def.armor : damageType === 1 ? def.resist : 0;
  const dmg = Math.max(COMBAT.minDamage, Math.round(power * (1 - armour)));
  E.hp[e] = E.hp[e]! - dmg;
  bump(w.stats, STAT.damageTower + source, dmg);
  bump(w.stats, STAT.hits);
  if (E.hp[e]! <= 0) {
    E.dying[e] = 1;
    E.killer[e] = source;
  }
  return dmg;
}

const picked = new Int32Array(8);
const pickedLeft = new Float64Array(8);

/** Writes up to `count` targets in range that `attack` may hit into `out`, furthest along first; returns how many. */
export function selectTargets(w: World, x: number, z: number, attack: CompiledAttack, level: CompiledAttackLevel, count: number, out: Int32Array = picked): number {
  const E = w.enemies;
  let found = 0;
  for (let e = 0; e < E.top; e += 1) {
    if (E.used[e] === 0 || E.dying[e] !== 0 || !attack.hits[E.altitude[e]!]) continue;
    const dx = E.x[e]! - x;
    const dz = E.z[e]! - z;
    if (dx * dx + dz * dz > level.range2) continue;
    const left = w.lanes[E.route[e]!]!.length - E.dist[e]!;
    // Insertion into the short sorted list; equal distance keeps the lower id first.
    let at = found;
    while (at > 0 && (pickedLeft[at - 1]! > left || (pickedLeft[at - 1] === left && E.id(out[at - 1]!) > E.id(e)))) at -= 1;
    if (at >= count) continue;
    for (let move = Math.min(found, count - 1); move > at; move -= 1) {
      out[move] = out[move - 1]!;
      pickedLeft[move] = pickedLeft[move - 1]!;
    }
    out[at] = e;
    pickedLeft[at] = left;
    if (found < count) found += 1;
  }
  return found;
}

/** Sends a shot of `attack` at enemy e: `power` before armour, the crit already decided. Returns its slot (−1: none free). */
export function launch(w: World, kind: number, x: number, z: number, attack: CompiledAttack, level: CompiledAttackLevel, e: number, source: number, power: number, crit: boolean, areaMul: number): number {
  const E = w.enemies;
  const P = w.projectiles;
  const slot = P.add(kind, x, z, E.id(e), E.x[e]!, E.z[e]!, attack.speed, source);
  if (slot < 0) return -1;
  P.power[slot] = power * (crit ? COMBAT.critMul : 1);
  P.crit[slot] = crit ? 1 : 0;
  P.damageType[slot] = attack.damageType;
  P.splash[slot] = level.splash * areaMul;
  P.edge[slot] = attack.edge;
  bump(w.stats, STAT.shots);
  w.events.ring.push(FX.fire, x, z, kind, w.tick);
  return slot;
}

/** Rolls a shot of `attack` at enemy e (damage on "combat", the crit on "crit") and sends it flying. */
export function fireAt(w: World, kind: number, x: number, z: number, attack: CompiledAttack, level: CompiledAttackLevel, e: number, source: number, dmgMul: number, areaMul: number): void {
  if (w.projectiles.count >= w.projectiles.cap) return;
  const base = level.min + w.rng.combat.float() * (level.max - level.min);
  launch(w, kind, x, z, attack, level, e, source, base * dmgMul, attack.crit > 0 && w.rng.crit.chance(attack.crit), areaMul);
}

/** Burning (TK 10.3, Draconis' Word Shots from a cannon): magic damage a second after resist, dealt in whole points. */
export function statusStep(w: World): void {
  const E = w.enemies;
  const perTick = w.c.content.hero.burn.dps / TICK_HZ;
  for (let e = 0; e < E.top; e += 1) {
    if (E.used[e] === 0 || E.dying[e] !== 0 || E.burnUntil[e]! <= w.tick) continue;
    const owed = E.burnAcc[e]! + perTick * (1 - w.c.enemies[E.def[e]!]!.resist);
    const whole = Math.floor(owed);
    E.burnAcc[e] = owed - whole;
    if (whole > 0) damageEnemy(w, e, whole, 2, SOURCE.wordShot);
  }
}

export const burnTicks = (w: World): number => ticks(w.c.content.hero.burn.durationS);

/** Towers and the Bastion's crossbow: a ready tower with no target waits at 0; with a power charge its volley is powered (§4.5). */
export function towersAttack(w: World): void {
  const B = w.buildings;
  for (let b = 0; b < B.top; b += 1) {
    if (B.used[b] === 0 || B.ready[b] === 0) continue;
    const def = w.c.buildings[B.def[b]!]!;
    const attack = def.attack;
    if (attack === null) continue;
    const level = attack.levels[B.level[b]! - 1]!;
    const cd = B.atkCd[b]! - 1;
    if (cd > 0) {
      B.atkCd[b] = cd;
      continue;
    }
    const powered = B.charges[b]! > 0;
    const found = selectTargets(w, B.x[b]!, B.z[b]!, attack, level, Math.min(picked.length, level.targets + (powered ? def.power.targets : 0)));
    if (found === 0) {
      B.atkCd[b] = 0;
      continue;
    }
    if (powered) B.charges[b] = B.charges[b]! - 1;
    const keep = b === 0;
    const kind = keep ? PROJECTILE.bolt : level.splash > 0 ? PROJECTILE.shell : PROJECTILE.arrow;
    for (let index = 0; index < found; index += 1) {
      fireAt(w, kind, B.x[b]!, B.z[b]!, attack, level, picked[index]!, keep ? SOURCE.crossbow : SOURCE.tower, powered ? def.power.dmg : 1, powered ? def.power.area : 1);
    }
    B.atkCd[b] = cd + level.period;
  }
}

/** Soldiers strike the enemy they touch; an enemy with melee strikes its first blocker (TK 13, 22.6). */
export function meleeStep(w: World): void {
  const E = w.enemies;
  const U = w.units;
  const B = w.buildings;
  for (let s = 0; s < U.top; s += 1) {
    if (U.used[s] === 0 || U.hp[s]! <= 0) continue;
    const t = U.target[s]!;
    if (U.contact[s] === 0 || t < 0 || E.dying[t] !== 0) {
      U.atkCd[s] = Math.max(0, U.atkCd[s]! - 1);
      continue;
    }
    const b = U.barracks[s]!;
    U.atkCd[s] = U.atkCd[s]! - 1;
    if (U.atkCd[s]! > 0) continue;
    const level = w.c.buildings[B.def[b]!]!.barracks!.levels[B.level[b]! - 1]!;
    damageEnemy(w, t, level.min + w.rng.combat.float() * (level.max - level.min), 0, SOURCE.soldier);
    U.atkCd[s] = U.atkCd[s]! + level.period;
    U.lastFight[s] = w.tick;
  }
  for (let e = 0; e < E.top; e += 1) {
    if (E.used[e] === 0 || E.dying[e] !== 0) continue;
    const melee = w.c.enemies[E.def[e]!]!.melee;
    const s = E.blocker[e]!;
    if (melee === null || s < 0 || U.hp[s]! <= 0) {
      E.meleeCd[e] = Math.max(0, E.meleeCd[e]! - 1);
      continue;
    }
    E.meleeCd[e] = E.meleeCd[e]! - 1;
    if (E.meleeCd[e]! > 0) continue;
    E.meleeCd[e] = E.meleeCd[e]! + melee.period;
    const b = U.barracks[s]!;
    const armour = w.c.buildings[B.def[b]!]!.barracks!.levels[B.level[b]! - 1]!.armor;
    const dmg = Math.max(COMBAT.minDamage, Math.round((melee.min + w.rng.combat.float() * (melee.max - melee.min)) * (1 - armour)));
    U.hp[s] = U.hp[s]! - dmg;
    U.lastFight[s] = w.tick;
    if (U.hp[s]! > 0) continue;
    U.hp[s] = 0;
    U.target[s] = -1;
    U.contact[s] = 0;
    U.respawnAt[s] = w.tick + w.c.buildings[B.def[b]!]!.barracks!.respawn;
    bump(w.stats, STAT.soldierDeaths);
    w.events.ring.push(FX.soldierDown, U.x[s]!, U.z[s]!, s, w.tick);
  }
}
