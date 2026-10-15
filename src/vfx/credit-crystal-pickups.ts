import type {
  CombatCreditRewardReceipt,
  CreditCrystalTier,
  CreditCrystalVariant,
} from "../rewards/combat-credit-drops";
import type { VisualQuality } from "../types";
import { CreditCrystalFx } from "./credit-crystal-fx";
import {
  drawCreditCrystalBursts,
  type CreditCrystalDrawablePiece,
} from "./credit-crystal-renderer";

export type CreditCrystalPoint = { x: number; y: number };
export type CreditCrystalPhase = "scatter" | "hover" | "magnet";

export type CreditCrystalCollectionEvent = {
  rewardIds: readonly string[];
  walletDeltaApplied: number;
  tier: CreditCrystalTier;
  variant: CreditCrystalVariant;
  hero: boolean;
};

/**
 * One crystal touching the ship. Presentation only (sound, flash, ship
 * glow): the wallet still moves once per burst through the collection event.
 */
export type CreditCrystalArrival = {
  x: number;
  y: number;
  tier: CreditCrystalTier;
  variant: CreditCrystalVariant;
  hero: boolean;
  anchor: boolean;
  radius: number;
  /** Chain ladder step of this crystal's burst (0 = chain start). */
  step: number;
  /** Arrival order inside its burst (0 = first crystal home). */
  order: number;
  /** Bursts collected in a row so far (1 = chain start). */
  chain: number;
  /** Set on the first arrival of every 5th burst in a chain. */
  milestone: boolean;
};

/**
 * Chain rules: a burst whose first crystal lands within CHAIN_WINDOW of the
 * previous burst climbs one step. Longer gaps lose one step per
 * CHAIN_DECAY_SECONDS, so a short pause dips the ladder instead of
 * restarting it.
 */
export const CREDIT_CHAIN_WINDOW = 1.6;
const CHAIN_DECAY_SECONDS = 0.5;
const CHAIN_MILESTONE = 5;
/** Seconds of magnet flight to reach full speed (gems accelerate home). */
const MAGNET_RAMP_SECONDS = 0.7;
export const CREDIT_TRAIL_POINTS = 10;
/** Trail samples are taken on game time, so frame rate never changes the look. */
const TRAIL_INTERVAL = 1 / 60;

type CrystalPiece = CreditCrystalDrawablePiece & {
  spin: number;
  flipSpeed: number;
  magnetDelay: number;
  /** Seconds since the last trail sample. */
  trailAge: number;
};

type CreditDropBurst = {
  rewardIds: string[];
  tier: CreditCrystalTier;
  variant: CreditCrystalVariant;
  walletDeltaApplied: number;
  age: number;
  phase: CreditCrystalPhase;
  scatterSeconds: number;
  hoverSeconds: number;
  maxLifetime: number;
  seed: number;
  hero: boolean;
  pieces: CrystalPiece[];
  /** Ladder step, fixed when the first crystal lands (-1 = not yet). */
  step: number;
  arrived: number;
};

type TierProfile = {
  satellites: number;
  anchorRadius: number;
  satelliteMin: number;
  satelliteMax: number;
  scatterSeconds: number;
  hoverSeconds: number;
  scatterSpeed: number;
  magnetSpeed: number;
  steering: number;
  curve: number;
  maxLifetime: number;
  hero: boolean;
};

const QUALITY_CAP: Readonly<Record<VisualQuality, number>> = {
  low: 28,
  medium: 44,
  high: 68,
  ultra: 92,
};

