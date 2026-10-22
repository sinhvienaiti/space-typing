/**
 * The Typing Defense bot (docs/td/BUILD_NOW.md §6.3, TK 19.1): a plan (what
 * to build, who assists what, tempos, waves) and a typist (eyes that see new
 * words late and pick the most urgent, hands with a speed, an accuracy and a
 * Backspace habit) play a world tick by tick through the same commands a
 * player sends. Every command is logged, so a run replays; the bot's own
 * randomness comes from a seed of its own and never touches the world's.
 * A run may check the word invariants every tick (BUILD_NOW §7 gate 3).
 */
import { createRng } from "../../src/platform/rng";
import { CAP, TICK_HZ } from "../../src/td/content/rules";
import type { Difficulty } from "../../src/td/content/types";
import type { Command, CommandBody } from "../../src/td/sim/commands";
import { hashHex } from "../../src/td/sim/hash";
import { statsObject, type StatName } from "../../src/td/sim/stats";
import { dealing } from "../../src/td/sim/systems/heat";
import { expectedE } from "../../src/td/sim/systems/words";
import { createWorld, step, type World } from "../../src/td/sim/world";
import { wordText, type Deck } from "../../src/td/typing/decks";
import { withinOneEdit } from "../../src/td/typing/distance";
import { capacity, wordsPerMinute } from "../../src/td/typing/tempo";
import { Keystrokes, type HandsSpec } from "./keystrokes";
import { Plan } from "./policies/stand";
import { Reader } from "./reader";

const STEP_MS = 1000 / TICK_HZ;

export type BotSpec = {
  seed: number;
  deck: Deck;
  /** null: never types (agents still stand). */
  hands: HandsSpec | null;
  /** Made fresh for each run: a plan keeps state. */
  plan: () => Plan;
  /** Stop when this wave has ended (or the Bastion falls). */
  waves: number;
  /** E, the sandbox's expected speed: the hands' WPM by default (35 without hands). */
  expected?: number;
  vocab?: number;
  difficulty?: Difficulty;
  /** Seed of the bot's eyes and hands (the run seed by default). */
  botSeed?: number;
  /** Hash the world every this many ticks (the golden test: 60). */
  hashEvery?: number;
  /** Check the word invariants every tick. */
  check?: boolean;
  maxTicks?: number;
};

export type BotRun = {
  world: World;
  log: Command[];
  hashes: string[];
  stats: Record<StatName, number>;
  ticks: number;
  /** Ticks in battle, and those with an enemy on the field (DPS is over these). */
  battleTicks: number;
  combatTicks: number;
  /** Load W / K summed over battle ticks (TK 6.13): mean = loadSum / battleTicks. */
  loadSum: number;
  /** Words caught and missed, by the tempo they were dealt at (index into TEMPO). */
  doneByTempo: number[];
  missedByTempo: number[];
  /** Lives left as each wave ended (index: wave). */
  livesAtWaveEnd: number[];
  /** Commands the world refused (reason), and invariant breaks. */
  rejected: string[];
  problems: string[];
  defeat: boolean;
};

/** Eyes and hands: one key a tick at most, when the hands are free and there is something to type. */
class Typist {
  private handsAt = 0;
  /** Id of the word the eyes chose; a Backspace due after a slip. */
  private target = -1;
  private backspace = false;

  constructor(private readonly hands: Keystrokes, private readonly eyes: Reader) {}

  key(w: World): CommandBody | null {
    this.eyes.look(w);
    const from = w.tick * STEP_MS;
    if (this.handsAt >= from + STEP_MS) return null;
    const at = Math.max(this.handsAt, from);
    if (this.backspace) {
      this.backspace = false;
      this.handsAt = at + this.hands.gap();
      return { t: "backspace", atMs: at };
    }
    const aim = this.aim(w);
    if (aim < 0) {
      this.handsAt = from + STEP_MS;
      return null;
    }
    const letter = this.hands.hit(aim);
    if (letter !== aim) this.backspace = this.hands.backspaceAfterSlip();
    this.handsAt = at + this.hands.gap();
    return { t: "key", letter, atMs: at };
  }

  /** The letter to aim at: the locked word's next; an open pair's second (the chosen word's, else the older's); else the first of the word the eyes pick. */
  private aim(w: World): number {
    const { router, letters, deck } = w.typing;
    const W = w.words;
    const letterOf = (s: number, k: number): number => deck.letters[deck.start[W.word[s]!]! + k]!;
    if (router.lock >= 0) return letterOf(router.lock, W.typed[router.lock]!);
    if (router.group >= 0 && letters.owner[router.group]! >= 0) {
      const chosen = W.slotOf(this.target);
      const pair = [letters.owner[router.group]!, letters.partner[router.group]!];
      return letterOf(chosen >= 0 && pair.includes(chosen) ? chosen : pair[0]!, 1);
    }
    const s = this.eyes.pick(w, this.hands.meanMs);
    this.target = s >= 0 ? W.id(s) : -1;
    return s >= 0 ? letterOf(s, 0) : -1;
  }
}

