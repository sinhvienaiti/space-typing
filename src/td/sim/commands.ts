/**
 * Player commands (docs/td/TYPING_DEFENSE_DESIGN.md 25.7; BUILD_1A6 §3–§8):
 * the only way into the world. Play, bots and replays all go through
 * applyCommand, each command stamped with the tick it acts on. A refused
 * command changes nothing and leaves a `rejected` event with the reason.
 * Positions are quarter metres.
 */
import { ticks } from "../content/compile";
import { BUILD, ECONOMY, EXPECTED, FARM, PRESET, RALLY, STORE, VILLAGERS } from "../content/rules";
import type { Mode } from "../content/types";
import { routeBackspace } from "../typing/router";
import { CELL } from "./nav/grid";
import { canPlace } from "./placement";
import { PLOT } from "./stores/buildings";
import { NPC_KIND, TASK } from "./stores/npcs";
import { moveAgent, orderAgent, recallAgent, releaseBuilding, reroute, slotsOpen } from "./systems/agents";
import { closeCall, closeCallsOf, configureDeck, typeKey } from "./systems/calls";
import { addVillager, countNpcs, finishSite, releaseNpc, staffBuilders, villagerCap } from "./systems/economy";
import { flood } from "./systems/spawn";
import { callNight, startNight } from "./systems/waves";
import type { World } from "./world";

export type SandboxOp =
  | { op: "gold"; value: number }
  | { op: "wood"; value: number }
  | { op: "keepLevel"; value: number }
  | { op: "level"; building: number; value: number }
  | { op: "mode"; value: Mode }
  | { op: "expected"; value: number }
  | { op: "vocab"; value: number }
  | { op: "speed"; value: number }
  | { op: "night" }
  | { op: "preset" }
  | { op: "flood"; value: number };

export type CommandBody =
  | { t: "build"; def: number; qx: number; qz: number }
  | { t: "upgrade"; building: number }
  | { t: "sell"; building: number }
  | { t: "rally"; building: number; qx: number; qz: number }
  | { t: "callNight" }
  | { t: "assignUnit"; agent: number; building: number }
  | { t: "move"; agent: number; qx: number; qz: number }
  | { t: "recall"; agent: number }
  | { t: "markTree"; tree: number }
  | { t: "hire" }
  | { t: "buySeeds" }
  | { t: "autoSeeds"; on: boolean }
  | { t: "sellFood" }
  | { t: "harvestPlot"; building: number; plot: number }
  | { t: "key"; letter: number; atMs: number }
  | { t: "backspace"; atMs: number }
  | { t: "unlock" }
  | { t: "sandbox"; op: SandboxOp };

export type Command = CommandBody & { tick: number };

const SPEEDS = [0.75, 1, 2];
const VOCAB_LEVELS = [1, 3, 5];
export const MODE_IDS: readonly Mode[] = ["relax", "balanced", "challenge", "learn"];

/** An agent the Bastion's level lets out. */
const agentOpen = (w: World, agent: number): boolean => Number.isInteger(agent) && agent >= 0 && agent < slotsOpen(w);

/** Pays `gold` (whole) and `wood`, or names what is short. */
function pay(w: World, gold: number, wood: number): string | null {
  if (w.gold < gold * 1000) return "gold";
  if (w.wood < wood) return "wood";
  w.gold -= gold * 1000;
  w.wood -= wood;
  return null;
}

export function applyCommand(w: World, command: Command): void {
  const reason = run(w, command);
  if (reason !== null) w.events.rare.push({ t: "rejected", tick: w.tick, command: command.t, reason });
}

