import type { VisualQuality } from "../types";
import type { EnemyDeathStyle, EnemyMaterial, EnemyShotSkin, FamilyStyle } from "../enemies/identity";
import { drawGlow, drawRingGlow } from "./light-sprites";

/**
 * Enemy and boss effects: family death bursts, material hit sparks, boss
 * auras, entrances, phase changes and death sequences, and the look of
 * enemy shots. Everything is drawn from cached light sprites and simple
 * paths (no shadowBlur) and every pool has a hard cap.
 */

const TAU = Math.PI * 2;
const MAX_PARTICLES = 360;
const MAX_RINGS = 48;

type ParticleShape = "glow" | "bubble" | "feather" | "shard" | "prism" | "leaf" | "ink" | "star" | "spark";

type Particle = {
  shape: ParticleShape;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
  gravity: number;
  drag: number;
};

type Ring = {
  x: number;
  y: number;
  radius: number;
  width: number;
  color: string;
  t: number;
  duration: number;
  delay: number;
};

export type BossAuraStyle =
  | "rays"
  | "embers"
  | "snow"
  | "petals"
  | "void"
  | "stardust"
  | "shards"
  | "bubbles"
  | "lightning";

type BossSequence = {
  kind: "entrance" | "phase" | "death";
  x: number;
  y: number;
  radius: number;
  primary: string;
  accent: string;
  t: number;
  duration: number;
  /** Death: explosion times already fired. */
  fired: number;
};

export type BossTitleCard = {
  label: string;
  name: string;
  title: string;
  color: string;
};