/** Live words break no rule of TK 6.4–6.5: caps, one first letter each (or a tier-2 pair told by the second), no twins, nothing one edit apart. */
export function wordProblems(w: World): string[] {
  const W = w.words;
  const { deck } = w.typing;
  const live = W.live();
  const out: string[] = [];
  const perBuilding = new Map<number, number>();
  for (const s of live) perBuilding.set(W.building[s]!, (perBuilding.get(W.building[s]!) ?? 0) + 1);
  if (live.length > CAP.liveWords) out.push(live.length + " live words");
  if (w.typing.streamLive > w.typing.cap) out.push(w.typing.streamLive + " stream words over the cap " + w.typing.cap);
  if ([...perBuilding.values()].some((n) => n > CAP.wordsPerBuilding)) out.push("over 4 words at a building");
  const texts = live.map((s) => wordText(deck, W.word[s]!));
  const byFirst = new Map<string, string[]>();
  for (const text of texts) byFirst.set(text[0]!, [...(byFirst.get(text[0]!) ?? []), text]);
  for (const group of byFirst.values()) if (group.length > 2 || (group.length === 2 && group[0]![1] === group[1]![1])) out.push("first letters " + group.join(" / "));
  for (let i = 0; i < live.length; i += 1) {
    for (let j = i + 1; j < live.length; j += 1) {
      const start = (k: number) => deck.start[W.word[live[k]!]!]!;
      if (texts[i] === texts[j]) out.push("twins " + texts[i]);
      else if (withinOneEdit(deck.letters, start(i), texts[i]!.length, start(j), texts[j]!.length)) out.push("one edit " + texts[i] + " / " + texts[j]);
    }
  }
  return out;
}

export function runBot(spec: BotSpec): BotRun {
  const world = createWorld({ seed: spec.seed, deck: spec.deck, expected: spec.expected ?? spec.hands?.wpm ?? 35, vocab: spec.vocab, difficulty: spec.difficulty });
  const bot = createRng(spec.botSeed ?? spec.seed);
  const typist = spec.hands === null ? null : new Typist(new Keystrokes(spec.hands, bot.ai), new Reader(bot.props));
  const plan = spec.plan();
  const queue: CommandBody[] = [];
  const view = { w: world, send: (body: CommandBody) => void queue.push(body) };
  const run: BotRun = {
    world, log: [], hashes: [], stats: statsObject(world.stats), ticks: 0, battleTicks: 0, combatTicks: 0, loadSum: 0,
    doneByTempo: [], missedByTempo: [], livesAtWaveEnd: [], rejected: [], problems: [], defeat: false,
  };
  const tempoOf = new Map<number, number>();
  const tally = (list: number[], tempo: number | undefined) => tempo !== undefined && (list[tempo] = (list[tempo] ?? 0) + 1);
  const maxTicks = spec.maxTicks ?? 60 * 60 * 30;
  const B = world.buildings;
  while (world.tick < maxTicks) {
    plan.tick(view);
    const key = typist?.key(world) ?? null;
    if (key !== null) queue.push(key);
    const commands = queue.splice(0).map((body) => ({ ...body, tick: world.tick }) as Command);
    run.log.push(...commands);
    step(world, commands);
    for (const event of world.events.rare) {
      if (event.t === "wordSpawn") tempoOf.set(event.word, world.words.tempo[world.words.slotOf(event.word)]!);
      else if (event.t === "wordHit" || event.t === "wordMiss") tally(event.t === "wordHit" ? run.doneByTempo : run.missedByTempo, tempoOf.get(event.word));
      else if (event.t === "rejected") run.rejected.push(event.command + ": " + event.reason);
      else if (event.t === "waveEnd") run.livesAtWaveEnd[event.wave] = world.lives;
      if (event.t === "wordHit" || event.t === "wordMiss" || event.t === "wordCancel") tempoOf.delete(event.word);
    }
    world.events.rare.length = 0;
    if (world.phase === "battle") {
      run.battleTicks += 1;
      if (world.enemies.count > 0) run.combatTicks += 1;
      const asked = wordsPerMinute(B.live().filter((b) => dealing(world, b)).map((b) => B.tempo[b]!));
      run.loadSum += asked / capacity(expectedE(world), world.typing.meanLen);
    }
    if (spec.check === true && run.problems.length < 20) run.problems.push(...wordProblems(world).map((p) => "tick " + world.tick + ": " + p));
    if (spec.hashEvery !== undefined && world.tick % spec.hashEvery === 0) run.hashes.push(hashHex(world));
    if (world.phase === "defeat" || (world.wave >= spec.waves && world.waveEnded[spec.waves] === 1)) break;
  }
  run.ticks = world.tick;
  run.stats = statsObject(world.stats);
  run.defeat = world.phase === "defeat";
  return run;
}

/** Steps a fresh world through a run's log, hashing every `every` ticks: a replay must give the run's hashes. */
export function replayHashes(spec: Pick<BotSpec, "seed" | "deck" | "expected" | "vocab" | "difficulty" | "hands">, log: readonly Command[], ticks: number, every: number): string[] {
  const world = createWorld({ seed: spec.seed, deck: spec.deck, expected: spec.expected ?? spec.hands?.wpm ?? 35, vocab: spec.vocab, difficulty: spec.difficulty });
  const hashes: string[] = [];
  let next = 0;
  while (world.tick < ticks) {
    const from = next;
    while (next < log.length && log[next]!.tick === world.tick) next += 1;
    step(world, log.slice(from, next));
    world.events.rare.length = 0;
    if (world.tick % every === 0) hashes.push(hashHex(world));
  }
  return hashes;
}
