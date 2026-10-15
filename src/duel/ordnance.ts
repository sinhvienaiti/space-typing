import type { VisualQuality } from "../types";
import { drawGlow, drawRingGlow, parseRgb } from "../vfx/light-sprites";
import { drawFlameStreak } from "./afterburner";

/**
 * Duel weapons in flight (2026-10-03 weapons pass). Every typed weapon used
 * to fly as the ship's ordinary bolt, only bigger; now each has its own body
 * and light, presentation only (damage stays in the engine):
 *
 * - LASER: twin tapered beams from the guns, energy pulses running along
 *   them, sizzling contact, burst on arrival.
 * - MISSILE: shaded rocket bodies that roll as they fly, a fire exhaust, a
 *   light ribbon and smoke; they eject, curve and dive in, one blast each.
 * - RAILGUN: the gun charges (converging sparks), then a hyper-velocity slug
 *   leaves a tracer and rings of shock along its line, and pierces.
 * - BOMB: a slow metal sphere with a pulsing core and two energy rings
 *   orbiting it in 3D, a comet tail, then the biggest blast.
 * - SIEGE LANCE: a crystal spear grows at the nose while the rival may
 *   counter; it fires a giant beam, or shatters if intercepted.
 *
 * Flight is perspective-correct between the two ships (bodies shrink and
 * slow as they recede, swell and speed up as they come at you). Bodies are
 * pre-rendered shaded sprites; glows and trails are additive.
 */

export type OrdnanceKind = "laser" | "missile" | "railgun" | "bomb" | "combo";
type Side = "self" | "opponent";
type Point = { x: number; y: number };

export type OrdnanceLaunch = {
  kind: OrdnanceKind;
  side: Side;
  /** Seconds until the lead hit (the engine's travel time). */
  travel: number;
  /** Where each body leaves (guns), screen px. */
  origins: readonly Point[];
  /** Drawn scale of the shooter and of the target (perspective). */
  originScale: number;
  targetScale: number;
  color: string;
  heat: number;
};

type Body = {
  kind: OrdnanceKind;
  side: Side;
  target: Side;
  index: number;
  lead: boolean;
  t: number;
  delay: number;
  duration: number;
  ox: number; oy: number;
  sA: number; sB: number;
  lateral: number;
  arc: number;
  color: string;
  heat: number;
  x: number; y: number; scale: number; angle: number;
  roll: number;
  trail: Float32Array;
  trailCount: number;
  launched: boolean;
  done: boolean;
};

type Beam = {
  side: Side;
  target: Side;
  t: number;
  duration: number;
  origins: Point[];
  sA: number; sB: number;
  color: string;
  hit: boolean;
  tx: number; ty: number;
};

type Lance = {
  id: string;
  side: Side;
  target: Side;
  t: number;
  window: number;
  origin: Point;
  scale: number;
  targetScale: number;
  color: string;
  state: "charge" | "strike" | "break";
  stateT: number;
  tx: number; ty: number;
};

type Effect = {
  kind: "pierce" | "shock" | "flash" | "shard" | "tracer";
  /** Tracer: where the line started and its scale there. */
  x0?: number; y0?: number; s0?: number;
  x: number; y: number; angle: number; scale: number;
  t: number; life: number; color: string;
  vx?: number; vy?: number;
};

export type OrdnanceImpact = (kind: OrdnanceKind, target: Side, x: number, y: number, angle: number, lead: boolean, heat: number) => void;
export type OrdnanceTrail = (x: number, y: number, angle: number, scale: number, heavy: boolean) => void;

const TRAIL = 18;
const MAX_BODIES = 28;
const WHITE = "#ffffff";
const FIRE = "#ffb24a";
const HOT = "#fff1c9";

/** Bodies and how they fly, per kind. */
const PLAN: Readonly<Record<OrdnanceKind, { count: number; stagger: number; lateral: number; size: number }>> = {
  laser: { count: 0, stagger: 0, lateral: 0, size: 1 },
  missile: { count: 3, stagger: 0.07, lateral: 0.28, size: 1 },
  railgun: { count: 1, stagger: 0, lateral: 0, size: 1 },
  bomb: { count: 1, stagger: 0, lateral: 0.12, size: 1 },
  combo: { count: 4, stagger: 0.06, lateral: 0.34, size: 0.9 },
};

/** How much of the travel the railgun spends charging before the slug flies. */
const RAIL_CHARGE = 0.72;

// --- Pre-rendered sprites ---------------------------------------------------

const spriteCache = new Map<string, HTMLCanvasElement | null>();

function canvas(width: number, height: number, paint: (g: CanvasRenderingContext2D) => void): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const g = c.getContext("2d");
  if (g === null) return null;
  paint(g);
  return c;
}

function rgba(color: string, alpha: number): string {
  const [r, g, b] = parseRgb(color);
  return "rgba(" + r + "," + g + "," + b + "," + alpha.toFixed(3) + ")";
}

