/**
 * The Typing Defense bot (docs/td/BUILD_NOW.md §6.3, TK 19.1; BUILD_1A6 §12): a plan (what to build, the Bastion's
 * level bought with gold, trees, villagers, where the hero and the helpers stand, day and night) and a typist (eyes
 * that see a bright call's word late and pick one, hands with a speed, an accuracy and a Backspace habit) play a
 * world tick by tick through the same commands a player sends. Every command is logged, so a run replays; the bot's
 * own randomness comes from a seed of its own and never touches the world's. A run meters what the report reads:
 * typing ticks by day and night (and by day number), the director's 20 s typing count at its highest, what was
 * earned (gold from every source, wood, food, knowledge) at each nightfall and dawn, what became of the calls, and
 * the cost of a step; it may check the call invariants every tick (§12 gate 6).
 */
import { createRng } from "../../src/platform/rng";
import { MODES, TICK_HZ } from "../../src/td/content/rules";
import type { Mode } from "../../src/td/content/types";
import type { Command, CommandBody } from "../../src/td/sim/commands";
import { hashHex } from "../../src/td/sim/hash";
import { STAT, statsObject, type StatName } from "../../src/td/sim/stats";
import { CALL_STATE } from "../../src/td/sim/stores/calls";
import { createWorld, step, type World } from "../../src/td/sim/world";
import { wordText, type Deck } from "../../src/td/typing/decks";
import { withinOneEdit } from "../../src/td/typing/distance";
import { Keystrokes, type HandsSpec } from "./keystrokes";
import { Plan } from "./policies/stand";
import { Reader } from "./reader";

const STEP_MS = 1000 / TICK_HZ;

export type BotSpec = {
  seed: number;
  deck: Deck;
  /** null: never types. */
  hands: HandsSpec | null;
  /** Made fresh for each run: a plan keeps state. */
  plan: () => Plan;
  /** Stop when this night has ended (or the Bastion falls). */
  nights: number;
  /** E, the sandbox's expected speed: the hands' WPM by default (35 without hands). */
  expected?: number;
  vocab?: number;
  mode?: Mode;
  /** Seed of the bot's eyes and hands (the run seed by default). */
  botSeed?: number;
  /** Hash the world every this many ticks (the golden test: 60). */
  hashEvery?: number;
  /** Check the call invariants every tick. */
  check?: boolean;
  /** Time every step (performance.now): the report's sim cost. */
  timeSteps?: boolean;
  maxTicks?: number;
};

/** Resources earned since the start (not spent, not the starting stock): gold from every source, wood, food, knowledge. */
export type Earned = { gold: number; wood: number; food: number; knowledge: number };

/** What became of the calls that ended: made, lit at least once, a word typed, finished by a typed word, whole Perfect, lit but left untyped, never lit. */
export type CallTally = { made: number; bright: number; typed: number; finished: number; perfect: number; ignored: number; dark: number };

export type BotRun = {
  world: World;
  log: Command[];
  hashes: string[];
  stats: Record<StatName, number>;
  ticks: number;
  /** Ticks with a lock, and ticks, by phase: day, night (dawn in neither). */
  typedTicks: [number, number];
  phaseTicks: [number, number];
  /** The same by day number (index n: day n, night n). */
  byDay: { dayTyped: number; dayTicks: number; nightTyped: number; nightTicks: number }[];
  /** The director's count of typing ticks in the last 20 s (BUILD_1A6 §5.3), at its highest, and the tick it was. */
  windowMax: number;
  windowAt: number;
  /** Earned so far when night n falls (index n) and when day n begins (index n; 1 is the start). */
  atNightfall: Earned[];
  atDawn: Earned[];
  calls: CallTally;
  callsByKind: CallTally[];
  /** Milliseconds a step: mean, 95th percentile, worst (timeSteps only). */
  stepMs: { mean: number; p95: number; max: number } | null;
  /** Lives left as each night ended (index: wave). */
  livesAtWaveEnd: number[];
  /** Commands the world refused (reason), and invariant breaks. */
  rejected: string[];
  problems: string[];
  defeat: boolean;
};

/** Eyes and hands: one key a tick at most, when the hands are free and there is something seen to type. */
class Typist {
  private handsAt = 0;
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

