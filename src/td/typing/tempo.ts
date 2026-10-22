/**
 * Tempo, word length and load (docs/td/TYPING_DEFENSE_DESIGN.md 6.2, 6.3,
 * 6.13). Each building deals a word every N seconds; denser tempos open with
 * its level (the sandbox opens them all), 8 s only on easy, and the Bastion's
 * densest is 2 s from Bastion level 2. Length follows the expected speed E,
 * and a dense tempo only cuts its top. The game suggests a tempo, never sets one.
 */
import { DEFAULT_TEMPO_S, LENGTH_BY_E, LOAD, TEMPO } from "../content/rules";
import type { Difficulty, Family } from "../content/types";

export const STOP = 0;
export const tempoIndex = (periodS: number): number => TEMPO.findIndex((tempo) => tempo.periodS === periodS);

/** The densest period a building may pick: its level's, 1 s in the sandbox; the Bastion passes its own. */
export function densestPeriod(level: number, sandbox: boolean): number {
  let densest: number = TEMPO[1].periodS;
  for (const tempo of TEMPO) if (tempo.periodS > 0 && (sandbox || tempo.minLevel <= level)) densest = Math.min(densest, tempo.periodS);
  return densest;
}

export function tempoOpen(index: number, densestS: number, difficulty: Difficulty): boolean {
  const tempo = TEMPO[index];
  return tempo !== undefined && (tempo.periodS === 0 || (tempo.periodS >= densestS && (!("easyOnly" in tempo) || difficulty === "easy")));
}

/** One open step denser (+1, Equal) or slower (−1, Minus; Dừng is the slowest); the same index when none. */
export function stepTempo(index: number, dir: 1 | -1, densestS: number, difficulty: Difficulty): number {
  for (let next = index + dir; next >= 0 && next < TEMPO.length; next += dir) if (tempoOpen(next, densestS, difficulty)) return next;
  return index;
}

/** A new building's tempo: 6 s below 30 WPM, 4 s from there. */
export const defaultTempo = (expected: number): number =>
  tempoIndex(expected < DEFAULT_TEMPO_S.slowEBelow ? DEFAULT_TEMPO_S.slowE : DEFAULT_TEMPO_S.normal);

/** Word lengths [lo, hi] for E; a dense tempo lowers hi (1 s: 5, 2 s: 6). */
export function lengthBand(expected: number, index: number): [number, number] {
  let band: readonly [number, number] = LENGTH_BY_E[0].len;
  for (const entry of LENGTH_BY_E) if (expected >= entry.minE) band = entry.len;
  const tempo = TEMPO[index]!;
  return [band[0], "maxLen" in tempo ? Math.min(band[1], tempo.maxLen) : band[1]];
}

/** T_N: the tempo's reward factor; economy (mines, the Bastion) has the flatter one. */
export const tempoFactor = (index: number, family: Family): number =>
  family === "economy" || family === "core" ? TEMPO[index]!.tEconomy : TEMPO[index]!.tAttack;

/** K: words a minute one can type while still watching the map. */
export const capacity = (expected: number, meanLen: number): number => (LOAD.share * expected * 5) / (meanLen + 1);

/** W: words a minute the given tempo indices deal. */
export const wordsPerMinute = (indices: readonly number[]): number =>
  indices.reduce((sum, index) => sum + (TEMPO[index]!.periodS > 0 ? 60 / TEMPO[index]!.periodS : 0), 0);

/** After 10 words at a tempo: +1 when ≥ 95 % were caught and a denser one is open, −1 when < 70 %, else 0. */
export function tempoHint(resolved: number, hits: number, index: number, densestS: number, difficulty: Difficulty): number {
  if (resolved < LOAD.hintWords || index === STOP) return 0;
  if (hits >= LOAD.hintUp * resolved) return stepTempo(index, 1, densestS, difficulty) !== index ? 1 : 0;
  return hits < LOAD.hintDown * resolved && stepTempo(index, -1, densestS, difficulty) !== STOP ? -1 : 0;
}
