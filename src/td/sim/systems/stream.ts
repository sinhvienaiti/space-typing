/**
 * The word stream (docs/td/TYPING_DEFENSE_DESIGN.md 6.2, 6.4, 6.14, 25.8;
 * 25.6 step 11). Words run out first (a locked word half typed gets 0.6 s
 * once); then every assisted building deals on its own fixed schedule,
 * anchor + k × N, which never drifts. Deals anywhere on the map keep 0.2 s
 * apart by putting the later one back 0.2 s, at most 0.6 s; a building at a
 * cap waits and gives the deal up at its next mark; a letter jam skips one
 * deal and is never a miss. Tempo, "stop all", assists and the order grace
 * restart or pause the schedule here.
 */
import { ticks } from "../../content/compile";
import { ASSIST, CAP, EMIT, LIFE, ORDER_GRACE, TEMPO } from "../../content/rules";
import { availableLetters, bandWords, streamCap } from "../../typing/decks";
import { KIND } from "../../typing/letters";
import { createBag, pickWord, type Bag } from "../../typing/picker";
import { defaultTempo, densestPeriod, lengthBand, STOP } from "../../typing/tempo";
import { STAT, bump } from "../stats";
import type { World } from "../world";
import { expireWord, spawnWord } from "./words";

const STAGGER = ticks(EMIT.staggerS);
const STAGGER_MAX = ticks(EMIT.staggerMaxS);
const period = (tempo: number): number => ticks(TEMPO[tempo]!.periodS);

/** Band, stream cap and fresh bags for the current E and vocabulary: at the start, and when the sandbox changes them. */
export function configureDeck(w: World): void {
  const T = w.typing;
  const [lo, hi] = lengthBand(w.expected, STOP);
  const words = bandWords(T.deck, w.vocab, lo, hi);
  T.a = availableLetters(T.deck, words);
  T.cap = streamCap(T.a);
  T.meanLen = words.length > 0 ? words.reduce((sum, word) => sum + T.deck.len[word]!, 0) / words.length : 0;
  T.bags.length = 0;
}

/** The bag of the band cut at `hi` letters (a dense tempo's top), made on first use. */
function bagFor(w: World, hi: number): Bag {
  return (w.typing.bags[hi] ??= createBag(bandWords(w.typing.deck, w.vocab, lengthBand(w.expected, STOP)[0], hi)));
}

/** The first deal `delay` ticks from now, then one every period. */
function restart(w: World, b: number, delay: number): void {
  const B = w.buildings;
  B.anchor[b] = B.nextEmit[b] = w.tick + delay;
  B.anchorK[b] = B.shift[b] = B.waiting[b] = 0;
}

/** Densest period building b may pick: the Bastion's from its own levels (2 s from level 2), others by level or the sandbox. */
export function densestFor(w: World, b: number): number {
  const B = w.buildings;
  if (b !== 0) return densestPeriod(B.level[b]!, w.sandbox);
  const unlocks = w.c.content.buildings[0]!.keep!.levels.slice(0, B.level[0]!).map((level) => level.tempoUnlock ?? Infinity);
  return Math.min(densestPeriod(1, false), ...unlocks);
}

/** A tempo takes effect from the next deal: the count restarts at the new period, no word at once. */
export function setTempo(w: World, b: number, tempo: number, remember = true): void {
  const B = w.buildings;
  B.tempo[b] = tempo;
  B.waiting[b] = B.resolved[b] = B.hits[b] = 0;
  if (tempo !== STOP) {
    restart(w, b, period(tempo));
    w.typing.allStopped = false;
    if (remember) w.typing.tempoByDef[B.def[b]!] = tempo;
  }
  w.events.rare.push({ t: "tempoChanged", tick: w.tick, building: B.id(b), tempo });
}

/** A new building takes the tempo last chosen for its kind, else 6 s below 30 WPM and 4 s above. */
export const startTempo = (w: World, def: number): number => (w.typing.tempoByDef[def]! > 0 ? w.typing.tempoByDef[def]! : defaultTempo(w.expected));

/** "Stop all" (Shift+Minus) and back (Shift+Equal): every building to Dừng, or to the tempo it had. */
export function stopAll(w: World, stop: boolean): void {
  const B = w.buildings;
  for (const b of B.live()) {
    if (stop && B.tempo[b] !== STOP) {
      B.tempoPrev[b] = B.tempo[b]!;
      setTempo(w, b, STOP, false);
    } else if (!stop && B.tempo[b] === STOP && B.tempoPrev[b]! > 0) {
      setTempo(w, b, B.tempoPrev[b]!, false);
      B.tempoPrev[b] = 0;
    }
  }
  w.typing.allStopped = stop;
}

