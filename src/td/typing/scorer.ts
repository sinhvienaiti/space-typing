/**
 * Word life and scoring (docs/td/TYPING_DEFENSE_DESIGN.md 6.4, 6.6). Errors
 * weigh most, with slack for long words; speed counts from the moment the
 * word appeared (reading time included), so the clock is the tick, not the
 * keys. The grade is the one name rules and pictures share (TK 0.6).
 *
 *   L_w   = clamp(1.2 + 12·(len + 1)/(E·d); 3; 6) × k_L
 *   A_w   = clamp(1 − e·clamp(1.5/len; 0.15; 0.40); 0; 1)
 *   S_w   = clamp((L_w − t_done)/(L_w − t_fast); 0; 1),  t_fast = 0.35 + 0.8·12·(len + 1)/(E·d)
 *   Q_w   = 0.6·A_w + 0.4·S_w·(0.4 + 0.6·A_w)
 */
import { LIFE, SCORE, TICK_HZ } from "../content/rules";
import type { Difficulty, Grade } from "../content/types";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Seconds to type a word at the expected speed E (12 s per WPM-minute of 5 letters plus the space). */
export const typeSeconds = (len: number, expected: number, d: number): number => (LIFE.perChar * (len + 1)) / (expected * d);

export function lifeSeconds(len: number, expected: number, d: number, difficulty: Difficulty): number {
  const life = clamp(LIFE.base + typeSeconds(len, expected, d), LIFE.min, LIFE.max) * LIFE.k[difficulty];
  return difficulty === "hard" ? Math.max(LIFE.hardMin, life) : life;
}

export const lifeTicks = (len: number, expected: number, d: number, difficulty: Difficulty): number =>
  Math.round(lifeSeconds(len, expected, d, difficulty) * TICK_HZ);

export type Score = { grade: Grade; accuracy: number; speed: number; speedEff: number; quality: number };

/** Errors allowed before a word is sloppy: 1, or 2 for a phrase of 12 letters or more. */
export const allowedErrors = (len: number): number => (len >= SCORE.phraseLen ? 2 : 1);

/** A finished word of `len` letters, `errors` wrong keys, `doneTicks` after it appeared, with base life `life` ticks. */
export function scoreWord(len: number, errors: number, life: number, doneTicks: number, expected: number, d: number): Score {
  const accuracy = clamp(1 - errors * clamp(SCORE.errNum / len, SCORE.errMin, SCORE.errMax), 0, 1);
  const lifeS = life / TICK_HZ;
  const fast = SCORE.fastBase + SCORE.fastK * typeSeconds(len, expected, d);
  const speed = lifeS > fast ? clamp((lifeS - doneTicks / TICK_HZ) / (lifeS - fast), 0, 1) : doneTicks <= life ? 1 : 0;
  const speedEff = speed * (SCORE.effBase + SCORE.effK * accuracy);
  const quality = SCORE.qA * accuracy + SCORE.qS * speedEff;
  let grade: Grade;
  if (errors === 0) grade = speed >= SCORE.flashS ? "flash" : "perfect";
  else if (errors <= allowedErrors(len)) grade = len >= 6 ? "good" : "ok";
  else grade = "sloppy";
  return { grade, accuracy, speed, speedEff, quality };
}

/** Raw typing speed, first key to last (TK 6.6): only for the baseline B, never for scoring. */
export const rawWpm = (len: number, firstMs: number, lastMs: number): number => (lastMs > firstMs ? ((len - 1) / 5) * (60000 / (lastMs - firstMs)) : 0);
