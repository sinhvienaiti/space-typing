/**
 * Player commands (docs/td/TYPING_DEFENSE_DESIGN.md 25.7): the only way into
 * the world. Play, bots and replays all go through applyCommand, each command
 * stamped with the tick it acts on. A refused command changes nothing and
 * leaves a `rejected` event with the reason. Positions are quarter metres.
 * 1A.1 handles building, undo, rally, calling a wave and the sandbox; the
 * typing and agent commands join with their milestones.
 */
import { ticks } from "../content/compile";
import { BUILD, ECONOMY, EXPECTED, RALLY } from "../content/rules";
import type { Difficulty } from "../content/types";
import { CELL } from "./nav/grid";
import { canPlace } from "./placement";
import { callWave, startWave } from "./systems/waves";
import type { World } from "./world";

export type SandboxOp =
  | { op: "gold"; value: number }
  | { op: "keepLevel"; value: number }
  | { op: "level"; building: number; value: number }
  | { op: "difficulty"; value: Difficulty }
  | { op: "expected"; value: number }
  | { op: "vocab"; value: number }
  | { op: "speed"; value: number }
  | { op: "wave" };

export type CommandBody =
  | { t: "build"; def: number; qx: number; qz: number }
  | { t: "sell"; building: number }
  | { t: "rally"; building: number; qx: number; qz: number }
  | { t: "callWave" }
  | { t: "sandbox"; op: SandboxOp };

export type Command = CommandBody & { tick: number };

const SPEEDS = [0.75, 1, 2];
const VOCAB_LEVELS = [1, 3, 5];
const DIFFICULTIES: readonly Difficulty[] = ["easy", "normal", "hard"];

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
      return null;
    case "expected":
      if (!(op.value >= EXPECTED.min && op.value <= EXPECTED.max)) return "badValue";
      w.expected = Math.round(op.value);
      return null;
    case "vocab":
      if (!VOCAB_LEVELS.includes(op.value)) return "badValue";
      w.vocab = op.value;
      return null;
    case "speed":
      if (!SPEEDS.includes(op.value)) return "badValue";
      w.speed = op.value;
      return null;
    case "wave":
      startWave(w);
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
  return null;
}

/** Puts a building down (the Bastion at world creation; a checked `build` after). */
export function placeBuilding(w: World, def: number, x: number, z: number, node: number, paid: number): number {
  const spec = w.c.buildings[def]!;
  const slot = w.buildings.add(def, x, z, spec.hp[0], w.tick, w.tick + spec.buildTicks, paid, node);
  if (slot < 0) return -1;
  if (spec.placement !== "fixed") w.grid.stamp(x, z, spec.radius, CELL.building, true);
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
  return slot;
}

function removeBuilding(w: World, slot: number): void {
  const spec = w.c.buildings[w.buildings.def[slot]!]!;
  for (const s of w.units.live()) if (w.units.barracks[s] === slot) w.units.release(s);
  w.grid.stamp(w.buildings.x[slot]!, w.buildings.z[slot]!, spec.radius, CELL.building, false);
  w.buildings.release(slot);
}
