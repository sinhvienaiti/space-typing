/**
 * Day, night and dawn (BUILD_1A6 §2; TK 18.3, 17.2). A run opens on Day 1;
 * when the day's clock runs out, or the player calls the night early
 * (Shift+Enter: a gold for each whole second left, at most 30), the next
 * wave starts. The night ends when every wave has spawned and no enemy is
 * left: each wave pays 10 + 2 × its number; a 3 s dawn, then the next day.
 */
import { ticks, waveSchedule } from "../../content/compile";
import { ECONOMY, MODES, PHASE, TICK_HZ } from "../../content/rules";
import { STAT, bump } from "../stats";
import type { Phase, World } from "../world";

function enter(w: World, phase: Exclude<Phase, "defeat">, length: number): void {
  w.phase = phase;
  w.phaseEnd = length < 0 ? -1 : w.tick + length;
  w.events.rare.push({ t: "phase", tick: w.tick, phase, day: w.day });
}

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
  w.events.rare.push({ t: "waveStart", tick: w.tick, wave });
}

/** The night falls: the next wave comes (the sandbox's "Sinh đêm" may add one to a night already running). */
export function startNight(w: World): void {
  if (w.phase !== "night") enter(w, "night", -1);
  startWave(w);
}

/** The gold an early call on this tick pays, for whole seconds of day left: the call button shows this number. */
export const earlyCallBonus = (w: World): number =>
  w.phase === "day" ? Math.min(ECONOMY.earlyCall.goldCap, Math.floor((w.phaseEnd - w.tick) / TICK_HZ) * ECONOMY.earlyCall.goldPerS) : 0;

/** callNight (Shift+Enter): only by day. */
export function callNight(w: World): boolean {
  if (w.phase !== "day") return false;
  const bonus = earlyCallBonus(w);
  w.gold += bonus * 1000;
  bump(w.stats, STAT.goldEarly, bonus * 1000);
  w.events.rare.push({ t: "nightCalled", tick: w.tick, day: w.day, bonus });
  startNight(w);
  return true;
}

export function phaseStep(w: World): void {
  if (w.phase === "defeat") return;
  if (w.phase === "day" && w.tick >= w.phaseEnd) startNight(w);
  else if (w.phase === "dawn" && w.tick >= w.phaseEnd) {
    w.day += 1;
    enter(w, "day", ticks(MODES[w.mode].dayS));
  }
  let open = 0;
  for (let wave = 1; wave <= w.wave; wave += 1) {
    if (w.waveEnded[wave] === 1) continue;
    if (w.waveLeft[wave]! > 0 || w.waveAlive[wave]! > 0) {
      open += 1;
      continue;
    }
    w.waveEnded[wave] = 1;
    const bonus = ECONOMY.waveBonus.base + ECONOMY.waveBonus.perWave * wave;
    w.gold += bonus * 1000;
    bump(w.stats, STAT.goldWave, bonus * 1000);
    bump(w.stats, STAT.wavesCleared);
    w.events.rare.push({ t: "waveEnd", tick: w.tick, wave, bonus });
  }
  if (w.phase === "night" && open === 0) enter(w, "dawn", ticks(PHASE.dawnS));
}
