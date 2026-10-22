/**
 * Calls and their words (BUILD_1A6 §5; TK 6.4–6.6, 6.15; 25.6 steps 1, 11).
 * A worker or a building makes a call when its work starts; the director
 * (attention.ts) opens it and lights it. A bright call holds one live word
 * and its first letter. A finished word is scored from the moment the call
 * got it, moves the chain and pushes the same work the worker does alone (a
 * sloppy one ×0.6). A locked call keeps its word, and gets the next one
 * locked, until it is done or Esc. Nothing is ever lost: a call that dims,
 * closes or runs out costs nothing, and what was typed stays done.
 */
import { AGENT, BUILD, CALL, FARM, LENGTH_BY_E, MINE, MODES, POWER, TREE, WORD_D } from "../../content/rules";
import { bandWords } from "../../typing/decks";
import { KIND } from "../../typing/letters";
import { createBag, pickWord, type Bag } from "../../typing/picker";
import { KEY, routeKey } from "../../typing/router";
import { lifeTicks, rawWpm, scoreWord } from "../../typing/scorer";
import { STAT, bump } from "../stats";
import { CALL_KIND } from "../stores/calls";
import { addAt, DONE } from "../stores/slots";
import type { World } from "../world";
import { inRing } from "./agents";
import { chainMul, chainStep } from "./chain";
import { shotPower } from "./rewards";

const firstLetter = (w: World, s: number): number => w.typing.deck.letters[w.typing.deck.start[w.words.word[s]!]!]!;

/** E = max(B, the mode's floor) (TK 6.6, §2): what scoring and word length read. */
export const expectedE = (w: World): number => Math.max(w.expected, MODES[w.mode].floorE);

/** Word lengths [lo, hi] for E (TK 6.3); a power word takes the lower half of the band (§5.2). */
export function lengthBand(expected: number, power = false): [number, number] {
  let band: readonly [number, number] = LENGTH_BY_E[0].len;
  for (const entry of LENGTH_BY_E) if (expected >= entry.minE) band = entry.len;
  return [band[0], power ? Math.floor((band[0] + band[1]) / 2) : band[1]];
}

/** Fresh bags for the current E and vocabulary: at the start, and when the sandbox changes them. */
export function configureDeck(w: World): void {
  w.typing.bags.length = 0;
}

/**
 * The bag of the band ending at `hi` letters, made on first use (a band's low end follows E alone). The hook for
 * word topics (§5.2, TK 22.5: harvest words of fields and food…): a topic would key its own bag here; the
 * vocabulary tags none yet, so every call draws on the level's common words.
 */
function bagFor(w: World, power: boolean): Bag {
  const [lo, hi] = lengthBand(expectedE(w), power);
  return (w.typing.bags[hi] ??= createBag(bandWords(w.typing.deck, w.vocab, lo, hi)));
}

/** A call follows whoever makes it: its NPC, else its building. */
export function placeCall(w: World, c: number): void {
  const C = w.calls;
  const npc = C.npc[c]!;
  C.x[c] = npc >= 0 ? w.npcs.x[npc]! : w.buildings.x[C.b[c]!]!;
  C.z[c] = npc >= 0 ? w.npcs.z[npc]! : w.buildings.z[C.b[c]!]!;
}

/** A new call, queued; `life` ticks to live (−1: no end). Returns its slot (−1: none free). */
export function makeCall(w: World, kind: number, words: number, npc: number, b: number, tree: number, plot: number, life = -1): number {
  const c = w.calls.add(kind, words, npc, b, tree, plot, w.tick, life < 0 ? -1 : w.tick + life);
  if (c < 0) return -1;
  placeCall(w, c);
  bump(w.stats, STAT.calls);
  w.events.rare.push({ t: "call", tick: w.tick, call: w.calls.id(c), kind, state: "made" });
  return c;
}

/** Gives bright call c its next word (tier 1 only: one first letter a live word), on the `call` kind's letters. */
export function giveWord(w: World, c: number): void {
  const T = w.typing;
  const C = w.calls;
  const pick = pickWord(bagFor(w, C.kind[c] === CALL_KIND.power), T.deck, T.letters, w.words, KIND.call, w.tick, w.vocab, C.last[c]!, w.rng.words);
  if (pick < 0 || (pick & 3) !== 1) {
    bump(w.stats, STAT.jams);
    return;
  }
  const word = pick >> 2;
  const s = w.words.add(word, c, KIND.call, 1, w.tick, lifeTicks(T.deck.len[word]!, expectedE(w), WORD_D.known, w.mode));
  if (s < 0) return;
  T.letters.take(s, firstLetter(w, s), 1);
  C.word[c] = s;
  C.last[c] = firstLetter(w, s);
  w.events.rare.push({ t: "wordSpawn", tick: w.tick, word: w.words.id(s), call: C.id(c) });
}

