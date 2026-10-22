/**
 * Worlds under load for the step-time measures (docs/td/BUILD_NOW.md §7 gate
 * 5, TK 25.12): ten buildings (six archers, three barracks, a mine), the
 * Bastion, two archers and the mine dealing a word a second with an agent
 * each on the real vocabulary, and `enemies` spread along every route with
 * hit points no shot ends, `shots` already in flight. The full world is TK
 * 25.12's: ten buildings more past the 1A caps and 64 soldiers. td-sim-perf
 * gates them, `pnpm td:balance` prints them.
 */
import { CAP, STORE } from "../../src/td/content/rules";
import { placeBuilding } from "../../src/td/sim/commands";
import { STAT } from "../../src/td/sim/stats";
import { addTempSoldier } from "../../src/td/sim/systems/block";
import { step, type World } from "../../src/td/sim/world";
import { tempoIndex } from "../../src/td/typing/tempo";
import { arrive, build, enemyAt, ready, send, world } from "./fixtures";
import { realDeck } from "./typing";

/** Spots canPlace takes once the ten of loadedWorld stand, but for the 1A caps (16 buildings, 6 towers, 3 barracks). */
const MORE = [
  ["gold-mine", -12, 32], ["gold-mine", -34, 8],
  ["cannon", -16, 8], ["cannon", 14, 26], ["cannon", 24, -12], ["cannon", 22, -6],
  ["barracks", 20, -24], ["barracks", -14, 24], ["barracks", 4, 2], ["barracks", 16, -32],
] as const;

export function loadedWorld(enemies: number, shots: number, full = false): World {
  const w = world({ gold: 5000, deck: realDeck() });
  send(w, { t: "sandbox", op: { op: "keepLevel", value: 4 } });
  for (const [x, z] of [[-18, -20], [-18, -8], [-8, -16], [-8, -8], [7, -25], [10, -8]] as const) build(w, "archer", x, z);
  for (const [x, z] of [[2, 18], [8, 12], [-10, 16]] as const) build(w, "barracks", x, z);
  const mine = build(w, "gold-mine", 26, -30);
  for (const [id, x, z] of full ? MORE : []) placeBuilding(w, w.c.buildingIndex(id), x, z, w.map.nodes.findIndex((n) => n.x === x && n.z === z), 0);
  ready(w);
  if (full) {
    // The squads, then extra soldiers (the five-good-words kind, TK 6.11) round the barracks up to the cap; none falls in the measure.
    const barracks = w.buildings.live(1).filter((b) => w.c.buildings[w.buildings.def[b]!]!.barracks !== null);
    for (let k = 0; w.units.count < CAP.soldiers; k += 1) addTempSoldier(w, barracks[k % barracks.length]!, 2, 1e9);
    for (const s of w.units.live()) w.units.hp[s] = 1e6;
  }
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

/** TK 25.12: the stores' 640 enemies and 512 shots, 20 buildings and the Bastion, 64 soldiers, 4 slots at 1 s. */
export const fullWorld = (): World => loadedWorld(STORE.enemies, STORE.projectiles, true);

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
