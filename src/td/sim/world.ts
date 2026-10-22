/**
 * The Typing Defense world and its fixed 60 Hz step, in the system order of
 * docs/td/TYPING_DEFENSE_DESIGN.md 25.6 (BUILD_1A6: the workers at step 10,
 * the attention director at 11, day and night at 17). Pure TypeScript: no
 * clock, no DOM, randomness only from the named seeded streams. The same
 * seed, content and command log give the same world on Node and in every browser.
 */
import { createRng, type Rng } from "../../platform/rng";
import { compile, ticks, type Compiled } from "../content/compile";
import { CALL, ECONOMY, EXPECTED, MODES, STORE, VILLAGERS } from "../content/rules";
import { SLICE_1A } from "../content/slice-1a";
import type { Content, MapDef, Mode } from "../content/types";
import { compileDeck, type Deck } from "../typing/decks";
import { Letters } from "../typing/letters";
import type { Bag } from "../typing/picker";
import type { Router } from "../typing/router";
import { applyCommand, placeBuilding, type Command } from "./commands";
import { Events } from "./events";
import { groundLanes, Lane } from "./lanes";
import { WalkGrid } from "./nav/grid";
import { createStats } from "./stats";
import { AgentStore } from "./stores/agents";
import { BuildingStore } from "./stores/buildings";
import { CallStore } from "./stores/calls";
import { EnemyStore } from "./stores/enemies";
import { NpcStore } from "./stores/npcs";
import { ProjectileStore } from "./stores/projectiles";
import { TreeStore } from "./stores/trees";
import { UnitStore } from "./stores/units";
import { WordStore } from "./stores/words";
import { agentsStep, heroAttack, home } from "./systems/agents";
import { attentionStep } from "./systems/attention";
import { soldiersStep } from "./systems/block";
import { meleeStep, statusStep, towersAttack } from "./systems/combat";
import { deathsStep } from "./systems/deaths";
import { addVillager, economyStep, staffBuilders } from "./systems/economy";
import { moveEnemies } from "./systems/move";
import { projectilesStep } from "./systems/projectile";
import { fireWordShots } from "./systems/rewards";
import { spawnEnemies } from "./systems/spawn";
import { phaseStep } from "./systems/waves";

export type Phase = "day" | "night" | "dawn" | "defeat";

export type QueuedSpawn = { tick: number; enemy: number; route: number; wave: number };

/** A Word Shot (or a Bastion volley) a power word finished in step 1 asks for; fired in step 7 of the same tick. */
export type PendingShot = { b: number; power: number; crit: boolean; word: number; burn: boolean; bolt: boolean };

/**
 * The typing state of a run (TK 25.8): bags by the band's top length (a power
 * word takes a shorter band); the chain; the shots words asked for this tick;
 * a ring of the last 20 s, 1 for each tick with a lock, with its sum
 * (BUILD_1A6 §5.3); the review book, deck words oldest first (§7).
 */
function createTyping(deck: Deck) {
  return {
    deck, letters: new Letters(), router: { lock: -1, group: -1 } as Router, bags: [] as (Bag | undefined)[],
    chain: 0, shots: [] as PendingShot[], typed: new Uint8Array(ticks(CALL.windowS)), typedSum: 0, review: new Int32Array(CALL.review), reviewN: 0,
  };
}

export type Typing = ReturnType<typeof createTyping>;

export type World = {
  readonly c: Compiled;
  readonly map: MapDef;
  readonly seed: number;
  readonly sandbox: boolean;
  tick: number;
  phase: Phase;
  /** The day number (from 1; the night after day n is night n) and the tick the day or the dawn ends (−1 at night). */
  day: number;
  phaseEnd: number;
  readonly rng: Rng;
  /** Treasury, thousandths of gold (TK 25.4); wood, food, seeds and knowledge are whole (BUILD_1A6 §3). */
  gold: number;
  wood: number;
  food: number;
  seeds: number;
  knowledge: number;
  /** A farmer out of seeds buys one at 8 gold (§4.1). */
  autoSeeds: boolean;
  lives: number;
  mode: Mode;
  /** The typist's base speed B in WPM, set by the sandbox; E lifts it to the mode's floor (expectedE, TK 6.6). */
  expected: number;
  /** Vocabulary levels 1..vocab feed the decks. */
  vocab: number;
  /** Game speed the session steps at; logged, so a replay knows it. */
  speed: number;
  /** Last wave started (0: none yet). */
  wave: number;
  /** Per wave number: spawns still queued, enemies alive, ended (1). */
  readonly waveLeft: number[];
  readonly waveAlive: number[];
  readonly waveEnded: number[];
  readonly spawnQueue: QueuedSpawn[];
  /** Ground routes, then the flying route last. */
  readonly lanes: readonly Lane[];
  readonly grid: WalkGrid;
  readonly keepCell: number;
  readonly enemies: EnemyStore;
  readonly units: UnitStore;
  readonly buildings: BuildingStore;
  readonly projectiles: ProjectileStore;
  readonly words: WordStore;
  readonly agents: AgentStore;
  readonly npcs: NpcStore;
  readonly trees: TreeStore;
  readonly calls: CallStore;
  readonly typing: Typing;
  readonly stats: Float64Array;
  readonly events: Events;
};

