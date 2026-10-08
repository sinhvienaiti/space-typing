import type {
  CreditCrystalTier,
  CreditCrystalVariant,
} from "../rewards/combat-credit-drops";
import type { VisualQuality } from "../types";
import {
  creditGlowSprite,
  creditPalette,
  creditStarSprite,
  type CreditPalette,
} from "./credit-crystal-renderer";

/** What the FX layer needs to know about one crystal reaching the ship. */
export type CreditCrystalFxArrival = {
  x: number;
  y: number;
  tier: CreditCrystalTier;
  variant: CreditCrystalVariant;
  hero: boolean;
  anchor: boolean;
  chain: number;
  milestone: boolean;
};

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  gravity: number;
  drag: number;
  /** Stays glued to the ship (absorb sparks) instead of the battlefield. */
  attached: boolean;
  star: boolean;
  colors: CreditPalette;
};

type Ring = {
  life: number;
  max: number;
  radius: number;
  width: number;
  colors: CreditPalette;
};

/** Sparks thrown out when a burst breaks open. */
const SPAWN_SPARKS: Readonly<Record<VisualQuality, number>> = {
  low: 0,
  medium: 5,
  high: 9,
  ultra: 14,
};
/** Sparks off the hull per crystal home. */
const ARRIVE_SPARKS: Readonly<Record<VisualQuality, number>> = {
  low: 0,
  medium: 1,
  high: 2,
  ultra: 3,
};
const SPARK_CAP: Readonly<Record<VisualQuality, number>> = {
  low: 0,
  medium: 80,
  high: 150,
  ultra: 240,
};
const TIER_RANK: Readonly<Record<CreditCrystalTier, number>> = {
  common: 0,
  refined: 1,
  high: 2,
  elite: 3,
  "mini-boss": 4,
  boss: 5,
  "major-boss": 6,
};

/**
 * Free light around the crystals: the spark spray when a burst breaks open,
 * the flash and sparks where each crystal enters the hull, the ship's own
 * glow that builds while crystals keep coming, and the ring on chain
 * milestones. Everything is drawn additive and capped per quality.
 */
export class CreditCrystalFx {
  private readonly sparks: Spark[] = [];
  private readonly flashes: Spark[] = [];
  private readonly rings: Ring[] = [];
  private glow = 0;
  private glowColors: CreditPalette = creditPalette("common", "standard");
  private readonly ship = { x: 0, y: 0 };
  private seed = 0x2f6b9a1d;

  spawn(
    x: number,
    y: number,
    tier: CreditCrystalTier,
    variant: CreditCrystalVariant,
    hero: boolean,
    quality: VisualQuality,
  ): void {
    const base = SPAWN_SPARKS[quality];
    if (base <= 0) return;
    const colors = creditPalette(tier, variant);
    const rank = TIER_RANK[tier];
    const count = Math.round(base * (hero ? 2.2 : 1 + rank * 0.15));
    for (let i = 0; i < count; i += 1) {
      const angle = this.random() * Math.PI * 2;
      const speed = (130 + this.random() * 230) * (hero ? 1.3 : 1);
      this.addSpark(quality, {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 70,
        life: 0,
        max: 0.32 + this.random() * 0.4,
        size: (1.4 + this.random() * 1.6) * (hero ? 1.4 : 1),
        gravity: 260,
        drag: 0.08,
        attached: false,
        star: this.random() < (quality === "ultra" ? 0.35 : 0.2),
        colors,
      });
    }
  }

  arrive(arrival: CreditCrystalFxArrival, quality: VisualQuality): void {
    if (quality === "low") return;
    const colors = creditPalette(arrival.tier, arrival.variant);
    const ox = (arrival.x - this.ship.x) * 0.7;
    const oy = (arrival.y - this.ship.y) * 0.7;
    const size =
      (arrival.anchor ? 30 : 18) *
      (arrival.hero ? 1.8 : 1) *
      (quality === "ultra" ? 1.2 : 1);
    if (this.flashes.length < 40) {
      this.flashes.push({
        x: ox,
        y: oy,
        vx: 0,
        vy: 0,
        life: 0,
        max: arrival.anchor ? 0.26 : 0.18,
        size,
        gravity: 0,
        drag: 1,
        attached: true,
        star: true,
        colors,
      });
    }

    const sparks = ARRIVE_SPARKS[quality] + (arrival.anchor ? 2 : 0);
    const away = Math.atan2(oy, ox);
    for (let i = 0; i < sparks; i += 1) {
      const angle = away + (this.random() - 0.5) * 2.2;
      const speed = 90 + this.random() * 150;
      this.addSpark(quality, {
        x: ox,
        y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        max: 0.16 + this.random() * 0.14,
        size: 1.2 + this.random() * 1.2,
        gravity: 0,
        drag: 0.02,
        attached: true,
        star: false,
        colors,
      });
    }

    this.glow = Math.min(
      1.6,
      this.glow + (arrival.anchor ? 0.22 : 0.09) * (arrival.hero ? 2.2 : 1),
    );
    this.glowColors = colors;

    if (arrival.milestone || (arrival.hero && arrival.anchor)) {
      const big = arrival.hero && arrival.anchor;
      this.rings.push({
        life: 0,
        max: big ? 0.62 : 0.42,
        radius:
          (big ? 150 : 92 + Math.min(4, arrival.chain / 5) * 10) *
          (quality === "ultra" ? 1.15 : 1),
        width: big ? 4 : 2.5,
        colors,
      });
      const stars = quality === "medium" ? 4 : quality === "high" ? 8 : 12;
      for (let i = 0; i < stars; i += 1) {
        const angle = (i / stars) * Math.PI * 2 + this.random() * 0.4;
        const speed = 160 + this.random() * 120;
        this.addSpark(quality, {
          x: 0,
          y: 0,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          max: 0.38 + this.random() * 0.2,
          size: 2.4 + this.random() * 1.6,
          gravity: 0,
          drag: 0.05,
          attached: true,
          star: true,
          colors,
        });
      }
    }
  }

