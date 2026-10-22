/**
 * The workers (BUILD_1A6 §4; 25.6 step 10), day and night alike. Farmers
 * sow, wait and harvest; villagers chop trees; builders put up sites; mines
 * fill their pile and the miner hauls a basket every 10 s; at night towers
 * with an enemy in reach call for power. Work that starts makes its call,
 * whose words push the same work (calls.ts): a job ends whichever way gets
 * there first, and a worker within 6 m of a helper works ×1.5.
 */
import { ticks } from "../../content/compile";
import { BUILD, CALL, FARM, MINE, MODES, NPC, PHASE, POWER, RICHNESS, TICK_HZ, TREE, VILLAGERS } from "../../content/rules";
import { socketCell } from "../placement";
import { STAT, bump } from "../stats";
import { CALL_KIND } from "../stores/calls";
import { PLOT } from "../stores/buildings";
import { addAt, DONE } from "../stores/slots";
import { NPC_KIND, TASK } from "../stores/npcs";
import { MODE } from "../stores/walkers";
import type { World } from "../world";
import { passive, stand, toward, walk, walkTo } from "./agents";
import { closeCall, endWork, makeCall } from "./calls";
import { selectTargets } from "./combat";

const SOW = ticks(FARM.sowS);
const GROW = ticks(FARM.growS);
const HARVEST = ticks(FARM.harvestS);
const CHOP = ticks(TREE.chopS);
const HAUL = ticks(MINE.haulEveryS);
const FARM_STEP = NPC.farmSpeed / TICK_HZ;
const target = new Int32Array(1);

/** Where a new villager or builder appears: a few metres east of the Bastion, k-th in a short column. */
export function npcHome(w: World, k: number): { x: number; z: number } {
  return { x: w.map.keep[0] + 5.5 + (k % 3) * 1.2, z: w.map.keep[1] - 3 + Math.floor(k / 3) * 1.2 };
}

/** Villagers the Bastion's level allows (§4.2). */
export const villagerCap = (w: World): number => VILLAGERS.cap[w.buildings.level[0]! - 1]!;

export const countNpcs = (w: World, kind: number): number => w.npcs.live().filter((n) => w.npcs.kind[n] === kind).length;

export function addVillager(w: World): number {
  const at = npcHome(w, countNpcs(w, NPC_KIND.villager));
  return w.npcs.add(NPC_KIND.villager, at.x, at.z, -1);
}

/** Lets NPC n go: its call ends, its tree or site waits for another. */
export function releaseNpc(w: World, n: number): void {
  const N = w.npcs;
  if (N.call[n]! >= 0) closeCall(w, N.call[n]!);
  if (N.kind[n] === NPC_KIND.villager && N.job[n]! >= 0) w.trees.worker[N.job[n]!] = -1;
  if (N.kind[n] === NPC_KIND.builder && N.job[n]! >= 0) w.buildings.builder[N.job[n]!] = -1;
  N.release(n);
}

/** §4.3: as many builders as the Bastion's level; the newest go first. */
export function staffBuilders(w: World): void {
  const builders = w.npcs.live().filter((n) => w.npcs.kind[n] === NPC_KIND.builder);
  for (let k = builders.length; k < w.buildings.level[0]!; k += 1) {
    const at = npcHome(w, 9 + k);
    w.npcs.add(NPC_KIND.builder, at.x, at.z, -1);
  }
  for (const n of builders.slice(w.buildings.level[0]!).reverse()) releaseNpc(w, n);
}

function idle(w: World, n: number): void {
  w.npcs.task[n] = TASK.idle;
  w.npcs.job[n] = -1;
}

/** The centre of plot p of farm b: a 2 × 2 grid 1.1 m off the centre. */
export function plotAt(w: World, b: number, p: number): { x: number; z: number } {
  return { x: w.buildings.x[b]! + ((p & 1) * 2 - 1) * FARM.plotM, z: w.buildings.z[b]! + ((p >> 1) * 2 - 1) * FARM.plotM };
}

/** The farmer's next plot: the one asked for if ripe, a ripe one, else an empty one it has a seed for (bought at 8 gold when out, if allowed); −1 none. */
function choosePlot(w: World, b: number): number {
  const B = w.buildings;
  const at = b * FARM.plots;
  const prio = B.prio[b]!;
  B.prio[b] = -1;
  if (prio >= 0 && B.plot[at + prio] === PLOT.ripe) return prio;
  for (let p = 0; p < FARM.plots; p += 1) if (B.plot[at + p] === PLOT.ripe) return p;
  for (let p = 0; p < FARM.plots; p += 1) {
    if (B.plot[at + p] !== PLOT.empty) continue;
    if (w.seeds <= 0 && w.autoSeeds && w.gold >= FARM.seedGold * 1000) {
      w.gold -= FARM.seedGold * 1000;
      w.seeds += 1;
      bump(w.stats, STAT.seedsBought);
    }
    if (w.seeds <= 0) return -1;
    w.seeds -= 1;
    return p;
  }
  return -1;
}

