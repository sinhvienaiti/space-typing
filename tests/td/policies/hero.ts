/**
 * Where the hero goes (TK 19.4, 22.2). The pendulum (one slot): Draconis
 * assists the tower while enemies come near it and the mine in the lull, at
 * least 5 s in each place; it swings only while the hero holds the only open
 * slot, then the layout's orders stand. "Tướng ra trận": the hero assists
 * nothing and stands by the road, throwing fireballs (magic: Thuồng Luồng's
 * armour does not stop them, TK 19.8).
 */
import { slotsOpen } from "../../../src/td/sim/systems/agents";
import type { Rule } from "./stand";

/** Near: an enemy within this of the tower sends the hero there; the lull: none within `CLEAR_M` for `CALM_TICKS`. */
const NEAR_M = 30;
const CLEAR_M = 40;
const CALM_TICKS = 3 * 60;
const STAY_TICKS = 5 * 60;

/** `tower`, `mine`: indices into the layout's builds. */
export function pendulum(tower: number, mine: number): Rule {
  let movedAt = -1e9;
  let calmSince = -1;
  return (bot, plan) => {
    const { w } = bot;
    const towerSlot = plan.slot(w, tower);
    const mineSlot = plan.slot(w, mine);
    if (slotsOpen(w) !== 1 || towerSlot < 0 || mineSlot < 0) return;
    const E = w.enemies;
    const B = w.buildings;
    let nearest = Infinity;
    for (let e = 0; e < E.top; e += 1) {
      if (E.used[e] === 0) continue;
      const dx = E.x[e]! - B.x[towerSlot]!;
      const dz = E.z[e]! - B.z[towerSlot]!;
      nearest = Math.min(nearest, Math.sqrt(dx * dx + dz * dz));
    }
    calmSince = nearest > CLEAR_M ? (calmSince < 0 ? w.tick : calmSince) : -1;
    const want = nearest <= NEAR_M ? towerSlot : calmSince >= 0 && w.tick - calmSince >= CALM_TICKS ? mineSlot : w.agents.goal[0]!;
    if (want < 0 || want === w.agents.goal[0] || w.tick - movedAt < STAY_TICKS) return;
    bot.send({ t: "assignUnit", agent: 0, building: B.id(want) });
    movedAt = w.tick;
  };
}

/** The hero stands at (x, z) and fights (leave agent 0 out of the layout's assign). */
export function heroOut(x: number, z: number): Rule {
  return (bot) => {
    const A = bot.w.agents;
    if (A.goal[0] === -1 && (A.gx[0] !== x || A.gz[0] !== z)) bot.send({ t: "move", agent: 0, qx: Math.round(x * 4), qz: Math.round(z * 4) });
  };
}
