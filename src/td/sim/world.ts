/**
 * The Typing Defense world and its fixed 60 Hz step, in the system order of
 * docs/td/TYPING_DEFENSE_DESIGN.md 25.6. Pure TypeScript: no clock, no DOM,
 * randomness only from the named seeded streams. The same seed, content and
 * command log give the same world on Node and in every browser.
 * 1A.1 runs the combat half; agents (step 3) and the word stream and heat
 * (steps 11–12) join in the next milestones.
 */
import { createRng, type Rng } from "../../platform/rng";
import { compile, type Compiled } from "../content/compile";
import { ECONOMY, EXPECTED, STORE } from "../content/rules";
import { SLICE_1A } from "../content/slice-1a";
import type { Content, Difficulty, MapDef } from "../content/types";
import { applyCommand, placeBuilding, type Command } from "./commands";
import { Events } from "./events";
import { Lane } from "./lanes";
import { WalkGrid } from "./nav/grid";
import { createStats } from "./stats";
import { BuildingStore } from "./stores/buildings";
import { EnemyStore } from "./stores/enemies";
import { ProjectileStore } from "./stores/projectiles";
import { UnitStore } from "./stores/units";
import { meleeStep, towersAttack } from "./systems/combat";
import { deathsStep } from "./systems/deaths";
import { moveEnemies } from "./systems/move";
import { soldiersStep } from "./systems/block";
import { productionStep } from "./systems/production";
import { projectilesStep } from "./systems/projectile";
import { spawnEnemies } from "./systems/spawn";
import { wavesStep } from "./systems/waves";

export type Phase = "prep" | "battle" | "defeat";

export type QueuedSpawn = { tick: number; enemy: number; route: number; wave: number };

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
  readonly stats: Float64Array;
  readonly events: Events;
};

export type WorldOptions = { seed: number; sandbox?: boolean; content?: Content; gold?: number; difficulty?: Difficulty; expected?: number; vocab?: number };

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
    lanes: [...map.routes, map.flyRoute].map((points) => new Lane(points)),
    grid,
    keepCell: grid.cell(map.keep[0], map.keep[1]),
    enemies: new EnemyStore(STORE.enemies),
    units: new UnitStore(STORE.soldiers),
    buildings: new BuildingStore(STORE.buildings),
    projectiles: new ProjectileStore(STORE.projectiles),
    stats: createStats(),
    events: new Events(),
  };
  placeBuilding(w, 0, map.keep[0], map.keep[1], -1, 0);
  return w;
}

/** One tick. `commands` are this tick's, in the order they were sent. */
export function step(w: World, commands: readonly Command[] = []): void {
  if (w.phase === "defeat") {
    w.tick += 1;
    return;
  }
  for (const command of commands) applyCommand(w, command); // 1
  spawnEnemies(w); // 2
  moveEnemies(w); // 4
  soldiersStep(w); // 5
  towersAttack(w); // 6–7: targets (aura from the last tick), shots
  meleeStep(w); // 7: melee
  projectilesStep(w); // 8
  productionStep(w); // 10
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