function hash(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export class CombatFxSystem {
  private particles: Particle[] = [];
  private rings: Ring[] = [];
  private sequences: BossSequence[] = [];
  private card: (BossTitleCard & { t: number; duration: number }) | null = null;
  private seed = 1;

  get activeParticles(): number {
    return this.particles.length;
  }

  clear(): void {
    this.particles = [];
    this.rings = [];
    this.sequences = [];
    this.card = null;
  }

  private random(): number {
    this.seed += 1;
    return hash(this.seed);
  }

  private spawn(particle: Particle): void {
    if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
    this.particles.push(particle);
  }

  private ring(x: number, y: number, radius: number, width: number, color: string, duration: number, delay = 0): void {
    if (this.rings.length >= MAX_RINGS) this.rings.shift();
    this.rings.push({ x, y, radius, width, color, t: -delay, duration, delay });
  }

  private scatter(
    x: number,
    y: number,
    count: number,
    shape: ParticleShape,
    colors: readonly string[],
    speed: number,
    size: number,
    life: number,
    gravity = 0,
    drag = 0.9,
  ): void {
    for (let index = 0; index < count; index += 1) {
      const angle = this.random() * TAU;
      const velocity = speed * (0.45 + this.random() * 0.75);
      this.spawn({
        shape,
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: life * (0.7 + this.random() * 0.5),
        max: life,
        size: size * (0.65 + this.random() * 0.7),
        rotation: this.random() * TAU,
        spin: (this.random() - 0.5) * 9,
        color: colors[index % colors.length]!,
        gravity,
        drag,
      });
    }
  }

  // --- Enemy events ----------------------------------------------------------

  /** A bolt lands: small sparks in the target's material. */
  hit(x: number, y: number, material: EnemyMaterial, style: FamilyStyle, power: number, quality: VisualQuality): void {
    const count = Math.round((quality === "low" ? 3 : 6) * Math.min(1.6, Math.max(0.6, power)));
    const colors = [style.primary, style.accent, style.core];
    switch (material) {
      case "bubble":
        this.scatter(x, y, count, "bubble", colors, 120, 4, 0.45, -40);
        break;
      case "bell":
        this.ring(x, y, 22, 2, style.accent, 0.35);
        this.scatter(x, y, count, "glow", colors, 150, 3, 0.35);
        break;
      case "ember":
        this.scatter(x, y, count, "glow", [style.accent, style.primary, style.core], 190, 3.2, 0.5, -80, 0.94);
        break;
      case "ice":
        this.scatter(x, y, count, "shard", colors, 210, 4, 0.4, 160);
        break;
      case "crystal":
        this.scatter(x, y, count, "prism", colors, 200, 4, 0.42, 60);
        break;
      case "wood":
        this.scatter(x, y, count, "leaf", colors, 150, 4.5, 0.55, 90);
        break;
      case "void":
        this.scatter(x, y, count, "ink", [style.primary, style.accent], 110, 5, 0.5, -20, 0.86);
        break;
      case "metal":
        this.scatter(x, y, count, "spark", [style.accent, style.core, style.primary], 280, 5, 0.3, 240, 0.9);
        break;
    }
  }

  /** An enemy is destroyed: the family's signature burst. */
  death(x: number, y: number, deathStyle: EnemyDeathStyle, style: FamilyStyle, size: number, quality: VisualQuality): void {
    const fine = quality !== "low";
    const n = (count: number) => (fine ? count : Math.ceil(count / 2));
    const colors = [style.primary, style.accent, style.core];
    // A short bright flash at the centre gives every death its punch.
    this.spawn({ shape: "glow", x, y, vx: 0, vy: 0, life: 0.2, max: 0.2, size: size * 1.1, rotation: 0, spin: 0, color: style.core, gravity: 0, drag: 1 });
    this.spawn({ shape: "glow", x, y, vx: 0, vy: 0, life: 0.32, max: 0.32, size: size * 1.6, rotation: 0, spin: 0, color: style.primary, gravity: 0, drag: 1 });
    this.ring(x, y, size * 2.1, 3, style.primary, 0.45);
    switch (deathStyle) {
      case "bubbles":
        this.scatter(x, y, n(12), "bubble", ["#ff8ad8", "#7fe8ff", "#ffe27a", "#9dff9a", "#c49bff"], 170, 7, 0.7, -60);
        this.ring(x, y, size * 1.3, 2, "#ffffff", 0.3, 0.05);
        break;
      case "feathers":
        this.scatter(x, y, n(10), "feather", colors, 150, 8, 1.1, 50, 0.9);
        this.ring(x, y, size * 1.6, 2.5, style.accent, 0.55, 0.06);
        break;
      case "embers":
        this.scatter(x, y, n(16), "glow", [style.accent, style.primary, style.core], 240, 4, 0.8, -120, 0.93);
        this.scatter(x, y, n(6), "ink", ["#3a1a10", "#2a0f08"], 60, 9, 0.9, -30, 0.9);
        break;
      case "shards":
        this.scatter(x, y, n(14), "shard", colors, 260, 7, 0.75, 220);
        this.ring(x, y, size * 1.2, 1.5, "#ffffff", 0.3);
        break;
      case "prisms":
        this.scatter(x, y, n(14), "prism", ["#d38bff", "#7ff5ff", "#ffe27a", "#ff8ad8"], 250, 7, 0.8, 90);
        break;
      case "leaves":
        this.scatter(x, y, n(12), "leaf", [style.primary, style.accent, "#b8f07a"], 170, 8, 1, 70, 0.9);
        break;
      case "ink":
        this.scatter(x, y, n(12), "ink", [style.primary, "#2a1450", style.accent], 130, 10, 0.9, -25, 0.88);
        this.ring(x, y, size * 1.4, 2, style.accent, 0.5);
        break;
      case "stars":
        this.scatter(x, y, n(12), "star", [style.primary, style.accent, style.core], 230, 7, 0.8, 0, 0.9);
        this.ring(x, y, size * 1.1, 2, style.core, 0.25, 0.08);
        break;
    }
  }

  /** A shield layer breaks: a ring of shards flies off. */
  layerBreak(x: number, y: number, radius: number, style: FamilyStyle): void {
    this.ring(x, y, radius * 1.5, 3, style.accent, 0.4);
    this.scatter(x, y, 8, "shard", [style.accent, style.core], 200, 5, 0.45, 120);
  }

  /** An enemy launches a scout, heals, drains or jams: a readable pulse. */
  cast(x: number, y: number, color: string, radius: number): void {
    this.ring(x, y, radius, 2.5, color, 0.55);
    this.ring(x, y, radius * 0.6, 1.5, "#ffffff", 0.35, 0.08);
  }

  // --- Bosses ------------------------------------------------------------------

  /** Boss arrives: a descending shockwave, title card and aura burst. */
  bossEntrance(x: number, y: number, radius: number, primary: string, accent: string, card: BossTitleCard): void {
    this.sequences.push({ kind: "entrance", x, y, radius, primary, accent, t: 0, duration: 1.6, fired: 0 });
    this.card = { ...card, t: 0, duration: 3.2 };
    this.ring(x, y, radius * 2.8, 5, primary, 0.9, 0.35);
    this.ring(x, y, radius * 4.2, 3, accent, 1.2, 0.5);
  }

  bossPhase(x: number, y: number, radius: number, primary: string, accent: string): void {
    this.sequences.push({ kind: "phase", x, y, radius, primary, accent, t: 0, duration: 1.1, fired: 0 });
    this.ring(x, y, radius * 3.4, 6, primary, 0.8);
    this.ring(x, y, radius * 2.2, 3, "#ffffff", 0.5, 0.1);
    this.scatter(x, y, 24, "glow", [primary, accent, "#ffffff"], 320, 5, 0.8, 0, 0.92);
  }

  bossDeath(x: number, y: number, radius: number, primary: string, accent: string, deathStyle: EnemyDeathStyle, style: FamilyStyle): void {
    this.sequences.push({ kind: "death", x, y, radius, primary, accent, t: 0, duration: 1.8, fired: 0 });
    this.death(x, y, deathStyle, style, radius * 0.6, "high");
  }

  /** Boss is hit: a heavier spark shower in its material. */
  bossHit(x: number, y: number, material: EnemyMaterial, style: FamilyStyle, quality: VisualQuality): void {
    this.hit(x, y, material, style, 1.6, quality);
  }

  // --- Simulation ------------------------------------------------------------------

  update(dt: number): void {
    const step = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.1) : 0;
    let live = 0;
    for (const particle of this.particles) {
      particle.life -= step;
      if (particle.life <= 0) continue;
      const drag = Math.pow(particle.drag, step * 60);
      particle.vx *= drag;
      particle.vy = particle.vy * drag + particle.gravity * step;
      particle.x += particle.vx * step;
      particle.y += particle.vy * step;
      particle.rotation += particle.spin * step;
      this.particles[live++] = particle;
    }
    this.particles.length = live;

    let ringLive = 0;
    for (const ring of this.rings) {
      ring.t += step;
      if (ring.t < ring.duration) this.rings[ringLive++] = ring;
    }
    this.rings.length = ringLive;

    let sequenceLive = 0;
    for (const sequence of this.sequences) {
      sequence.t += step;
      if (sequence.kind === "death") this.stepBossDeath(sequence);
      if (sequence.t < sequence.duration) this.sequences[sequenceLive++] = sequence;
    }
    this.sequences.length = sequenceLive;

    if (this.card !== null) {
      this.card.t += step;
      if (this.card.t >= this.card.duration) this.card = null;
    }
  }

  /** A chain of blasts across the boss body, then the final flash. */
  private stepBossDeath(sequence: BossSequence): void {
    const times = [0, 0.18, 0.34, 0.52, 0.7, 0.95];
    while (sequence.fired < times.length && sequence.t >= times[sequence.fired]!) {
      const index = sequence.fired;
      sequence.fired += 1;
      const angle = hash(index * 7.7 + sequence.x) * TAU;
      const distance = index === times.length - 1 ? 0 : sequence.radius * (0.25 + hash(index * 3.1) * 0.55);
      const x = sequence.x + Math.cos(angle) * distance;
      const y = sequence.y + Math.sin(angle) * distance;
      const final = index === times.length - 1;
      this.ring(x, y, sequence.radius * (final ? 3.6 : 1.2), final ? 7 : 3, final ? "#ffffff" : sequence.primary, final ? 0.9 : 0.45);
      this.scatter(x, y, final ? 30 : 12, "glow", [sequence.primary, sequence.accent, "#ffffff"], final ? 420 : 240, final ? 6 : 4, final ? 1 : 0.6, 0, 0.93);
    }
  }

  // --- Drawing ---------------------------------------------------------------------

  /** Particles and rings over the enemies. */
  draw(context: CanvasRenderingContext2D, quality: VisualQuality): void {
    if (this.particles.length === 0 && this.rings.length === 0 && this.sequences.length === 0) return;
    context.save();
    // Ink is dark smoke: normal blending, drawn first.
    context.globalCompositeOperation = "source-over";
    for (const particle of this.particles) {
      if (particle.shape !== "ink") continue;
      const k = particle.life / particle.max;
      context.globalAlpha = Math.min(1, k * 1.4) * 0.55;
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size * (1.6 - k * 0.6), 0, TAU);
      context.fill();
    }
    context.globalCompositeOperation = "lighter";
    for (const sequence of this.sequences) this.drawSequence(context, sequence);
    for (const ring of this.rings) {
      if (ring.t < 0) continue;
      const k = ring.t / ring.duration;
      const eased = 1 - (1 - k) * (1 - k);
      const radius = 6 + eased * ring.radius;
      drawRingGlow(context, ring.color, ring.x, ring.y, radius, (1 - k) * 0.8);
      context.globalAlpha = (1 - k) * 0.9;
      context.strokeStyle = ring.color;
      context.lineWidth = Math.max(0.6, ring.width * (1 - k));
      context.beginPath();
      context.arc(ring.x, ring.y, radius, 0, TAU);
      context.stroke();
    }
    const fine = quality !== "low";
    for (const particle of this.particles) {
      if (particle.shape === "ink") continue;
      const k = particle.life / particle.max;
      const alpha = Math.min(1, k * 1.6);
      this.drawParticle(context, particle, alpha, fine);
    }
    context.restore();
  }

  private drawParticle(context: CanvasRenderingContext2D, particle: Particle, alpha: number, fine: boolean): void {
    const { x, y, size, color } = particle;
    switch (particle.shape) {
      case "glow":
        drawGlow(context, color, x, y, size * 2.4, alpha);
        return;
      case "bubble":
        context.globalAlpha = alpha * 0.85;
        context.strokeStyle = color;
        context.lineWidth = 1.3;
        context.beginPath();
        context.arc(x, y, size, 0, TAU);
        context.stroke();
        if (fine) drawGlow(context, "#ffffff", x - size * 0.35, y - size * 0.35, size * 0.5, alpha * 0.8);
        return;
      case "spark": {
        const speed = Math.hypot(particle.vx, particle.vy) || 1;
        const length = Math.min(14, size * 0.4 + speed * 0.03);
        context.globalAlpha = alpha;
        context.strokeStyle = color;
        context.lineWidth = 1.6;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x - (particle.vx / speed) * length, y - (particle.vy / speed) * length);
        context.stroke();
        return;
      }
      case "star":
        drawGlow(context, color, x, y, size * 1.8, alpha * 0.7);
        context.globalAlpha = alpha;
        context.fillStyle = "#ffffff";
        context.save();
        context.translate(x, y);
        context.rotate(particle.rotation);
        context.beginPath();
        for (let point = 0; point < 8; point += 1) {
          const r = point % 2 === 0 ? size : size * 0.28;
          const a = (point / 8) * TAU;
          if (point === 0) context.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else context.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        context.closePath();
        context.fill();
        context.restore();
        return;
      default:
        break;
    }
    // Solid little shapes: shard, prism, feather, leaf.
    context.save();
    context.translate(x, y);
    context.rotate(particle.rotation);
    context.globalAlpha = alpha;
    context.fillStyle = color;
    context.beginPath();
    if (particle.shape === "shard") {
      context.moveTo(0, -size);
      context.lineTo(size * 0.32, 0);
      context.lineTo(0, size * 0.6);
      context.lineTo(-size * 0.32, 0);
    } else if (particle.shape === "prism") {
      context.moveTo(0, -size * 0.8);
      context.lineTo(size * 0.7, size * 0.5);
      context.lineTo(-size * 0.7, size * 0.5);
    } else if (particle.shape === "feather") {
      context.ellipse(0, 0, size * 0.28, size, 0, 0, TAU);
    } else {
      // Leaf: two arcs meeting at the tips.
      context.moveTo(0, -size);
      context.quadraticCurveTo(size * 0.75, 0, 0, size);
      context.quadraticCurveTo(-size * 0.75, 0, 0, -size);
    }
    context.closePath();
    context.fill();
    context.restore();
    if (fine && (particle.shape === "prism" || particle.shape === "shard")) drawGlow(context, color, x, y, size * 1.6, alpha * 0.4);
  }

  private drawSequence(context: CanvasRenderingContext2D, sequence: BossSequence): void {
    const k = sequence.t / sequence.duration;
    if (sequence.kind === "entrance") {
      // A pillar of light the boss descends through, then a bloom.
      const beam = k < 0.5 ? k / 0.5 : 1 - (k - 0.5) / 0.5;
      drawGlow(context, sequence.primary, sequence.x, sequence.y, sequence.radius * (2.2 + beam * 1.6), beam * 0.7);
      context.globalAlpha = beam * 0.35;
      context.fillStyle = sequence.accent;
      const width = sequence.radius * (0.5 + beam * 0.8);
      context.fillRect(sequence.x - width / 2, 0, width, sequence.y);
      return;
    }
    if (sequence.kind === "phase") {
      const flash = 1 - k;
      drawGlow(context, sequence.primary, sequence.x, sequence.y, sequence.radius * (2 + k * 2.2), flash * 0.8);
      return;
    }
    // Death: swelling light before the final blast.
    const swell = k < 0.9 ? k / 0.9 : 1 - (k - 0.9) / 0.1;
    drawGlow(context, "#ffffff", sequence.x, sequence.y, sequence.radius * (1.2 + swell * 2.6), swell * 0.75);
  }

  /** Screen-space: the boss title card (drawn last, over everything). */
  drawScreen(context: CanvasRenderingContext2D, width: number, height: number): void {
    const card = this.card;
    if (card === null) return;
    const k = card.t / card.duration;
    const alpha = k < 0.12 ? k / 0.12 : k > 0.82 ? Math.max(0, 1 - (k - 0.82) / 0.18) : 1;
    // Mid-screen: under the boss and its word, above the ship.
    const y = height * 0.54;
    context.save();
    // Band: dark ribbon with the boss colour at its edges.
    context.globalAlpha = alpha * 0.82;
    const band = context.createLinearGradient(0, y - 46, 0, y + 46);
    band.addColorStop(0, "rgba(0,0,0,0)");
    band.addColorStop(0.25, "rgba(4,6,14,0.92)");
    band.addColorStop(0.75, "rgba(4,6,14,0.92)");
    band.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = band;
    context.fillRect(0, y - 46, width, 92);
    context.globalCompositeOperation = "lighter";
    const sweep = ((card.t * 0.9) % 1) * width * 1.4 - width * 0.2;
    drawGlow(context, card.color, sweep, y, 120, alpha * 0.35);
    context.globalAlpha = alpha * 0.7;
    context.fillStyle = card.color;
    context.fillRect(width * 0.18, y - 30, width * 0.64, 1.5);
    context.fillRect(width * 0.18, y + 30, width * 0.64, 1.5);
    context.globalCompositeOperation = "source-over";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.globalAlpha = alpha;
    context.fillStyle = card.color;
    context.font = "800 12px ui-monospace, SFMono-Regular, Menlo, monospace";
    context.fillText(card.label.toUpperCase().split("").join(" "), width / 2, y - 18);
    context.fillStyle = "#ffffff";
    const spread = Math.min(1, card.t / 0.5);
    context.font = "900 " + String(Math.round(26 + spread * 4)) + "px ui-sans-serif, system-ui, -apple-system, sans-serif";
    context.fillText(card.name, width / 2, y + 3);
    context.fillStyle = "rgba(255,255,255,0.78)";
    context.font = "650 13px ui-sans-serif, system-ui, -apple-system, sans-serif";
    context.fillText(card.title, width / 2, y + 24);
    context.restore();
  }
}