const PROFILE: Readonly<Record<CreditCrystalTier, TierProfile>> = {
  common: {
    satellites: 3,
    anchorRadius: 8,
    satelliteMin: 4,
    satelliteMax: 6,
    scatterSeconds: 0.16,
    hoverSeconds: 0.07,
    scatterSpeed: 105,
    magnetSpeed: 520,
    steering: 8.5,
    curve: 68,
    maxLifetime: 2.2,
    hero: false,
  },
  refined: {
    satellites: 4,
    anchorRadius: 11,
    satelliteMin: 5,
    satelliteMax: 8,
    scatterSeconds: 0.2,
    hoverSeconds: 0.12,
    scatterSpeed: 125,
    magnetSpeed: 570,
    steering: 8.8,
    curve: 78,
    maxLifetime: 2.4,
    hero: false,
  },
  high: {
    satellites: 6,
    anchorRadius: 15,
    satelliteMin: 6,
    satelliteMax: 9,
    scatterSeconds: 0.24,
    hoverSeconds: 0.15,
    scatterSpeed: 145,
    magnetSpeed: 620,
    steering: 9.2,
    curve: 92,
    maxLifetime: 2.6,
    hero: false,
  },
  elite: {
    satellites: 8,
    anchorRadius: 20,
    satelliteMin: 7,
    satelliteMax: 11,
    scatterSeconds: 0.28,
    hoverSeconds: 0.19,
    scatterSpeed: 160,
    magnetSpeed: 680,
    steering: 9.6,
    curve: 108,
    maxLifetime: 2.9,
    hero: false,
  },
  "mini-boss": {
    satellites: 10,
    anchorRadius: 26,
    satelliteMin: 8,
    satelliteMax: 13,
    scatterSeconds: 0.34,
    hoverSeconds: 0.28,
    scatterSpeed: 180,
    magnetSpeed: 720,
    steering: 9.8,
    curve: 124,
    maxLifetime: 3.4,
    hero: true,
  },
  boss: {
    satellites: 12,
    anchorRadius: 36,
    satelliteMin: 9,
    satelliteMax: 14,
    scatterSeconds: 0.4,
    hoverSeconds: 0.4,
    scatterSpeed: 205,
    magnetSpeed: 760,
    steering: 10.2,
    curve: 142,
    maxLifetime: 4,
    hero: true,
  },
  "major-boss": {
    satellites: 15,
    anchorRadius: 46,
    satelliteMin: 10,
    satelliteMax: 16,
    scatterSeconds: 0.45,
    hoverSeconds: 0.55,
    scatterSpeed: 225,
    magnetSpeed: 810,
    steering: 10.6,
    curve: 160,
    maxLifetime: 4.6,
    hero: true,
  },
};

const TIER_PRIORITY: Readonly<Record<CreditCrystalTier, number>> = {
  common: 0,
  refined: 1,
  high: 2,
  elite: 3,
  "mini-boss": 4,
  boss: 5,
  "major-boss": 6,
};

