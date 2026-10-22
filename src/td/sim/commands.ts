/**
 * Player commands (docs/td/TYPING_DEFENSE_DESIGN.md 25.7): the only way into
 * the world. Play, bots and replays all go through applyCommand, each command
 * stamped with the tick it acts on. A refused command changes nothing and
 * leaves a `rejected` event with the reason. Positions are quarter metres.
 */
import { ticks } from "../content/compile";
import { BUILD, ECONOMY, EXPECTED, RALLY, STORE } from "../content/rules";
import type { Difficulty } from "../content/types";
import { routeBackspace } from "../typing/router";
import { tempoOpen } from "../typing/tempo";
import { CELL } from "./nav/grid";
import { canPlace } from "./placement";
import { moveAgent, orderAgent, recallAgent, releaseBuilding, rerouteAgents, slotsOpen } from "./systems/agents";
import { configureDeck, densestFor, orderGrace, recheckTempos, setTempo, startTempo, stopAll } from "./systems/stream";
import { flood } from "./systems/spawn";
import { callWave, startWave } from "./systems/waves";
import { cancelWords, typeKey } from "./systems/words";
import type { World } from "./world";

export type SandboxOp =
  | { op: "gold"; value: number }
  | { op: "keepLevel"; value: number }
  | { op: "level"; building: number; value: number }
  | { op: "difficulty"; value: Difficulty }
  | { op: "expected"; value: number }
  | { op: "vocab"; value: number }
  | { op: "speed"; value: number }
  | { op: "wave" }
  | { op: "preset" }
  | { op: "flood"; value: number };

export type CommandBody =
  | { t: "build"; def: number; qx: number; qz: number }
  | { t: "sell"; building: number }
  | { t: "rally"; building: number; qx: number; qz: number }
  | { t: "callWave" }
  | { t: "assignUnit"; agent: number; building: number }
  | { t: "move"; agent: number; qx: number; qz: number }
  | { t: "recall"; agent: number }
  | { t: "setTempo"; building: number; idx: number }
  | { t: "setAllTempo"; stop: boolean }
  | { t: "uiFocus"; on: boolean }
  | { t: "key"; letter: number; atMs: number }
  | { t: "backspace"; atMs: number }
  | { t: "unlock" }
  | { t: "sandbox"; op: SandboxOp };

export type Command = CommandBody & { tick: number };

const SPEEDS = [0.75, 1, 2];
const VOCAB_LEVELS = [1, 3, 5];
const DIFFICULTIES: readonly Difficulty[] = ["easy", "normal", "hard"];

/** An agent whose slot the Bastion's level has opened. */
const agentOpen = (w: World, agent: number): boolean => Number.isInteger(agent) && agent >= 0 && agent < slotsOpen(w);

export function applyCommand(w: World, command: Command): void {
  const reason = run(w, command);
  if (reason !== null) w.events.rare.push({ t: "rejected", tick: w.tick, command: command.t, reason });
}

