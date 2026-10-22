/**
 * Worlds under load for the step-time measures (docs/td/BUILD_NOW.md §7 gate 5, TK 25.12, BUILD_1A6 §12 gate 3):
 * ten buildings (six archers, three barracks, a mine) and four farms, all built, the Bastion at level 4 with its
 * four builders, nine villagers chopping twenty marked trees, the helpers out among them, the hero by the
 * merge with calls bright around him on the real vocabulary, and `enemies` spread along every route with hit
 * points no shot ends, `shots` already in flight, at night (power calls). The full world is TK 25.12's: ten
 * buildings more past the 1A caps and 64 soldiers. td-sim-perf gates them.
 */
import { CAP, STORE } from "../../src/td/content/rules";
import { placeBuilding } from "../../src/td/sim/commands";
import { STAT } from "../../src/td/sim/stats";
import { NPC_KIND } from "../../src/td/sim/stores/npcs";
import { addVillager, countNpcs } from "../../src/td/sim/systems/economy";
import { step, type World } from "../../src/td/sim/world";
import { built, enemyAt, send, world } from "./fixtures";
import { realDeck } from "./typing";

/** Spots canPlace takes once the ten of loadedWorld stand, but for the 1A caps (16 buildings, 6 towers, 3 barracks). */
const MORE = [
  ["gold-mine", -12, 32], ["gold-mine", -34, 8],
  ["cannon", -16, 8], ["cannon", 14, 26], ["cannon", 24, -12], ["cannon", 22, -6],
  ["barracks", 20, -24], ["barracks", -14, 24], ["barracks", 4, 2], ["barracks", 16, -32],
] as const;
/** Four farms off the roads, clear of the trees and of each other. */
export const FARMS = [[-17, 40], [-30, 30], [-36, -6], [30, 6]] as const;

export function loadedWorld(enemies: number, shots: number, full = false): World {
  const w = world({ gold: 5000, deck: realDeck() });
  send(w, { t: "sandbox", op: { op: "keepLevel", value: 4 } });
  for (const [x, z] of [[-18, -14], [-18, -8], [-8, -16], [-8, -8], [7, -25], [10, -8]] as const) built(w, "archer", x, z);
  for (const [x, z] of [[2, 18], [8, 12], [-10, 16]] as const) built(w, "barracks", x, z);
  built(w, "gold-mine", 26, -30);
  for (const [x, z] of full ? [] : FARMS) built(w, "farm", x, z);
  for (const [id, x, z] of full ? MORE : []) placeBuilding(w, w.c.buildingIndex(id), x, z, w.map.nodes.findIndex((n) => n.x === x && n.z === z), true);
  if (full) {
    // The squads, then extra soldiers round the barracks up to the cap; none falls in the measure.
    const barracks = w.buildings.live(1).filter((b) => w.c.buildings[w.buildings.def[b]!]!.barracks !== null);
    for (let k = 0; w.units.count < CAP.soldiers; k += 1) {
      const b = barracks[k % barracks.length]!;
      w.units.add(b, 3 + k, 1, w.buildings.x[b]!, w.buildings.z[b]!);
    }
    for (const s of w.units.live()) w.units.hp[s] = 1e6;
  }
  while (countNpcs(w, NPC_KIND.villager) < 9) addVillager(w);
  for (let t = 0; t < 20; t += 1) w.trees.marked[t] = 1;
  // Helpers among the farms and trees, the hero by the merge.
  const spots = [[-4, 14], [-20, 36], [-26, -24], [30, 2]] as const;
  spots.forEach(([x, z], a) => send(w, { t: "move", agent: a, qx: x * 4, qz: z * 4 }));
  send(w, { t: "sandbox", op: { op: "night" } });
  w.spawnQueue.length = 0; // the night stays (wave 1 never ends), its enemies are the test's
  for (const e of w.enemies.live()) w.enemies.release(e);
  w.waveAlive[1] = 0;
  w.lives = 1e6;
  const ids = ["cuong-thi", "ma-troi", "thuong-luong"];
  for (let index = 0; index < enemies; index += 1) {
    const id = ids[index % 3]!;
    const route = id === "ma-troi" ? w.lanes.length - 1 : index % 2;
    const slot = enemyAt(w, id, route, 5 + ((index * 0.37) % 90));
    w.enemies.hp[slot] = 1e7;
  }
  for (let index = 0; index < shots; index += 1) {
    const target = (index * 7) % Math.max(1, enemies);
    const shot = w.projectiles.add(0, -40 + (index % 20), -40 + Math.floor(index / 20), w.enemies.id(target), 0, 0, 0.001, 0);
    w.projectiles.power[shot] = 1;
  }
  return w;
}

/** TK 25.12: the stores' 640 enemies and 512 shots, 20 buildings and the Bastion, 64 soldiers. */
export const fullWorld = (): World => loadedWorld(STORE.enemies, STORE.projectiles, true);

/** Milliseconds per step over `ticks` steps after `warm` warm-up steps: median, 95th percentile, worst; and calls made meanwhile. */
export function stepCost(w: World, ticks: number, warm: number): { median: number; p95: number; max: number; calls: number } {
  const times: number[] = [];
  for (let tick = 0; tick < warm + ticks; tick += 1) {
    const start = performance.now();
    step(w);
    if (tick >= warm) times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return { median: times[times.length >> 1]!, p95: times[Math.floor(times.length * 0.95)]!, max: times[times.length - 1]!, calls: w.stats[STAT.calls]! };
}
