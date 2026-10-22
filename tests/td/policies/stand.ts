/**
 * "Build what the layout says" (docs/td/BUILD_NOW.md §6.3, BUILD_1A6 §2–§6, §12 gate 4), the frame every bot policy
 * builds on: buy the layout's steps in order as gold and wood allow (a building on its spot, or the Bastion's next
 * level paid in gold and wood), send each helper to its building once it stands and the helper's slot is open, keep
 * enough marked trees standing for the villagers (nearest the layout's wood anchor first), hire villagers when food
 * allows, and (if the layout says so) call the night early. Rules (where the hero stands by day and by night) run
 * after, every tick. A plan only reads the world and sends commands.
 */
import { ECONOMY, MODES, VILLAGERS } from "../../../src/td/content/rules";
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
/** A step of the build order: a building on its spot, the Bastion to a level, or build k (an index into builds) upgraded to a level. */
export type Step = Spot | { readonly keep: number } | { readonly upgrade: number; readonly level: number };

/**
 * The Bastion's level 2–4 at TK 2's price (150 / 260 / 400; its own wood dropped) cut as BUILD_1A6 §3 cuts every
 * price: wood round(woodShare × G), the rest gold. 1A.6 raises the Bastion only in the sandbox, free and at once
 * (§4.3), so the bots pay this through the sandbox's gold and wood, then set the level.
 */
export function keepPrice(level: number): { gold: number; wood: number } {
  const total = [0, 0, 150, 260, 400][level]!;
  const wood = Math.round(total * ECONOMY.woodShare);
  return { gold: total - wood, wood };
}

export type Layout = {
  readonly name: string;
  /** Bought in this order. */
  readonly builds: readonly Step[];
  /** Helper a (1 Chấm, 2 Phẩy, 3 Gạch) at helpers[a − 1] → index into builds; null: stays home. The hero is left to rules. */
  readonly helpers: readonly (number | null)[];
  /** Marked trees kept standing: the villagers' count plus this many, nearest the first wood anchor with trees standing within 12 m of it (none: no marks). */
  readonly marks?: { readonly spare: number; readonly woodAt: readonly (readonly [number, number])[] };
  /** Food kept for hires and soldiers; above it food is sold 10 at a time (none: never sold). */
  readonly foodKeep?: number;
  /** Villagers to hire up to, as food and gold allow (gold kept back besides the price). */
  readonly villagers?: number;
  readonly hireReserve?: number;
  /** Seconds into a day after which the night is called early (none: the day runs out). */
  readonly callAfterS?: number;
  /** Sandbox gold at the start (none: the run's own). */
  readonly gold?: number;
};

export type Rule = (bot: Bot, plan: Plan) => void;

const q = (metres: number): number => Math.round(metres * 4);
export const isKeep = (step: Step): step is { readonly keep: number } => "keep" in step;
const isUpgrade = (step: Step): step is { readonly upgrade: number; readonly level: number } => "upgrade" in step;