/** Assist slots: the Bastion's level, and no more than the hero and the helpers brought (the sandbox brings all three). */
export const slotsOpen = (w: World): number => Math.min(w.c.content.buildings[0]!.keep!.levels[w.buildings.level[0]! - 1]!.slots, 1 + w.c.content.helpers.length);

/**
 * Agent `agent` (0: the hero) assists building b, or leaves (b = −1). It
 * settles in 0.4 s and the first word comes 0.6 s later (TK 6.4). 1A.2 has
 * no walking yet: the agent is there at once.
 */
export function setAssist(w: World, agent: number, b: number): void {
  const B = w.buildings;
  for (const other of B.live()) if (B.assist[other] === agent) B.assist[other] = -1;
  w.events.rare.push({ t: "assist", tick: w.tick, agent, building: b < 0 ? -1 : B.id(b) });
  if (b < 0) return;
  B.assist[b] = agent;
  const settle = ticks(agent === 0 ? ASSIST.settleS : w.c.content.helpers[agent - 1]!.settleS);
  B.assistAt[b] = w.tick + settle;
  restart(w, b, settle + ticks(EMIT.firstDelayS));
}

/** Sending an agent to a building someone else assists swaps the two (TK 25.9). */
export function assignAgent(w: World, agent: number, b: number): void {
  const B = w.buildings;
  const from = B.live().find((other) => B.assist[other] === agent) ?? -1;
  if (from === b) return;
  const other = B.assist[b]!;
  setAssist(w, agent, b);
  if (other >= 0) setAssist(w, other, from);
}

/** The order grace (TK 6.14): a menu open spares expiring words for 2 s; another opening within 3 s gets none. */
export function orderGrace(w: World, on: boolean): void {
  const T = w.typing;
  if (on && w.tick >= T.graceReadyAt) {
    T.graceUntil = w.tick + ticks(ORDER_GRACE.maxS);
    T.graceReadyAt = T.graceUntil + ticks(ORDER_GRACE.cooldownS);
  } else if (!on && T.graceUntil > w.tick) {
    T.graceUntil = w.tick;
    T.graceReadyAt = w.tick + ticks(ORDER_GRACE.cooldownS);
  }
}

export function streamStep(w: World): void {
  const T = w.typing;
  const W = w.words;
  const B = w.buildings;
  for (let s = 0; s < W.top; s += 1) {
    if (W.used[s] === 0 || w.tick < W.expire[s]!) continue;
    if (T.router.lock === s && W.extended[s] === 0 && W.typed[s]! >= T.deck.len[W.word[s]!]! * LIFE.graceAt) {
      W.extended[s] = 1;
      W.expire[s] = W.expire[s]! + ticks(LIFE.graceS);
      w.events.rare.push({ t: "wordExtend", tick: w.tick, word: W.id(s) });
    } else expireWord(w, s);
  }
  for (let b = 0; b < B.top; b += 1) {
    if (B.used[b] === 0 || B.assist[b]! < 0 || B.tempo[b] === STOP || w.tick < B.assistAt[b]! || w.tick < B.readyTick[b]! || w.tick < B.nextEmit[b]!) continue;
    const every = period(B.tempo[b]!);
    if (B.liveWords[b]! >= CAP.wordsPerBuilding || T.streamLive >= T.cap || W.count >= CAP.liveWords) {
      B.waiting[b] = 1;
      if (w.tick >= B.anchor[b]! + (B.anchorK[b]! + 1) * every) {
        B.anchorK[b] = B.anchorK[b]! + 1;
        B.nextEmit[b] = B.anchor[b]! + B.anchorK[b]! * every;
        bump(w.stats, STAT.fullDrops);
        w.events.rare.push({ t: "streamDeferred", tick: w.tick, building: B.id(b), reason: "full" });
      }
      continue;
    }
    B.waiting[b] = 0;
    if (w.tick - T.lastSpawn < STAGGER && B.shift[b]! < STAGGER_MAX) {
      B.shift[b] = B.shift[b]! + STAGGER;
      B.nextEmit[b] = w.tick + STAGGER;
      continue;
    }
    const pick = pickWord(bagFor(w, lengthBand(w.expected, B.tempo[b]!)[1]), T.deck, T.letters, W, KIND.stream, w.tick, w.vocab, B.lastLetter[b]!, w.rng.words);
    if (pick >= 0) {
      spawnWord(w, b, pick >> 2, pick & 3);
      T.lastSpawn = w.tick;
    } else {
      bump(w.stats, STAT.jams);
      w.events.rare.push({ t: "streamDeferred", tick: w.tick, building: B.id(b), reason: "jam" });
    }
    B.anchorK[b] = B.anchorK[b]! + 1;
    B.nextEmit[b] = B.anchor[b]! + B.anchorK[b]! * every;
    B.shift[b] = 0;
  }
}
