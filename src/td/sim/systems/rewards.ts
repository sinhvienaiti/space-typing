/**
 * Word rewards (docs/td/TYPING_DEFENSE_DESIGN.md 6.11): paid on the tick a
 * word is finished and never capped. A tower fires a Word Shot at once
 * (25.6 step 7; Perfect and Flash always crit, with no draw; with no enemy in
 * range it fizzles), a mine and the Bastion pay gold straight to the
 * treasury, a barracks brings its longest-dead soldier back sooner or heals
 * the squad. Five good words in a row at a mine or a barracks pay a bonus. A
 * helper on its specialty adds its share. The preparation phase pays nothing (TK 11.2).
 *
 *   lenF = clamp((len + 1)/6; 0.8; 1.2) · qA = 0.4 + 0.6·A_w · qS = 0.8 + 0.4·S_w · qQ = 0.5 + 0.5·Q_w
 */
import { FIVE_GOOD, REWARD, RICHNESS, TICK_HZ } from "../../content/rules";
import type { WordReward } from "../../content/types";
import type { Score } from "../../typing/scorer";
import { tempoFactor } from "../../typing/tempo";
import { FX } from "../events";
import { SOURCE, STAT, bump } from "../stats";
import { PROJECTILE } from "../stores/projectiles";
import type { World } from "../world";
import { addTempSoldier, findTempSoldier } from "./block";
import { fireAt, launch, selectTargets } from "./combat";

/** What one word is worth before it is paid: a shot's power, gold, or the barracks' share of 3 s and 8 %. */
export function rewardValue(reward: WordReward, level: number, len: number, score: Score, tempoMul: number, richness: number, specialty: number): number {
  const lenF = Math.max(REWARD.lenMin, Math.min(REWARD.lenMax, (len + 1) / REWARD.lenDiv));
  const qA = REWARD.qA[0] + REWARD.qA[1] * score.accuracy;
  const qS = REWARD.qS[0] + REWARD.qS[1] * score.speed;
  const qQ = REWARD.qQ[0] + REWARD.qQ[1] * score.quality;
  const common = tempoMul * lenF * specialty;
  switch (reward.kind) {
    case "shot":
      return reward.dBar[level - 1]! * (REWARD.shotQ[0] + REWARD.shotQ[1] * score.quality) * common;
    case "resource":
      return reward.perLevel[level - 1]! * qA * qS * (reward.richness ? richness : 1) * common;
    case "keep":
      return reward.goldPerWord * qA * common;
    case "soldiers":
      return qQ * common;
  }
}

const richnessOf = (w: World, b: number): number => (w.buildings.node[b]! >= 0 ? RICHNESS[w.map.nodes[w.buildings.node[b]!]!.richness - 1]! : 1);

/** Pays word `s` of building b; returns the gold paid (thousandths). */
export function payWord(w: World, s: number, b: number, score: Score): number {
  if (w.phase !== "battle") return 0;
  const B = w.buildings;
  const W = w.words;
  const def = w.c.buildings[B.def[b]!]!;
  const agent = W.agent[s]!;
  const helper = agent > 0 ? w.c.content.helpers[agent - 1]! : null;
  const specialty = helper !== null && helper.specialty === def.def.specialty ? 1 + helper.specialtyPct : 1;
  const reward = def.def.reward;
  const value = rewardValue(reward, B.level[b]!, w.typing.deck.len[W.word[s]!]!, score, tempoFactor(W.tempo[s]!, def.family), richnessOf(w, b), specialty);
  const crit = score.grade === "flash" || score.grade === "perfect";
  let gold = 0;
  if (reward.kind === "shot") {
    w.typing.shots.push({ b, power: value, crit, word: W.word[s]!, burn: agent === 0 && w.c.content.hero.affinity.includes(def.id), bolt: false });
  } else if (reward.kind === "soldiers") {
    soldierReward(w, b, value * reward.respawnCutS * TICK_HZ, value * reward.healPct);
  } else {
    gold = Math.round(value * 1000);
    if (reward.kind === "keep" && reward.crossbowShot) w.typing.shots.push({ b, power: 0, crit: false, word: -1, burn: false, bolt: true });
  }
  B.streak[b] = score.grade === "sloppy" ? 0 : B.streak[b]! + 1;
  if (B.streak[b]! >= FIVE_GOOD.words) {
    B.streak[b] = 0;
    if (def.mine !== null) gold += Math.round(FIVE_GOOD.mineGold * richnessOf(w, b) * 1000);
    if (def.barracks !== null && findTempSoldier(w, b, 2, FIVE_GOOD.tempSoldierMax - 1) < 0) addTempSoldier(w, b, 2, w.tick + FIVE_GOOD.tempSoldierS * TICK_HZ);
  }
  if (gold > 0) {
    w.gold += gold;
    bump(w.stats, STAT.goldWord, gold);
    w.events.ring.push(FX.wordGold, B.x[b]!, B.z[b]!, gold, w.tick);
  }
  return gold;
}

