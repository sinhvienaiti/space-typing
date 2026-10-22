/**
 * What the player has in hand (docs/td/TYPING_DEFENSE_DESIGN.md 25.7: app
 * state, never in the sim). Keys and buttons name the same actions, so every
 * task has a keyboard path (BUILD_NOW §5.4, BUILD_1A6 §8). A click on a tree
 * marks it, on a ripe plot asks its farmer to harvest it first.
 */
import { FARM, TREE } from "../content/rules";
import type { CommandBody } from "../sim/commands";
import { canPlace, nextSpot, spotCandidates, type Point } from "../sim/placement";
import { PLOT } from "../sim/stores/buildings";
import { slotsOpen } from "../sim/systems/agents";
import { plotAt } from "../sim/systems/economy";
import type { World } from "../sim/world";
import { REASON } from "../ui/hud";
import { sandboxOp } from "./sandbox";

const q = (metres: number): number => Math.round(metres * 4);
const dist2 = (x: number, z: number, p: Point): number => (x - p.x) * (x - p.x) + (z - p.z) * (z - p.z);

export class Selection {
  agent = 0;
  /** The building whose card is open, by id (−1 none). */
  focus = -1;
  building = false;
  kind = 1;
  /** The build ghost stands at the mouse once it moves over the field, else at `spots[spot]` (−1: none free). */
  mouse: Point | null = null;
  spots: Point[] = [];
  spot = -1;
  paused = false;
  panel = true;

  constructor(private readonly w: World, private readonly send: (command: CommandBody) => void) {}

  private readonly actions: Record<string, (n: number) => unknown> = {
    pick: (n) => (this.building ? this.choose(n, this.mouse) : this.actions.agent!(n - 1)), // Digit1–5; a build menu row
    agent: (n) => n >= 0 && n < slotsOpen(this.w) && (this.agent = n),
    cycle: () => (this.agent = (this.agent + 1) % slotsOpen(this.w)),
    recall: () => this.send({ t: "recall", agent: this.agent }),
    next: () => this.next(1),
    prev: () => this.next(-1),
    send: () => (this.building ? this.build(null) : this.focus >= 0 && this.send({ t: "assignUnit", agent: this.agent, building: this.focus })),
    night: () => this.send({ t: "callNight" }),
    hire: () => this.send({ t: "hire" }),
    seeds: () => this.send({ t: "buySeeds" }),
    autoSeeds: () => this.send({ t: "autoSeeds", on: !this.w.autoSeeds }),
    sellFood: () => this.send({ t: "sellFood" }),
    upgrade: () => this.focus >= 0 && this.send({ t: "upgrade", building: this.focus }),
    build: () => this.choose(this.kind, null),
    undo: () => this.w.buildings.slotOf(this.focus) > 0 && this.send({ t: "sell", building: this.focus }), // the card's button; Delete
    close: () => this.close(),
    escape: () => this.escape(),
    pause: () => (this.paused = !this.paused),
    sandbox: () => (this.panel = !this.panel),
  };

  /** `name`, `name:value`, or `sb:<op>:<value>` for the sandbox. */
  act(action: string): void {
    const [name = "", arg = "", value = ""] = action.split(":");
    if (name === "sb") this.send({ t: "sandbox", op: sandboxOp(arg, value, this.w, this.focus) });
    else this.actions[name]?.(Number(arg));
    this.update();
  }

  /** After each action and frame: a card whose building is gone closes, an agent whose slot closed gives way to the hero. */
  update(): void {
    if (this.w.buildings.slotOf(this.focus) < 0) this.focus = -1;
    if (this.agent >= slotsOpen(this.w)) this.agent = 0;
  }

