/**
 * "Stand where the layout says" (docs/td/BUILD_NOW.md §6.3), the frame every
 * bot policy builds on: buy the layout's buildings in order as gold allows,
 * send each agent to its building once it is down and the agent's slot is
 * open, set the Bastion's level when a wave comes (the sandbox; 1B pays for
 * it), start wave 1 once the opening stands and call each next wave as soon
 * as the field is clear. Agents stay where they are sent; rules (a tempo
 * choice, the hero's pendulum) run after, every tick. A plan only reads the
 * world and sends commands.
 */
import type { CommandBody } from "../../../src/td/sim/commands";
import { canPlace } from "../../../src/td/sim/placement";
import { slotsOpen } from "../../../src/td/sim/systems/agents";
import type { World } from "../../../src/td/sim/world";

/** What a policy may do: read the world, queue commands for this tick. */
export interface Bot {
  readonly w: World;
  send(body: CommandBody): void;
}

export type Spot = { readonly id: string; readonly x: number; readonly z: number };

export type Layout = {
  readonly name: string;
  /** Bought in this order. */
  readonly builds: readonly Spot[];
  /** Agent a (0 Draconis, 1 Chấm, 2 Phẩy, 3 Gạch) → index into builds, −1 the Bastion; null or past the list: assists nothing. */
  readonly assign: readonly (number | null)[];
  /** [wave, level]: the Bastion's level from that wave on (the first entry also before wave 1). */
  readonly keep: readonly (readonly [number, number])[];
  /** Sandbox gold set at the start: enough puts the whole layout down at once. */
  readonly gold?: number;
  /** Every building's level (L1–L3), set by the sandbox once it is down. */
  readonly levels?: number;
};

export type Rule = (bot: Bot, plan: Plan) => void;

const PREP_MAX_TICKS = 60 * 60;
const q = (metres: number): number => Math.round(metres * 4);

export class Plan {
  /** Building slot of builds[k] (−1: not down yet). */
  readonly slots: number[];
  private asked = -1;

  constructor(readonly layout: Layout, readonly rules: readonly Rule[] = []) {
    this.slots = layout.builds.map(() => -1);
  }

  /** The building slot of build k, −1 not down (or gone). */
  slot(w: World, k: number): number {
    const s = this.slots[k]!;
    return s >= 0 && w.buildings.used[s] === 1 ? s : -1;
  }

  /** Building an agent goes to: build k's slot, the Bastion (0) for −1, −1 when it is not down. */
  goalOf(w: World, k: number): number {
    return k < 0 ? 0 : this.slot(w, k);
  }

  tick(bot: Bot): void {
    const { w } = bot;
    const { layout } = this;
    this.find(w);
    if (w.tick === 0 && layout.gold !== undefined) bot.send({ t: "sandbox", op: { op: "gold", value: layout.gold } });
    const level = this.keepLevel(w);
    if (w.buildings.level[0] !== level) bot.send({ t: "sandbox", op: { op: "keepLevel", value: level } });
    for (let k = 0; k < this.slots.length && layout.levels !== undefined; k += 1) {
      const b = this.slot(w, k);
      if (b >= 0 && w.buildings.level[b] !== layout.levels) bot.send({ t: "sandbox", op: { op: "level", building: w.buildings.id(b), value: layout.levels } });
    }
    // The next building in order, when the treasury has its price and it fits (the gold first: canPlace walks the field); one at a time.
    const next = this.slots.findIndex((s) => s < 0);
    if (next >= 0 && this.asked !== w.tick - 1) {
      const spot = layout.builds[next]!;
      const def = w.c.buildingIndex(spot.id);
      if (w.gold >= w.c.buildings[def]!.costs[0] * 1000 && canPlace(w, def, q(spot.x), q(spot.z)).ok) {
        bot.send({ t: "build", def, qx: q(spot.x), qz: q(spot.z) });
        this.asked = w.tick;
      }
    }
    const A = w.agents;
    layout.assign.forEach((k, a) => {
      const goal = k === null ? -1 : this.goalOf(w, k);
      if (a < slotsOpen(w) && goal >= 0 && A.goal[a] === -1) bot.send({ t: "assignUnit", agent: a, building: w.buildings.id(goal) });
    });
    for (const rule of this.rules) rule(bot, this);
    if (this.waveDue(w)) bot.send({ t: "callWave" });
  }

  /** The Bastion's level the layout wants now. */
  keepLevel(w: World): number {
    let level = 1;
    for (const [wave, value] of this.layout.keep) if (wave <= Math.max(1, w.wave + (w.phase === "prep" ? 1 : 0))) level = value;
    return level;
  }

  /** Builds the world now has: a building of the spot's kind standing on it (a mine on the node's centre). */
  private find(w: World): void {
    const B = w.buildings;
    this.layout.builds.forEach((spot, k) => {
      if (this.slot(w, k) >= 0) return;
      const def = w.c.buildingIndex(spot.id);
      this.slots[k] = B.live(1).find((b) => B.def[b] === def && Math.abs(B.x[b]! - spot.x) < 1e-6 && Math.abs(B.z[b]! - spot.z) < 1e-6) ?? -1;
    });
  }

  /**
   * Wave 1 once nothing more can be bought now, every building is up and every agent sent is in place (or after
   * 60 s); later waves as soon as the field is clear and the next one is counting down.
   */
  private waveDue(w: World): boolean {
    if (w.phase === "battle") return w.nextWaveAt >= 0 && w.enemies.count === 0;
    if (w.phase !== "prep") return false;
    if (w.tick >= PREP_MAX_TICKS) return true;
    const B = w.buildings;
    const A = w.agents;
    const next = this.slots.findIndex((s) => s < 0);
    const buying = next >= 0 && w.gold >= w.c.buildings[w.c.buildingIndex(this.layout.builds[next]!.id)]!.costs[0] * 1000;
    const building = B.live().some((b) => w.tick < B.readyTick[b]!);
    const walking = A.live().some((a) => A.goal[a]! >= 0 && A.at[a] !== A.goal[a]);
    const unsent = this.layout.assign.some((k, a) => k !== null && a < slotsOpen(w) && this.goalOf(w, k) >= 0 && A.goal[a] === -1);
    return !buying && !building && !walking && !unsent && this.asked < w.tick - 1;
  }
}