  /** The letter to aim at: the locked word's next once it is read; else the first of the word the eyes pick. */
  private aim(w: World): number {
    const { router, deck } = w.typing;
    const W = w.words;
    const letterOf = (s: number, k: number): number => deck.letters[deck.start[W.word[s]!]! + k]!;
    if (router.lock >= 0) return this.eyes.seen(w, router.lock) ? letterOf(router.lock, W.typed[router.lock]!) : -1;
    const s = this.eyes.pick(w, this.hands.meanMs);
    return s >= 0 ? letterOf(s, 0) : -1;
  }
}

/** §12 gate 6 and TK 6.5: bright ≤ cap; only bright calls hold a word, each its own; distinct first letters, no twins, nothing one edit apart; the lock on a bright call's word. */
export function callProblems(w: World): string[] {
  const W = w.words;
  const C = w.calls;
  const { deck } = w.typing;
  const out: string[] = [];
  const bright = C.live().filter((c) => C.bright[c] === 1).length;
  if (bright > MODES[w.mode].open) out.push(bright + " bright calls");
  for (const c of C.live()) if (C.bright[c] === 1 && C.state[c] !== CALL_STATE.open) out.push("call " + c + " is bright and queued");
  for (const c of C.live()) if (C.word[c]! >= 0 && (C.bright[c] !== 1 || W.call[C.word[c]!] !== c)) out.push("call " + c + " holds a word it should not");
  const live = W.live();
  const texts = live.map((s) => wordText(deck, W.word[s]!));
  if (new Set(texts.map((text) => text[0])).size !== texts.length) out.push("first letters " + texts.join(" / "));
  for (let i = 0; i < live.length; i += 1) {
    if (C.word[W.call[live[i]!]!] !== live[i]) out.push("word " + texts[i] + " without its call");
    for (let j = i + 1; j < live.length; j += 1) {
      const start = (k: number) => deck.start[W.word[live[k]!]!]!;
      if (texts[i] === texts[j]) out.push("twins " + texts[i]);
      else if (withinOneEdit(deck.letters, start(i), texts[i]!.length, start(j), texts[j]!.length)) out.push("one edit " + texts[i] + " / " + texts[j]);
    }
  }
  const lock = w.typing.router.lock;
  if (lock >= 0 && C.bright[W.call[lock]!] !== 1) out.push("the lock is on a word of no bright call");
  return out;
}

const worldOf = (spec: Pick<BotSpec, "seed" | "deck" | "expected" | "vocab" | "mode" | "hands">): World =>
  createWorld({ seed: spec.seed, deck: spec.deck, expected: spec.expected ?? spec.hands?.wpm ?? 35, vocab: spec.vocab, mode: spec.mode });

/** What the world has earned so far (Earned). */
export function earned(w: World): Earned {
  const s = w.stats;
  const gold = s[STAT.goldKill]! + s[STAT.goldProduce]! + s[STAT.goldWave]! + s[STAT.goldEarly]! + s[STAT.goldWord]!;
  return { gold: gold / 1000, wood: s[STAT.wood]!, food: s[STAT.food]!, knowledge: w.knowledge };
}

const tally = (): CallTally => ({ made: 0, bright: 0, typed: 0, finished: 0, perfect: 0, ignored: 0, dark: 0 });

/** Reads a tick's rare events into the run: refusals, lives at a night's end, nightfall and dawn, the calls' lives. */
class Meter {
  private readonly open = new Map<number, { kind: number; bright: boolean; typed: number }>();

  constructor(private readonly run: BotRun) {}

