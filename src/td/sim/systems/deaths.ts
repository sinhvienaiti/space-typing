/**
 * Deaths and leaks (TK 25.6 step 15). A kill's gold reaches the treasury on
 * the tick the enemy dies (TK 17.4: coins flying to the HUD are only a
 * picture); a leak costs the Bastion its lives, and at 0 the run is lost.
 */
import { FX } from "../events";
import { STAT, bump } from "../stats";
import type { World } from "../world";
import { LEAKED } from "./move";

export function deathsStep(w: World): void {
  const E = w.enemies;
  for (let e = 0; e < E.top; e += 1) {
    if (E.used[e] === 0 || E.dying[e] === 0) continue;
    const def = w.c.enemies[E.def[e]!]!;
    if (E.dying[e] === LEAKED) {
      w.lives = Math.max(0, w.lives - def.leak);
      bump(w.stats, STAT.leaks);
      bump(w.stats, STAT.livesLost, def.leak);
      w.events.ring.push(FX.leak, E.x[e]!, E.z[e]!, def.leak, w.tick);
      w.events.rare.push({ t: "leak", tick: w.tick, enemy: def.index, lives: w.lives });
    } else {
      w.gold += def.gold * 1000;
      bump(w.stats, STAT.kills);
      bump(w.stats, STAT.goldKill, def.gold * 1000);
      w.events.ring.push(FX.death, E.x[e]!, E.z[e]!, def.index, w.tick);
      w.events.ring.push(FX.coin, E.x[e]!, E.z[e]!, def.gold, w.tick);
    }
    w.waveAlive[E.wave[e]!]! -= 1;
    E.release(e);
  }
  if (w.lives <= 0 && w.phase !== "defeat") {
    w.phase = "defeat";
    w.events.rare.push({ t: "defeat", tick: w.tick });
  }
}
