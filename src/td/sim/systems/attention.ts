/**
 * The AttentionDirector (BUILD_1A6 §5.3; 25.6 step 11), inside the sim so a
 * replay sees what the player saw. Each tick: the ticks typed in the last
 * 20 s (a tick with a lock is a typing tick); calls that ran out, and
 * quizzes once the day is over, close (the locked one waits for its word);
 * open calls follow their maker, and a
 * bright one that leaves every help ring dims and gives its word back (the
 * locked one stays bright). The cap counts
 * bright calls only: a dim call holds nothing, so calls nobody answers never
 * keep others waiting. While fewer than the mode's cap are bright, queued
 * calls open and open calls in a ring light, by priority (power, build, then
 * harvest = chop = mine, then quiz; older first), within the typing budget;
 * at night no quiz and one economy call bright at a time. At
 * the cap a quiz nobody is typing dims for another call in a ring. Last,
 * every bright call without a word gets one.
 *
 * The typing budget is kept word by word (BUILD_1A6 §12 gate 5, review R3):
 * a word may start only if typing it from now, at E's pace (typeSeconds of
 * its letters but the first, ×CALL.paceK), after the word in flight, keeps every 20 s
 * window within the mode's seconds, counting the typed ticks that leave the
 * window meanwhile; or when nothing is typed at all (a word longer than the
 * budget still comes, alone). A call lights only if a word of its band's
 * longest would; a bright call whose word is not begun dims (it waits, and
 * gives the word back) once its word would not fit, the next word of the
 * locked call too. Power and build lead the queue but wait for room like the
 * rest. Checked against the past 20 s alone, calls lit at a quiet moment
 * were typed back to back: 17 s in 20 s at 35 WPM.
 */
import { ticks } from "../../content/compile";
import { CALL, MODES, WORD_D } from "../../content/rules";
import { typeSeconds } from "../../typing/scorer";
import { CALL_KIND, CALL_RANK, CALL_STATE } from "../stores/calls";
import type { World } from "../world";
import { closeCall, dropWord, expectedE, giveWord, lengthBand, lit, placeCall } from "./calls";

const ECONOMY_RANK = 2;
const QUIZ_RANK = 3;

/**
 * Ticks a word holds the lock while `letters` of it are left at E, ×CALL.paceK for slips: the lock comes with its
 * first letter, so the letters after it and the reading of the next word (typeSeconds counts a space: one fewer letter).
 */
const typeTicks = (w: World, letters: number): number => ticks(typeSeconds(letters - 1, expectedE(w), WORD_D.known) * CALL.paceK);

/** peak[k]: for k ticks typed from now, the most the window's count rises meanwhile (k less the typed ticks leaving it), over 0..k. */
const peak = new Int32Array(4096);

function rises(typed: Uint8Array, at: number): void {
  const len = typed.length;
  let rise = 0;
  peak[0] = 0;
  for (let k = 1; k <= len; k += 1) {
    rise += 1 - typed[(at + k) % len]!;
    peak[k] = Math.max(peak[k - 1]!, rise);
  }
}

function light(w: World, c: number, bright: boolean): void {
  const C = w.calls;
  if (!bright && C.word[c]! >= 0) dropWord(w, C.word[c]!);
  C.bright[c] = bright ? 1 : 0;
  w.events.rare.push({ t: "call", tick: w.tick, call: C.id(c), kind: C.kind[c]!, state: bright ? "bright" : "dim" });
}

export function attentionStep(w: World): void {
  const C = w.calls;
  const T = w.typing;
  const W = w.words;
  const at = w.tick % T.typed.length;
  const typing = T.router.lock >= 0 ? 1 : 0;
  T.typedSum += typing - T.typed[at]!;
  T.typed[at] = typing;
  const mode = MODES[w.mode];
  const night = w.phase === "night";
  // The word in flight (a letter of it typed) runs to its end; another starts only if it fits the 20 s budget after it.
  rises(T.typed, at);
  const room = ticks(mode.typeS) - T.typedSum;
  const lock = T.router.lock;
  const flying = lock >= 0 && W.typed[lock]! > 0 ? typeTicks(w, T.deck.len[W.word[lock]!]! - W.typed[lock]!) : 0;
  const fits = (letters: number): boolean => {
    const k = flying + typeTicks(w, letters) + ticks(CALL.slipS);
    return (T.typedSum === 0 && flying === 0) || (k <= T.typed.length ? peak[k]! : peak[T.typed.length]! + k - T.typed.length) <= room;
  };
  const longest = lengthBand(expectedE(w))[1];
  let locked = lock >= 0 ? W.call[lock]! : -1;
  let bright = 0;
  let economy = 0;
  for (let c = 0; c < C.top; c += 1) {
    if (C.used[c] === 0) continue;
    if (c !== locked && ((C.expire[c]! >= 0 && w.tick >= C.expire[c]!) || (C.kind[c] === CALL_KIND.quiz && w.phase !== "day"))) {
      closeCall(w, c);
      continue;
    }
    placeCall(w, c);
    const s = C.word[c]!;
    if (C.bright[c] === 1 && (!lit(w, c, locked) || (s >= 0 && W.typed[s] === 0 && !fits(T.deck.len[W.word[s]!]!)))) {
      if (c === locked) locked = -1; // its next word, not begun, waits with it
      light(w, c, false);
    }
    if (C.bright[c] === 0) continue;
    bright += 1;
    if (CALL_RANK[C.kind[c]!] === ECONOMY_RANK) economy += 1;
  }
  // Each round opens a queued call or lights one in a ring, so it ends; at the cap new calls wait queued (CHỜ),
  // except that a quiz no one is typing gives its place to another call in a ring (a quiz may be skipped: §4.5 of
  // the plan; helpers' quizzes, always in their own ring, would otherwise hold the cap).
  const room1 = fits(longest);
  for (;;) {
    const full = bright >= mode.open;
    let quiz = -1;
    for (let c = 0; full && c < C.top; c += 1) if (C.used[c] === 1 && C.bright[c] === 1 && C.kind[c] === CALL_KIND.quiz && c !== locked) quiz = c;
    if (!room1 || (full && quiz < 0)) break;
    let best = -1;
    for (let c = 0; c < C.top; c += 1) {
      if (C.used[c] === 0 || C.bright[c] === 1 || ((full || C.state[c] === CALL_STATE.open) && !lit(w, c, locked))) continue;
      const rank = CALL_RANK[C.kind[c]!]!;
      if ((full && rank === QUIZ_RANK) || (night && (rank === QUIZ_RANK || (rank === ECONOMY_RANK && economy >= CALL.nightEconomy)))) continue;
      const bestRank = best < 0 ? 99 : CALL_RANK[C.kind[best]!]!;
      if (rank < bestRank || (rank === bestRank && C.born[c]! < C.born[best]!)) best = c;
    }
    if (best < 0) break;
    if (full) {
      light(w, quiz, false);
      bright -= 1;
    }
    if (C.state[best] === CALL_STATE.queued) {
      C.state[best] = CALL_STATE.open;
      w.events.rare.push({ t: "call", tick: w.tick, call: C.id(best), kind: C.kind[best]!, state: "open" });
    }
    if (!lit(w, best, locked)) continue;
    light(w, best, true);
    bright += 1;
    if (CALL_RANK[C.kind[best]!] === ECONOMY_RANK) economy += 1;
  }
  for (let c = 0; c < C.top; c += 1) {
    if (C.used[c] === 1 && C.bright[c] === 1 && C.word[c]! < 0 && C.done[c]! < C.words[c]!) giveWord(w, c);
  }
}
