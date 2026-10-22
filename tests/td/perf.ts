/**
 * Worlds under load for the step-time measures (docs/td/BUILD_NOW.md §7 gate
 * 5, TK 25.12): ten buildings (six archers, three barracks, a mine), the
 * Bastion, two archers and the mine dealing a word a second with an agent
 * each on the real vocabulary, and `enemies` spread along every route with
 * hit points no shot ends, `shots` already in flight. td-sim-perf gates it,
 * `pnpm td:balance` prints it.
 */
import { STAT } from "../../src/td/sim/stats";
import { step, type World } from "../../src/td/sim/world";
import { tempoIndex } from "../../src/td/typing/tempo";
import { arrive, build, enemyAt, ready, send, world } from "./fixtures";
import { realDeck } from "./typing";

export function loadedWorld(enemies: number, shots: number): World {
  const w = world({ gold: 5000, deck: realDeck() });
  send(w, { t: "sandbox", op: { op: "keepLevel", value: 4 } });
  for (const [x, z] of [[-18, -20], [-18, -8], [-8, -16], [-8, -8], [7, -25], [10, -8]] as const) build(w, "archer", x, z);
  for (const [x, z] of [[2, 18], [8, 12], [-10, 16]] as const) build(w, "barracks", x, z);
  const mine = build(w, "gold-mine", 26, -30);
  ready(w);
  [0, w.buildings.live(1)[0]!, w.buildings.live(1)[1]!, mine].forEach((b, agent) => {
    send(w, { t: "assignUnit", agent, building: w.buildings.id(b) });
    send(w, { t: "setTempo", building: w.buildings.id(b), idx: tempoIndex(1) });
  });
  arrive(w);
  w.phase = "battle";
  w.lives = 1e6;
  const ids = ["cuong-thi", "ma-troi", "thuong-luong"];
  for (let index = 0; index < enemies; index += 1) {
    const id = ids[index % 3]!;
    const route = id === "ma-troi" ? w.lanes.length - 1 : index % 2;
    const slot = enemyAt(w, id, route, 5 + ((index * 0.37) % 90));
    w.enemies.hp[slot] = 1e7;
  }
  for (let index = 0; index < shots; index += 1) {
    const target = (index * 7) % enemies;
    const shot = w.projectiles.add(0, -40 + (index % 20), -40 + Math.floor(index / 20), w.enemies.id(target), 0, 0, 0.001, 0);
    w.projectiles.power[shot] = 1;
  }
  return w;
}

/** Milliseconds per step over `ticks` steps after `warm` warm-up steps: median, 95th percentile, worst. */
export function stepCost(w: World, ticks: number, warm: number): { median: number; p95: number; max: number; words: number } {
  const times: number[] = [];
  for (let tick = 0; tick < warm + ticks; tick += 1) {
    const start = performance.now();
    step(w);
    if (tick >= warm) times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return { median: times[times.length >> 1]!, p95: times[Math.floor(times.length * 0.95)]!, max: times[times.length - 1]!, words: w.stats[STAT.streamSpawned]! };
}
