/**
 * The Typing Defense bot (docs/td/BUILD_NOW.md §6.3, TK 19.1; BUILD_1A6 §12): a plan (what to build, where the
 * helpers stand, trees, villagers, the night call, the hero following the calls) and a typist (eyes that see a
 * call's word late and pick one, hands with a speed, an accuracy and a Backspace habit) play a world tick by tick
 * through the same commands a player sends. Every command is logged, so a run replays; the bot's own randomness
 * comes from a seed of its own and never touches the world's. A run may check the call invariants every tick
 * (BUILD_1A6 §12 gate 6). R3 grows this into the report's bots.
 */
import { createRng } from "../../src/platform/rng";
import { MODES, TICK_HZ } from "../../src/td/content/rules";
import type { Mode } from "../../src/td/content/types";
import type { Command, CommandBody } from "../../src/td/sim/commands";
import { hashHex } from "../../src/td/sim/hash";
import { statsObject, type StatName } from "../../src/td/sim/stats";
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
  maxTicks?: number;
};

export type BotRun = {
  world: World;
  log: Command[];
  hashes: string[];
  stats: Record<StatName, number>;
  ticks: number;
  /** Ticks with a lock, by phase: day, night. */
  typedTicks: [number, number];
  phaseTicks: [number, number];
  /** Lives left as each night ended (index: wave). */
  livesAtWaveEnd: number[];
  /** Commands the world refused (reason), and invariant breaks. */
  rejected: string[];
  problems: string[];
  defeat: boolean;
};

/** Eyes and hands: one key a tick at most, when the hands are free and there is something to type. */
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

  /** The letter to aim at: the locked word's next; else the first of the word the eyes pick. */
  private aim(w: World): number {
    const { router, deck } = w.typing;
    const W = w.words;
    const letterOf = (s: number, k: number): number => deck.letters[deck.start[W.word[s]!]! + k]!;
    if (router.lock >= 0) return letterOf(router.lock, W.typed[router.lock]!);
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

export function runBot(spec: BotSpec): BotRun {
  const world = worldOf(spec);
  const bot = createRng(spec.botSeed ?? spec.seed);
  const typist = spec.hands === null ? null : new Typist(new Keystrokes(spec.hands, bot.ai), new Reader(bot.props));
  const plan = spec.plan();
  const queue: CommandBody[] = [];
  const view = { w: world, send: (body: CommandBody) => void queue.push(body) };
  const run: BotRun = {
    world, log: [], hashes: [], stats: statsObject(world.stats), ticks: 0, typedTicks: [0, 0], phaseTicks: [0, 0], livesAtWaveEnd: [], rejected: [], problems: [], defeat: false,
  };
  const maxTicks = spec.maxTicks ?? 60 * 60 * 30;
  while (world.tick < maxTicks) {
    plan.tick(view);
    const key = typist?.key(world) ?? null;
    if (key !== null) queue.push(key);
    const commands = queue.splice(0).map((body) => ({ ...body, tick: world.tick }) as Command);
    run.log.push(...commands);
    const phase = world.phase === "night" ? 1 : 0;
    step(world, commands);
    run.phaseTicks[phase] += 1;
    if (world.typing.router.lock >= 0) run.typedTicks[phase] += 1;
    for (const event of world.events.rare) {
      if (event.t === "rejected") run.rejected.push(event.command + ": " + event.reason);
      else if (event.t === "waveEnd") run.livesAtWaveEnd[event.wave] = world.lives;
    }
    world.events.rare.length = 0;
    if (spec.check === true && run.problems.length < 20) run.problems.push(...callProblems(world).map((p) => "tick " + world.tick + ": " + p));
    if (spec.hashEvery !== undefined && world.tick % spec.hashEvery === 0) run.hashes.push(hashHex(world));
    if (world.phase === "defeat" || (world.wave >= spec.nights && world.waveEnded[spec.nights] === 1)) break;
  }
  run.ticks = world.tick;
  run.stats = statsObject(world.stats);
  run.defeat = world.phase === "defeat";
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