/** `deck`: the compiled vocabulary (levels 1–5); none deals no word. */
export type WorldOptions = { seed: number; sandbox?: boolean; content?: Content; deck?: Deck; gold?: number; wood?: number; mode?: Mode; expected?: number; vocab?: number };

export function createWorld(options: WorldOptions): World {
  const c = compile(options.content ?? SLICE_1A);
  const map = c.content.map;
  const grid = new WalkGrid(map);
  const mode = options.mode ?? "balanced";
  const w: World = {
    c,
    map,
    seed: options.seed >>> 0,
    sandbox: options.sandbox ?? true,
    tick: 0,
    phase: "day",
    day: 1,
    phaseEnd: ticks(MODES[mode].dayS),
    rng: createRng(options.seed),
    gold: (options.gold ?? ECONOMY.start.gold) * 1000,
    wood: options.wood ?? ECONOMY.start.wood,
    food: ECONOMY.start.food,
    seeds: ECONOMY.start.seeds,
    knowledge: 0,
    autoSeeds: true,
    lives: ECONOMY.lives,
    mode,
    expected: options.expected ?? EXPECTED.default,
    vocab: options.vocab ?? 3,
    speed: 1,
    wave: 0,
    waveLeft: [],
    waveAlive: [],
    waveEnded: [],
    spawnQueue: [],
    lanes: [...groundLanes(map.routes), new Lane(map.flyRoute)],
    grid,
    keepCell: grid.cell(map.keep[0], map.keep[1]),
    enemies: new EnemyStore(STORE.enemies),
    units: new UnitStore(STORE.soldiers),
    buildings: new BuildingStore(STORE.buildings),
    projectiles: new ProjectileStore(STORE.projectiles),
    words: new WordStore(STORE.words),
    agents: new AgentStore(STORE.agents),
    npcs: new NpcStore(STORE.npcs),
    trees: new TreeStore(map.trees.length),
    calls: new CallStore(STORE.calls),
    typing: createTyping(options.deck ?? compileDeck([])),
    stats: createStats(),
    events: new Events(),
  };
  placeBuilding(w, 0, map.keep[0], map.keep[1], -1, true);
  for (let agent = 0; agent <= c.content.helpers.length; agent += 1) w.agents.add(home(w, agent));
  for (let k = 0; k < VILLAGERS.start; k += 1) addVillager(w);
  staffBuilders(w);
  return w;
}

/** One tick. `commands` are this tick's, in the order they were sent. */
export function step(w: World, commands: readonly Command[] = []): void {
  if (w.phase === "defeat") {
    w.tick += 1;
    return;
  }
  for (const command of commands) applyCommand(w, command); // 1: keys route; finished words push their work
  spawnEnemies(w); // 2
  agentsStep(w); // 3
  moveEnemies(w); // 4
  soldiersStep(w); // 5
  towersAttack(w); // 6–7: targets, shots (a power charge spent)
  fireWordShots(w); // 7: Word Shots waiting
  heroAttack(w); // 7: the hero's fireballs
  meleeStep(w); // 7: melee
  projectilesStep(w); // 8
  statusStep(w); // 9
  economyStep(w); // 10: farms, trees, sites, mines, power calls, quizzes
  attentionStep(w); // 11: calls open, light, get words
  deathsStep(w); // 15
  phaseStep(w); // 17
  w.tick += 1;
}

/** Steps until `tick`, feeding each tick the logged commands stamped with it (a replay). */
export function runLog(w: World, log: readonly Command[], tick: number): void {
  let next = 0;
  while (next < log.length && log[next]!.tick < w.tick) next += 1;
  while (w.tick < tick) {
    const from = next;
    while (next < log.length && log[next]!.tick === w.tick) next += 1;
    step(w, log.slice(from, next));
  }
}