/** Word s goes back, with its letter and the lock: no loss (its call dimmed or closed, or it was typed). */
export function dropWord(w: World, s: number): void {
  const T = w.typing;
  const c = firstLetter(w, s);
  T.letters.release(s, c, w.tick);
  if (T.letters.owner[c]! >= 0) w.words.tier[T.letters.owner[c]!] = 1; // a tier-2 partner left is told by one key now
  if (T.router.lock === s) T.router.lock = -1;
  w.calls.word[w.words.call[s]!] = -1;
  w.words.release(s);
}

/** A whole Perfect call's bonus (§5.1), the chain tier's share on resources (§5.4). */
function perfectBonus(w: World, c: number): void {
  const C = w.calls;
  const mul = chainMul(w.typing.chain);
  const b = C.b[c]!;
  switch (C.kind[c]) {
    case CALL_KIND.harvest: {
      const food = Math.round(FARM.perfectFood * mul);
      w.food += food;
      bump(w.stats, STAT.food, food);
      return;
    }
    case CALL_KIND.chop: {
      const wood = Math.round(TREE.perfectWood * mul);
      w.wood += wood;
      bump(w.stats, STAT.wood, wood);
      return;
    }
    case CALL_KIND.mine: {
      const gold = Math.round(MINE.perfectGold * mul * 1000);
      w.gold += gold;
      bump(w.stats, STAT.goldWord, gold);
      return;
    }
    case CALL_KIND.build: {
      const B = w.buildings;
      B.sturdy[b] = 1;
      B.hp[b] = Math.round(w.c.buildings[B.def[b]!]!.hp[B.level[b]! - 1]! * BUILD.sturdy);
      return;
    }
    case CALL_KIND.power:
      w.buildings.charges[b] = Math.min(POWER.max, w.buildings.charges[b]! + POWER.perfect);
      return;
    default:
      w.knowledge += 1;
  }
}

/**
 * Call c ends (§5.2): its work is done, its words are typed, its maker is gone or it ran out. A call whose work a
 * typed word finished, every typed word Flash or Perfect, pays its bonus: answered to the end, though self-work
 * may have spared it its last words (BUILD_NOTES §3.2 item 2, review R1).
 */
export function closeCall(w: World, c: number): void {
  const C = w.calls;
  if (C.word[c]! >= 0) dropWord(w, C.word[c]!);
  const perfect = C.finished[c] === 1 && C.done[c]! > 0 && C.perfect[c] === 1;
  if (perfect) {
    perfectBonus(w, c);
    bump(w.stats, STAT.callsPerfect);
  }
  const npc = C.npc[c]!;
  if (npc >= 0 && w.npcs.call[npc] === c) w.npcs.call[npc] = -1;
  if (C.b[c]! >= 0 && w.buildings.call[C.b[c]!] === c) w.buildings.call[C.b[c]!] = -1;
  w.events.rare.push({ t: "callEnd", tick: w.tick, call: C.id(c), kind: C.kind[c]!, perfect, finished: C.finished[c] === 1 });
  C.release(c);
}

/** A worker's job is done, or (`byWord`) the last word of a call with no job of its own is typed: call c (−1 none) ends. */
export function endWork(w: World, c: number, byWord = false): void {
  if (c < 0) return;
  if (byWord) w.calls.finished[c] = 1;
  closeCall(w, c);
}

/** Every call of building b ends with it (an undo). */
export function closeCallsOf(w: World, b: number): void {
  for (const c of w.calls.live()) if (w.calls.b[c] === b) closeCall(w, c);
}