function run(w: World, command: Command): string | null {
  const B = w.buildings;
  switch (command.t) {
    case "build": {
      const placed = canPlace(w, command.def, command.qx, command.qz);
      if (!placed.ok) return placed.reason;
      const spec = w.c.buildings[command.def]!;
      const [gold, wood] = [spec.gold[0]!, spec.wood[0]!];
      pay(w, gold, wood);
      const slot = placeBuilding(w, command.def, placed.x, placed.z, placed.node, false);
      B.paidGold[slot] = gold;
      B.paidWood[slot] = wood;
      return null;
    }
    case "upgrade": {
      const slot = B.slotOf(command.building);
      if (slot <= 0) return "noBuilding";
      const spec = w.c.buildings[B.def[slot]!]!;
      const level = B.level[slot]!;
      if (B.ready[slot] === 0 || B.upTo[slot]! > 0 || level >= spec.gold.length) return "noUpgrade";
      const gold = spec.gold[level]! - spec.gold[level - 1]!;
      const wood = spec.wood[level]! - spec.wood[level - 1]!;
      const short = pay(w, gold, wood);
      if (short !== null) return short;
      B.upTo[slot] = level + 1;
      B.progress[slot] = 0;
      B.builtTick[slot] = w.tick;
      B.paidGold[slot] = gold;
      B.paidWood[slot] = wood;
      w.events.rare.push({ t: "built", tick: w.tick, building: B.id(slot), def: B.def[slot]! });
      return null;
    }
    case "sell": {
      // An undo (§4.3): a site or an upgrade still being built, within 5 s of its start, goes, refunded in full; finished work stays.
      const slot = B.slotOf(command.building);
      if (slot <= 0) return "noBuilding";
      if (B.ready[slot] === 1 && B.upTo[slot] === 0) return "finished";
      if (w.tick - B.builtTick[slot]! > ticks(ECONOMY.undoWindowS)) return "undoWindow";
      w.gold += B.paidGold[slot]! * 1000;
      w.wood += B.paidWood[slot]!;
      w.events.rare.push({ t: "sold", tick: w.tick, building: command.building, gold: B.paidGold[slot]!, wood: B.paidWood[slot]! });
      if (B.ready[slot] === 1 && B.upTo[slot]! > 0) stopSite(w, slot);
      else removeBuilding(w, slot);
      return null;
    }
    case "rally": {
      const slot = B.slotOf(command.building);
      if (slot < 0 || w.c.buildings[B.def[slot]!]!.barracks === null) return "noBarracks";
      if (!Number.isInteger(command.qx) || !Number.isInteger(command.qz)) return "bounds";
      const x = command.qx * BUILD.snapM;
      const z = command.qz * BUILD.snapM;
      const dx = x - B.x[slot]!;
      const dz = z - B.z[slot]!;
      if (dx * dx + dz * dz > RALLY.radiusM * RALLY.radiusM) return "rallyFar";
      if (!w.lanes.slice(0, -1).some((lane) => lane.gap2(x, z) <= RALLY.roadMaxM * RALLY.roadMaxM)) return "rallyOffRoad";
      B.rallyX[slot] = x;
      B.rallyZ[slot] = z;
      return null;
    }
    case "callNight":
      return callNight(w) ? null : "notDay";
    case "assignUnit": {
      const slot = B.slotOf(command.building);
      if (slot < 0) return "noBuilding";
      if (!agentOpen(w, command.agent)) return "noSlot";
      orderAgent(w, command.agent, slot);
      return null;
    }
    case "move":
      if (!agentOpen(w, command.agent)) return "noSlot";
      if (!Number.isInteger(command.qx) || !Number.isInteger(command.qz)) return "bounds";
      return moveAgent(w, command.agent, command.qx * BUILD.snapM, command.qz * BUILD.snapM) ? null : "blocked";
    case "recall":
      if (!agentOpen(w, command.agent)) return "noSlot";
      recallAgent(w, command.agent);
      return null;
    case "markTree": {
      const t = command.tree;
      if (!(Number.isInteger(t) && t >= 0 && t < w.trees.count) || w.trees.standing[t] === 0) return "noTree";
      w.trees.marked[t] = 1 - w.trees.marked[t]!;
      return null;
    }
    case "hire": {
      if (countNpcs(w, NPC_KIND.villager) >= villagerCap(w)) return "villagerCap";
      if (w.food < VILLAGERS.food) return "food";
      const short = pay(w, VILLAGERS.gold, 0);
      if (short !== null) return short;
      w.food -= VILLAGERS.food;
      addVillager(w);
      return null;
    }
    case "buySeeds": {
      const short = pay(w, FARM.pack.gold, 0);
      if (short === null) w.seeds += FARM.pack.seeds;
      return short;
    }
    case "autoSeeds":
      w.autoSeeds = command.on === true;
      return null;
    case "sellFood":
      if (w.food < ECONOMY.sale.food) return "food";
      w.food -= ECONOMY.sale.food;
      w.gold += ECONOMY.sale.gold * 1000;
      return null;
    case "harvestPlot": {
      const slot = B.slotOf(command.building);
      const p = command.plot;
      if (slot < 0 || !w.c.buildings[B.def[slot]!]!.farm || !(Number.isInteger(p) && p >= 0 && p < FARM.plots)) return "noBuilding";
      if (B.plot[slot * FARM.plots + p] !== PLOT.ripe) return "notRipe";
      B.prio[slot] = p;
      return null;
    }
    case "key":
      return typeKey(w, command.letter, command.atMs);
    case "backspace":
      routeBackspace(w.typing.router, w.words);
      return null;
    case "unlock":
      // Esc drops the half-typed word, its errors uncounted (plan §8 Q6): typed again, it starts clean.
      if (w.typing.router.lock >= 0) w.words.typed[w.typing.router.lock] = w.words.errors[w.typing.router.lock] = 0;
      w.typing.router.lock = -1;
      w.typing.router.group = -1;
      return null;
    case "sandbox":
      return w.sandbox ? sandbox(w, command.op) : "noSandbox";
  }
}

