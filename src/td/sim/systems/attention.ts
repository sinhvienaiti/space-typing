/**
 * The AttentionDirector (BUILD_1A6 §5.3; 25.6 step 11), inside the sim so a
 * replay sees what the player saw. Each tick: the ticks typed in the last
 * 20 s (a tick with a lock is a typing tick); calls that ran out close (the
 * locked one waits for its word); open calls follow their maker and are
 * bright in a help ring, or while locked, and dim outside, where a dim one
 * gives its word back. Then queued calls open while fewer than the mode's cap
 * are open, by priority (power, build, then harvest = chop = mine, then
 * quiz; older first): over the typing budget only power and build, at night
 * no quiz and one economy call at a time. Last, every bright call without a
 * word gets one.
 */
import { ticks } from "../../content/compile";
import { CALL, MODES } from "../../content/rules";
import { CALL_RANK, CALL_STATE } from "../stores/calls";
import type { World } from "../world";
import { closeCall, dropWord, giveWord, lit, placeCall } from "./calls";

const ECONOMY_RANK = 2;
const QUIZ_RANK = 3;

function light(w: World, c: number, bright: boolean): void {
  const C = w.calls;
  if (!bright && C.word[c]! >= 0) dropWord(w, C.word[c]!);
  if ((C.bright[c] === 1) === bright) return;
  C.bright[c] = bright ? 1 : 0;
  w.events.rare.push({ t: "call", tick: w.tick, call: C.id(c), kind: C.kind[c]!, state: bright ? "bright" : "dim" });
}

export function attentionStep(w: World): void {
  const C = w.calls;
  const T = w.typing;
  const lock = T.router.lock;
  const at = w.tick % T.typed.length;
  T.typedSum += (lock >= 0 ? 1 : 0) - T.typed[at]!;
  T.typed[at] = lock >= 0 ? 1 : 0;
  const locked = lock >= 0 ? w.words.call[lock]! : -1;
  let open = 0;
  let economy = 0;
  for (let c = 0; c < C.top; c += 1) {
    if (C.used[c] === 0) continue;
    if (c !== locked && C.expire[c]! >= 0 && w.tick >= C.expire[c]!) {
      closeCall(w, c);
      continue;
    }
    placeCall(w, c);
    if (C.state[c] !== CALL_STATE.open) continue;
    open += 1;
    if (CALL_RANK[C.kind[c]!] === ECONOMY_RANK) economy += 1;
    light(w, c, lit(w, c, locked));
  }
  const mode = MODES[w.mode];
  const over = T.typedSum > ticks(mode.typeS);
  const night = w.phase === "night";
  while (open < mode.open) {
    let best = -1;
    for (let c = 0; c < C.top; c += 1) {
      if (C.used[c] === 0 || C.state[c] !== CALL_STATE.queued) continue;
      const rank = CALL_RANK[C.kind[c]!]!;
      if ((over && rank >= ECONOMY_RANK) || (night && (rank === QUIZ_RANK || (rank === ECONOMY_RANK && economy >= CALL.nightEconomy)))) continue;
      const bestRank = best < 0 ? 99 : CALL_RANK[C.kind[best]!]!;
      if (rank < bestRank || (rank === bestRank && C.born[c]! < C.born[best]!)) best = c;
    }
    if (best < 0) break;
    C.state[best] = CALL_STATE.open;
    open += 1;
    if (CALL_RANK[C.kind[best]!] === ECONOMY_RANK) economy += 1;
    w.events.rare.push({ t: "call", tick: w.tick, call: C.id(best), kind: C.kind[best]!, state: "open" });
    light(w, best, lit(w, best, locked));
  }
  for (let c = 0; c < C.top; c += 1) {
    if (C.used[c] === 1 && C.bright[c] === 1 && C.word[c]! < 0 && C.done[c]! < C.words[c]!) giveWord(w, c);
  }
}