/** The work a word moves, `share` of one word's part (§5.1); returns whether the call's own work is now done. */
function work(w: World, c: number, share: number, word: number, len: number, quality: number, crit: boolean): boolean {
  const C = w.calls;
  const B = w.buildings;
  const b = C.b[c]!;
  const part = share / C.words[c]!;
  switch (C.kind[c]) {
    case CALL_KIND.harvest:
      return addAt(B.plotWork, b * FARM.plots + C.plot[c]!, part) >= DONE;
    case CALL_KIND.chop:
      return addAt(w.trees.progress, C.tree[c]!, part) >= DONE;
    case CALL_KIND.build:
      return addAt(B.progress, b, part) >= DONE;
    case CALL_KIND.mine: {
      const gold = Math.round(MINE.wordGold * share * 1000);
      w.gold += B.pile[b]! + gold;
      bump(w.stats, STAT.goldProduce, B.pile[b]!);
      bump(w.stats, STAT.goldWord, gold);
      B.pile[b] = 0;
      return false;
    }
    case CALL_KIND.power: {
      const def = w.c.buildings[B.def[b]!]!;
      const spec = def.def.shot;
      const dx = w.agents.x[0]! - B.x[b]!;
      const dz = w.agents.z[0]! - B.z[b]!;
      // Draconis within his ring of a cannon (his affinity) sets what its Word Shot hits burning (TK 10.3).
      const burn = w.c.content.hero.affinity.includes(def.id) && dx * dx + dz * dz <= AGENT.heroRingM * AGENT.heroRingM;
      w.typing.shots.push({ b, power: spec ? shotPower(spec.dBar[B.level[b]! - 1]!, len, quality) : 0, crit, word, burn, bolt: spec === undefined });
      B.charges[b] = Math.min(POWER.max, B.charges[b]! + Math.round(POWER.perWord * share));
      return false;
    }
    default:
      w.knowledge += 1;
      return false;
  }
}

/** Word s is typed: scored, the chain moved, the work pushed; the call goes on locked, or ends. */
function finishWord(w: World, s: number): void {
  const W = w.words;
  const C = w.calls;
  const c = W.call[s]!;
  const word = W.word[s]!;
  const len = w.typing.deck.len[word]!;
  const score = scoreWord(len, W.errors[s]!, W.life[s]!, w.tick - W.born[s]!, expectedE(w), WORD_D.known);
  const top = score.grade === "flash" || score.grade === "perfect";
  chainStep(w, score.grade);
  if (!top) C.perfect[c] = 0;
  C.done[c] = C.done[c]! + 1;
  bump(w.stats, STAT.callWords);
  if (top) bump(w.stats, STAT.wordsPerfect);
  if (score.grade === "sloppy") bump(w.stats, STAT.wordsSloppy);
  bump(w.stats, STAT.rawWpmSum, rawWpm(len, W.firstMs[s]!, W.lastMs[s]!));
  w.events.rare.push({ t: "wordHit", tick: w.tick, word: W.id(s), call: C.id(c), grade: score.grade, errors: W.errors[s]!, quality: score.quality });
  dropWord(w, s);
  // A job this word finished ends at its worker's step this tick (economy.ts), with its yield and the bonus.
  if (work(w, c, score.grade === "sloppy" ? CALL.sloppy : 1, word, len, score.quality, top)) {
    C.finished[c] = 1;
    return;
  }
  if (C.done[c]! < C.words[c]!) {
    giveWord(w, c);
    const next = C.word[c]!;
    if (next >= 0) {
      w.typing.router.lock = next;
      W.touched[next] = 1;
    }
  } else if (C.kind[c] === CALL_KIND.mine || C.kind[c] === CALL_KIND.power || C.kind[c] === CALL_KIND.quiz) endWork(w, c, true);
  else closeCall(w, c); // every word typed, a sloppy one among them: the worker finishes alone
}

/** A letter key (0–25) at `atMs` (the key's own clock, logged: raw speed only). */
export function typeKey(w: World, letter: number, atMs: number): string | null {
  if (!Number.isInteger(letter) || letter < 0 || letter > 25 || !Number.isFinite(atMs)) return "badKey";
  const T = w.typing;
  const W = w.words;
  bump(w.stats, STAT.keys);
  const before = T.router.lock;
  const result = routeKey(T.router, T.deck, T.letters, W, letter);
  const s = result === KEY.done ? before : T.router.lock;
  if (result === KEY.stray || result === KEY.wrong || result === KEY.switch) bump(w.stats, result === KEY.stray ? STAT.strays : STAT.keyErrors);
  if (s >= 0 && (s !== before || (result === KEY.advance && W.typed[s] === 1))) W.firstMs[s] = atMs; // its first letter: the lock came with this key, or it came locked
  if (result === KEY.lock || result === KEY.switch || result === KEY.advance || result === KEY.done) W.lastMs[s] = atMs;
  w.events.rare.push({ t: "wordKey", tick: w.tick, word: s >= 0 ? W.id(s) : -1, result });
  if (result === KEY.done) finishWord(w, s);
  return null;
}

/** Whether call c lies in a help ring now (or is the locked one): bright. */
export const lit = (w: World, c: number, locked: number): boolean => c === locked || inRing(w, w.calls.x[c]!, w.calls.z[c]!);
