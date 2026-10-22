/**
 * Mines produce on their own (docs/td/TYPING_DEFENSE_DESIGN.md 11.2, 11.5;
 * 25.6 step 10), only in battle time (the preparation phase has none). A
 * yield of amount × node richness lands on the pile at the mine's door; a
 * full pile stops production. With someone assisting, the pile goes to the
 * treasury when they arrive and every 5 s after; at each wave end every
 * standing mine's pile goes home.
 */
import { ticks } from "../../content/compile";
import { ECONOMY, RICHNESS } from "../../content/rules";
import { STAT, bump } from "../stats";
import type { World } from "../world";

function collect(w: World, b: number): void {
  const pile = w.buildings.pile[b]!;
  if (pile <= 0) return;
  w.buildings.pile[b] = 0;
  w.gold += pile;
  bump(w.stats, STAT.goldProduce, pile);
  w.events.rare.push({ t: "pileCollected", tick: w.tick, building: w.buildings.id(b), gold: pile / 1000 });
}

export function collectPiles(w: World): void {
  for (let b = 0; b < w.buildings.top; b += 1) if (w.buildings.used[b] === 1) collect(w, b);
}

export function productionStep(w: World): void {
  if (w.phase !== "battle") return;
  const B = w.buildings;
  for (let b = 0; b < B.top; b += 1) {
    if (B.used[b] === 0 || w.tick < B.readyTick[b]!) continue;
    const mine = w.c.buildings[B.def[b]!]!.mine;
    if (mine === null) continue;
    if (B.assist[b]! >= 0 && w.tick >= B.collectAt[b]!) {
      collect(w, b);
      B.collectAt[b] = w.tick + ticks(ECONOMY.pileEveryS);
    }
    const level = mine.levels[B.level[b]! - 1]!;
    const cap = level.pile * 1000;
    if (B.pile[b]! >= cap) continue;
    const progress = B.progress[b]! + B.rateMul[b]!;
    if (progress < level.every) {
      B.progress[b] = progress;
      continue;
    }
    B.progress[b] = progress - level.every;
    const richness = B.node[b]! >= 0 ? RICHNESS[w.map.nodes[B.node[b]!]!.richness - 1]! : 1;
    B.pile[b] = Math.min(cap, B.pile[b]! + Math.round(level.amount * richness * B.outMul[b]! * 1000));
  }
}
