import type {
  CombatCreditRewardReceipt,
  CreditCrystalTier,
  CreditCrystalVariant,
} from "../rewards/combat-credit-drops";
import type { VisualQuality } from "../types";
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

type CrystalPiece = CreditCrystalDrawablePiece & {
  vx: number;
  vy: number;
  spin: number;
  magnetDelay: number;
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

export class CreditCrystalPickupSystem {
  private readonly bursts: CreditDropBurst[] = [];
  private nextBurstId = 1;

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

    if (!hero && this.livePieceCount() >= cap) {
      const target =
        this.findMergeTarget(receipt.tier, receipt.variant) ??
        this.findOverflowMergeTarget();
      if (target !== null) {
        this.mergeReceipt(target, receipt);
        return;
      }
    }

    if (hero) {
      this.freeCapacityForHero(
        Math.min(profile.satellites + 1, 10),
        cap,
      );
    }

    const free = Math.max(1, cap - this.livePieceCount());
    const requested = profile.satellites + 1;
    const count = hero
      ? Math.max(1, Math.min(requested, free + 4))
      : Math.max(1, Math.min(requested, free));
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
      const speed =
        profile.scatterSpeed *
        (anchor ? 0.7 : lerp(0.78, 1.18, random01(randomState)));

      pieces.push({
        x,
        y,
        previousX: x,
        previousY: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (anchor ? 34 : 56),
        radius,
        angle: random01(randomState) * Math.PI * 2,
        spin:
          lerp(-2.3, 2.3, random01(randomState)) *
          (anchor ? 0.55 : 1),
        magnetDelay:
          profile.scatterSeconds +
          profile.hoverSeconds +
          (anchor && hero ? 0.18 : index * 0.018) +
          random01(randomState) * 0.08,
        anchor,
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
    });
  }

  update(
    dt: number,
    shipTarget: CreditCrystalPoint,
  ): CreditCrystalCollectionEvent[] {
    const events: CreditCrystalCollectionEvent[] = [];
    let burstWrite = 0;

    for (const burst of this.bursts) {
      burst.age += Math.max(0, dt);
      burst.phase = phaseFor(burst);
      const profile = PROFILE[burst.tier];
      let pieceWrite = 0;

      for (const piece of burst.pieces) {
        piece.previousX = piece.x;
        piece.previousY = piece.y;
        piece.angle += piece.spin * dt;
        let collected = false;

        if (burst.phase === "scatter") {
          piece.x += piece.vx * dt;
          piece.y += piece.vy * dt;
          piece.vx *= Math.pow(0.12, dt);
          piece.vy = piece.vy * Math.pow(0.2, dt) + 20 * dt;
        } else if (
          burst.phase === "hover" ||
          burst.age < piece.magnetDelay
        ) {
          const damping = Math.pow(0.025, dt);
          piece.vx *= damping;
          piece.vy *= damping;
          piece.x += piece.vx * dt;
          piece.y += piece.vy * dt;
        } else {
          const dx = shipTarget.x - piece.x;
          const dy = shipTarget.y - piece.y;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const nx = dx / distance;
          const ny = dy / distance;
          const progress = Math.min(
            1,
            Math.max(
              0,
              (burst.age - piece.magnetDelay) /
                Math.max(0.2, burst.maxLifetime - piece.magnetDelay),
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

          collected =
            Math.hypot(
              shipTarget.x - piece.x,
              shipTarget.y - piece.y,
            ) <= Math.max(18, piece.radius + 9);
        }

        if (!collected) {
          burst.pieces[pieceWrite++] = piece;
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
    drawCreditCrystalBursts(context, this.bursts, quality);
  }

  flush(): CreditCrystalCollectionEvent[] {
    const events = this.bursts.map((burst) =>
      this.collectionEvent(burst),
    );
    this.bursts.length = 0;
    return events;
  }

  clear(): void {
    this.bursts.length = 0;
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

    if (
      !burst.hero &&
      TIER_PRIORITY[receipt.tier] > TIER_PRIORITY[burst.tier]
    ) {
      burst.tier = receipt.tier;
      const profile = PROFILE[receipt.tier];
      const anchor = burst.pieces.find((piece) => piece.anchor);
      if (anchor !== undefined) {
        anchor.radius = Math.max(anchor.radius, profile.anchorRadius);
      }
    }
    if (receipt.variant === "golden") burst.variant = "golden";
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
