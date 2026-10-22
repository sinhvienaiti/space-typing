/**
 * Waves (docs/td/TYPING_DEFENSE_DESIGN.md 18.3, 17.2; BUILD_NOW §3.3). The
 * first wave waits for the player (the preparation phase has no clock); the
 * next wave's 30 s count starts once the current one has spawned everything.
 * Calling early pays a gold per second left (at most 30). A wave ends when
 * all its enemies are gone: +10 + 2 × wave gold, and mine piles go home.
 */
import { waveSchedule } from "../../content/compile";
import { ECONOMY, TICK_HZ } from "../../content/rules";
import { STAT, bump } from "../stats";
import type { World } from "../world";
import { collectPiles } from "./production";

export function startWave(w: World): void {
  const wave = (w.wave += 1);
  const schedule = waveSchedule(w.c, wave);
  const grounds = w.lanes.length - 1;
  // Packs take the ground routes in turn, from a side the spawn stream picks.
  const first = w.rng.spawn.int(0, grounds - 1);
  for (const spawn of schedule) {
    w.spawnQueue.push({ tick: w.tick + spawn.at, enemy: spawn.enemy, route: spawn.lane < 0 ? grounds : (first + spawn.lane) % grounds, wave });
  }
  w.spawnQueue.sort((a, b) => a.tick - b.tick);
  w.waveLeft[wave] = schedule.length;
  w.waveAlive[wave] = 0;
  w.waveEnded[wave] = 0;
  w.nextWaveAt = -1;
  if (w.phase === "prep") w.phase = "battle";
  w.events.rare.push({ t: "waveStart", tick: w.tick, wave });
}

/** The gold a call on this tick pays, for whole seconds left: the flag button shows this number. */
export const earlyCallBonus = (w: World): number => Math.min(ECONOMY.earlyCall.goldCap, Math.floor((w.nextWaveAt - w.tick) / TICK_HZ) * ECONOMY.earlyCall.goldPerS);

/** The early call (Shift+Enter, the flag button): during preparation or the count between waves. */
export function callWave(w: World): boolean {
  if (w.phase === "prep") {
    startWave(w);
    return true;
  }
  if (w.phase !== "battle" || w.nextWaveAt < 0) return false;
  const bonus = earlyCallBonus(w);
  w.gold += bonus * 1000;
  bump(w.stats, STAT.goldEarly, bonus * 1000);
  w.events.rare.push({ t: "waveCalled", tick: w.tick, wave: w.wave + 1, bonus });
  startWave(w);
  return true;
}

export function wavesStep(w: World): void {
  if (w.phase !== "battle") return;
  if (w.nextWaveAt >= 0 && w.tick >= w.nextWaveAt) startWave(w);
  for (let wave = 1; wave <= w.wave; wave += 1) {
    if (w.waveEnded[wave] === 1 || w.waveLeft[wave]! > 0 || w.waveAlive[wave]! > 0) continue;
    w.waveEnded[wave] = 1;
    const bonus = ECONOMY.waveBonus.base + ECONOMY.waveBonus.perWave * wave;
    w.gold += bonus * 1000;
    bump(w.stats, STAT.goldWave, bonus * 1000);
    bump(w.stats, STAT.wavesCleared);
    w.events.rare.push({ t: "waveEnd", tick: w.tick, wave, bonus });
    collectPiles(w);
  }
}