function phaseFor(burst: CreditDropBurst): CreditCrystalPhase {
  if (burst.age < burst.scatterSeconds) return "scatter";
  if (burst.age < burst.scatterSeconds + burst.hoverSeconds) return "hover";
  return "magnet";
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function nextSeed(seed: number): number {
  let value = seed | 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
}

function random01(state: { value: number }): number {
  state.value = nextSeed(state.value || 0x9e3779b9);
  return state.value / 0x1_0000_0000;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function wrapAngle(value: number): number {
  return Math.atan2(Math.sin(value), Math.cos(value));
}

function pushTrail(piece: CrystalPiece): void {
  const head = piece.trailHead;
  piece.trail[head * 2] = piece.x;
  piece.trail[head * 2 + 1] = piece.y;
  piece.trailHead = (head + 1) % CREDIT_TRAIL_POINTS;
  piece.trailLength = Math.min(CREDIT_TRAIL_POINTS, piece.trailLength + 1);
}

export class CreditCrystalPickupSystem {
  private readonly bursts: CreditDropBurst[] = [];
  private nextBurstId = 1;
  private readonly fx = new CreditCrystalFx();
  private quality: VisualQuality = "high";
  private clock = 0;
  private chainStep = 0;
  private chainBursts = 0;
  private lastBurstArrival = -Infinity;

  spawn(
    receipt: CombatCreditRewardReceipt,
    x: number,
    y: number,
    quality: VisualQuality,
  ): void {
    if (receipt.walletDeltaApplied <= 0 && receipt.nominalEarned <= 0) return;

    const profile = PROFILE[receipt.tier];
    const cap = QUALITY_CAP[quality];
    const hero = profile.hero;
    this.quality = quality;
    this.fx.spawn(x, y, receipt.tier, receipt.variant, hero, quality);

    if (!hero && this.livePieceCount() >= cap) {
      const target =
        this.findMergeTarget(receipt.tier, receipt.variant) ??
        this.findOverflowMergeTarget();
      if (target !== null) {
        this.mergeReceipt(target, receipt);
        return;
      }
    }

    const requested = profile.satellites + 1;
    if (hero) {
      this.freeCapacityForHero(requested, cap);
      if (this.livePieceCount() >= cap) {
        const target = this.findHeroMergeTarget(
          receipt.tier,
          receipt.variant,
        );
        if (target !== null) {
          this.mergeReceipt(target, receipt);
          return;
        }
      }
    }

    const free = Math.max(0, cap - this.livePieceCount());
    if (free <= 0) {
      const target =
        hero
          ? this.findHeroMergeTarget(receipt.tier, receipt.variant)
          : this.findMergeTarget(receipt.tier, receipt.variant) ??
            this.findOverflowMergeTarget();
      if (target !== null) this.mergeReceipt(target, receipt);
      return;
    }
    const count = Math.max(1, Math.min(requested, free));
    const randomState = {
      value:
        hashString(receipt.rewardId) ^
        this.nextBurstId++ ^
        Math.floor(x * 17 + y * 31),
    };
    const pieces: CrystalPiece[] = [];

    for (let index = 0; index < count; index += 1) {
      const anchor = index === 0;
      const angle =
        random01(randomState) * Math.PI * 2 - Math.PI * 0.5;
      const radius = anchor
        ? profile.anchorRadius
        : lerp(
            profile.satelliteMin,
            profile.satelliteMax,
            random01(randomState),
          );
      // Satellites burst out wide and brake hard; the anchor stays central.
      const speed =
        profile.scatterSpeed *
        (anchor ? 0.55 : lerp(1.15, 1.75, random01(randomState)));

      pieces.push({
        x,
        y,
        previousX: x,
        previousY: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (anchor ? 34 : 56),
        radius,
        angle: random01(randomState) * Math.PI * 2,
        // Tumbles hard while it flies out, then settles upright.
        spin:
          lerp(-7, 7, random01(randomState)) *
          (anchor ? 0.45 : 1),
        magnetDelay:
          profile.scatterSeconds +
          profile.hoverSeconds +
          (anchor && hero ? 0.18 : index * 0.018) +
          random01(randomState) * 0.08,
        anchor,
        flip: random01(randomState) * Math.PI * 2,
        flipSpeed:
          (anchor ? 2.6 : lerp(3.6, 5.6, random01(randomState))) *
          (random01(randomState) < 0.5 ? -1 : 1),
        twinkle: random01(randomState),
        magnetic: false,
        trail: new Float32Array(CREDIT_TRAIL_POINTS * 2),
        trailLength: 0,
        trailHead: 0,
        trailAge: 0,
      });
    }

    this.bursts.push({
      rewardIds: [receipt.rewardId],
      tier: receipt.tier,
      variant: receipt.variant,
      walletDeltaApplied: receipt.walletDeltaApplied,
      age: 0,
      phase: "scatter",
      scatterSeconds: profile.scatterSeconds,
      hoverSeconds: profile.hoverSeconds,
      maxLifetime: profile.maxLifetime,
      seed: randomState.value,
      hero,
      pieces,
      step: -1,
      arrived: 0,
    });
  }

  /**
   * Moves every crystal. Returns the wallet events (one per finished burst);
   * pass `arrivals` to also receive every single crystal that reached the
   * ship this frame, for per-crystal sound and light.
   */
  update(
    dt: number,
    shipTarget: CreditCrystalPoint,
    arrivals?: CreditCrystalArrival[],
  ): CreditCrystalCollectionEvent[] {
    const events: CreditCrystalCollectionEvent[] = [];
    let burstWrite = 0;
    this.clock += Math.max(0, dt);
    this.fx.update(dt, shipTarget);

    for (const burst of this.bursts) {
      burst.age += Math.max(0, dt);
      burst.phase = phaseFor(burst);
      const profile = PROFILE[burst.tier];
      let pieceWrite = 0;

      for (const piece of burst.pieces) {
        piece.previousX = piece.x;
        piece.previousY = piece.y;
        piece.flip += piece.flipSpeed * dt;
        let collected = false;

        if (burst.phase === "scatter") {
          piece.angle += piece.spin * dt * Math.max(0.25, 1 - burst.age / burst.scatterSeconds);
          piece.x += piece.vx * dt;
          piece.y += piece.vy * dt;
          piece.vx *= Math.pow(0.12, dt);
          piece.vy = piece.vy * Math.pow(0.2, dt) + 20 * dt;
        } else if (
          burst.phase === "hover" ||
          burst.age < piece.magnetDelay
        ) {
          piece.angle = wrapAngle(piece.angle) * Math.exp(-14 * dt);
          const damping = Math.pow(0.025, dt);
          piece.vx *= damping;
          piece.vy *= damping;
          piece.x += piece.vx * dt;
          piece.y += piece.vy * dt;
        } else {
          if (!piece.magnetic) {
            piece.magnetic = true;
            piece.trailLength = 0;
            piece.trailAge = 0;
            pushTrail(piece);
          }
          const dx = shipTarget.x - piece.x;
          const dy = shipTarget.y - piece.y;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const nx = dx / distance;
          const ny = dy / distance;
          const progress = Math.min(
            1,
            Math.max(
              0,
              (burst.age - piece.magnetDelay) / MAGNET_RAMP_SECONDS,
            ),
          );
          const desiredSpeed =
            profile.magnetSpeed *
            (0.55 + progress * 1.05) *
            (piece.anchor ? 0.93 : 1.08);
          const side =
            ((burst.seed + Math.round(piece.radius * 17)) & 1) === 0
              ? -1
              : 1;
          const curve =
            profile.curve *
            side *
            Math.min(1, distance / 220) *
            (1 - progress * 0.72);
          const desiredVx = nx * desiredSpeed - ny * curve;
          const desiredVy = ny * desiredSpeed + nx * curve;
          const steer = Math.min(1, profile.steering * dt);
          piece.vx += (desiredVx - piece.vx) * steer;
          piece.vy += (desiredVy - piece.vy) * steer;
          piece.x += piece.vx * dt;
          piece.y += piece.vy * dt;
          piece.trailAge += dt;
          if (piece.trailAge >= TRAIL_INTERVAL) {
            piece.trailAge = 0;
            pushTrail(piece);
          }

          // Leans into the flight a little but stays a gem, not a dart.
          // Sideways motion tilts the long axis along the flight.
          const lean = Math.max(-0.42, Math.min(0.42, -piece.vx / 700));
          piece.angle +=
            (lean - wrapAngle(piece.angle)) * Math.min(1, 10 * dt);

          collected =
            Math.hypot(
              shipTarget.x - piece.x,
              shipTarget.y - piece.y,
            ) <= Math.max(18, piece.radius + 9);
        }

        if (!collected) {
          burst.pieces[pieceWrite++] = piece;
        } else if (arrivals !== undefined) {
          arrivals.push(this.arrival(burst, piece));
        } else {
          this.arrival(burst, piece);
        }
      }
      burst.pieces.length = pieceWrite;

      if (
        burst.pieces.length === 0 ||
        burst.age >= burst.maxLifetime
      ) {
        events.push(this.collectionEvent(burst));
        continue;
      }
      this.bursts[burstWrite++] = burst;
    }

    this.bursts.length = burstWrite;
    return events;
  }

  draw(
    context: CanvasRenderingContext2D,
    quality: VisualQuality,
  ): void {
    this.quality = quality;
    this.fx.drawUnder(context, quality);
    drawCreditCrystalBursts(context, this.bursts, quality);
    this.fx.drawOver(context, quality);
  }

  flush(): CreditCrystalCollectionEvent[] {
    const events = this.bursts.map((burst) =>
      this.collectionEvent(burst),
    );
    this.bursts.length = 0;
    return events;
  }

  forceMagnet(): void {
    for (const burst of this.bursts) {
      burst.age = Math.max(
        burst.age,
        burst.scatterSeconds + burst.hoverSeconds,
      );
      burst.phase = "magnet";
      for (const piece of burst.pieces) {
        piece.magnetDelay = Math.min(piece.magnetDelay, burst.age);
      }
    }
  }

  reframe(
    previous: { width: number; height: number },
    next: { width: number; height: number },
  ): void {
    const scaleX =
      previous.width > 0 ? next.width / previous.width : 1;
    const scaleY =
      previous.height > 0 ? next.height / previous.height : 1;
    const margin = 72;
    const clampX = (value: number): number =>
      Math.min(next.width + margin, Math.max(-margin, value));
    const clampY = (value: number): number =>
      Math.min(next.height + margin, Math.max(-margin, value));

    for (const burst of this.bursts) {
      for (const piece of burst.pieces) {
        piece.x = clampX(piece.x * scaleX);
        piece.y = clampY(piece.y * scaleY);
        piece.previousX = clampX(piece.previousX * scaleX);
        piece.previousY = clampY(piece.previousY * scaleY);
        piece.vx *= scaleX;
        piece.vy *= scaleY;
      }
    }
  }

  clear(): void {
    this.bursts.length = 0;
    this.fx.clear();
    this.chainStep = 0;
    this.chainBursts = 0;
    this.lastBurstArrival = -Infinity;
  }

  liveBurstCount(): number {
    return this.bursts.length;
  }

  livePieceCount(): number {
    let count = 0;
    for (const burst of this.bursts) count += burst.pieces.length;
    return count;
  }

  phaseSnapshot(): CreditCrystalPhase[] {
    return this.bursts.map((burst) => burst.phase);
  }

  diagnosticSnapshot(): ReadonlyArray<{
    tier: CreditCrystalTier;
    hero: boolean;
    rewardCount: number;
    walletDeltaApplied: number;
    pieces: ReadonlyArray<{ x: number; y: number; anchor: boolean }>;
  }> {
    return this.bursts.map((burst) => ({
      tier: burst.tier,
      hero: burst.hero,
      rewardCount: burst.rewardIds.length,
      walletDeltaApplied: burst.walletDeltaApplied,
      pieces: burst.pieces.map((piece) => ({
        x: piece.x,
        y: piece.y,
        anchor: piece.anchor,
      })),
    }));
  }

  /** Current chain: ladder step and bursts collected in a row. */
  chainSnapshot(): { step: number; bursts: number } {
    return { step: this.chainStep, bursts: this.chainBursts };
  }

  private arrival(
    burst: CreditDropBurst,
    piece: CrystalPiece,
  ): CreditCrystalArrival {
    const arrival = this.chainArrival(burst, piece);
    this.fx.arrive(arrival, this.quality);
    return arrival;
  }

  private chainArrival(
    burst: CreditDropBurst,
    piece: CrystalPiece,
  ): CreditCrystalArrival {
    let milestone = false;
    if (burst.step < 0) {
      const gap = this.clock - this.lastBurstArrival;
      if (gap <= CREDIT_CHAIN_WINDOW) {
        this.chainStep += 1;
        this.chainBursts += 1;
      } else {
        const lost = Number.isFinite(gap)
          ? Math.ceil((gap - CREDIT_CHAIN_WINDOW) / CHAIN_DECAY_SECONDS)
          : Infinity;
        this.chainStep = Math.max(0, this.chainStep - lost);
        this.chainBursts = 1;
      }
      this.lastBurstArrival = this.clock;
      burst.step = this.chainStep;
      milestone = this.chainBursts % CHAIN_MILESTONE === 0;
    }
    const order = burst.arrived;
    burst.arrived += 1;
    return {
      x: piece.x,
      y: piece.y,
      tier: burst.tier,
      variant: burst.variant,
      hero: burst.hero,
      anchor: piece.anchor,
      radius: piece.radius,
      step: burst.step,
      order,
      chain: this.chainBursts,
      milestone,
    };
  }

  private collectionEvent(
    burst: CreditDropBurst,
  ): CreditCrystalCollectionEvent {
    return {
      rewardIds: [...burst.rewardIds],
      walletDeltaApplied: burst.walletDeltaApplied,
      tier: burst.tier,
      variant: burst.variant,
      hero: burst.hero,
    };
  }

  private mergeReceipt(
    burst: CreditDropBurst,
    receipt: CombatCreditRewardReceipt,
  ): void {
    burst.rewardIds.push(receipt.rewardId);
    burst.walletDeltaApplied += receipt.walletDeltaApplied;
    burst.maxLifetime = Math.max(
      burst.maxLifetime,
      burst.age + 1.2,
    );

    if (TIER_PRIORITY[receipt.tier] > TIER_PRIORITY[burst.tier]) {
      burst.tier = receipt.tier;
      burst.hero = PROFILE[receipt.tier].hero;
      const profile = PROFILE[receipt.tier];
      const anchor = burst.pieces.find((piece) => piece.anchor);
      if (anchor !== undefined) {
        anchor.radius = Math.max(anchor.radius, profile.anchorRadius);
      }
    }
    if (receipt.variant === "golden") burst.variant = "golden";
  }

  private findHeroMergeTarget(
    tier: CreditCrystalTier,
    variant: CreditCrystalVariant,
  ): CreditDropBurst | null {
    for (let index = this.bursts.length - 1; index >= 0; index -= 1) {
      const burst = this.bursts[index]!;
      if (
        burst.hero &&
        burst.tier === tier &&
        burst.variant === variant
      ) {
        return burst;
      }
    }
    for (let index = this.bursts.length - 1; index >= 0; index -= 1) {
      if (this.bursts[index]!.hero) return this.bursts[index]!;
    }
    return null;
  }

  private findMergeTarget(
    tier: CreditCrystalTier,
    variant: CreditCrystalVariant,
  ): CreditDropBurst | null {
    for (let index = this.bursts.length - 1; index >= 0; index -= 1) {
      const burst = this.bursts[index]!;
      if (
        !burst.hero &&
        burst.tier === tier &&
        burst.variant === variant &&
        burst.age < burst.maxLifetime * 0.72
      ) {
        return burst;
      }
    }
    return null;
  }

  private findOverflowMergeTarget(): CreditDropBurst | null {
    for (let index = this.bursts.length - 1; index >= 0; index -= 1) {
      if (!this.bursts[index]!.hero) return this.bursts[index]!;
    }
    return this.bursts.at(-1) ?? null;
  }

  private freeCapacityForHero(
    requestedPieces: number,
    cap: number,
  ): void {
    let overflow = this.livePieceCount() + requestedPieces - cap;
    if (overflow <= 0) return;

    for (const burst of this.bursts) {
      if (burst.hero || burst.pieces.length <= 1) continue;
      while (burst.pieces.length > 1 && overflow > 0) {
        burst.pieces.pop();
        overflow -= 1;
      }
      if (overflow <= 0) return;
    }

    while (overflow > 0) {
      const sourceIndex = this.bursts.findIndex(
        (burst, index) =>
          !burst.hero &&
          index > 0 &&
          this.bursts.some(
            (candidate, candidateIndex) =>
              candidateIndex !== index && !candidate.hero,
          ),
      );
      if (sourceIndex < 0) return;
      const targetIndex = this.bursts.findIndex(
        (burst, index) => index !== sourceIndex && !burst.hero,
      );
      if (targetIndex < 0) return;

      const source = this.bursts[sourceIndex]!;
      const target = this.bursts[targetIndex]!;
      target.rewardIds.push(...source.rewardIds);
      target.walletDeltaApplied += source.walletDeltaApplied;
      target.maxLifetime = Math.max(
        target.maxLifetime,
        source.maxLifetime,
      );
      if (TIER_PRIORITY[source.tier] > TIER_PRIORITY[target.tier]) {
        target.tier = source.tier;
      }
      if (source.variant === "golden") target.variant = "golden";
      overflow -= source.pieces.length;
      this.bursts.splice(sourceIndex, 1);
    }
  }
}
