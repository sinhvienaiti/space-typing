/**
 * The Typing Defense world and its fixed 60 Hz step, in the system order of
 * docs/td/TYPING_DEFENSE_DESIGN.md 25.6. Pure TypeScript: no clock, no DOM,
 * randomness only from the named seeded streams. The same seed, content and
 * command log give the same world on Node and in every browser.
 * Agents (step 3) join in 1A.3; until then an assigned agent is at its
 * building at once.
 */
import { createRng, type Rng } from "../../platform/rng";
import { compile, type Compiled } from "../content/compile";
import { ECONOMY, EVENNESS, EXPECTED, STORE } from "../content/rules";
import { SLICE_1A } from "../content/slice-1a";
import type { Content, Difficulty, MapDef } from "../content/types";
import { compileDeck, type Deck } from "../typing/decks";
import { Letters } from "../typing/letters";
import type { Bag } from "../typing/picker";
import type { Router } from "../typing/router";
import { applyCommand, placeBuilding, type Command } from "./commands";
import { Events } from "./events";
import { groundLanes, Lane } from "./lanes";
import { WalkGrid } from "./nav/grid";
import { createStats } from "./stats";
import { BuildingStore } from "./stores/buildings";
import { EnemyStore } from "./stores/enemies";
import { ProjectileStore } from "./stores/projectiles";
import { UnitStore } from "./stores/units";
import { WordStore } from "./stores/words";
import { auraStep } from "./systems/aura";
import { meleeStep, statusStep, towersAttack } from "./systems/combat";
import { deathsStep } from "./systems/deaths";
import { moveEnemies } from "./systems/move";
import { soldiersStep } from "./systems/block";
import { productionStep } from "./systems/production";
import { heatStep } from "./systems/heat";
import { projectilesStep } from "./systems/projectile";
import { fireWordShots } from "./systems/rewards";
import { spawnEnemies } from "./systems/spawn";
import { configureDeck, setTempo, startTempo, streamStep } from "./systems/stream";
import { wavesStep } from "./systems/waves";

export type Phase = "prep" | "battle" | "defeat";

export type QueuedSpawn = { tick: number; enemy: number; route: number; wave: number };

/** A Word Shot (or a Bastion bolt) a word finished in step 1 asks for; fired in step 7 of the same tick. */
export type PendingShot = { b: number; power: number; crit: boolean; word: number; burn: boolean; bolt: boolean };

/**
 * The typing state of a run (TK 25.8). Bags go by the band's top length (a
 * dense tempo cuts it); a, cap and meanLen follow E and the vocabulary;
 * lastSpawn is the last deal anywhere (the 0.2 s spacing); keyMs rings the
 * last key times for the evenness C; tempoByDef is the tempo last chosen per
 * building kind (0: none yet).
 */
function createTyping(deck: Deck, defs: number) {
  return {
    deck, letters: new Letters(), router: { lock: -1, group: -1 } as Router, bags: [] as (Bag | undefined)[],
    a: 0, cap: 0, meanLen: 0, streamLive: 0, lastSpawn: -1e6, chain: 0, graceUntil: 0, graceReadyAt: 0, allStopped: false,
    keyMs: new Float64Array(EVENNESS.gaps + 1), keys: 0, tempoByDef: new Uint8Array(defs), shots: [] as PendingShot[],
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
  readonly rng: Rng;
  /** Treasury, thousandths of gold (TK 25.4). */
  gold: number;
  lives: number;
  difficulty: Difficulty;
  /** Expected speed E in WPM (TK 6.6), set by the sandbox in 1A. */
  expected: number;
  /** Vocabulary levels 1..vocab feed the decks. */
  vocab: number;
  /** Game speed the session steps at; logged, so a replay knows it. */
  speed: number;
  /** Last wave started (0: none yet); the next one starts at `nextWaveAt` (−1: not counting). */
  wave: number;
  nextWaveAt: number;
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
  readonly typing: Typing;
  readonly stats: Float64Array;
  readonly events: Events;
};

/** `deck`: the compiled vocabulary (levels 1–5); none deals no word. */
export type WorldOptions = { seed: number; sandbox?: boolean; content?: Content; deck?: Deck; gold?: number; difficulty?: Difficulty; expected?: number; vocab?: number };

export const KEEP_SLOT = 0;

export function createWorld(options: WorldOptions): World {
  const c = compile(options.content ?? SLICE_1A);
  const map = c.content.map;
  const grid = new WalkGrid(map);
  const w: World = {
    c,
    map,
    seed: options.seed >>> 0,
    sandbox: options.sandbox ?? true,
    tick: 0,
    phase: "prep",
    rng: createRng(options.seed),
    gold: (options.gold ?? ECONOMY.startGold) * 1000,
    lives: ECONOMY.lives,
    difficulty: options.difficulty ?? "normal",
    expected: options.expected ?? EXPECTED.default,
    vocab: options.vocab ?? 3,
    speed: 1,
    wave: 0,
    nextWaveAt: -1,
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
    typing: createTyping(options.deck ?? compileDeck([]), c.buildings.length),
    stats: createStats(),
    events: new Events(),
  };
  configureDeck(w);
  placeBuilding(w, 0, map.keep[0], map.keep[1], -1, 0);
  setTempo(w, 0, startTempo(w, 0), false);
  return w;
}

/** One tick. `commands` are this tick's, in the order they were sent. */
export function step(w: World, commands: readonly Command[] = []): void {
  if (w.phase === "defeat") {
    w.tick += 1;
    return;
  }
  for (const command of commands) applyCommand(w, command); // 1: keys route; finished words pay
  spawnEnemies(w); // 2
  moveEnemies(w); // 4
  soldiersStep(w); // 5
  towersAttack(w); // 6–7: targets (aura from the last tick), shots
  fireWordShots(w); // 7: Word Shots waiting
  meleeStep(w); // 7: melee
  projectilesStep(w); // 8
  statusStep(w); // 9
  productionStep(w); // 10
  streamStep(w); // 11
  heatStep(w); // 12
  auraStep(w); // 12
  deathsStep(w); // 15
  wavesStep(w); // 17
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