  read(w: World): void {
    const run = this.run;
    for (const event of w.events.rare) {
      if (event.t === "rejected") run.rejected.push(event.command + ": " + event.reason);
      else if (event.t === "waveEnd") run.livesAtWaveEnd[event.wave] = w.lives;
      else if (event.t === "phase" && event.phase === "night") run.atNightfall[event.day] = earned(w);
      else if (event.t === "phase" && event.phase === "day") run.atDawn[event.day] = earned(w);
      else if (event.t === "call" && event.state === "made") this.open.set(event.call, { kind: event.kind, bright: false, typed: 0 });
      else if (event.t === "call" && event.state === "bright") this.open.get(event.call)!.bright = true;
      else if (event.t === "wordHit") this.open.get(event.call)!.typed += 1;
      else if (event.t === "callEnd") {
        const call = this.open.get(event.call)!;
        this.open.delete(event.call);
        for (const into of [run.calls, (run.callsByKind[call.kind] ??= tally())]) {
          into.made += 1;
          if (call.bright) into.bright += 1;
          else into.dark += 1;
          if (call.typed > 0) into.typed += 1;
          else if (call.bright) into.ignored += 1;
          if (event.finished && call.typed > 0) into.finished += 1;
          if (event.perfect) into.perfect += 1;
        }
      }
    }
    w.events.rare.length = 0;
  }
}

export function runBot(spec: BotSpec): BotRun {
  const world = worldOf(spec);
  const bot = createRng(spec.botSeed ?? spec.seed);
  const typist = spec.hands === null ? null : new Typist(new Keystrokes(spec.hands, bot.ai), new Reader(bot.props));
  const plan = spec.plan();
  const queue: CommandBody[] = [];
  const view = { w: world, send: (body: CommandBody) => void queue.push(body) };
  const run: BotRun = {
    world, log: [], hashes: [], stats: statsObject(world.stats), ticks: 0, typedTicks: [0, 0], phaseTicks: [0, 0], byDay: [], windowMax: 0, windowAt: 0,
    atNightfall: [], atDawn: [], calls: tally(), callsByKind: [], stepMs: null, livesAtWaveEnd: [], rejected: [], problems: [], defeat: false,
  };
  run.atDawn[1] = earned(world);
  const meter = new Meter(run);
  const times: number[] = [];
  const maxTicks = spec.maxTicks ?? 60 * 60 * 30;
  while (world.tick < maxTicks) {
    plan.tick(view);
    const key = typist?.key(world) ?? null;
    if (key !== null) queue.push(key);
    const commands = queue.splice(0).map((body) => ({ ...body, tick: world.tick }) as Command);
    run.log.push(...commands);
    const phase = world.phase;
    const day = (run.byDay[world.day] ??= { dayTyped: 0, dayTicks: 0, nightTyped: 0, nightTicks: 0 });
    const started = spec.timeSteps === true ? performance.now() : 0;
    step(world, commands);
    if (spec.timeSteps === true) times.push(performance.now() - started);
    const typed = world.typing.router.lock >= 0 ? 1 : 0;
    if (phase === "day" || phase === "night") {
      const k = phase === "day" ? 0 : 1;
      run.phaseTicks[k] += 1;
      run.typedTicks[k] += typed;
      if (k === 0) [day.dayTicks, day.dayTyped] = [day.dayTicks + 1, day.dayTyped + typed];
      else [day.nightTicks, day.nightTyped] = [day.nightTicks + 1, day.nightTyped + typed];
    }
    if (world.typing.typedSum > run.windowMax) [run.windowMax, run.windowAt] = [world.typing.typedSum, world.tick];
    meter.read(world);
    if (spec.check === true && run.problems.length < 20) run.problems.push(...callProblems(world).map((p) => "tick " + world.tick + ": " + p));
    if (spec.hashEvery !== undefined && world.tick % spec.hashEvery === 0) run.hashes.push(hashHex(world));
    if (world.phase === "defeat" || (world.wave >= spec.nights && world.waveEnded[spec.nights] === 1)) break;
  }
  run.ticks = world.tick;
  run.stats = statsObject(world.stats);
  run.defeat = world.phase === "defeat";
  if (times.length > 0) {
    const mean = times.reduce((sum, t) => sum + t, 0) / times.length;
    times.sort((a, b) => a - b);
    run.stepMs = { mean, p95: times[Math.floor(times.length * 0.95)]!, max: times[times.length - 1]! };
  }
  return run;
}

/** Steps a fresh world through a run's log, hashing every `every` ticks: a replay must give the run's hashes. */
export function replayHashes(spec: Pick<BotSpec, "seed" | "deck" | "expected" | "vocab" | "mode" | "hands">, log: readonly Command[], ticks: number, every: number): string[] {
  const world = worldOf(spec);
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
