/**
 * Heat and afterglow (docs/td/TYPING_DEFENSE_DESIGN.md 6.7, 6.14; 25.6 step
 * 12). Heat is 0–5 per building, in thousandths, moved by finished and
 * expired words. It never cools while someone assists and the building
 * deals; once that stops it holds 4 + 2·C seconds (C: how even the last 30
 * key gaps were), then cools 0.25 a second. "Stop all" between waves freezes
 * heat and chain; the preparation phase caps heat at 2.5.
 */
import { EVENNESS, HEAT, TICK_HZ } from "../../content/rules";
import type { Grade } from "../../content/types";
import type { Typing, World } from "../world";

export const GRADE_HEAT: Readonly<Record<Grade, number>> = {
  flash: HEAT.flash, perfect: HEAT.good, good: HEAT.good, ok: HEAT.ok, sloppy: HEAT.sloppy, expired: HEAT.expired, cancelled: 0,
};

/** Between waves (or before the first) with every building stopped: heat and chain stand still. */
export const frozen = (w: World): boolean => w.typing.allStopped && (w.phase === "prep" || (w.wave > 0 && w.waveEnded[w.wave] === 1));

/** Losses wait: the order grace is open, or everything is frozen. */
export const penaltyFree = (w: World): boolean => w.tick < w.typing.graceUntil || frozen(w);

export function addHeat(w: World, b: number, delta: number): void {
  const cap = (w.phase === "prep" ? HEAT.prepCap : HEAT.max) * 1000;
  w.buildings.heat[b] = Math.max(0, Math.min(cap, w.buildings.heat[b]! + Math.round(delta * 1000)));
}

/** C = clamp((0.7 − CV)/0.4; 0; 1), CV the spread over the mean of the last 30 key gaps; 0 with fewer than 2. */
export function evenness(t: Typing): number {
  const ring = t.keyMs.length;
  const gaps = Math.min(t.keys - 1, EVENNESS.gaps);
  if (gaps < 2) return 0;
  let sum = 0;
  let squares = 0;
  for (let k = 0; k < gaps; k += 1) {
    const gap = t.keyMs[(t.keys - 1 - k) % ring]! - t.keyMs[(t.keys - 2 - k) % ring]!;
    sum += gap;
    squares += gap * gap;
  }
  const mean = sum / gaps;
  if (mean <= 0) return 0;
  const cv = Math.sqrt(Math.max(0, squares / gaps - mean * mean)) / mean;
  return Math.max(0, Math.min(1, (EVENNESS.cvTop - cv) / EVENNESS.cvSpan));
}

/** S_w and A_w of a finished word join its building's last five. */
export function pushRecent(w: World, b: number, speed: number, accuracy: number): void {
  const B = w.buildings;
  const at = b * HEAT.recentWords;
  B.recentS[at + B.recentHead[b]!] = speed;
  B.recentA[at + B.recentHead[b]!] = accuracy;
  B.recentHead[b] = (B.recentHead[b]! + 1) % HEAT.recentWords;
  const n = (B.recentN[b] = Math.min(HEAT.recentWords, B.recentN[b]! + 1));
  let s = 0;
  let a = 0;
  for (let k = 0; k < n; k += 1) {
    s += B.recentS[at + k]!;
    a += B.recentA[at + k]!;
  }
  B.speedAvg[b] = s / n;
  B.accAvg[b] = a / n;
}

/** Assisted (settled), dealing and not stopped: the building keeps its heat. */
export const dealing = (w: World, b: number): boolean => w.buildings.assist[b]! >= 0 && w.tick >= w.buildings.assistAt[b]! && w.buildings.tempo[b]! > 0;

export function heatStep(w: World): void {
  const B = w.buildings;
  const still = frozen(w);
  for (let b = 0; b < B.top; b += 1) {
    if (B.used[b] === 0) continue;
    if (dealing(w, b) || B.heat[b] === 0) {
      B.glowAt[b] = -1;
      continue;
    }
    if (B.glowAt[b]! < 0) B.glowAt[b] = w.tick + Math.round((HEAT.holdBase + HEAT.holdC * evenness(w.typing)) * TICK_HZ);
    if (still) {
      B.glowAt[b] = B.glowAt[b]! + 1;
      continue;
    }
    const past = w.tick - B.glowAt[b]!;
    if (past > 0 && past % TICK_HZ === 0) addHeat(w, b, -HEAT.decayPerS);
  }
}
