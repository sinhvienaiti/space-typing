/**
 * Words from deal to end (docs/td/TYPING_DEFENSE_DESIGN.md 6.4, 6.6, 6.15;
 * keys at 25.6 step 1, expiry at step 11). Keys go through the router; a
 * finished word is scored and paid on its tick: heat, chain, its building's
 * last five, the reward. An expired word costs its building 1 heat and the
 * chain 2, or half when it was touched; a cancelled one costs nothing.
 */
import { HEAT, WORD_D } from "../../content/rules";
import { KIND } from "../../typing/letters";
import { KEY, routeKey } from "../../typing/router";
import { lifeTicks, rawWpm, scoreWord } from "../../typing/scorer";
import { STAT, bump } from "../stats";
import type { World } from "../world";
import { chainStep } from "./chain";
import { GRADE_HEAT, addHeat, penaltyFree, pushRecent } from "./heat";
import { payWord } from "./rewards";

const firstLetter = (w: World, s: number): number => w.typing.deck.letters[w.typing.deck.start[w.words.word[s]!]!]!;

export function spawnWord(w: World, b: number, word: number, tier: number): void {
  const T = w.typing;
  const B = w.buildings;
  const life = lifeTicks(T.deck.len[word]!, w.expected, WORD_D.known, w.difficulty);
  const s = w.words.add(word, b, KIND.stream, tier, B.assist[b]!, B.tempo[b]!, w.tick, life);
  if (s < 0) return;
  T.letters.take(s, firstLetter(w, s), tier);
  B.liveWords[b] = B.liveWords[b]! + 1;
  B.lastLetter[b] = firstLetter(w, s);
  T.streamLive += 1;
  bump(w.stats, STAT.streamSpawned);
  w.events.rare.push({ t: "wordSpawn", tick: w.tick, word: w.words.id(s), building: B.id(b) });
}

/** Frees word `s`: its letter, the lock, its building's count. */
function endWord(w: World, s: number): void {
  const T = w.typing;
  T.letters.release(s, firstLetter(w, s), w.tick);
  if (T.router.lock === s) T.router.lock = -1;
  const b = w.words.building[s]!;
  w.buildings.liveWords[b] = w.buildings.liveWords[b]! - 1;
  if (w.words.kind[s] === KIND.stream) T.streamLive -= 1;
  w.words.release(s);
}

export function expireWord(w: World, s: number): void {
  const W = w.words;
  const b = W.building[s]!;
  const touched = W.touched[s] === 1;
  if (!penaltyFree(w)) addHeat(w, b, HEAT.expired);
  chainStep(w, "expired", touched);
  w.buildings.streak[b] = 0;
  w.buildings.resolved[b] = w.buildings.resolved[b]! + 1;
  bump(w.stats, STAT.streamMissed);
  w.events.rare.push({ t: "wordMiss", tick: w.tick, word: W.id(s), building: w.buildings.id(b), touched });
  endWord(w, s);
}

/** Building b is gone (undo): its words end with no loss (TK 6.4 "Hủy"). */
export function cancelWords(w: World, b: number): void {
  for (const s of w.words.live()) {
    if (w.words.building[s] !== b) continue;
    bump(w.stats, STAT.streamCancelled);
    w.events.rare.push({ t: "wordCancel", tick: w.tick, word: w.words.id(s) });
    endWord(w, s);
  }
}

function finishWord(w: World, s: number): void {
  const W = w.words;
  const B = w.buildings;
  const b = W.building[s]!;
  const len = w.typing.deck.len[W.word[s]!]!;
  const score = scoreWord(len, W.errors[s]!, W.life[s]!, w.tick - W.born[s]!, w.expected, WORD_D.known);
  addHeat(w, b, GRADE_HEAT[score.grade]);
  chainStep(w, score.grade);
  pushRecent(w, b, score.speed, score.accuracy);
  B.resolved[b] = B.resolved[b]! + 1;
  B.hits[b] = B.hits[b]! + 1;
  const gold = payWord(w, s, b, score);
  bump(w.stats, STAT.streamDone);
  if (score.grade === "flash" || score.grade === "perfect") bump(w.stats, STAT.streamPerfect);
  if (score.grade === "sloppy") bump(w.stats, STAT.streamSloppy);
  bump(w.stats, STAT.rawWpmSum, rawWpm(len, W.firstMs[s]!, W.lastMs[s]!));
  w.events.rare.push({ t: "wordHit", tick: w.tick, word: W.id(s), building: B.id(b), grade: score.grade, errors: W.errors[s]!, quality: score.quality, gold: gold / 1000 });
  endWord(w, s);
}

/** A letter key (0–25) at `atMs` (the key's own clock, logged: raw speed and evenness only). */
export function typeKey(w: World, letter: number, atMs: number): string | null {
  if (!Number.isInteger(letter) || letter < 0 || letter > 25 || !Number.isFinite(atMs)) return "badKey";
  const T = w.typing;
  const W = w.words;
  T.keyMs[T.keys % T.keyMs.length] = atMs;
  T.keys += 1;
  bump(w.stats, STAT.keys);
  const before = T.router.lock;
  const result = routeKey(T.router, T.deck, T.letters, W, letter);
  const s = result === KEY.done ? before : T.router.lock;
  if (result === KEY.stray || result === KEY.wrong || result === KEY.switch) bump(w.stats, result === KEY.stray ? STAT.strays : STAT.keyErrors);
  if (s >= 0 && s !== before) W.firstMs[s] = atMs; // the lock came to this word with this key
  if (result === KEY.lock || result === KEY.switch || result === KEY.advance || result === KEY.done) W.lastMs[s] = atMs;
  w.events.rare.push({ t: "wordKey", tick: w.tick, word: s >= 0 ? W.id(s) : -1, result });
  if (result === KEY.done) finishWord(w, s);
  return null;
}
