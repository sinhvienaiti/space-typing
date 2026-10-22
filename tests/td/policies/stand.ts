/**
 * "Build what the layout says" (docs/td/BUILD_NOW.md §6.3, BUILD_1A6 §2–§6), the frame every bot policy builds
 * on: mark the layout's trees, buy its buildings in order as gold and wood allow, send each helper to its
 * building once it stands and the helper's slot is open, set the Bastion's level when a night comes (the
 * sandbox), hire villagers when food allows, and call the night early once the day is mostly gone. Rules (the
 * hero following the calls) run after, every tick. A plan only reads the world and sends commands.
 */
import { MODES, VILLAGERS } from "../../../src/td/content/rules";
import type { CommandBody } from "../../../src/td/sim/commands";
import { canPlace } from "../../../src/td/sim/placement";
import { NPC_KIND } from "../../../src/td/sim/stores/npcs";
import { slotsOpen } from "../../../src/td/sim/systems/agents";
import { countNpcs, villagerCap } from "../../../src/td/sim/systems/economy";
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
  /** Helper a (1 Chấm, 2 Phẩy, 3 Gạch) at helpers[a − 1] → index into builds; null: stays home. The hero is left to rules. */
  readonly helpers: readonly (number | null)[];
  /** [night, level]: the Bastion's level from that night on (the first entry also before night 1). */
  readonly keep: readonly (readonly [number, number])[];
  /** Trees marked at the start (map indices). */
  readonly marks?: readonly number[];
  /** Villagers to hire up to, as food and gold allow. */
  readonly villagers?: number;
  /** Seconds into a day after which the night is called early (none: the day runs out). */
  readonly callAfterS?: number;
  readonly gold?: number;
};

export type Rule = (bot: Bot, plan: Plan) => void;

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

  tick(bot: Bot): void {
    const { w } = bot;
    const { layout } = this;
    this.find(w);
    if (w.tick === 0) {
      if (layout.gold !== undefined) bot.send({ t: "sandbox", op: { op: "gold", value: layout.gold } });
      for (const tree of layout.marks ?? []) bot.send({ t: "markTree", tree });
    }
    const level = this.keepLevel(w);
    if (w.buildings.level[0] !== level) bot.send({ t: "sandbox", op: { op: "keepLevel", value: level } });
    // The next building in order, when the treasury has its price and it fits (the price first: canPlace walks the field); one at a time.
    const next = this.slots.findIndex((s) => s < 0);
    if (next >= 0 && this.asked !== w.tick - 1) {
      const spot = layout.builds[next]!;
      const def = w.c.buildingIndex(spot.id);
      const spec = w.c.buildings[def]!;
      if (w.gold >= spec.gold[0]! * 1000 && w.wood >= spec.wood[0]! && canPlace(w, def, q(spot.x), q(spot.z)).ok) {
        bot.send({ t: "build", def, qx: q(spot.x), qz: q(spot.z) });
        this.asked = w.tick;
      }
    }
    const A = w.agents;
    layout.helpers.forEach((k, index) => {
      const a = index + 1;
      const goal = k === null ? -1 : this.slot(w, k);
      if (a < slotsOpen(w) && goal >= 0 && A.goal[a] === -1) bot.send({ t: "assignUnit", agent: a, building: w.buildings.id(goal) });
    });
    const hire = countNpcs(w, NPC_KIND.villager) < Math.min(layout.villagers ?? 0, villagerCap(w));
    if (hire && w.food >= VILLAGERS.food && w.gold >= (VILLAGERS.gold + 40) * 1000 && w.tick % 60 === 0) bot.send({ t: "hire" });
    for (const rule of this.rules) rule(bot, this);
    const callAt = layout.callAfterS;
    if (callAt !== undefined && w.phase === "day" && w.phaseEnd - w.tick <= (MODES[w.mode].dayS - callAt) * 60) bot.send({ t: "callNight" });
  }

  /** The Bastion's level the layout wants now. */
  keepLevel(w: World): number {
    let level = 1;
    for (const [night, value] of this.layout.keep) if (night <= w.wave + (w.phase === "night" ? 0 : 1)) level = value;
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
}
