import type { VisualQuality } from "../types";
import { drawGlow } from "./light-sprites";

/**
 * Bonus-target rewards that you can see (supply pod, treasure drone, crates,
 * Recall bonus): pieces burst out where the bonus was destroyed, then fly to
 * the ship like Credit crystals. When the first piece of a drop arrives the
 * caller plays the pickup sound and a ring; a label ("+40 SHIELD") rises
 * from the ship. Pure presentation: the reward itself is applied by Game.ts.
 */
export type RewardDropSpec = {
  /** Painted icon URL; null draws a glowing star shard. */
  icon: string | null;
  color: string;
  label: string;
  pieces: number;
  /** Icon edge in CSS px at launch. */
  size?: number;
  /** Which pickup sound to play on arrival. */
  sound: "item" | "treasure" | "crate";
};

type Piece = {
  group: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  spin: number;
  size: number;
  color: string;
  image: HTMLImageElement | null;
  trailX: number[];
  trailY: number[];
};

type Label = { text: string; color: string; age: number };

/** Burst phase, then the pull toward the ship ramps up. */
const BURST_SECONDS = 0.34;
const LABEL_SECONDS = 1.3;
const TRAIL = 6;

const images = new Map<string, HTMLImageElement>();
function image(url: string | null): HTMLImageElement | null {
  if (url === null || typeof Image === "undefined") return null;
  let found = images.get(url);
  if (found === undefined) {
    found = new Image();
    found.decoding = "async";
    found.src = url;
    images.set(url, found);
  }
  return found;
}

export class RewardDrops {
  private pieces: Piece[] = [];
  private labels: Label[] = [];
  private nextGroup = 1;
  private readonly specs = new Map<number, RewardDropSpec>();
  private readonly arrivedGroups = new Set<number>();

  /** Starts loading an icon so the first drop already shows it. */
  preload(url: string | null): void {
    image(url);
  }

  spawn(x: number, y: number, spec: RewardDropSpec): void {
    const group = this.nextGroup++;
    this.specs.set(group, spec);
    const count = Math.max(1, Math.min(6, spec.pieces));
    for (let index = 0; index < count; index += 1) {
      const angle = -Math.PI / 2 + (index - (count - 1) / 2) * 0.55 + (Math.random() - 0.5) * 0.3;
      const speed = 210 + Math.random() * 90;
      this.pieces.push({
        group,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        age: -index * 0.05,
        spin: (Math.random() - 0.5) * 6,
        size: (spec.size ?? 38) * (index === 0 ? 1 : 0.72),
        color: spec.color,
        image: image(spec.icon),
        trailX: [],
        trailY: [],
      });
    }
    if (this.pieces.length > 40) this.pieces.splice(0, this.pieces.length - 40);
  }

