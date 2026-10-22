/**
 * Word Shots (docs/td/TYPING_DEFENSE_DESIGN.md 6.11; BUILD_1A6 §4.5): a power
 * word fires one from its tower on the tick it is finished (25.6 step 7;
 * Perfect and Flash always crit, with no draw; with no enemy in range it
 * fizzles). The Bastion's power word is a powered crossbow volley.
 *
 *   power = D̄ × (0.8 + 1.2·Q_w) × lenF,   lenF = clamp((len + 1)/6; 0.8; 1.2)
 */
import { REWARD } from "../../content/rules";
import { FX } from "../events";
import { SOURCE, STAT, bump } from "../stats";
import { PROJECTILE } from "../stores/projectiles";
import type { World } from "../world";
import { fireAt, launch, selectTargets } from "./combat";

export function shotPower(dBar: number, len: number, quality: number): number {
  const lenF = Math.max(REWARD.lenMin, Math.min(REWARD.lenMax, (len + 1) / REWARD.lenDiv));
  return dBar * (REWARD.shotQ[0] + REWARD.shotQ[1] * quality) * lenF;
}

const targets = new Int32Array(8);

/** Step 7: the Word Shots and Bastion volleys that words finished this tick asked for. */
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
    const spec = def.def.shot;
    const found = selectTargets(w, x, z, attack, level, Math.min(targets.length, spec ? 1 + spec.pierce : level.targets + def.power.targets), targets);
    if (found === 0) {
      bump(w.stats, STAT.fizzles);
      w.events.ring.push(FX.fizzle, x, z, b, w.tick);
      continue;
    }
    for (let index = 0; index < found; index += 1) {
      if (spec === undefined) {
        fireAt(w, PROJECTILE.bolt, x, z, attack, level, targets[index]!, SOURCE.crossbow, def.power.dmg, 1);
        continue;
      }
      const crit = shot.crit || (attack.crit > 0 && w.rng.crit.chance(attack.crit));
      const p = launch(w, PROJECTILE.wordShot, x, z, attack, level, targets[index]!, SOURCE.wordShot, shot.power, crit, spec.splashMul ?? 1);
      if (p < 0) continue;
      w.projectiles.word[p] = shot.word;
      w.projectiles.burn[p] = shot.burn ? 1 : 0;
    }
    bump(w.stats, STAT.wordShots);
  }
  w.typing.shots.length = 0;
}