function cached(key: string, make: () => HTMLCanvasElement | null): HTMLCanvasElement | null {
  let sprite = spriteCache.get(key);
  if (sprite === undefined) {
    sprite = make();
    spriteCache.set(key, sprite);
  }
  return sprite;
}

/**
 * A missile pointing right (+x), lit from above: metal body, coloured band,
 * ogive nose, four fins at roll angle `roll` (fins behind the body first).
 */
function missileSprite(color: string, frame: number): HTMLCanvasElement | null {
  return cached("missile:" + color + ":" + frame, () => canvas(112, 40, (g) => {
    const cy = 20, r = 8;
    const roll = (frame / 8) * (Math.PI / 2);
    const fin = (angle: number, front: boolean): void => {
      const reach = Math.sin(angle) * 13;
      const depth = Math.cos(angle);
      if ((depth >= 0) !== front) return;
      const shade = 0.45 + 0.4 * Math.max(0, depth);
      g.fillStyle = "rgba(" + Math.round(150 * shade) + "," + Math.round(160 * shade) + "," + Math.round(175 * shade) + ",1)";
      g.beginPath();
      g.moveTo(22, cy + Math.sign(reach) * r * 0.6);
      g.lineTo(14, cy + reach + Math.sign(reach) * r * 0.6);
      g.lineTo(30, cy + reach * 0.85 + Math.sign(reach) * r * 0.6);
      g.lineTo(38, cy + Math.sign(reach) * r * 0.6);
      g.closePath();
      g.fill();
    };
    for (let k = 0; k < 4; k += 1) fin(roll + k * Math.PI / 2, false);
    // Body: a lit cylinder.
    const body = g.createLinearGradient(0, cy - r, 0, cy + r);
    body.addColorStop(0, "#f4f7fb");
    body.addColorStop(0.35, "#b9c2cd");
    body.addColorStop(0.75, "#4f5866");
    body.addColorStop(1, "#262b33");
    g.fillStyle = body;
    g.fillRect(16, cy - r, 76, r * 2);
    // Ogive nose.
    const nose = g.createLinearGradient(0, cy - r, 0, cy + r);
    nose.addColorStop(0, "#ffffff");
    nose.addColorStop(0.4, "#c9d1db");
    nose.addColorStop(1, "#30363f");
    g.fillStyle = nose;
    g.beginPath();
    g.moveTo(92, cy - r);
    g.quadraticCurveTo(108, cy - r * 0.6, 111, cy);
    g.quadraticCurveTo(108, cy + r * 0.6, 92, cy + r);
    g.closePath();
    g.fill();
    // Coloured warhead band and a hot seam.
    const band = g.createLinearGradient(0, cy - r, 0, cy + r);
    band.addColorStop(0, rgba(color, 1));
    band.addColorStop(0.5, rgba(color, 0.85));
    band.addColorStop(1, rgba(color, 0.4));
    g.fillStyle = band;
    g.fillRect(70, cy - r, 9, r * 2);
    // Specular streak along the top.
    g.fillStyle = "rgba(255,255,255,0.65)";
    g.fillRect(20, cy - r + 2, 70, 1.6);
    // Nozzle.
    g.fillStyle = "#1b1f26";
    g.fillRect(10, cy - r * 0.8, 7, r * 1.6);
    g.fillStyle = rgba(FIRE, 0.95);
    g.fillRect(9, cy - r * 0.45, 2, r * 0.9);
    for (let k = 0; k < 4; k += 1) fin(roll + k * Math.PI / 2, true);
  }));
}