export class Plan {
  /** Building slot of builds[k] (−1: not down yet); a Bastion step: 0 once it is at that level. */
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
    if (w.tick === 0 && layout.gold !== undefined) bot.send({ t: "sandbox", op: { op: "gold", value: layout.gold } });
    // The next step in order, when the treasury has its price (and a building fits: the price first, canPlace walks the field); one at a time.
    const next = this.slots.findIndex((s) => s < 0);
    if (next >= 0 && this.asked !== w.tick - 1) this.buy(bot, next);
    const A = w.agents;
    layout.helpers.forEach((k, index) => {
      const a = index + 1;
      const goal = k === null ? -1 : this.slot(w, k);
      if (a < slotsOpen(w) && goal >= 0 && A.goal[a] !== goal) bot.send({ t: "assignUnit", agent: a, building: w.buildings.id(goal) });
    });
    const villagers = countNpcs(w, NPC_KIND.villager);
    if (layout.marks !== undefined && w.tick % 60 === 0) this.mark(bot, villagers + layout.marks.spare);
    // Not on a tick something was bought: its price leaves the treasury only when the command acts.
    const hire = this.asked !== w.tick && villagers < Math.min(layout.villagers ?? 0, villagerCap(w));
    if (hire && w.food >= VILLAGERS.food && w.gold >= (VILLAGERS.gold + (layout.hireReserve ?? 0)) * 1000 && w.tick % 60 === 30) bot.send({ t: "hire" });
    else if (layout.foodKeep !== undefined && w.food >= layout.foodKeep + ECONOMY.sale.food && w.tick % 60 === 30) bot.send({ t: "sellFood" });
    for (const rule of this.rules) rule(bot, this);
    const callAt = layout.callAfterS;
    if (callAt !== undefined && w.phase === "day" && w.phaseEnd - w.tick <= (MODES[w.mode].dayS - callAt) * 60) bot.send({ t: "callNight" });
  }

  private buy(bot: Bot, k: number): void {
    const { w } = bot;
    const step = this.layout.builds[k]!;
    if (isKeep(step)) {
      const price = keepPrice(step.keep);
      if (w.gold < price.gold * 1000 || w.wood < price.wood) return;
      bot.send({ t: "sandbox", op: { op: "gold", value: Math.floor(w.gold / 1000) - price.gold } });
      bot.send({ t: "sandbox", op: { op: "wood", value: w.wood - price.wood } });
      bot.send({ t: "sandbox", op: { op: "keepLevel", value: step.keep } });
    } else if (isUpgrade(step)) {
      const b = this.slot(w, step.upgrade);
      if (b < 0 || w.buildings.ready[b] === 0 || w.buildings.upTo[b]! > 0) return;
      const spec = w.c.buildings[w.buildings.def[b]!]!;
      const level = w.buildings.level[b]!;
      if (w.gold < (spec.gold[level]! - spec.gold[level - 1]!) * 1000 || w.wood < spec.wood[level]! - spec.wood[level - 1]!) return;
      bot.send({ t: "upgrade", building: w.buildings.id(b) });
    } else {
      const def = w.c.buildingIndex(step.id);
      const spec = w.c.buildings[def]!;
      if (w.gold < spec.gold[0]! * 1000 || w.wood < spec.wood[0]! || !canPlace(w, def, q(step.x), q(step.z)).ok) return;
      bot.send({ t: "build", def, qx: q(step.x), qz: q(step.z) });
    }
    this.asked = w.tick;
  }

  /** Marks the standing trees nearest the first wood anchor that still has some within 12 m, until `want` marked ones stand. */
  private mark(bot: Bot, want: number): void {
    const { w } = bot;
    const T = w.trees;
    let marked = 0;
    for (let t = 0; t < T.count; t += 1) if (T.standing[t] === 1 && T.marked[t] === 1) marked += 1;
    if (marked >= want) return;
    const anchors = this.layout.marks!.woodAt;
    const near = (t: number, [x, z]: readonly [number, number]) => (w.map.trees[t]![0] - x) ** 2 + (w.map.trees[t]![1] - z) ** 2;
    const [ax, az] = anchors.find((anchor) => w.map.trees.some((_, t) => T.standing[t] === 1 && T.marked[t] === 0 && near(t, anchor) <= 144)) ?? anchors[anchors.length - 1]!;
    const d2 = (t: number) => (w.map.trees[t]![0] - ax) ** 2 + (w.map.trees[t]![1] - az) ** 2;
    const free = [...w.map.trees.keys()].filter((t) => T.standing[t] === 1 && T.marked[t] === 0).sort((p, r) => d2(p) - d2(r) || p - r);
    for (const tree of free.slice(0, want - marked)) bot.send({ t: "markTree", tree });
  }

  /** Steps done: a building of the spot's kind standing on it (a mine on the node's centre); the Bastion at the level; an upgrade begun. */
  private find(w: World): void {
    const B = w.buildings;
    this.layout.builds.forEach((step, k) => {
      if (isKeep(step) || isUpgrade(step)) {
        const b = isKeep(step) ? 0 : this.slot(w, step.upgrade);
        this.slots[k] = b >= 0 && Math.max(B.level[b]!, B.upTo[b]!) >= (isKeep(step) ? step.keep : step.level) ? b : -1;
        return;
      }
      if (this.slot(w, k) >= 0) return;
      const def = w.c.buildingIndex(step.id);
      this.slots[k] = B.live(1).find((b) => B.def[b] === def && Math.abs(B.x[b]! - step.x) < 1e-6 && Math.abs(B.z[b]! - step.z) < 1e-6) ?? -1;
    });
  }
}
