/**
 * The 1A picture (docs/td/BUILD_NOW.md §5.1): the world seen from above on a
 * Canvas 2D, no media. Grass, lanes, the Silver Stream and its bridges, ore
 * nodes, buildings as discs of their true radius, enemies as ink-purple dots
 * sized by tier, soldiers, shots and short-lived hit marks read from the
 * combat ring; each building's heat lanterns and tempo badge; the hero and
 * the helpers with their paths and assist lines; Word Shots with a jade head
 * trailing their word; the player's hand. The camera zooms and pans. It reads
 * the world and never changes it.
 */
import { BUILD, TEMPO, TICK_HZ } from "../content/rules";
import { FX } from "../sim/events";
import { MODE, PATH_MAX } from "../sim/stores/agents";
import { PROJECTILE } from "../sim/stores/projectiles";
import { slotsOpen } from "../sim/systems/agents";
import type { World } from "../sim/world";
import { wordText } from "../typing/decks";

const COLOR = {
  grass: "#7dba5a", edge: "#6aa64b", road: "#c9a66b", roadEdge: "#8f6f3f", water: "#5da9e9", bridge: "#8b5a2b",
  ink: "#2b2118", paper: "#fff4d6", ore: "#c98a2e", soldier: "#3b7ddd", enemyHp: "#ff4a4a", buildingHp: "#ffb020", jade: "#0b8a78", lamp: "#ffb84d",
} as const;

const FONT = '"Be Vietnam Pro", ui-sans-serif, system-ui, sans-serif';
/** How long a hit mark stays, in ticks. */
const MARK_TICKS = 24;
/** Draconis from above, nose up: a body and two swept wings, in metres. */
const DRAGON = new Path2D("M0 -1.15L0.35 -0.15L1.3 0.7L0.27 0.4L0 0.85L-0.27 0.4L-1.3 0.7L-0.35 -0.15Z");
/** The rally flag: a pole up from the point, a pennant at its top. */
const FLAG = new Path2D("M0 0V-1.6L1.1 -1.25L0 -0.9Z");

type Mark = { kind: number; x: number; z: number; value: number; tick: number };
/** The player's hand (app/selection.ts): the selected agent, the building in focus by id, the build menu's kind and ghost. */
export type Hand = { agent: number; focus: number; kind: number; ghost(): { x: number; z: number; reason: string } | null };