function sandbox(w: World, op: SandboxOp): string | null {
  switch (op.op) {
    case "gold":
    case "wood":
      if (!(op.value >= 0 && op.value <= 1e6)) return "badValue";
      if (op.op === "gold") w.gold = Math.round(op.value) * 1000;
      else w.wood = Math.round(op.value);
      return null;
    case "keepLevel":
      return setLevel(w, 0, op.value, w.c.buildings[0]!.attack!.levels.length);
    case "level": {
      const slot = w.buildings.slotOf(op.building);
      return slot <= 0 ? "noBuilding" : setLevel(w, slot, op.value, 3);
    }
    case "mode":
      if (!MODE_IDS.includes(op.value)) return "badValue";
      w.mode = op.value;
      configureDeck(w); // E's floor follows the mode
      return null;
    case "expected":
      if (!(op.value >= EXPECTED.min && op.value <= EXPECTED.max)) return "badValue";
      w.expected = Math.round(op.value);
      configureDeck(w);
      return null;
    case "vocab":
      if (!VOCAB_LEVELS.includes(op.value)) return "badValue";
      w.vocab = op.value;
      configureDeck(w);
      return null;
    case "speed":
      if (!SPEEDS.includes(op.value)) return "badValue";
      w.speed = op.value;
      return null;
    case "night":
      startNight(w);
      return null;
    case "preset":
      preset(w);
      return null;
    case "flood":
      if (!(Number.isInteger(op.value) && op.value >= 1 && op.value <= STORE.enemies)) return "badValue";
      flood(w, op.value);
      return null;
  }
}

/** §10 "Đặt sẵn": the Bastion at level 3, the map's preset put down built and free, 5 villagers, the 8 standing trees nearest the Bastion marked. */
function preset(w: World): void {
  setLevel(w, 0, Math.max(PRESET.keepLevel, w.buildings.level[0]!), 4);
  for (const [id, x, z] of w.map.preset ?? []) {
    const def = w.c.buildingIndex(id);
    const placed = canPlace(w, def, Math.round(x / BUILD.snapM), Math.round(z / BUILD.snapM), true);
    if (placed.ok) placeBuilding(w, def, placed.x, placed.z, placed.node, true);
  }
  while (countNpcs(w, NPC_KIND.villager) < PRESET.villagers) addVillager(w);
  const [kx, kz] = w.map.keep;
  const d2 = (t: number) => (w.map.trees[t]![0] - kx) * (w.map.trees[t]![0] - kx) + (w.map.trees[t]![1] - kz) * (w.map.trees[t]![1] - kz);
  const near = [...w.map.trees.keys()].filter((t) => w.trees.standing[t] === 1).sort((p, q) => d2(p) - d2(q) || p - q);
  for (const t of near.slice(0, PRESET.marks)) w.trees.marked[t] = 1;
}