  update(dt: number, ship: { x: number; y: number }): void {
    this.ship.x = ship.x;
    this.ship.y = ship.y;
    const step = Math.max(0, dt);
    this.glow *= Math.exp(-2.4 * step);
    if (this.glow < 0.005) this.glow = 0;
    this.advance(this.sparks, step);
    this.advance(this.flashes, step);
    let write = 0;
    for (const ring of this.rings) {
      ring.life += step;
      if (ring.life < ring.max) this.rings[write++] = ring;
    }
    this.rings.length = write;
  }

  /** The ship's own glow, under the crystals. */
  drawUnder(context: CanvasRenderingContext2D, quality: VisualQuality): void {
    if (quality === "low" || this.glow <= 0) return;
    const g = Math.min(1.6, this.glow);
    context.save();
    context.globalCompositeOperation = "lighter";
    const sprite = creditGlowSprite(this.glowColors.light);
    if (sprite !== null) {
      const size = 70 + 70 * g;
      context.globalAlpha = Math.min(0.85, 0.18 + 0.42 * g);
      context.drawImage(sprite, this.ship.x - size / 2, this.ship.y - size / 2, size, size);
      if (quality === "ultra" || quality === "high") {
        const outer = size * 2;
        context.globalAlpha = Math.min(0.4, 0.2 * g);
        context.drawImage(sprite, this.ship.x - outer / 2, this.ship.y - outer / 2, outer, outer);
      }
    }
    context.restore();
  }

  /** Sparks, hull flashes and milestone rings, over the crystals. */
  drawOver(context: CanvasRenderingContext2D, quality: VisualQuality): void {
    if (
      quality === "low" ||
      (this.sparks.length === 0 && this.flashes.length === 0 && this.rings.length === 0)
    ) {
      return;
    }
    context.save();
    context.globalCompositeOperation = "lighter";
    context.lineCap = "round";

    for (const ring of this.rings) {
      const t = ring.life / ring.max;
      const ease = 1 - (1 - t) * (1 - t) * (1 - t);
      context.globalAlpha = (1 - t) * 0.85;
      context.strokeStyle = "rgba(" + ring.colors.hot + ",1)";
      context.lineWidth = ring.width * (1 - t * 0.6);
      context.beginPath();
      context.arc(this.ship.x, this.ship.y, 18 + ring.radius * ease, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = (1 - t) * 0.4;
      context.strokeStyle = "rgba(" + ring.colors.light + ",1)";
      context.lineWidth = ring.width * 3 * (1 - t);
      context.beginPath();
      context.arc(this.ship.x, this.ship.y, 12 + ring.radius * ease * 0.82, 0, Math.PI * 2);
      context.stroke();
    }

    for (const spark of this.sparks) {
      const fade = 1 - spark.life / spark.max;
      const x = spark.attached ? this.ship.x + spark.x : spark.x;
      const y = spark.attached ? this.ship.y + spark.y : spark.y;
      if (spark.star) {
        const sprite = creditStarSprite(spark.colors.light);
        if (sprite !== null) {
          const size = spark.size * 7 * (0.5 + fade * 0.5);
          context.globalAlpha = fade;
          context.drawImage(sprite, x - size / 2, y - size / 2, size, size);
        }
        continue;
      }
      context.globalAlpha = fade * 0.95;
      context.strokeStyle = "rgba(" + spark.colors.hot + ",1)";
      context.lineWidth = spark.size * (0.5 + fade * 0.5);
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x - spark.vx * 0.035, y - spark.vy * 0.035);
      context.stroke();
    }

    for (const flash of this.flashes) {
      const t = flash.life / flash.max;
      const sprite = creditStarSprite(flash.colors.light);
      if (sprite === null) continue;
      const size = flash.size * (0.6 + t * 0.9);
      context.globalAlpha = (1 - t) * (1 - t);
      context.drawImage(
        sprite,
        this.ship.x + flash.x - size / 2,
        this.ship.y + flash.y - size / 2,
        size,
        size,
      );
    }
    context.restore();
  }

  clear(): void {
    this.sparks.length = 0;
    this.flashes.length = 0;
    this.rings.length = 0;
    this.glow = 0;
  }

  /** Live sparks + flashes + rings (for budgets and tests). */
  liveCount(): number {
    return this.sparks.length + this.flashes.length + this.rings.length;
  }

  shipGlow(): number {
    return this.glow;
  }

  private addSpark(quality: VisualQuality, spark: Spark): void {
    const cap = SPARK_CAP[quality];
    if (cap <= 0) return;
    if (this.sparks.length >= cap) this.sparks.shift();
    this.sparks.push(spark);
  }

  private advance(list: Spark[], dt: number): void {
    let write = 0;
    for (const spark of list) {
      spark.life += dt;
      if (spark.life >= spark.max) continue;
      const drag = Math.pow(spark.drag, dt);
      spark.vx *= drag;
      spark.vy = spark.vy * drag + spark.gravity * dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      list[write++] = spark;
    }
    list.length = write;
  }

  private random(): number {
    let value = this.seed | 0;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.seed = value >>> 0;
    return this.seed / 0x1_0000_0000;
  }
}