function run(w: World, command: Command): string | null {
  switch (command.t) {
    case "build": {
      const placed = canPlace(w, command.def, command.qx, command.qz);
      if (!placed.ok) return placed.reason;
      const cost = w.c.buildings[command.def]!.costs[0];
      w.gold -= cost * 1000;
      placeBuilding(w, command.def, placed.x, placed.z, placed.node, cost);
      return null;
    }
    case "sell": {
      const slot = w.buildings.slotOf(command.building);
      if (slot <= 0) return "noBuilding";
      const undo = w.phase === "prep" || w.tick - w.buildings.builtTick[slot]! <= ticks(ECONOMY.undoWindowS);
      if (!undo) return "undoWindow";
      const refund = w.buildings.paid[slot]!;
      w.gold += refund * 1000;
      w.events.rare.push({ t: "sold", tick: w.tick, building: command.building, refund });
      removeBuilding(w, slot);
      return null;
    }
    case "rally": {
      const slot = w.buildings.slotOf(command.building);
      if (slot < 0 || w.c.buildings[w.buildings.def[slot]!]!.barracks === null) return "noBarracks";
      if (!Number.isInteger(command.qx) || !Number.isInteger(command.qz)) return "bounds";
      const x = command.qx * BUILD.snapM;
      const z = command.qz * BUILD.snapM;
      const dx = x - w.buildings.x[slot]!;
      const dz = z - w.buildings.z[slot]!;
      if (dx * dx + dz * dz > RALLY.radiusM * RALLY.radiusM) return "rallyFar";
      if (!w.lanes.slice(0, -1).some((lane) => lane.gap2(x, z) <= RALLY.roadMaxM * RALLY.roadMaxM)) return "rallyOffRoad";
      w.buildings.rallyX[slot] = x;
      w.buildings.rallyZ[slot] = z;
      return null;
    }
    case "callWave":
      return callWave(w) ? null : "notCounting";
    case "assignUnit": {
      const slot = w.buildings.slotOf(command.building);
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
    case "setTempo": {
      const slot = w.buildings.slotOf(command.building);
      if (slot < 0) return "noBuilding";
      if (!tempoOpen(command.idx, densestFor(w, slot), w.difficulty)) return "tempoClosed";
      setTempo(w, slot, command.idx);
      return null;
    }
    case "setAllTempo":
      stopAll(w, command.stop === true);
      return null;
    case "uiFocus":
      orderGrace(w, command.on === true);
      return null;
    case "key":
      return typeKey(w, command.letter, command.atMs);
    case "backspace":
      routeBackspace(w.typing.router, w.words);
      return null;
    case "unlock":
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
      if (!(op.value >= 0 && op.value <= 1e6)) return "badValue";
      w.gold = Math.round(op.value) * 1000;
      return null;
    case "keepLevel":
      return setLevel(w, 0, op.value, w.c.buildings[0]!.attack!.levels.length);
    case "level": {
      const slot = w.buildings.slotOf(op.building);
      return slot <= 0 ? "noBuilding" : setLevel(w, slot, op.value, 3);
    }
    case "difficulty":
      if (!DIFFICULTIES.includes(op.value)) return "badValue";
      w.difficulty = op.value;
      configureDeck(w); // E's floor follows the difficulty
      recheckTempos(w);
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
    case "wave":
      startWave(w);
      return null;
    case "preset":
      // "Đặt sẵn 4 ô" (BUILD_NOW §5.3): the Bastion at level 4, the map's preset buildings put down free, an agent sent to each.
      setLevel(w, 0, 4, 4);
      for (const [id, x, z, agent] of w.map.preset ?? []) {
        const def = w.c.buildingIndex(id);
        const placed = canPlace(w, def, Math.round(x / BUILD.snapM), Math.round(z / BUILD.snapM), true);
        const slot = placed.ok ? placeBuilding(w, def, placed.x, placed.z, placed.node, 0) : -1;
        if (slot >= 0) orderAgent(w, agent, slot);
      }
      return null;
    case "flood":
      if (!(Number.isInteger(op.value) && op.value >= 1 && op.value <= STORE.enemies)) return "badValue";
      flood(w, op.value);
      return null;
  }
}

/** The sandbox sets levels for free (TK 0.5); nothing is paid, so an undo refunds only what was. */
function setLevel(w: World, slot: number, level: number, max: number): string | null {
  if (!(Number.isInteger(level) && level >= 1 && level <= max)) return "badValue";
  const B = w.buildings;
  const def = w.c.buildings[B.def[slot]!]!;
  B.level[slot] = level;
  if (def.hp[0] > 0) B.hp[slot] = def.hp[level - 1]!;
  if (def.barracks !== null) {
    const hp = def.barracks.levels[level - 1]!.hp;
    for (const s of w.units.live()) if (w.units.barracks[s] === slot && w.units.hp[s]! > 0) w.units.hp[s] = hp;
  }
  w.events.rare.push({ t: "levelSet", tick: w.tick, building: B.id(slot), level });
  recheckTempos(w);
  if (slot === 0) for (let agent = slotsOpen(w); agent < w.agents.top; agent += 1) if (w.agents.goal[agent]! >= 0) recallAgent(w, agent); // a closed slot's agent goes home
  return null;
}

/** Puts a building down (the Bastion at world creation; a checked `build` after). */
export function placeBuilding(w: World, def: number, x: number, z: number, node: number, paid: number): number {
  const spec = w.c.buildings[def]!;
  const slot = w.buildings.add(def, x, z, spec.hp[0], w.tick, w.tick + spec.buildTicks, paid, node);
  if (slot < 0) return -1;
  if (spec.placement !== "fixed") w.grid.stamp(x, z, spec.radius, CELL.building, true);
  rerouteAgents(w);
  if (spec.barracks !== null) {
    const point = { x, z };
    let best = Infinity;
    for (const lane of w.lanes.slice(0, -1)) {
      const d2 = lane.gap2(x, z, point);
      if (d2 >= best) continue;
      best = d2;
      w.buildings.rallyX[slot] = point.x;
      w.buildings.rallyZ[slot] = point.z;
    }
    // Soldiers wait inside until construction ends (soldiersStep stands them up).
    for (let post = 0; post < spec.barracks.soldiers; post += 1) {
      const unit = w.units.add(slot, post, 0, x, z);
      if (unit >= 0) w.units.respawnAt[unit] = w.tick + spec.buildTicks;
    }
  }
  w.events.rare.push({ t: "built", tick: w.tick, building: w.buildings.id(slot), def });
  startTempo(w, slot);
  return slot;
}

function removeBuilding(w: World, slot: number): void {
  const spec = w.c.buildings[w.buildings.def[slot]!]!;
  cancelWords(w, slot);
  for (const s of w.units.live()) if (w.units.barracks[s] === slot) w.units.release(s);
  w.grid.stamp(w.buildings.x[slot]!, w.buildings.z[slot]!, spec.radius, CELL.building, false);
  releaseBuilding(w, slot); // after the grid is open again: a recalled walker's path may cross the freed ground
  w.buildings.release(slot);
}