  /** Moves the pieces; returns the drops whose first piece reached the ship. */
  update(dt: number, ship: { x: number; y: number }): RewardDropSpec[] {
    const arrived: RewardDropSpec[] = [];
    let live = 0;
    for (const piece of this.pieces) {
      piece.age += dt;
      if (piece.age < 0) {
        this.pieces[live++] = piece;
        continue;
      }
      piece.trailX.push(piece.x);
      piece.trailY.push(piece.y);
      if (piece.trailX.length > TRAIL) {
        piece.trailX.shift();
        piece.trailY.shift();
      }
      if (piece.age < BURST_SECONDS) {
        // Pop out and slow down.
        const drag = Math.exp(-dt * 5);
        piece.vx *= drag;
        piece.vy = piece.vy * drag + 160 * dt;
      } else {
        // Magnet: steer toward the ship, faster every frame.
        const dx = ship.x - piece.x;
        const dy = ship.y - piece.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 22) {
          if (!this.arrivedGroups.has(piece.group)) {
            this.arrivedGroups.add(piece.group);
            const spec = this.specs.get(piece.group);
            if (spec !== undefined) {
              arrived.push(spec);
              this.labels.push({ text: spec.label, color: spec.color, age: 0 });
              if (this.labels.length > 4) this.labels.shift();
            }
          }
          continue;
        }
        const pull = 1600 + (piece.age - BURST_SECONDS) * 4200;
        const speed = Math.min(1900, Math.max(320, Math.hypot(piece.vx, piece.vy)) + pull * dt);
        const turn = Math.min(1, dt * 9);
        piece.vx += ((dx / distance) * speed - piece.vx) * turn;
        piece.vy += ((dy / distance) * speed - piece.vy) * turn;
      }
      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
      if (piece.age > 4) continue;
      this.pieces[live++] = piece;
    }
    this.pieces.length = live;
    // Forget groups with no pieces left.
    if (this.pieces.length === 0) {
      this.specs.clear();
      this.arrivedGroups.clear();
    }
    let liveLabels = 0;
    for (const label of this.labels) {
      label.age += dt;
      if (label.age < LABEL_SECONDS) this.labels[liveLabels++] = label;
    }
    this.labels.length = liveLabels;
    return arrived;
  }

  draw(context: CanvasRenderingContext2D, quality: VisualQuality, ship: { x: number; y: number }): void {
    if (this.pieces.length === 0 && this.labels.length === 0) return;
    const rich = quality === "high" || quality === "ultra";
    for (const piece of this.pieces) {
      if (piece.age < 0) continue;
      const homing = piece.age > BURST_SECONDS;
      // Shrinks a little as it is drawn in.
      const scale = homing ? Math.max(0.55, 1 - (piece.age - BURST_SECONDS) * 0.9) : 1 + Math.min(0.15, piece.age * 0.6);
      const size = piece.size * scale;
      context.save();
      context.globalCompositeOperation = "lighter";
      if (rich || homing) {
        for (let index = 0; index < piece.trailX.length; index += 1) {
          const k = (index + 1) / piece.trailX.length;
          drawGlow(context, piece.color, piece.trailX[index]!, piece.trailY[index]!, size * 0.35 * k, 0.45 * k);
        }
      }
      drawGlow(context, piece.color, piece.x, piece.y, size * 1.25, 0.9);
      // A bright ring while it pops out, so the eye catches the drop.
      if (!homing) {
        const k = piece.age / BURST_SECONDS;
        context.strokeStyle = piece.color;
        context.globalAlpha = 1 - k;
        context.lineWidth = 3 * (1 - k) + 1;
        context.beginPath();
        context.arc(piece.x, piece.y, size * (0.4 + k * 0.9), 0, Math.PI * 2);
        context.stroke();
      }
      context.restore();

      context.save();
      context.translate(piece.x, piece.y);
      context.rotate(Math.sin(piece.age * 5 + piece.spin) * 0.25);
      const ready = piece.image !== null && piece.image.complete && piece.image.naturalWidth > 0;
      if (ready) {
        // Item icons carry a dark square: screen-blend it into the glow.
        context.globalCompositeOperation = "screen";
        context.drawImage(piece.image!, -size / 2, -size / 2, size, size);
      } else {
        // Star shard.
        context.globalCompositeOperation = "lighter";
        context.fillStyle = "#fffbe8";
        context.beginPath();
        const r = size * 0.32;
        for (let point = 0; point < 8; point += 1) {
          const radius = point % 2 === 0 ? r : r * 0.4;
          const angle = (point / 8) * Math.PI * 2 + piece.age * piece.spin;
          context.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        context.closePath();
        context.fill();
      }
      context.restore();
    }

    // Labels rising from the ship.
    for (const label of this.labels) {
      const k = label.age / LABEL_SECONDS;
      const alpha = k < 0.15 ? k / 0.15 : k > 0.7 ? Math.max(0, 1 - (k - 0.7) / 0.3) : 1;
      const pop = k < 0.12 ? 0.7 + (k / 0.12) * 0.45 : 1.15 - Math.min(0.15, (k - 0.12) * 0.5);
      context.save();
      context.globalAlpha = alpha;
      context.translate(ship.x, ship.y - 70 - k * 46);
      context.scale(pop, pop);
      context.font = "800 italic 20px 'Exo 2', 'Be Vietnam Pro', ui-sans-serif, system-ui, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.shadowColor = label.color;
      context.shadowBlur = 16;
      context.fillStyle = "#ffffff";
      context.fillText(label.text, 0, 0);
      context.shadowBlur = 0;
      context.strokeStyle = label.color;
      context.lineWidth = 1;
      context.strokeText(label.text, 0, 0);
      context.restore();
    }
  }

  clear(): void {
    this.pieces = [];
    this.labels = [];
    this.specs.clear();
    this.arrivedGroups.clear();
  }
}