/** §4.1: plots grow by themselves; the farmer walks inside the farm to a plot, sows it (2 s) or harvests it (12 s, a 3-word call). */
function farm(w: World, b: number): void {
  const B = w.buildings;
  const N = w.npcs;
  const at = b * FARM.plots;
  for (let p = 0; p < FARM.plots; p += 1) {
    if (B.plot[at + p] !== PLOT.growing || addAt(B.plotWork, at + p, 1 / GROW) < DONE) continue;
    B.plot[at + p] = PLOT.ripe;
    B.plotWork[at + p] = 0;
  }
  const n = B.farmer[b]!;
  if (n < 0) return;
  if (N.task[n] === TASK.idle) {
    const p = choosePlot(w, b);
    if (p < 0) return;
    const spot = plotAt(w, b, p);
    N.job[n] = p;
    N.task[n] = TASK.going;
    N.gx[n] = spot.x;
    N.gz[n] = spot.z;
  }
  const p = N.job[n]!;
  if (N.task[n] === TASK.going) {
    if (toward(N, n, N.gx[n]!, N.gz[n]!, FARM_STEP) < 0) return;
    N.task[n] = TASK.working;
    if (B.plot[at + p] === PLOT.ripe) N.call[n] = makeCall(w, CALL_KIND.harvest, CALL.words.harvest, n, b, -1, p);
  }
  const ripe = B.plot[at + p] === PLOT.ripe;
  if (addAt(B.plotWork, at + p, passive(w, N.x[n]!, N.z[n]!) / (ripe ? HARVEST : SOW)) < DONE) return;
  B.plotWork[at + p] = 0;
  B.plot[at + p] = ripe ? PLOT.empty : PLOT.growing;
  if (ripe) {
    w.food += FARM.food;
    bump(w.stats, STAT.food, FARM.food);
    w.events.rare.push({ t: "harvested", tick: w.tick, building: B.id(b), plot: p });
    endWork(w, N.call[n]!);
  }
  idle(w, n);
}

/** §4.2: a marked tree nearest villager n, else the tree nearest the Bastion within 30 m; one villager a tree; −1 none. */
function chooseTree(w: World, n: number): number {
  const trees = w.map.trees;
  const T = w.trees;
  const [kx, kz] = w.map.keep;
  let best = -1;
  let bestD = Infinity;
  for (const marked of [1, 0]) {
    for (let t = 0; t < T.count; t += 1) {
      if (T.standing[t] === 0 || T.worker[t]! >= 0 || T.marked[t] !== marked) continue;
      const [fx, fz] = marked === 1 ? [w.npcs.x[n]!, w.npcs.z[n]!] : [kx, kz];
      const d = (trees[t]![0] - fx) * (trees[t]![0] - fx) + (trees[t]![1] - fz) * (trees[t]![1] - fz);
      if (d < bestD && (marked === 1 || d <= TREE.nearKeepM * TREE.nearKeepM)) {
        best = t;
        bestD = d;
      }
    }
    if (best >= 0) return best;
  }
  return -1;
}

/** §4.2: an idle villager walks (A*) to its tree, chops it in 20 s (a 4-word call); it falls for 8 wood at once. */
function villager(w: World, n: number): void {
  const N = w.npcs;
  const T = w.trees;
  if (N.task[n] === TASK.idle) {
    const t = chooseTree(w, n);
    if (t < 0) return;
    const [x, z] = w.map.trees[t]!;
    const spot = socketCell(w, x, z, TREE.radiusM);
    const open = spot >= 0 && w.grid.cells[spot] === 0;
    T.worker[t] = n;
    N.job[n] = t;
    N.task[n] = TASK.going;
    walkTo(w, N, n, open ? w.grid.centerX(spot) : x, open ? w.grid.centerZ(spot) : z);
  }
  const t = N.job[n]!;
  if (N.task[n] === TASK.going) {
    if (N.mode[n] === MODE.walk) walk(w, N, n, NPC.speed);
    if (N.mode[n] === MODE.walk) return;
    N.task[n] = TASK.working;
    N.call[n] = makeCall(w, CALL_KIND.chop, CALL.words.chop, n, -1, t, -1);
  }
  if (addAt(T.progress, t, passive(w, N.x[n]!, N.z[n]!) / CHOP) < DONE) return;
  T.standing[t] = 0;
  T.worker[t] = -1;
  w.wood += TREE.wood;
  bump(w.stats, STAT.wood, TREE.wood);
  w.events.rare.push({ t: "felled", tick: w.tick, tree: t });
  endWork(w, N.call[n]!);
  idle(w, n);
}

/** Ticks of work site b needs: its footprint's time, an upgrade 0.75 of it (§4.3). */
const siteTicks = (w: World, b: number): number => w.c.buildings[w.buildings.def[b]!]!.buildTicks * (w.buildings.ready[b] === 1 ? BUILD.upgradeK : 1);