/** A metal sphere lit from the upper left, glowing seams in the ship colour. */
function bombSprite(color: string): HTMLCanvasElement | null {
  return cached("bomb:" + color, () => canvas(96, 96, (g) => {
    const shell = g.createRadialGradient(36, 32, 4, 48, 48, 46);
    shell.addColorStop(0, "#ffffff");
    shell.addColorStop(0.12, "#d5dbe3");
    shell.addColorStop(0.5, "#5e6673");
    shell.addColorStop(0.92, "#1a1e25");
    shell.addColorStop(1, "rgba(10,12,16,0)");
    g.fillStyle = shell;
    g.beginPath();
    g.arc(48, 48, 44, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = rgba(color, 0.95);
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(48, 50, 42, 13, 0, 0, Math.PI);
    g.stroke();
    g.beginPath();
    g.ellipse(48, 48, 12, 42, 0, -Math.PI / 2, Math.PI / 2);
    g.stroke();
    // Rim light on the shadow side.
    g.strokeStyle = rgba(color, 0.55);
    g.lineWidth = 4;
    g.beginPath();
    g.arc(48, 48, 42, 0.1, 1.6);
    g.stroke();
  }));
}

/** A hyper-velocity slug pointing right: white core, coloured sheath. */
function slugSprite(color: string): HTMLCanvasElement | null {
  return cached("slug:" + color, () => canvas(96, 28, (g) => {
    const sheath = g.createLinearGradient(0, 0, 96, 0);
    sheath.addColorStop(0, rgba(color, 0));
    sheath.addColorStop(0.55, rgba(color, 0.75));
    sheath.addColorStop(1, rgba(color, 1));
    g.fillStyle = sheath;
    g.beginPath();
    g.ellipse(56, 14, 40, 10, 0, 0, Math.PI * 2);
    g.fill();
    const core = g.createLinearGradient(20, 0, 96, 0);
    core.addColorStop(0, "rgba(255,255,255,0)");
    core.addColorStop(1, "rgba(255,255,255,1)");
    g.fillStyle = core;
    g.beginPath();
    g.ellipse(62, 14, 32, 4, 0, 0, Math.PI * 2);
    g.fill();
  }));
}

/** A faceted crystal spear pointing right. */
function lanceSprite(color: string): HTMLCanvasElement | null {
  return cached("lance:" + color, () => canvas(200, 48, (g) => {
    const [r, gg, b] = parseRgb(color);
    const light = "rgb(" + Math.min(255, r + 120) + "," + Math.min(255, gg + 120) + "," + Math.min(255, b + 120) + ")";
    g.fillStyle = light;
    g.beginPath(); g.moveTo(0, 24); g.lineTo(46, 8); g.lineTo(200, 24); g.closePath(); g.fill();
    g.fillStyle = rgba(color, 1);
    g.beginPath(); g.moveTo(0, 24); g.lineTo(46, 40); g.lineTo(200, 24); g.closePath(); g.fill();
    g.strokeStyle = "rgba(255,255,255,0.9)";
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(4, 24); g.lineTo(198, 24); g.stroke();
    g.strokeStyle = "rgba(255,255,255,0.55)";
    g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(0, 24); g.lineTo(46, 8); g.lineTo(200, 24); g.lineTo(46, 40); g.closePath(); g.stroke();
  }));
}

/** A tapered quad from (x0, y0) width w0 to (x1, y1) width w1. */
function taper(g: CanvasRenderingContext2D, x0: number, y0: number, w0: number, x1: number, y1: number, w1: number): void {
  const dx = x1 - x0, dy = y1 - y0;
  const n = Math.hypot(dx, dy) || 1;
  const px = -dy / n, py = dx / n;
  g.beginPath();
  g.moveTo(x0 + px * w0, y0 + py * w0);
  g.lineTo(x1 + px * w1, y1 + py * w1);
  g.lineTo(x1 - px * w1, y1 - py * w1);
  g.lineTo(x0 - px * w0, y0 - py * w0);
  g.closePath();
  g.fill();
}

/** Perspective-correct point between A (scale sA) and B (scale sB), u in 0…1. */
function perspective(ax: number, ay: number, sA: number, bx: number, by: number, sB: number, u: number, out: { x: number; y: number; s: number }): void {
  const wa = (1 - u) / sA, wb = u / sB;
  const z = wa + wb;
  out.x = (wa * ax + wb * bx) / z;
  out.y = (wa * ay + wb * by) / z;
  out.s = 1 / z;
}

export class DuelOrdnance {
  private readonly bodies: Body[] = [];
  private readonly beams: Beam[] = [];
  private readonly lances: Lance[] = [];
  private readonly effects: Effect[] = [];
  private readonly scratch = { x: 0, y: 0, s: 1 };
  private readonly target = { x: 0, y: 0 };
  private time = 0;
  private seed = 0x3a7f;

  get active(): number { return this.bodies.length + this.beams.length + this.lances.length; }

  launch(input: OrdnanceLaunch): void {
    const target: Side = input.side === "self" ? "opponent" : "self";
    const origins = input.origins.length > 0 ? input.origins : [{ x: 0, y: 0 }];
    if (input.kind === "laser") {
      this.beams.push({ side: input.side, target, t: 0, duration: Math.max(0.25, input.travel), origins: origins.slice(0, 2).map((p) => ({ ...p })), sA: input.originScale, sB: input.targetScale, color: input.color, hit: false, tx: 0, ty: 0 });
      if (this.beams.length > 6) this.beams.shift();
      return;
    }
    const plan = PLAN[input.kind];
    for (let index = 0; index < plan.count; index += 1) {
      if (this.bodies.length >= MAX_BODIES) this.bodies.shift();
      const origin = origins[index % origins.length]!;
      const side = plan.count === 1 ? 0 : (index / (plan.count - 1)) * 2 - 1;
      this.bodies.push({
        kind: input.kind, side: input.side, target, index, lead: index === 0,
        t: 0, delay: index * plan.stagger * input.travel,
        duration: Math.max(0.2, input.travel),
        ox: origin.x, oy: origin.y, sA: input.originScale, sB: input.targetScale,
        lateral: (side + (this.random() - 0.5) * 0.35) * plan.lateral,
        arc: input.kind === "bomb" ? (this.random() < 0.5 ? -1 : 1) : 0,
        color: input.color, heat: input.heat,
        x: origin.x, y: origin.y, scale: input.originScale, angle: input.side === "self" ? -Math.PI / 2 : Math.PI / 2,
        roll: this.random() * 8,
        trail: new Float32Array(TRAIL * 2), trailCount: 0, launched: false, done: false,
      });
    }
  }

  /** SIEGE LANCE: start charging at the shooter's nose for `window` seconds. */
  lanceCharge(id: string, side: Side, origin: Point, scale: number, targetScale: number, window: number, color: string): void {
    const target: Side = side === "self" ? "opponent" : "self";
    this.lances.push({ id, side, target, t: 0, window: Math.max(0.4, window), origin: { ...origin }, scale, targetScale, color, state: "charge", stateT: 0, tx: 0, ty: 0 });
    if (this.lances.length > 4) this.lances.shift();
  }

  /** SIEGE LANCE resolved: the giant beam (the engine's blast lands with it). */
  lanceStrike(id: string): boolean {
    const lance = this.lances.find((item) => item.id === id && item.state === "charge");
    if (lance === undefined) return false;
    lance.state = "strike";
    lance.stateT = 0;
    return true;
  }

  /** SIEGE LANCE intercepted: the spear shatters at the nose. */
  lanceBreak(id: string): boolean {
    const lance = this.lances.find((item) => item.id === id && item.state === "charge");
    if (lance === undefined) return false;
    lance.state = "break";
    lance.stateT = 0;
    for (let k = 0; k < 14; k += 1) {
      const a = this.random() * Math.PI * 2, v = 80 + this.random() * 220;
      this.effects.push({ kind: "shard", x: lance.origin.x, y: lance.origin.y, angle: a, scale: lance.scale * (0.5 + this.random() * 0.6), t: 0, life: 0.5 + this.random() * 0.3, color: lance.color, vx: Math.cos(a) * v, vy: Math.sin(a) * v });
    }
    this.effects.push({ kind: "flash", x: lance.origin.x, y: lance.origin.y, angle: 0, scale: lance.scale * 1.6, t: 0, life: 0.3, color: lance.color });
    return true;
  }

  /** Lance origins follow the shooter (it weaves while charging). */
  moveLanceOrigin(side: Side, origin: Point): void {
    for (const lance of this.lances) if (lance.side === side && lance.state === "charge") { lance.origin.x = origin.x; lance.origin.y = origin.y; }
  }

  update(dt: number, targetPoint: (side: Side, out: Point) => void, onImpact: OrdnanceImpact, onTrail: OrdnanceTrail): void {
    const step = Math.max(0, Math.min(0.1, dt));
    this.time += step;
    const p = this.scratch;
    for (const body of this.bodies) {
      body.t += step;
      const live = body.t - body.delay;
      if (live < 0) continue;
      body.launched = true;
      targetPoint(body.target, this.target);
      const tx = this.target.x, ty = this.target.y;
      const k = Math.min(1, live / body.duration);
      let u: number;
      if (body.kind === "railgun") u = k < RAIL_CHARGE ? 0 : (k - RAIL_CHARGE) / (1 - RAIL_CHARGE);
      else if (body.kind === "bomb") u = k * (0.85 + 0.15 * k);
      else u = Math.pow(k, 1.45);
      perspective(body.ox, body.oy, body.sA, tx, ty, body.sB, u, p);
      // Curves: missiles eject sideways then dive in; bombs arc.
      const dx = tx - body.ox, dy = ty - body.oy, length = Math.hypot(dx, dy) || 1;
      const nx = -dy / length, ny = dx / length;
      const bend = body.kind === "bomb"
        ? Math.sin(Math.PI * u) * body.arc * 0.16 * length
        : Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 - u) * body.lateral * length;
      const px = body.x, py = body.y;
      body.x = p.x + nx * bend;
      body.y = p.y + ny * bend;
      body.scale = p.s;
      const mx = body.x - px, my = body.y - py;
      if (Math.hypot(mx, my) > 0.3) body.angle = Math.atan2(my, mx);
      body.roll += step * 26;
      if (body.kind !== "railgun" || k >= RAIL_CHARGE) {
        // Light ribbon: newest point first.
        const trail = body.trail;
        trail.copyWithin(2, 0, TRAIL * 2 - 2);
        trail[0] = body.x;
        trail[1] = body.y;
        body.trailCount = Math.min(TRAIL, body.trailCount + 1);
        if (body.kind === "missile" || body.kind === "combo" || body.kind === "bomb") {
          onTrail(body.x, body.y, body.angle, body.scale, body.kind === "bomb");
        }
      }
      if (body.kind === "railgun" && k >= RAIL_CHARGE && body.trailCount === 1) {
        // The slug leaves: rings of shock along its line.
        for (const at of [0.2, 0.4, 0.6, 0.8]) {
          perspective(body.ox, body.oy, body.sA, tx, ty, body.sB, at, p);
          this.effects.push({ kind: "shock", x: p.x, y: p.y, angle: Math.atan2(dy, dx), scale: p.s, t: -at * 0.08, life: 0.45, color: body.color });
        }
      }
      if (k >= 1 && !body.done) {
        body.done = true;
        onImpact(body.kind, body.target, tx, ty, body.angle, body.lead, body.heat);
        if (body.kind === "railgun") {
          this.effects.push({ kind: "pierce", x: tx, y: ty, angle: body.angle, scale: body.sB, t: 0, life: 0.32, color: body.color });
          // The tracer lingers a moment, so the shot reads even at speed.
          this.effects.push({ kind: "tracer", x: tx, y: ty, x0: body.ox, y0: body.oy, s0: body.sA, angle: body.angle, scale: body.sB, t: 0, life: 0.4, color: body.color });
        }
        if (body.kind === "bomb") {
          this.effects.push({ kind: "shock", x: tx, y: ty, angle: 0, scale: body.sB * 4, t: 0, life: 0.55, color: HOT });
          this.effects.push({ kind: "flash", x: tx, y: ty, angle: 0, scale: body.sB * 3.2, t: 0, life: 0.35, color: HOT });
        }
      }
    }
    for (let index = this.bodies.length - 1; index >= 0; index -= 1) if (this.bodies[index]!.done) this.bodies.splice(index, 1);

    for (const beam of this.beams) {
      beam.t += step;
      targetPoint(beam.target, this.target);
      beam.tx = this.target.x;
      beam.ty = this.target.y;
      if (!beam.hit && beam.t >= beam.duration) {
        beam.hit = true;
        onImpact("laser", beam.target, beam.tx, beam.ty, Math.atan2(beam.ty - beam.origins[0]!.y, beam.tx - beam.origins[0]!.x), true, 0);
      }
    }
    for (let index = this.beams.length - 1; index >= 0; index -= 1) if (this.beams[index]!.t > this.beams[index]!.duration + 0.18) this.beams.splice(index, 1);

    for (const lance of this.lances) {
      // A pulse ring off the charging spear twice a second.
      if (lance.state === "charge" && Math.floor((lance.t + step) * 2) !== Math.floor(lance.t * 2)) {
        this.effects.push({ kind: "shock", x: lance.origin.x, y: lance.origin.y, angle: Math.atan2(lance.ty - lance.origin.y, lance.tx - lance.origin.x), scale: lance.scale * 1.4, t: 0, life: 0.45, color: lance.color });
      }
      lance.t += step;
      lance.stateT += step;
      targetPoint(lance.target, this.target);
      lance.tx = this.target.x;
      lance.ty = this.target.y;
    }
    for (let index = this.lances.length - 1; index >= 0; index -= 1) {
      const lance = this.lances[index]!;
      // A charge with no word from the engine fades after its window.
      const over = lance.state === "strike" ? lance.stateT > 0.55 : lance.state === "break" ? lance.stateT > 0.35 : lance.t > lance.window + 1.5;
      if (over) this.lances.splice(index, 1);
    }

    for (const effect of this.effects) {
      effect.t += step;
      if (effect.vx !== undefined && effect.vy !== undefined) {
        effect.x += effect.vx * step;
        effect.y += effect.vy * step;
        effect.vx *= Math.exp(-step * 2.5);
        effect.vy *= Math.exp(-step * 2.5);
      }
    }
    for (let index = this.effects.length - 1; index >= 0; index -= 1) if (this.effects[index]!.t > this.effects[index]!.life) this.effects.splice(index, 1);
  }

  /** K.O.: everything still in flight bursts where it is. */
  detonateAll(onImpact: OrdnanceImpact): void {
    for (const body of this.bodies) if (body.launched && !body.done) onImpact(body.kind, body.target, body.x, body.y, body.angle, false, body.heat);
    this.bodies.length = 0;
    this.beams.length = 0;
  }

  clear(): void {
    this.bodies.length = 0;
    this.beams.length = 0;
    this.lances.length = 0;
    this.effects.length = 0;
  }

  draw(g: CanvasRenderingContext2D, quality: VisualQuality): void {
    const rich = quality === "high" || quality === "ultra";
    g.save();
    for (const lance of this.lances) this.drawLance(g, lance, rich);
    for (const beam of this.beams) this.drawBeam(g, beam, rich);
    for (const body of this.bodies) {
      if (!body.launched) continue;
      this.drawTrail(g, body, rich);
    }
    for (const body of this.bodies) {
      if (!body.launched) continue;
      if (body.kind === "missile" || body.kind === "combo") this.drawMissile(g, body, rich);
      else if (body.kind === "bomb") this.drawBomb(g, body, rich);
      else if (body.kind === "railgun") this.drawRail(g, body, rich);
    }
    this.drawEffects(g);
    g.restore();
  }

  // --- Drawing ----------------------------------------------------------------

  /** A light ribbon: widest and brightest at the body, fading behind it. */
  private drawTrail(g: CanvasRenderingContext2D, body: Body, rich: boolean): void {
    const n = body.trailCount;
    if (n < 2) return;
    const trail = body.trail;
    const s = body.scale;
    const width = body.kind === "railgun" ? 7 * s : body.kind === "bomb" ? 12 * s : 5 * s;
    const color = body.kind === "missile" ? FIRE : body.color;
    g.globalCompositeOperation = "lighter";
    g.lineCap = "round";
    for (let pass = 0; pass < (rich ? 2 : 1); pass += 1) {
      g.strokeStyle = pass === 0 ? color : WHITE;
      for (let i = n - 1; i > 0; i -= 1) {
        const k = 1 - i / n;
        g.globalAlpha = (pass === 0 ? 0.55 : 0.5) * k * k;
        g.lineWidth = Math.max(0.6, width * (pass === 0 ? 1 : 0.35) * (0.25 + 0.75 * k));
        g.beginPath();
        g.moveTo(trail[i * 2]!, trail[i * 2 + 1]!);
        g.lineTo(trail[(i - 1) * 2]!, trail[(i - 1) * 2 + 1]!);
        g.stroke();
      }
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  }

  private drawMissile(g: CanvasRenderingContext2D, body: Body, rich: boolean): void {
    const s = body.scale * (body.kind === "combo" ? 0.9 : 1);
    const length = 42 * s, height = length * 40 / 112;
    const back = body.angle + Math.PI;
    const tailX = body.x + Math.cos(back) * length * 0.42, tailY = body.y + Math.sin(back) * length * 0.42;
    // Exhaust fire behind the body.
    g.globalCompositeOperation = "lighter";
    const flicker = 0.85 + 0.15 * Math.sin(this.time * 60 + body.index * 2);
    drawFlameStreak(g, tailX, tailY, Math.cos(back), Math.sin(back), length * 1.25 * flicker, height * 0.95, FIRE, 0.9);
    drawFlameStreak(g, tailX, tailY, Math.cos(back), Math.sin(back), length * 0.6 * flicker, height * 0.45, HOT, 0.95);
    drawGlow(g, FIRE, tailX, tailY, height * 2.2, 0.55);
    g.globalCompositeOperation = "source-over";
    const sprite = missileSprite(body.kind === "combo" ? "#ff5a3c" : body.color, Math.floor(body.roll) % 8);
    if (sprite !== null) {
      g.save();
      g.translate(body.x, body.y);
      g.rotate(body.angle);
      g.drawImage(sprite, -length / 2, -height / 2, length, height);
      g.restore();
    }
    if (rich) {
      g.globalCompositeOperation = "lighter";
      drawGlow(g, body.color, body.x + Math.cos(body.angle) * length * 0.18, body.y + Math.sin(body.angle) * length * 0.18, height * 1.1, 0.35);
      g.globalCompositeOperation = "source-over";
    }
  }

  private drawBomb(g: CanvasRenderingContext2D, body: Body, rich: boolean): void {
    const s = body.scale;
    const radius = 15 * s;
    const pulse = 0.75 + 0.25 * Math.sin(this.time * 14);
    const spin = this.time * 3.2;
    // Rings orbit in 3D: back halves under the sphere, front halves over it.
    const ring = (front: boolean): void => {
      g.strokeStyle = body.color;
      g.lineWidth = Math.max(1, 2.2 * s);
      for (const [tilt, phase] of [[0.42, 0], [-0.35, Math.PI / 2]] as const) {
        const rot = spin * 0.6 + phase;
        g.globalAlpha = front ? 0.95 : 0.4;
        g.beginPath();
        g.ellipse(body.x, body.y, radius * 1.65, radius * 1.65 * Math.abs(Math.sin(spin + phase)) * 0.45 + radius * 0.2, rot + tilt, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
        g.stroke();
      }
      g.globalAlpha = 1;
    };
    g.globalCompositeOperation = "lighter";
    drawGlow(g, body.color, body.x, body.y, radius * 3.6, 0.45 * pulse);
    ring(false);
    g.globalCompositeOperation = "source-over";
    const sprite = bombSprite(body.color);
    if (sprite !== null) g.drawImage(sprite, body.x - radius, body.y - radius, radius * 2, radius * 2);
    g.globalCompositeOperation = "lighter";
    drawGlow(g, body.color, body.x, body.y, radius * 1.3, 0.6 * pulse);
    drawGlow(g, WHITE, body.x, body.y, radius * 0.5, 0.7 * pulse);
    ring(true);
    if (rich) drawRingGlow(g, body.color, body.x, body.y, radius * (1.8 + 0.5 * ((this.time * 2) % 1)), 0.3 * (1 - ((this.time * 2) % 1)));
    g.globalCompositeOperation = "source-over";
  }

  private drawRail(g: CanvasRenderingContext2D, body: Body, rich: boolean): void {
    const live = body.t - body.delay;
    const k = Math.min(1, live / body.duration);
    g.globalCompositeOperation = "lighter";
    if (k < RAIL_CHARGE) {
      // Charging: energy converges into the gun.
      const c = k / RAIL_CHARGE;
      const s = body.sA;
      drawGlow(g, body.color, body.ox, body.oy, (10 + 26 * c) * s, 0.35 + 0.45 * c);
      drawGlow(g, WHITE, body.ox, body.oy, (4 + 9 * c) * s, 0.6 + 0.3 * c);
      g.strokeStyle = body.color;
      g.lineWidth = Math.max(1, 1.4 * s);
      for (let i = 0; i < (rich ? 9 : 5); i += 1) {
        const a = i * 2.39996 + this.time * 3;
        const r0 = (46 - 34 * ((this.time * 1.8 + i * 0.13) % 1)) * s;
        g.globalAlpha = 0.6 * c;
        g.beginPath();
        g.moveTo(body.ox + Math.cos(a) * r0, body.oy + Math.sin(a) * r0);
        g.lineTo(body.ox + Math.cos(a) * r0 * 0.7, body.oy + Math.sin(a) * r0 * 0.7);
        g.stroke();
      }
      g.globalAlpha = 1;
      if (rich) drawRingGlow(g, body.color, body.ox, body.oy, (30 - 18 * c) * s, 0.5 * c);
    } else {
      // Tracer: a tapered beam from the gun to the slug.
      g.fillStyle = body.color;
      g.globalAlpha = 0.5;
      taper(g, body.ox, body.oy, 4.5 * body.sA, body.x, body.y, 4.5 * body.scale);
      g.fillStyle = WHITE;
      g.globalAlpha = 0.85;
      taper(g, body.ox, body.oy, 1.4 * body.sA, body.x, body.y, 1.4 * body.scale);
      g.globalAlpha = 1;
      const sprite = slugSprite(body.color);
      if (sprite !== null) {
        const length = 44 * body.scale;
        g.save();
        g.translate(body.x, body.y);
        g.rotate(body.angle);
        g.drawImage(sprite, -length * 0.8, -length * 0.15, length, length * 0.3);
        g.restore();
      }
      drawGlow(g, body.color, body.x, body.y, 22 * body.scale, 0.7);
    }
    g.globalCompositeOperation = "source-over";
  }

  private drawBeam(g: CanvasRenderingContext2D, beam: Beam, rich: boolean): void {
    const grow = Math.min(1, beam.t / Math.max(0.05, beam.duration * 0.35));
    const fade = beam.t > beam.duration ? Math.max(0, 1 - (beam.t - beam.duration) / 0.18) : 1;
    const flicker = 0.85 + 0.15 * Math.sin(this.time * 70) * Math.sin(this.time * 43);
    g.globalCompositeOperation = "lighter";
    for (const origin of beam.origins) {
      const ex = origin.x + (beam.tx - origin.x) * grow, ey = origin.y + (beam.ty - origin.y) * grow;
      const wB = beam.sA + (beam.sB - beam.sA) * grow;
      const layers: Array<[string, number, number]> = rich
        ? [[beam.color, 9, 0.22], [beam.color, 4.5, 0.55], [WHITE, 1.6, 0.95]]
        : [[beam.color, 5, 0.45], [WHITE, 1.6, 0.9]];
      for (const [color, width, alpha] of layers) {
        g.fillStyle = color;
        g.globalAlpha = alpha * fade * flicker;
        taper(g, origin.x, origin.y, width * beam.sA, ex, ey, width * wB * 0.9);
      }
      g.globalAlpha = 1;
      // Energy pulses running down the beam.
      if (rich) {
        for (let i = 0; i < 4; i += 1) {
          const at = ((this.time * 2.6 + i / 4) % 1) * grow;
          perspective(origin.x, origin.y, beam.sA, beam.tx, beam.ty, beam.sB, at, this.scratch);
          drawGlow(g, WHITE, this.scratch.x, this.scratch.y, 7 * this.scratch.s, 0.6 * fade);
        }
      }
      drawGlow(g, beam.color, origin.x, origin.y, 16 * beam.sA, 0.7 * fade);
      if (grow >= 1) {
        // Sizzling contact on the target.
        const jitter = (this.random() - 0.5) * 6 * beam.sB;
        drawGlow(g, beam.color, ex + jitter, ey - jitter, 22 * beam.sB * flicker, 0.75 * fade);
        drawGlow(g, WHITE, ex, ey, 9 * beam.sB, 0.9 * fade);
      }
    }
    g.globalCompositeOperation = "source-over";
  }

  private drawLance(g: CanvasRenderingContext2D, lance: Lance, rich: boolean): void {
    const angle = Math.atan2(lance.ty - lance.origin.y, lance.tx - lance.origin.x);
    g.globalCompositeOperation = "lighter";
    if (lance.state === "charge") {
      const c = Math.min(1, lance.t / lance.window);
      const s = lance.scale;
      // Targeting line, pulsing.
      g.strokeStyle = lance.color;
      g.lineWidth = Math.max(1, 1.2 * s);
      g.globalAlpha = 0.25 + 0.25 * Math.sin(this.time * 12);
      g.setLineDash([10 * s, 8 * s]);
      g.lineDashOffset = -this.time * 60;
      g.beginPath();
      g.moveTo(lance.origin.x, lance.origin.y);
      g.lineTo(lance.tx, lance.ty);
      g.stroke();
      g.setLineDash([]);
      g.globalAlpha = 1;
      // Energy converging, a growing glow and the crystal spear itself.
      for (let i = 0; i < (rich ? 12 : 6); i += 1) {
        const a = i * 2.39996 + this.time * 2;
        const r0 = (70 - 55 * ((this.time * 1.4 + i * 0.09) % 1)) * s;
        drawGlow(g, lance.color, lance.origin.x + Math.cos(a) * r0, lance.origin.y + Math.sin(a) * r0, 5 * s, 0.6 * c);
      }
      drawGlow(g, lance.color, lance.origin.x, lance.origin.y, (16 + 40 * c) * s, 0.35 + 0.4 * c);
      drawGlow(g, WHITE, lance.origin.x, lance.origin.y, (6 + 12 * c) * s, 0.7);
      g.globalCompositeOperation = "source-over";
      const sprite = lanceSprite(lance.color);
      if (sprite !== null) {
        const length = (28 + 62 * c) * s, height = length * 0.24;
        g.save();
        g.translate(lance.origin.x, lance.origin.y);
        g.rotate(angle);
        g.globalAlpha = 0.6 + 0.4 * c;
        g.drawImage(sprite, -length * 0.25, -height / 2, length, height);
        g.restore();
        g.globalAlpha = 1;
      }
      g.globalCompositeOperation = "lighter";
    } else if (lance.state === "strike") {
      // The giant beam: wide near the shooter, narrowing to the target.
      const f = lance.stateT < 0.08 ? lance.stateT / 0.08 : Math.max(0, 1 - (lance.stateT - 0.08) / 0.47);
      for (const [color, width, alpha] of [[lance.color, 30, 0.3], [lance.color, 15, 0.6], [WHITE, 5, 0.95]] as const) {
        g.fillStyle = color;
        g.globalAlpha = alpha * f;
        taper(g, lance.origin.x, lance.origin.y, width * lance.scale, lance.tx, lance.ty, width * lance.targetScale);
      }
      g.globalAlpha = 1;
      drawGlow(g, lance.color, lance.origin.x, lance.origin.y, 60 * lance.scale * f, 0.8 * f);
      drawGlow(g, WHITE, lance.tx, lance.ty, 70 * lance.targetScale * f, 0.9 * f);
    }
    g.globalCompositeOperation = "source-over";
  }

  private drawEffects(g: CanvasRenderingContext2D): void {
    g.globalCompositeOperation = "lighter";
    for (const effect of this.effects) {
      if (effect.t < 0) continue;
      const k = effect.t / effect.life;
      const fade = 1 - k;
      if (effect.kind === "tracer") {
        g.fillStyle = effect.color;
        g.globalAlpha = 0.55 * fade;
        taper(g, effect.x0!, effect.y0!, 5 * effect.s0! * (1 + k), effect.x, effect.y, 5 * effect.scale * (1 + k));
        g.fillStyle = WHITE;
        g.globalAlpha = 0.8 * fade * fade;
        taper(g, effect.x0!, effect.y0!, 1.4 * effect.s0!, effect.x, effect.y, 1.4 * effect.scale);
        g.globalAlpha = 1;
      } else if (effect.kind === "pierce") {
        // A white-hot line through the target and out the far side.
        const reach = 90 * effect.scale;
        g.strokeStyle = WHITE;
        g.globalAlpha = 0.9 * fade;
        g.lineWidth = Math.max(1, 3 * effect.scale * fade);
        g.beginPath();
        g.moveTo(effect.x - Math.cos(effect.angle) * reach * 0.3, effect.y - Math.sin(effect.angle) * reach * 0.3);
        g.lineTo(effect.x + Math.cos(effect.angle) * reach, effect.y + Math.sin(effect.angle) * reach);
        g.stroke();
        drawGlow(g, effect.color, effect.x + Math.cos(effect.angle) * reach * 0.5, effect.y + Math.sin(effect.angle) * reach * 0.5, 30 * effect.scale, 0.5 * fade);
      } else if (effect.kind === "shock") {
        // A ring seen edge-on to its line of flight: reads as a 3D halo.
        const r = (10 + 36 * k) * effect.scale;
        g.strokeStyle = effect.color;
        g.globalAlpha = 0.7 * fade;
        g.lineWidth = Math.max(1, 2.4 * effect.scale * fade);
        g.beginPath();
        g.ellipse(effect.x, effect.y, r * 0.32, r, effect.angle, 0, Math.PI * 2);
        g.stroke();
      } else if (effect.kind === "flash") {
        drawGlow(g, effect.color, effect.x, effect.y, 40 * effect.scale * (0.7 + 0.6 * k), 0.8 * fade);
      } else {
        g.fillStyle = effect.color;
        g.globalAlpha = 0.9 * fade;
        const size = 5 * effect.scale;
        g.save();
        g.translate(effect.x, effect.y);
        g.rotate(effect.angle + effect.t * 9);
        g.beginPath();
        g.moveTo(size * 1.6, 0); g.lineTo(0, size * 0.5); g.lineTo(-size, 0); g.lineTo(0, -size * 0.5);
        g.closePath();
        g.fill();
        g.restore();
      }
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  }

  private random(): number {
    this.seed = (this.seed * 48271) % 2147483647;
    return this.seed / 2147483647;
  }
}