/** The sandbox sets a running building's level for free (TK 0.5), the Bastion's too (its builders follow); nothing is paid. */
function setLevel(w: World, slot: number, level: number, max: number): string | null {
  if (!(Number.isInteger(level) && level >= 1 && level <= max)) return "badValue";
  const B = w.buildings;
  if (B.ready[slot] === 0 || B.upTo[slot]! > 0) return "notReady"; // an upgrade under way would set its own level when done
  const def = w.c.buildings[B.def[slot]!]!;
  B.level[slot] = level;
  if (def.hp[0] > 0) B.hp[slot] = def.hp[level - 1]!;
  if (def.barracks !== null) {
    const hp = def.barracks.levels[level - 1]!.hp;
    for (const s of w.units.live()) if (w.units.barracks[s] === slot && w.units.hp[s]! > 0) w.units.hp[s] = hp;
  }
  w.events.rare.push({ t: "levelSet", tick: w.tick, building: B.id(slot), level });
  if (slot === 0) {
    for (let agent = slotsOpen(w); agent < w.agents.top; agent += 1) if (w.agents.goal[agent]! >= 0) recallAgent(w, agent); // a closed slot's agent goes home
    staffBuilders(w);
  }
  return null;
}

/** Puts a building down: a site for the builders, or (the Bastion, the sandbox preset) built at once. */
export function placeBuilding(w: World, def: number, x: number, z: number, node: number, built: boolean): number {
  const spec = w.c.buildings[def]!;
  const B = w.buildings;
  const slot = B.add(def, x, z, spec.hp[0], w.tick, node);
  if (slot < 0) return -1;
  if (spec.placement !== "fixed") w.grid.stamp(x, z, spec.radius, CELL.building, true);
  reroute(w);
  if (spec.barracks !== null) {
    const point = { x, z };
    let best = Infinity;
    for (const lane of w.lanes.slice(0, -1)) {
      const d2 = lane.gap2(x, z, point);
      if (d2 >= best) continue;
      best = d2;
      B.rallyX[slot] = point.x;
      B.rallyZ[slot] = point.z;
    }
  }
  B.upTo[slot] = 1;
  w.events.rare.push({ t: "built", tick: w.tick, building: B.id(slot), def });
  if (built) finishSite(w, slot);
  return slot;
}

/** A site's work stops: its builder goes idle and its build call ends (a mine's or a farm's own calls go on); an upgrade leaves the building as it was. */
function stopSite(w: World, slot: number): void {
  const B = w.buildings;
  const n = B.builder[slot]!;
  if (n >= 0) {
    if (w.npcs.call[n]! >= 0) closeCall(w, w.npcs.call[n]!);
    w.npcs.task[n] = TASK.idle;
    w.npcs.job[n] = -1;
  }
  B.builder[slot] = -1;
  B.upTo[slot] = 0;
  B.progress[slot] = 0;
}

function removeBuilding(w: World, slot: number): void {
  const spec = w.c.buildings[w.buildings.def[slot]!]!;
  stopSite(w, slot);
  closeCallsOf(w, slot);
  for (const s of w.units.live()) if (w.units.barracks[s] === slot) w.units.release(s);
  for (const n of w.npcs.live()) if (w.npcs.kind[n] === NPC_KIND.farmer && w.npcs.home[n] === slot) releaseNpc(w, n);
  w.grid.stamp(w.buildings.x[slot]!, w.buildings.z[slot]!, spec.radius, CELL.building, false);
  releaseBuilding(w, slot); // after the grid is open again: a recalled walker's path may cross the freed ground
  w.buildings.release(slot);
}