/** Site b is done: the level it was built to runs, at its full hit points; a new barracks' squad and a new farm's farmer come out. */
export function finishSite(w: World, b: number): void {
  const B = w.buildings;
  const def = w.c.buildings[B.def[b]!]!;
  const first = B.ready[b] === 0;
  B.level[b] = B.upTo[b]!;
  B.ready[b] = 1;
  B.upTo[b] = 0;
  B.progress[b] = 0;
  B.builder[b] = -1;
  B.hp[b] = def.hp[B.level[b]! - 1]!;
  if (first && def.barracks !== null) for (let post = 0; post < def.barracks.soldiers; post += 1) w.units.add(b, post, def.barracks.levels[0]!.hp, B.x[b]!, B.z[b]!);
  if (first && def.farm) B.farmer[b] = w.npcs.add(NPC_KIND.farmer, B.x[b]!, B.z[b]!, b);
  w.events.rare.push({ t: "finished", tick: w.tick, building: B.id(b), level: B.level[b]! });
}

/** §4.3: an idle builder takes the site waiting longest, walks there, builds (a 2–4-word call), slower at night. */
function builder(w: World, n: number): void {
  const N = w.npcs;
  const B = w.buildings;
  if (N.task[n] === TASK.idle) {
    let site = -1;
    for (let b = 1; b < B.top; b += 1) if (B.used[b] === 1 && B.upTo[b]! > 0 && B.builder[b]! < 0 && (site < 0 || B.builtTick[b]! < B.builtTick[site]!)) site = b;
    if (site < 0) return;
    const spot = stand(w, site);
    B.builder[site] = n;
    N.job[n] = site;
    N.task[n] = TASK.going;
    walkTo(w, N, n, spot.x, spot.z);
  }
  const b = N.job[n]!;
  if (N.task[n] === TASK.going) {
    if (N.mode[n] === MODE.walk) walk(w, N, n, NPC.speed);
    if (N.mode[n] === MODE.walk) return;
    N.task[n] = TASK.working;
    N.call[n] = makeCall(w, CALL_KIND.build, B.ready[b] === 1 ? CALL.words.upgrade : w.c.buildings[B.def[b]!]!.words, n, b, -1, -1);
  }
  const night = w.phase === "night" ? PHASE.nightBuildMul : 1;
  if (addAt(B.progress, b, passive(w, N.x[n]!, N.z[n]!) / (siteTicks(w, b) * night)) < DONE) return;
  const call = N.call[n]!;
  finishSite(w, b);
  endWork(w, call);
  idle(w, n);
}

/** §4.4: the pile fills as in 1A (×1.5 by a helper), the miner hauls a basket every 10 s, a half-full pile calls. */
function mine(w: World, b: number): void {
  const B = w.buildings;
  const level = w.c.buildings[B.def[b]!]!.mine!.levels[B.level[b]! - 1]!;
  const cap = level.pile * 1000;
  if (B.pile[b]! < cap && addAt(B.prod, b, passive(w, B.x[b]!, B.z[b]!)) >= level.every) {
    B.prod[b] = B.prod[b]! - level.every;
    const richness = B.node[b]! >= 0 ? RICHNESS[w.map.nodes[B.node[b]!]!.richness - 1]! : 1;
    B.pile[b] = Math.min(cap, B.pile[b]! + Math.round(level.amount * richness * 1000));
  }
  if (w.tick >= B.haulAt[b]!) {
    const take = Math.min(B.pile[b]!, Math.round(MINE.haulK * level.amount * 1000));
    B.haulAt[b] = w.tick + HAUL;
    B.pile[b] = B.pile[b]! - take;
    w.gold += take;
    bump(w.stats, STAT.goldProduce, take);
  }
  if (B.call[b]! < 0 && B.pile[b]! >= MINE.callAt * cap) B.call[b] = makeCall(w, CALL_KIND.mine, CALL.words.mine, -1, b, -1, -1);
}

/** §4.5: at night a tower (or the Bastion) under 5 charges, past its cooldown, with an enemy in reach, calls for power: 1 word, 6 s. */
function power(w: World, b: number): void {
  const B = w.buildings;
  const attack = w.c.buildings[B.def[b]!]!.attack!;
  if (w.phase !== "night" || B.charges[b]! >= POWER.max || B.call[b]! >= 0 || w.tick - B.powerAt[b]! < ticks(MODES[w.mode].powerCdS)) return;
  if (selectTargets(w, B.x[b]!, B.z[b]!, attack, attack.levels[B.level[b]! - 1]!, 1, target) === 0) return;
  B.powerAt[b] = w.tick;
  B.call[b] = makeCall(w, CALL_KIND.power, CALL.words.power, -1, b, -1, -1, ticks(CALL.powerLifeS));
}

export function economyStep(w: World): void {
  const B = w.buildings;
  for (let b = 0; b < B.top; b += 1) {
    if (B.used[b] === 0 || B.ready[b] === 0) continue;
    const def = w.c.buildings[B.def[b]!]!;
    if (def.farm) farm(w, b);
    else if (def.mine !== null) mine(w, b);
    else if (def.attack !== null) power(w, b);
  }
  const N = w.npcs;
  for (let n = 0; n < N.top; n += 1) {
    if (N.used[n] === 0) continue;
    if (N.kind[n] === NPC_KIND.villager) villager(w, n);
    else if (N.kind[n] === NPC_KIND.builder) builder(w, n);
  }
}
