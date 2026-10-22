/**
 * The word stream (docs/td/TYPING_DEFENSE_DESIGN.md 6.2, 6.4, 6.14, 25.8;
 * 25.6 step 11). Words run out first (a locked word half typed gets 0.6 s
 * once); then every assisted building deals on its own fixed schedule,
 * anchor + k × N, which never drifts. Deals anywhere on the map keep 0.2 s
 * apart by putting the later one back 0.2 s, at most 0.6 s; a building at a
 * cap waits and gives the deal up at its next mark; a letter jam skips one
 * deal and is never a miss. Tempo, "stop all" and the order grace restart or
 * pause the schedule here; an agent settling in restarts it (agents.ts).
 */
import { ticks } from "../../content/compile";
import { CAP, EMIT, LIFE, ORDER_GRACE, TEMPO } from "../../content/rules";
import { availableLetters, bandWords, streamCap } from "../../typing/decks";
import { KIND } from "../../typing/letters";
import { createBag, pickWord, type Bag } from "../../typing/picker";
import { defaultTempo, densestPeriod, lengthBand, stepTempo, STOP, tempoOpen } from "../../typing/tempo";
import { STAT, bump } from "../stats";
import type { World } from "../world";
import { expectedE, expireWord, spawnWord } from "./words";

const STAGGER = ticks(EMIT.staggerS);
const STAGGER_MAX = ticks(EMIT.staggerMaxS);
const period = (tempo: number): number => ticks(TEMPO[tempo]!.periodS);

/** Band, stream cap and fresh bags for the current E and vocabulary: at the start, and when the sandbox changes them. */
export function configureDeck(w: World): void {
  const T = w.typing;
  const [lo, hi] = lengthBand(expectedE(w), STOP);
  const words = bandWords(T.deck, w.vocab, lo, hi);
  T.a = availableLetters(T.deck, words);
  T.cap = streamCap(T.a);
  T.meanLen = words.length > 0 ? words.reduce((sum, word) => sum + T.deck.len[word]!, 0) / words.length : 0;
  T.bags.length = 0;
}

/** The bag of the band cut at `hi` letters (a dense tempo's top), made on first use. */
function bagFor(w: World, hi: number): Bag {
  return (w.typing.bags[hi] ??= createBag(bandWords(w.typing.deck, w.vocab, lengthBand(expectedE(w), STOP)[0], hi)));
}

/** The first deal `delay` ticks from now, then one every period (a tempo change; an agent settling in). */
export function restartStream(w: World, b: number, delay: number): void {
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

/**
 * A tempo takes effect from the next deal, no word at once. The player's own
 * choice (`remember`) is kept for its kind and clears what "stop all" put aside; a running one ends "stop all".
 */
export function setTempo(w: World, b: number, tempo: number, remember = true): void {
  const B = w.buildings;
  B.tempo[b] = tempo;
  B.waiting[b] = B.resolved[b] = B.hits[b] = 0;
  if (remember) B.tempoPrev[b] = 0;
  if (tempo !== STOP) restartStream(w, b, period(tempo));
  if (remember && tempo !== STOP) {
    w.typing.tempoByDef[B.def[b]!] = tempo;
    w.typing.allStopped = false;
  }
  w.events.rare.push({ t: "tempoChanged", tick: w.tick, building: B.id(b), tempo });
}

/** `tempo` when building b may pick it, else the nearest open one: slower when it is too dense, denser when it closed (8 s off easy). */
function nearestOpen(w: World, b: number, tempo: number): number {
  const densest = densestFor(w, b);
  if (tempoOpen(tempo, densest, w.difficulty)) return tempo;
  return stepTempo(tempo, TEMPO[tempo]!.periodS < densest ? -1 : 1, densest, w.difficulty);
}

/** After a difficulty or level change, a tempo that closed (or one "stop all" put aside) moves to the nearest open one. */
export function recheckTempos(w: World): void {
  const B = w.buildings;
  for (const b of B.live()) {
    if (B.tempoPrev[b]! > 0) B.tempoPrev[b] = nearestOpen(w, b, B.tempoPrev[b]!);
    if (!tempoOpen(B.tempo[b]!, densestFor(w, b), w.difficulty)) setTempo(w, b, nearestOpen(w, b, B.tempo[b]!), false);
  }
}

/** A new building's tempo: its kind's last, else 6 s below 30 WPM and 4 s above; under "stop all" put aside, at Dừng. */
export function startTempo(w: World, b: number): void {
  const chosen = w.typing.tempoByDef[w.buildings.def[b]!]!;
  const tempo = nearestOpen(w, b, chosen > 0 ? chosen : defaultTempo(expectedE(w)));
  setTempo(w, b, w.typing.allStopped ? STOP : tempo, false);
  if (w.typing.allStopped) w.buildings.tempoPrev[b] = tempo;
}

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
        B.shift[b] = 0; // the next deal has not been put back yet
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
    const pick = pickWord(bagFor(w, lengthBand(expectedE(w), B.tempo[b]!)[1]), T.deck, T.letters, W, KIND.stream, w.tick, w.vocab, B.lastLetter[b]!, w.rng.words);
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
