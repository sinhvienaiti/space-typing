/**
 * Auras (docs/td/TYPING_DEFENSE_DESIGN.md 6.10, 11.3–11.5; 25.6 step 12):
 * what a building gains all the time from its heat and its last five words,
 * read by combat and production on the next tick. m_eff = heat/5 × k_N of
 * its tempo. Speed (S̄_eff) quickens it, Accuracy (Ā) hardens it, Flow
 * (min(S̄_eff, Ā)·r_c, its own words only) widens it and adds targets, each
 * under its cap. Presence (+15 %, someone settled there) multiplies the
 * rate outside the caps.
 */
import { AURA_ATTACK, AURA_ECONOMY, AURA_MILITARY, CANNON_AURA, HEAT, PRESENCE, SCORE, TEMPO } from "../../content/rules";
import type { World } from "../world";
import { addTempSoldier, findTempSoldier } from "./block";
import { chainRc } from "./chain";

const CAPS = AURA_ATTACK.caps;

/** Presence of an agent: the hero's, or the helper's at its level. */
export const presenceOf = (w: World, agent: number): number => (agent === 0 ? PRESENCE : w.c.content.helpers[agent - 1]!.presence);

export function auraStep(w: World): void {
  const B = w.buildings;
  const rc = chainRc(w.typing.chain);
  for (let b = 0; b < B.top; b += 1) {
    if (B.used[b] === 0) continue;
    const def = w.c.buildings[B.def[b]!]!;
    const m = (B.heat[b]! / (HEAT.max * 1000)) * TEMPO[B.tempo[b]!]!.auraK;
    const acc = B.accAvg[b]!;
    const speed = B.speedAvg[b]! * (SCORE.effBase + SCORE.effK * acc);
    const flow = Math.min(speed, acc) * rc;
    const agent = B.assist[b]!;
    const presence = agent >= 0 && w.tick >= B.assistAt[b]! ? 1 + presenceOf(w, agent) : 1;
    let rate = 1;
    let dmg = 1;
    let area = 1;
    let crit = 0;
    let out = 1;
    let targets = 0;
    let armor = 0;
    let edge = 0;
    if (def.barracks !== null) {
      const shout = flow * m >= AURA_MILITARY.tempSoldierAt;
      rate = 1 / (1 - AURA_MILITARY.respawn * speed * m);
      dmg = 1 + AURA_MILITARY.buff * acc * m;
      armor = AURA_MILITARY.buff * acc * m;
      out = shout ? 1 + AURA_MILITARY.shout : 1;
      const extra = findTempSoldier(w, b, 1);
      if (shout && extra < 0 && w.tick >= B.readyTick[b]!) addTempSoldier(w, b, 1, -1);
      else if (!shout && extra >= 0) w.units.release(extra);
    } else if (def.mine !== null) {
      rate = 1 + AURA_ECONOMY.cycle * speed * m;
      out = 1 + AURA_ECONOMY.perProduce * acc * m;
    } else if (def.attack !== null) {
      // The cannon: Accuracy softens the blast's rim, Flow widens it (≤ +40 %) and adds no target (TK 11.3).
      const blast = def.attack.levels[0]!.splash > 0;
      rate = Math.min(CAPS.rate, 1 + AURA_ATTACK.rate * speed * m);
      dmg = Math.min(CAPS.dmg, 1 + AURA_ATTACK.dmg * acc * m);
      crit = AURA_ATTACK.crit * acc * m;
      area = Math.min(blast ? CANNON_AURA.areaCap : CAPS.area, 1 + AURA_ATTACK.area * flow * m);
      targets = blast ? 0 : Math.min(CAPS.targets, Math.floor(0.5 + AURA_ATTACK.targets * flow * m));
      edge = blast ? CANNON_AURA.edge * acc * m : 0;
    }
    B.rateMul[b] = rate * presence;
    B.dmgMul[b] = dmg;
    B.areaMul[b] = area;
    B.critAdd[b] = crit;
    B.outMul[b] = out;
    B.extraTargets[b] = targets;
    B.armorAdd[b] = armor;
    B.edgeAdd[b] = edge;
  }
}