export class DebugView {
  private readonly ctx: CanvasRenderingContext2D;
  private scale = 1;
  private ox = 0;
  private oy = 0;
  private ratio = 1;
  /** The scale at zoom 1, and the middle of the area the field fits in (canvas px): zoom and pan stay around them. */
  private readonly fit = { scale: 1, x: 0, y: 0 };
  private readCursor = 0;
  private readonly marks: Mark[] = [];

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (ctx === null) throw new Error("typing defense: no 2D canvas");
    this.ctx = ctx;
  }

  /** Fits the field (with a margin) into the canvas above the `bottom` px the word strip keeps. */
  resize(cssWidth: number, cssHeight: number, ratio: number, halfM: number, bottom: number): void {
    this.ratio = ratio;
    this.canvas.width = Math.round(cssWidth * ratio);
    this.canvas.height = Math.round(cssHeight * ratio);
    this.fit.scale = this.scale = (Math.min(cssWidth, cssHeight - bottom) / (halfM * 2 + 4)) * ratio;
    this.fit.x = this.ox = this.canvas.width / 2;
    this.fit.y = this.oy = ((cssHeight - bottom) / 2) * ratio;
  }

  /** Moves the field `dx`, `dy` CSS px; its centre stays within half its size of the middle. */
  panBy(dx: number, dy: number): void {
    const room = this.scale * 50;
    this.ox = Math.max(this.fit.x - room, Math.min(this.fit.x + room, this.ox + dx * this.ratio));
    this.oy = Math.max(this.fit.y - room, Math.min(this.fit.y + room, this.oy + dy * this.ratio));
  }

  /** Zooms 1–2.5× (BUILD_NOW §5.4) about the point under (px, py). */
  zoomAt(px: number, py: number, factor: number): void {
    const k = Math.max(this.fit.scale, Math.min(2.5 * this.fit.scale, this.scale * factor)) / this.scale;
    this.scale *= k;
    this.ox = px * this.ratio - k * (px * this.ratio - this.ox);
    this.oy = py * this.ratio - k * (py * this.ratio - this.oy);
    this.panBy(0, 0);
  }

  /** Screen point (CSS px) of a world point. */
  project(x: number, z: number): { x: number; y: number } {
    return { x: (this.ox + x * this.scale) / this.ratio, y: (this.oy + z * this.scale) / this.ratio };
  }

  unproject(px: number, py: number): { x: number; z: number } {
    return { x: (px * this.ratio - this.ox) / this.scale, z: (py * this.ratio - this.oy) / this.scale };
  }

  draw(w: World, hand: Hand): void {
    const { ctx } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = COLOR.grass;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.scale, 0, 0, this.scale, this.ox, this.oy);
    this.ground(w);
    this.buildings(w, hand);
    this.ghost(w, hand);
    this.soldiers(w);
    this.enemies(w);
    this.agents(w, hand);
    this.shots(w);
    this.readMarks(w);
    this.drawMarks(w);
  }

  private px(pixels: number): number {
    return (pixels * this.ratio) / this.scale;
  }

  private disc(x: number, z: number, r: number, fill: string | null, stroke: string | null, strokePx = 1.5): void {
    const { ctx } = this;
    ctx.beginPath();
    ctx.arc(x, z, r, 0, Math.PI * 2);
    if (fill !== null) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke !== null) {
      ctx.lineWidth = this.px(strokePx);
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }

  /** A label in screen pixels at a world point; with `edge`, on a paper chip edged in that colour (TK 12.5's reason chip). */
  private text(label: string, x: number, z: number, sizePx: number, color: string, weight = 800, edge = ""): void {
    const { ctx } = this;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = weight + " " + Math.round(sizePx * this.ratio) + "px " + FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (edge !== "") {
      const half = ctx.measureText(label).width / 2 + 0.6 * sizePx * this.ratio;
      ctx.beginPath();
      ctx.roundRect(this.ox + x * this.scale - half, this.oy + z * this.scale - 0.85 * sizePx * this.ratio, half * 2, 1.7 * sizePx * this.ratio, 6 * this.ratio);
      Object.assign(ctx, { fillStyle: COLOR.paper, strokeStyle: edge, lineWidth: 2 * this.ratio });
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = color;
    ctx.fillText(label, this.ox + x * this.scale, this.oy + z * this.scale);
    ctx.restore();
  }

  private bar(x: number, z: number, width: number, share: number, color: string): void {
    const { ctx } = this;
    const h = this.px(4);
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(x - width / 2 - this.px(1), z - this.px(1), width + this.px(2), h + this.px(2));
    ctx.fillStyle = color;
    ctx.fillRect(x - width / 2, z, width * Math.max(0, Math.min(1, share)), h);
  }

  private ground(w: World): void {
    const { ctx } = this;
    const half = w.map.halfM;
    ctx.strokeStyle = COLOR.edge;
    ctx.lineWidth = this.px(2);
    ctx.strokeRect(-half, -half, half * 2, half * 2);
    ctx.fillStyle = COLOR.water;
    for (const rect of w.map.water) ctx.fillRect(rect.x0, rect.z0, rect.x1 - rect.x0, rect.z1 - rect.z0);
    // Roads: a dark rim, then the dirt on top, so the fork reads as one road.
    const lanes = w.lanes.slice(0, -1);
    for (const [color, extra] of [[COLOR.roadEdge, this.px(3)], [COLOR.road, 0]] as const) {
      ctx.strokeStyle = color;
      ctx.lineWidth = w.map.roadHalfM * 2 + extra;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const lane of lanes) {
        ctx.beginPath();
        for (let index = 0; index < lane.xs.length; index += 4) ctx.lineTo(lane.xs[index]!, lane.zs[index]!);
        ctx.lineTo(lane.xs[lane.xs.length - 1]!, lane.zs[lane.zs.length - 1]!);
        ctx.stroke();
      }
    }
    for (const rect of w.map.bridges) {
      ctx.fillStyle = COLOR.bridge;
      ctx.fillRect(rect.x0 - 0.3, rect.z0, rect.x1 - rect.x0 + 0.6, rect.z1 - rect.z0);
      ctx.strokeStyle = COLOR.ink;
      ctx.lineWidth = this.px(1);
      ctx.beginPath();
      for (let x = rect.x0 + 0.5; x < rect.x1; x += 0.75) ctx.rect(x, rect.z0, 0, rect.z1 - rect.z0);
      ctx.stroke();
    }
    // The flying route: a faint dashed line.
    const fly = w.lanes[w.lanes.length - 1]!;
    ctx.setLineDash([this.px(6), this.px(6)]);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = this.px(1.5);
    ctx.beginPath();
    for (let index = 0; index < fly.xs.length; index += 8) ctx.lineTo(fly.xs[index]!, fly.zs[index]!);
    ctx.stroke();
    // No building inside this ring around the Bastion.
    this.disc(w.map.keep[0], w.map.keep[1], BUILD.keepClearM, null, "rgba(43, 33, 24, 0.55)");
    ctx.setLineDash([]);
    this.disc(w.map.gate[0], w.map.gate[1], 2.4, "#3e2766", COLOR.ink, 2);
    w.map.nodes.forEach((node, index) => {
      if (w.buildings.live(1).some((b) => w.buildings.node[b] === index)) return; // a mine stands on it
      this.disc(node.x, node.z, BUILD.footprintR.L, "rgba(201, 138, 46, 0.25)", COLOR.ore, 2);
      this.text("★".repeat(node.richness), node.x, node.z, 12, COLOR.ore);
    });
  }

  private buildings(w: World, hand: Hand): void {
    const B = w.buildings;
    for (let b = 0; b < B.top; b += 1) {
      if (B.used[b] === 0) continue;
      const spec = w.c.buildings[B.def[b]!]!;
      const x = B.x[b]!;
      const z = B.z[b]!;
      const r = spec.radius;
      const level = B.level[b]!;
      const building = w.tick < B.readyTick[b]!;
      if (B.id(b) === hand.focus) this.disc(x, z, r + 0.7, "rgba(127, 245, 224, 0.35)", COLOR.jade, 3);
      if (spec.attack !== null && !building) this.disc(x, z, spec.attack.levels[level - 1]!.range, null, "rgba(43, 33, 24, 0.22)", 1);
      if (building) this.ctx.setLineDash([this.px(4), this.px(3)]);
      this.disc(x, z, r, building ? "rgba(255, 244, 214, 0.6)" : spec.def.view.color, COLOR.ink, 2);
      this.ctx.setLineDash([]);
      this.text(spec.def.view.short, x, z - 0.2, b === 0 ? 15 : 14, COLOR.ink);
      // Level marks under the letter (the Bastion has 4 levels).
      for (let mark = 0; mark < level; mark += 1) {
        this.ctx.fillStyle = COLOR.ink;
        this.ctx.fillRect(x - 0.6 * level + mark * 1.2 + 0.25, z + r * 0.45, 0.7, this.px(3));
      }
      // Five lanterns over the roof: heat, a lantern per point, half lit at half a point.
      for (let lamp = 0; lamp < 5; lamp += 1) {
        const lit = B.heat[b]! - lamp * 1000;
        this.disc(x - 1.9 + lamp * 0.95, z - r - 0.9, 0.42, lit >= 1000 ? COLOR.lamp : lit >= 500 ? "#ffe0a8" : COLOR.paper, COLOR.ink, 1);
      }
      const tempo = TEMPO[B.tempo[b]!]!.periodS;
      this.text(tempo === 0 ? "Dừng" : tempo + "s", x + r + 0.9, z + r * 0.6, 10, COLOR.ink, 700);
      if (B.assist[b]! >= 0 && B.waiting[b] === 1) this.text("…", x, z - r - 1.7, 14, COLOR.ink);
      if (spec.hp[0] > 0 && B.hp[b]! < spec.hp[level - 1]!) this.bar(x, z + r + 0.5, r * 2, B.hp[b]! / spec.hp[level - 1]!, COLOR.buildingHp);
      if (spec.barracks !== null) this.shape(FLAG, B.rallyX[b]!, B.rallyZ[b]!, COLOR.soldier);
      if (spec.mine !== null && B.pile[b]! > 0) this.text("+" + Math.floor(B.pile[b]! / 1000), x + r + 1.2, z, 11, "#7a4f12");
    }
  }

  /** The build ghost (TK 12.5): the kind's disc and reach; where it may not stand, a red ring and the reason on a chip under it. */
  private ghost(w: World, hand: Hand): void {
    const g = hand.ghost();
    const spec = w.c.buildings[hand.kind]!;
    if (g === null) return;
    if (spec.attack !== null) this.disc(g.x, g.z, spec.attack.levels[0]!.range, null, "rgba(43, 33, 24, 0.35)", 1);
    this.disc(g.x, g.z, spec.radius, spec.def.view.color + "99", g.reason === "" ? COLOR.ink : COLOR.enemyHp, 3);
    if (g.reason !== "") this.text(g.reason, g.x, g.z + spec.radius + this.px(18), 14, COLOR.ink, 800, COLOR.ink);
  }

  /** A shape drawn in metres about (x, z), filled and edged in ink. */
  private shape(path: Path2D, x: number, z: number, fill: string): void {
    const { ctx } = this;
    ctx.translate(x, z);
    Object.assign(ctx, { fillStyle: fill, strokeStyle: COLOR.ink, lineWidth: this.px(1.5) });
    ctx.fill(path);
    ctx.stroke(path);
    ctx.translate(-x, -z);
  }

  private soldiers(w: World): void {
    const U = w.units;
    for (let s = 0; s < U.top; s += 1) {
      if (U.used[s] === 0 || U.hp[s]! <= 0) continue;
      this.disc(U.x[s]!, U.z[s]!, 0.55, COLOR.soldier, U.contact[s] === 1 ? COLOR.paper : COLOR.ink, U.contact[s] === 1 ? 2 : 1.2);
      const max = w.c.buildings[w.buildings.def[U.barracks[s]!]!]!.barracks!.levels[w.buildings.level[U.barracks[s]!]! - 1]!.hp;
      if (U.hp[s]! < max) this.bar(U.x[s]!, U.z[s]! - 1.1, 1.2, U.hp[s]! / max, COLOR.soldier);
    }
  }

  private enemies(w: World): void {
    const E = w.enemies;
    for (let e = 0; e < E.top; e += 1) {
      if (E.used[e] === 0) continue;
      const def = w.c.enemies[E.def[e]!]!;
      const x = E.x[e]!;
      const z = E.z[e]!;
      if (def.altitude > 0) {
        // Flyers: a ground shadow, the body lifted, a soft glow ring.
        this.disc(x + 0.5, z + 0.9, def.radius * 0.8, "rgba(43, 33, 24, 0.25)", null);
        this.disc(x, z, def.radius + 0.45, "rgba(186, 160, 255, 0.35)", null);
      }
      this.disc(x, z, def.radius, def.def.view.color, COLOR.ink, def.armor > 0 ? 3 : 1.2);
      if (E.hp[e]! < def.hp) this.bar(x, z - def.radius - 0.7, Math.max(1.4, def.radius * 2), E.hp[e]! / def.hp, COLOR.enemyHp);
    }
  }

  private polyline(points: ArrayLike<number>, color: string, dash: number, widthPx = 3): void {
    const { ctx } = this;
    Object.assign(ctx, { strokeStyle: color, lineWidth: this.px(widthPx) });
    ctx.setLineDash(dash > 0 ? [this.px(dash), this.px(dash * 0.7)] : []);
    ctx.beginPath();
    for (let k = 0; k < points.length; k += 2) ctx.lineTo(points[k]!, points[k + 1]!);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /** The assist line; a walker's path ahead, dashed; Thư Đồng as lettered discs, Draconis a winged triangle over its shadow. */
  private agents(w: World, hand: Hand): void {
    const A = w.agents;
    const B = w.buildings;
    for (let a = 0; a < A.top; a += 1) {
      if (a >= slotsOpen(w) && A.goal[a]! < 0 && A.mode[a] === MODE.stand) continue; // a closed slot's helper waits inside the Bastion
      const view = a === 0 ? w.c.content.hero.view : w.c.content.helpers[a - 1]!.view;
      const left = (A.until[a]! - w.tick) / ((A.mode[a] === MODE.land ? w.c.content.hero.landS : w.c.content.hero.takeoffS) * TICK_HZ);
      const up = A.mode[a] === MODE.fly ? 1 : A.mode[a] === MODE.takeoff ? 1 - left : A.mode[a] === MODE.land ? left : 0; // height 0–1: the body lifts off its shadow
      let x = A.x[a]!;
      let z = A.z[a]!;
      // Perched on an eave, or low over one, Draconis is drawn 1 m out from it: the letter and the level marks stay readable.
      for (let b = 0; a === 0 && b < B.top; b += 1) {
        if (B.used[b] === 0) continue;
        const dx = A.x[a]! - B.x[b]!;
        const dz = A.z[a]! - B.z[b]!;
        const d = Math.sqrt(dx * dx + dz * dz);
        const out = (w.c.buildings[B.def[b]!]!.radius + 1 - d) * (1 - up);
        if (d === 0 || out <= 0) continue;
        x += (dx / d) * out;
        z += (dz / d) * out;
      }
      // The assist line stops 0.3 r inside the rim: joined to the building, off its letter and level marks.
      const at = A.at[a]!;
      const tx = at >= 0 ? B.x[at]! - x : 0;
      const tz = at >= 0 ? B.z[at]! - z : 0;
      const reach = at >= 0 ? 1 - (0.7 * w.c.buildings[B.def[at]!]!.radius) / Math.sqrt(tx * tx + tz * tz) : 0;
      if (reach > 0) this.polyline([x, z, x + tx * reach, z + tz * reach], view.color, 0);
      // The locked word's light runs down the line a step a right key and reaches the building as the word is done (TK 23.7).
      const lock = w.typing.router.lock;
      const f = lock >= 0 && reach > 0 && w.words.building[lock] === at ? (reach * w.words.typed[lock]!) / w.typing.deck.len[w.words.word[lock]!]! : 0;
      if (f > 0) this.disc(x + tx * f, z + tz * f, 0.5, "#e6fffa", COLOR.jade, 1.5);
      if (a === hand.agent) this.disc(x, z, a === 0 ? 1.6 : 1.3, null, COLOR.jade, 3);
      if (A.mode[a] === MODE.walk) this.polyline([x, z, ...A.path.subarray((a * PATH_MAX + A.next[a]!) * 2, (a * PATH_MAX + A.pathN[a]!) * 2)], view.color, 7);
      if (a > 0) {
        this.disc(x, z, 0.85, view.color, COLOR.ink, 1.5);
        this.text(view.short, x, z, 10, COLOR.ink);
        continue;
      }
      if (up > 0) this.disc(x + 0.9 * up, z + 1.4 * up, 0.9, "rgba(43, 33, 24, 0.25)", null);
      this.shape(DRAGON, x, z - 0.8 * up, view.color);
    }
  }

  private shots(w: World): void {
    const P = w.projectiles;
    for (let p = 0; p < P.top; p += 1) {
      if (P.used[p] === 0) continue;
      const x = P.x[p]!;
      const z = P.z[p]!;
      const kind = P.kind[p]!;
      if (kind === PROJECTILE.wordShot) {
        this.wordShot(w, x, z, P.tx[p]! - x, P.tz[p]! - z, P.word[p]!);
        continue;
      }
      if (kind === PROJECTILE.shell) {
        this.disc(x + 0.35, z + 0.6, 0.3, "rgba(43, 33, 24, 0.3)", null);
        this.disc(x, z, 0.38, COLOR.ink, null);
        continue;
      }
      const dx = P.tx[p]! - x;
      const dz = P.tz[p]! - z;
      const back = (kind === PROJECTILE.bolt ? 1.4 : 1.1) / (Math.sqrt(dx * dx + dz * dz) || 1);
      this.polyline([x - dx * back, z - dz * back, x, z], kind === PROJECTILE.bolt ? COLOR.paper : COLOR.ink, 0, kind === PROJECTILE.bolt ? 3 : 2);
    }
  }

  /** A jade head with the word's letters trailing behind it. */
  private wordShot(w: World, x: number, z: number, dx: number, dz: number, word: number): void {
    const d = Math.sqrt(dx * dx + dz * dz) || 1;
    const text = word >= 0 ? wordText(w.typing.deck, word) : "";
    for (let k = 0; k < text.length; k += 1) this.text(text[text.length - 1 - k]!, x - (dx / d) * 0.9 * (k + 1), z - (dz / d) * 0.9 * (k + 1), 11, "rgba(11, 138, 120, " + (0.9 - k * 0.1).toFixed(2) + ")");
    this.disc(x, z, 0.45, "#7ff5e0", COLOR.jade, 2);
  }

  private readMarks(w: World): void {
    const ring = w.events.ring;
    if (ring.written - this.readCursor > ring.size) this.readCursor = ring.written - ring.size;
    for (; this.readCursor < ring.written; this.readCursor += 1) {
      const slot = this.readCursor % ring.size;
      const kind = ring.kind[slot]!;
      if (kind === FX.death || kind === FX.burst || kind === FX.leak || kind === FX.coin || kind === FX.soldierDown || kind === FX.fizzle || kind === FX.wordGold) {
        this.marks.push({ kind, x: ring.x[slot]!, z: ring.z[slot]!, value: ring.value[slot]!, tick: ring.tick[slot]! });
      }
    }
    while (this.marks.length > 0 && (w.tick - this.marks[0]!.tick > MARK_TICKS || this.marks.length > 200)) this.marks.shift();
  }

  private drawMarks(w: World): void {
    for (const mark of this.marks) {
      const age = Math.max(0, w.tick - mark.tick) / MARK_TICKS;
      const alpha = (1 - age).toFixed(2);
      if (mark.kind === FX.burst) this.disc(mark.x, mark.z, (mark.value / 100) * (0.4 + 0.6 * age), null, "rgba(255, 176, 32, " + alpha + ")", 3);
      else if (mark.kind === FX.death) this.disc(mark.x, mark.z, 0.6 + age * 1.4, "rgba(91, 58, 140, " + (0.5 * (1 - age)).toFixed(2) + ")", null);
      else if (mark.kind === FX.soldierDown) this.disc(mark.x, mark.z, 0.5 + age, null, "rgba(59, 125, 221, " + alpha + ")", 2);
      else if (mark.kind === FX.leak) this.disc(mark.x, mark.z, 1 + age * 4, null, "rgba(255, 74, 74, " + alpha + ")", 3);
      else if (mark.kind === FX.fizzle) this.disc(mark.x, mark.z - 2 - age * 3, 0.4 + age * 1.6, null, "rgba(127, 245, 224, " + alpha + ")", 2);
      else if (mark.kind === FX.wordGold) this.text("+" + Number((mark.value / 1000).toFixed(1)), mark.x, mark.z - 3 - age * 3, 13, "rgba(201, 138, 46, " + alpha + ")");
      else this.text("+" + mark.value, mark.x, mark.z - 1 - age * 2.5, 12, "rgba(201, 138, 46, " + alpha + ")");
    }
  }
}