  /** Tab: the build menu's next suggested spot, else the next building by distance from the agent (TK 8.3). */
  private next(dir: 1 | -1): void {
    if (this.building) {
      this.mouse = null;
      this.spot = nextSpot(this.w, this.kind, this.spots, (this.spot + dir + this.spots.length) % this.spots.length, dir);
      return;
    }
    const B = this.w.buildings;
    const from = { x: this.w.agents.x[this.agent]!, z: this.w.agents.z[this.agent]! };
    const order = B.live().sort((p, r) => dist2(B.x[p]!, B.z[p]!, from) - dist2(B.x[r]!, B.z[r]!, from) || p - r);
    const at = order.indexOf(B.slotOf(this.focus));
    this.focus = B.id(order[at < 0 ? (dir > 0 ? 0 : order.length - 1) : (at + dir + order.length) % order.length]!);
  }

  /** The ghost starts at `at` (a click on open ground), else at the kind's first suggested spot. */
  private choose(kind: number, at: Point | null): void {
    if (!(kind >= 1 && kind < this.w.c.buildings.length)) return;
    this.focus = -1;
    this.building = true;
    this.kind = kind;
    this.mouse = at;
    this.spots = spotCandidates(this.w, kind);
    this.spot = nextSpot(this.w, kind, this.spots, 0, 1);
  }

  /** Where the build ghost stands (a mine on the node it would take) and, in words, why it may not ("" when it may). */
  ghost(): { x: number; z: number; reason: string } | null {
    const at = this.mouse ?? this.spots[this.spot];
    if (!this.building || at === undefined) return null;
    const placed = canPlace(this.w, this.kind, q(at.x), q(at.z));
    return placed.ok ? { x: placed.x, z: placed.z, reason: "" } : { x: at.x, z: at.z, reason: REASON[placed.reason]! };
  }

  private build(at: Point | null): void {
    if (at !== null) this.mouse = at;
    const ghost = this.ghost();
    if (ghost === null || ghost.reason !== "") return;
    this.send({ t: "build", def: this.kind, qx: q(ghost.x), qz: q(ghost.z) });
    this.close();
  }

  pointer(p: Point): void {
    if (this.building) this.mouse = p;
  }

  /** The ripe plot of farm b under p, −1 none. */
  private ripePlot(b: number, p: Point): number {
    for (let k = 0; k < FARM.plots; k += 1) if (this.w.buildings.plot[b * FARM.plots + k] === PLOT.ripe && dist2(p.x, p.z, plotAt(this.w, b, k)) <= 1) return k;
    return -1;
  }

  /** TK 8.3: right sends the agent to a building or to stand at the point; left builds, harvests a ripe plot, marks a tree, opens a card or the build menu. */
  click(p: Point, right: boolean): void {
    const B = this.w.buildings;
    const hit = B.live().find((b) => dist2(B.x[b]!, B.z[b]!, p) <= (this.w.c.buildings[B.def[b]!]!.radius + 0.3) ** 2);
    const b = hit === undefined ? -1 : B.id(hit);
    const plot = hit === undefined ? -1 : this.ripePlot(hit, p);
    const tree = this.w.map.trees.findIndex(([x, z], t) => this.w.trees.standing[t] === 1 && dist2(x, z, p) <= (TREE.radiusM + 0.3) ** 2);
    const field = Math.abs(p.x) <= this.w.map.halfM && Math.abs(p.z) <= this.w.map.halfM;
    if (right && this.building) this.close();
    else if (right) this.send(b >= 0 ? { t: "assignUnit", agent: this.agent, building: b } : { t: "move", agent: this.agent, qx: q(p.x), qz: q(p.z) });
    else if (this.building) this.build(p);
    else if (plot >= 0) this.send({ t: "harvestPlot", building: b, plot });
    else if (tree >= 0 && b < 0) this.send({ t: "markTree", tree });
    else if (b >= 0 || this.focus >= 0 || !field) this.focus = b;
    else this.choose(this.kind, p);
    this.update();
  }

  /** Esc (TK 6.15): lets go of the locked word, else closes the menu, else goes back to the hero, else pauses. */
  private escape(): void {
    const router = this.w.typing.router;
    if (router.lock >= 0 || router.group >= 0) this.send({ t: "unlock" });
    else if (this.building || this.focus >= 0) this.close();
    else if (this.agent !== 0) this.agent = 0;
    else this.paused = !this.paused;
  }

  private close(): void {
    this.focus = -1;
    this.building = false;
  }
}