// --- Enemy shot skins -------------------------------------------------------------

const shotCache = new Map<string, HTMLCanvasElement | null>();

/**
 * The shot's body (no letter), pre-rendered once per skin and colour. The
 * sprite is 64 px with the shot's radius at 16 px, drawn scaled.
 */
function shotSprite(skin: EnemyShotSkin, style: FamilyStyle): HTMLCanvasElement | null {
  const key = skin + ":" + style.primary;
  const cached = shotCache.get(key);
  if (cached !== undefined) return cached;
  let canvas: HTMLCanvasElement | null = null;
  if (typeof document !== "undefined") {
    canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    if (context === null) {
      canvas = null;
    } else {
      context.translate(32, 32);
      paintShot(context, skin, style);
    }
  }
  shotCache.set(key, canvas);
  return canvas;
}

function paintShot(context: CanvasRenderingContext2D, skin: EnemyShotSkin, style: FamilyStyle): void {
  const r = 16;
  context.globalCompositeOperation = "lighter";
  const halo = context.createRadialGradient(0, 0, 0, 0, 0, 30);
  halo.addColorStop(0, style.primary + "cc");
  halo.addColorStop(0.45, style.primary + "44");
  halo.addColorStop(1, style.primary + "00");
  context.fillStyle = halo;
  context.fillRect(-32, -32, 64, 64);
  context.globalCompositeOperation = "source-over";
  context.lineJoin = "round";
  context.fillStyle = "rgba(6, 8, 20, 0.72)";
  context.strokeStyle = style.accent;
  context.lineWidth = 2.2;
  context.beginPath();
  switch (skin) {
    case "bubble":
      context.arc(0, 0, r, 0, TAU);
      break;
    case "feather":
      context.moveTo(0, -r * 1.15);
      context.quadraticCurveTo(r * 0.95, 0, 0, r * 1.05);
      context.quadraticCurveTo(-r * 0.95, 0, 0, -r * 1.15);
      break;
    case "fireball":
      context.arc(0, 2, r * 0.92, 0, TAU);
      break;
    case "ice-shard":
      context.moveTo(0, -r * 1.2);
      context.lineTo(r * 0.8, 0);
      context.lineTo(0, r * 1.2);
      context.lineTo(-r * 0.8, 0);
      break;
    case "prism":
      for (let side = 0; side < 6; side += 1) {
        const a = (side / 6) * TAU - Math.PI / 2;
        if (side === 0) context.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else context.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      break;
    case "seed":
      context.ellipse(0, 0, r * 0.85, r * 1.05, 0, 0, TAU);
      break;
    case "void-orb":
      context.arc(0, 0, r, 0, TAU);
      break;
    case "star":
      for (let point = 0; point < 10; point += 1) {
        const a = (point / 10) * TAU - Math.PI / 2;
        const radius = point % 2 === 0 ? r * 1.15 : r * 0.62;
        if (point === 0) context.moveTo(Math.cos(a) * radius, Math.sin(a) * radius);
        else context.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
      }
      break;
  }
  context.closePath();
  context.fill();
  context.stroke();
  // Material detail.
  context.globalCompositeOperation = "lighter";
  if (skin === "bubble") {
    context.strokeStyle = "rgba(255,255,255,0.55)";
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(-4, -5, 6, Math.PI * 1.05, Math.PI * 1.6);
    context.stroke();
  } else if (skin === "fireball") {
    const core = context.createRadialGradient(0, -2, 0, 0, 2, r);
    core.addColorStop(0, style.core + "aa");
    core.addColorStop(1, style.primary + "00");
    context.fillStyle = core;
    context.beginPath();
    context.arc(0, 2, r * 0.9, 0, TAU);
    context.fill();
  } else if (skin === "void-orb") {
    context.strokeStyle = style.accent;
    context.lineWidth = 1.2;
    context.beginPath();
    context.arc(0, 0, r * 0.7, 0.4, 2.4);
    context.stroke();
  }
}

/**
 * Draws an enemy shot (body + glow, not the letter) at the context origin,
 * scaled to `radius`, pointing along `angle`. Returns false when sprites are
 * unavailable (tests, no DOM).
 */
export function drawEnemyShot(
  context: CanvasRenderingContext2D,
  skin: EnemyShotSkin,
  style: FamilyStyle,
  radius: number,
  angle: number,
  time: number,
): boolean {
  const sprite = shotSprite(skin, style);
  if (sprite === null) return false;
  const scale = radius / 16;
  context.save();
  if (skin === "fireball") {
    // A flame tail opposite the direction of travel.
    context.globalCompositeOperation = "lighter";
    for (let step = 1; step <= 3; step += 1) {
      const back = step * radius * 0.55;
      drawGlow(context, style.accent, -Math.cos(angle) * back, -Math.sin(angle) * back, radius * (1.1 - step * 0.22), 0.5 - step * 0.12);
    }
  }
  const spin = skin === "prism" || skin === "star" ? time * 2.4 : skin === "ice-shard" || skin === "feather" ? angle - Math.PI / 2 : 0;
  context.rotate(spin);
  context.globalCompositeOperation = "source-over";
  context.drawImage(sprite, -32 * scale, -32 * scale, 64 * scale, 64 * scale);
  context.restore();
  return true;
}

// --- Boss auras ---------------------------------------------------------------------------

/**
 * Every boss carries a sigil: two counter-rotating dashed rings with rune
 * marks in its colours, so it reads as a boss even before painted art.
 */
function drawBossSigil(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  time: number,
  primary: string,
  accent: string,
  strength: number,
): void {
  const alpha = Math.min(1, 0.55 * strength);
  drawRingGlow(context, primary, x, y, radius * 1.32, 0.45 * strength);
  context.lineCap = "round";
  for (const [scale, speed, color, dash] of [
    [1.32, 0.35, primary, [18, 10]],
    [1.52, -0.22, accent, [4, 12]],
  ] as const) {
    context.save();
    context.translate(x, y);
    context.rotate(time * speed);
    context.globalAlpha = alpha;
    context.strokeStyle = color;
    context.lineWidth = scale < 1.4 ? 2.2 : 1.6;
    context.setLineDash(dash as unknown as number[]);
    context.beginPath();
    context.arc(0, 0, radius * scale, 0, TAU);
    context.stroke();
    context.restore();
  }
  context.setLineDash([]);
  // Six rune marks riding the inner ring.
  context.save();
  context.translate(x, y);
  context.rotate(-time * 0.35);
  context.globalAlpha = alpha;
  context.strokeStyle = accent;
  context.lineWidth = 2;
  for (let mark = 0; mark < 6; mark += 1) {
    const a = (mark / 6) * TAU;
    const r = radius * 1.42;
    const cx = Math.cos(a) * r;
    const cy = Math.sin(a) * r;
    context.beginPath();
    context.moveTo(cx - Math.sin(a) * 6, cy + Math.cos(a) * 6);
    context.lineTo(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7);
    context.lineTo(cx + Math.sin(a) * 6, cy - Math.cos(a) * 6);
    context.stroke();
  }
  context.restore();
}

/**
 * A boss's ambient signature, drawn around it every frame from a few moving
 * sprites (deterministic in time, no state): rising embers, falling snow,
 * swirling petals, void tendrils, god rays…
 */
export function drawBossAura(
  context: CanvasRenderingContext2D,
  style: BossAuraStyle,
  x: number,
  y: number,
  radius: number,
  time: number,
  primary: string,
  accent: string,
  strength: number,
  quality: VisualQuality,
): void {
  const count = quality === "low" ? 8 : quality === "medium" ? 14 : 22;
  context.save();
  // A soft dark backing first: added light vanishes on bright Worlds (lava,
  // snow) without it, and it gives the boss presence on dark ones.
  context.globalCompositeOperation = "source-over";
  const shade = context.createRadialGradient(x, y, radius * 0.7, x, y, radius * 2.7);
  shade.addColorStop(0, "rgba(4, 4, 14, 0.55)");
  shade.addColorStop(1, "rgba(4, 4, 14, 0)");
  context.fillStyle = shade;
  context.fillRect(x - radius * 2.7, y - radius * 2.7, radius * 5.4, radius * 5.4);
  context.globalCompositeOperation = "lighter";
  drawGlow(context, primary, x, y, radius * 2.6, 0.3 * strength);
  drawBossSigil(context, x, y, radius, time, primary, accent, strength);
  switch (style) {
    case "rays": {
      context.globalAlpha = 0.16 * strength;
      context.fillStyle = accent;
      for (let ray = 0; ray < 10; ray += 1) {
        const a = (ray / 10) * TAU + time * 0.18;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + Math.cos(a - 0.06) * radius * 3, y + Math.sin(a - 0.06) * radius * 3);
        context.lineTo(x + Math.cos(a + 0.06) * radius * 3, y + Math.sin(a + 0.06) * radius * 3);
        context.closePath();
        context.fill();
      }
      break;
    }
    case "embers":
      for (let index = 0; index < count; index += 1) {
        const p = (time * 0.45 + hash(index)) % 1;
        const px = x + (hash(index * 3.3) - 0.5) * radius * 2.4 + Math.sin(time * 2 + index) * 6;
        const py = y + radius * 0.8 - p * radius * 3.2;
        drawGlow(context, index % 3 === 0 ? accent : primary, px, py, 8 + (1 - p) * 7, Math.min(1, (1 - p) * 1.2 * strength));
        drawGlow(context, "#fff2c8", px, py, 2.5 + (1 - p) * 2, (1 - p) * strength);
      }
      break;
    case "snow":
      for (let index = 0; index < count; index += 1) {
        const p = (time * 0.18 + hash(index)) % 1;
        const px = x + (hash(index * 5.1) - 0.5) * radius * 3.4 + Math.sin(time + index) * 10;
        const py = y - radius * 1.6 + p * radius * 3.4;
        drawGlow(context, "#ffffff", px, py, 5.5, Math.sin(p * Math.PI) * strength);
        drawGlow(context, accent, px, py, 11, Math.sin(p * Math.PI) * 0.35 * strength);
      }
      break;
    case "petals":
      for (let index = 0; index < count; index += 1) {
        const a = time * (0.5 + hash(index) * 0.4) + (index / count) * TAU;
        const d = radius * (1.2 + hash(index * 2.2) * 0.9);
        const px = x + Math.cos(a) * d;
        const py = y + Math.sin(a) * d * 0.55;
        context.globalAlpha = Math.min(1, 0.85 * strength);
        context.fillStyle = index % 2 === 0 ? primary : accent;
        context.beginPath();
        context.ellipse(px, py, 4.5, 9, a, 0, TAU);
        context.fill();
      }
      break;
    case "void":
      context.globalCompositeOperation = "source-over";
      for (let index = 0; index < 6; index += 1) {
        const a = (index / 6) * TAU + Math.sin(time * 0.7 + index) * 0.4;
        context.globalAlpha = 0.28 * strength;
        context.strokeStyle = "#140826";
        context.lineWidth = 7;
        context.beginPath();
        context.moveTo(x + Math.cos(a) * radius * 0.8, y + Math.sin(a) * radius * 0.8);
        context.quadraticCurveTo(
          x + Math.cos(a + 0.5) * radius * 1.8,
          y + Math.sin(a + 0.5) * radius * 1.8,
          x + Math.cos(a + 0.2) * radius * (2.4 + Math.sin(time + index) * 0.3),
          y + Math.sin(a + 0.2) * radius * (2.4 + Math.sin(time + index) * 0.3),
        );
        context.stroke();
      }
      context.globalCompositeOperation = "lighter";
      drawRingGlow(context, accent, x, y, radius * 1.25, 0.35 * strength);
      break;
    case "stardust":
      for (let index = 0; index < count; index += 1) {
        const a = time * 0.25 + (index / count) * TAU;
        const d = radius * (1.3 + hash(index) * 1.1);
        const twinkle = 0.5 + 0.5 * Math.sin(time * 5 + index * 1.7);
        drawGlow(context, index % 4 === 0 ? accent : "#ffffff", x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6, 4 + twinkle * 6, Math.min(1, twinkle * 1.2 * strength));
      }
      break;
    case "shards":
      for (let index = 0; index < 8; index += 1) {
        const a = time * 0.6 + (index / 8) * TAU;
        const d = radius * 1.45;
        const px = x + Math.cos(a) * d;
        const py = y + Math.sin(a) * d * 0.5;
        context.save();
        context.translate(px, py);
        context.rotate(a * 2);
        context.globalAlpha = 0.85 * strength;
        context.fillStyle = index % 2 === 0 ? primary : accent;
        context.beginPath();
        context.moveTo(0, -13);
        context.lineTo(5.5, 0);
        context.lineTo(0, 13);
        context.lineTo(-5.5, 0);
        context.closePath();
        context.fill();
        context.restore();
        drawGlow(context, primary, px, py, 12, 0.3 * strength);
      }
      break;
    case "bubbles":
      for (let index = 0; index < count; index += 1) {
        const p = (time * 0.3 + hash(index)) % 1;
        const px = x + (hash(index * 4.4) - 0.5) * radius * 2.8;
        const py = y + radius - p * radius * 2.8;
        context.globalAlpha = Math.min(1, Math.sin(p * Math.PI) * 0.9 * strength);
        context.strokeStyle = index % 2 === 0 ? primary : accent;
        context.lineWidth = 1.8;
        context.beginPath();
        context.arc(px, py, 6 + hash(index) * 8, 0, TAU);
        context.stroke();
      }
      break;
    case "lightning": {
      const flicker = Math.sin(time * 23) > 0.6 ? 1 : 0.25;
      context.globalAlpha = 0.6 * flicker * strength;
      context.strokeStyle = accent;
      context.lineWidth = 1.6;
      for (let arc = 0; arc < 3; arc += 1) {
        const a = hash(Math.floor(time * 6) + arc * 11) * TAU;
        context.beginPath();
        context.moveTo(x + Math.cos(a) * radius * 0.9, y + Math.sin(a) * radius * 0.9);
        for (let step = 1; step <= 4; step += 1) {
          const d = radius * (0.9 + step * 0.28);
          const jitter = (hash(arc * 7 + step + Math.floor(time * 12)) - 0.5) * 0.5;
          context.lineTo(x + Math.cos(a + jitter) * d, y + Math.sin(a + jitter) * d);
        }
        context.stroke();
      }
      break;
    }
  }
  context.restore();
}