/** The longest-dead squad soldier comes back `cut` ticks sooner; with none dead, every soldier heals `share` of its hit points. */
function soldierReward(w: World, b: number, cut: number, share: number): void {
  const U = w.units;
  let dead = -1;
  for (let s = 0; s < U.top; s += 1) {
    if (U.used[s] === 0 || U.barracks[s] !== b || U.hp[s]! > 0 || U.respawnAt[s]! < 0 || U.temp[s] !== 0) continue;
    if (dead < 0 || U.respawnAt[s]! < U.respawnAt[dead]!) dead = s;
  }
  if (dead >= 0) {
    U.respawnAt[dead] = U.respawnAt[dead]! - Math.round(cut);
    return;
  }
  const max = w.c.buildings[w.buildings.def[b]!]!.barracks!.levels[w.buildings.level[b]! - 1]!.hp;
  for (let s = 0; s < U.top; s += 1) if (U.used[s] === 1 && U.barracks[s] === b && U.hp[s]! > 0) U.hp[s] = Math.min(max, U.hp[s]! + Math.round(max * share));
}

const targets = new Int32Array(8);

/** Step 7: the Word Shots and Bastion bolts that words finished this tick asked for. */
export function fireWordShots(w: World): void {
  const B = w.buildings;
  for (const shot of w.typing.shots) {
    const b = shot.b;
    if (B.used[b] === 0) continue;
    const def = w.c.buildings[B.def[b]!]!;
    const attack = def.attack!;
    const level = attack.levels[B.level[b]! - 1]!;
    const x = B.x[b]!;
    const z = B.z[b]!;
    const reward = def.def.reward;
    const count = reward.kind === "shot" ? Math.min(targets.length, 1 + reward.pierce + B.extraTargets[b]!) : 1;
    const found = selectTargets(w, x, z, attack, level, count, targets);
    if (found === 0) {
      bump(w.stats, STAT.fizzles);
      w.events.ring.push(FX.fizzle, x, z, b, w.tick);
      continue;
    }
    if (shot.bolt) {
      fireAt(w, PROJECTILE.bolt, x, z, attack, level, targets[0]!, SOURCE.crossbow, B.dmgMul[b]!, B.critAdd[b]!, B.areaMul[b]!, B.edgeAdd[b]!);
      continue;
    }
    const area = B.areaMul[b]! * (reward.kind === "shot" ? (reward.splashMul ?? 1) : 1);
    for (let index = 0; index < found; index += 1) {
      const crit = shot.crit || (attack.crit + B.critAdd[b]! > 0 && w.rng.crit.chance(attack.crit + B.critAdd[b]!));
      const p = launch(w, PROJECTILE.wordShot, x, z, attack, level, targets[index]!, SOURCE.wordShot, shot.power, crit, area, B.edgeAdd[b]!);
      if (p < 0) continue;
      w.projectiles.word[p] = shot.word;
      w.projectiles.burn[p] = shot.burn ? 1 : 0;
    }
    bump(w.stats, STAT.wordShots);
  }
  w.typing.shots.length = 0;
}
