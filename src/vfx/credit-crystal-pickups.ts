import type {
  CombatCreditRewardReceipt,
  CreditCrystalTier,
  CreditCrystalVariant,
} from "../rewards/combat-credit-drops";
import type { VisualQuality } from "../types";

export type CreditCrystalPoint = {
  x: number;
  y: number;
};

export type CreditCrystalPhase =
  | "scatter"
  | "hover"
  | "magnet";

export type CreditCrystalCollectionEvent = {
  rewardIds: readonly string[];
  walletDeltaApplied: number;
  tier: CreditCrystalTier;
  variant: CreditCrystalVariant;
  hero: boolean;
};

type CrystalPiece = {
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  vx: number;
  vy: number;
  radius: number;
  angle: number;
  spin: number;
  magnetDelay: number;
  anchor: boolean;
};

type CreditDropBurst = {
  rewardIds: string[];
  tier: CreditCrystalTier;
  variant: CreditCrystalVariant;
  walletDeltaApplied: number;
  age: number;
  scatterSeconds: number;
  hoverSeconds: number;
  maxLifetime: number;
  seed: number;
  hero: boolean;
  pieces: CrystalPiece[];
};

type TierVisualProfile = {
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

const TIER_PROFILE: Readonly<Record<CreditCrystalTier, TierVisualProfile>> = {
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

function isHeroTier(tier: CreditCrystalTier): boolean {
  return TIER_PROFILE[tier].hero;
}

function phaseFor(burst: CreditDropBurst): CreditCrystalPhase {
  if (burst.age < burst.scatterSeconds) return "scatter";
  if (burst.age < burst.scatterSeconds + burst.hoverSeconds) return "hover";
  return "magnet";
}

function palette(
  tier: CreditCrystalTier,
  variant: CreditCrystalVariant,
): {
  core: string;
  edge: string;
  glow: string;
  trail: string;
} {
  if (variant === "golden") {
    return {
      core: "#fff4a8",
      edge: "#ffb323",
      glow: "rgba(255, 199, 64, 0.45)",
      trail: "rgba(255, 232, 150, 0.62)",
    };
  }
  switch (tier) {
    case "common":
      return {
        core: "#c79cff",
        edge: "#7b49ff",
        glow: "rgba(152, 91, 255, 0.33)",
        trail: "rgba(194, 157, 255, 0.46)",
      };
    case "refined":
      return {
        core: "#bffcff",
        edge: "#9b62ff",
        glow: "rgba(124, 232, 255, 0.38)",
        trail: "rgba(184, 248, 255, 0.54)",
      };
    case "high":
      return {
        core: "#eef8ff",
        edge: "#6979ff",
        glow: "rgba(112, 156, 255, 0.44)",
        trail: "rgba(178, 220, 255, 0.62)",
      };
    case "elite":
      return {
        core: "#fff4ff",
        edge: "#df4cff",
        glow: "rgba(226, 76, 255, 0.48)",
        trail: "rgba(255, 190, 255, 0.66)",
      };
    case "mini-boss":
      return {
        core: "#ffffff",
        edge: "#c943ff",
        glow: "rgba(216, 88, 255, 0.52)",
        trail: "rgba(255, 202, 255, 0.72)",
      };
    case "boss":
      return {
        core: "#ffffff",
        edge: "#8df4ff",
        glow: "rgba(204, 89, 255, 0.57)",
        trail: "rgba(207, 246, 255, 0.78)",
      };
    case "major-boss":
      return {
        core: "#ffffff",
        edge: "#78f6ff",
        glow: "rgba(247, 104, 255, 0.62)",
        trail: "rgba(228, 252, 255, 0.84)",
      };
  }
}

function drawFacetCrystal(
  context: CanvasRenderingContext2D,
  piece: CrystalPiece,
  colors: ReturnType<typeof palette>,
  quality: VisualQuality,
  hero: boolean,
  age: number,
): void {
  const r = piece.radius;
  context.save();
  context.translate(piece.x, piece.y);
  context.rotate(piece.angle);

  if (quality !== "low") {
    context.globalAlpha = hero ? 0.5 : 0.34;
    context.fillStyle = colors.glow;
    context.beginPath();
    context.arc(0, 0, r * (hero ? 1.75 : 1.5), 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
  }

  context.fillStyle = colors.edge;
  context.beginPath();
  context.moveTo(0, -r);
  context.lineTo(r * 0.72, -r * 0.18);
  context.lineTo(r * 0.42, r);
  context.lineTo(-r * 0.46, r * 0.88);
  context.lineTo(-r * 0.74, -r * 0.16);
  context.closePath();
  context.fill();

  context.fillStyle = colors.core;
  context.globalAlpha = 0.92;
  context.beginPath();
  context.moveTo(0, -r * 0.82);
  context.lineTo(r * 0.44, -r * 0.12);
  context.lineTo(0, r * 0.62);
  context.lineTo(-r * 0.32, -r * 0.08);
  context.closePath();
  context.fill();

  context.strokeStyle = "rgba(255,255,255,0.82)";
  context.lineWidth = hero ? 1.5 : 1;
  context.beginPath();
  context.moveTo(-r * 0.28, -r * 0.18);
  context.lineTo(0, -r * 0.72);
  context.lineTo(r * 0.24, -r * 0.2);
  context.stroke();

  if (
    hero &&
    (quality === "high" || quality === "ultra")
  ) {
    const sweep = ((age * 2.6) % 1) * 2 - 1;
    context.globalAlpha = quality === "ultra" ? 0.9 : 0.68;
    context.strokeStyle = "#ffffff";
    context.lineWidth = quality === "ultra" ? 2.1 : 1.4;
    context.beginPath();
    context.moveTo(sweep * r - r * 0.18, -r * 0.7);
    context.lineTo(sweep * r + r * 0.2, r * 0.72);
    context.stroke();
  }

  context.restore();
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

    const hero = isHeroTier(receipt.tier);
    const currentPieces = this.livePieceCount();
    const cap = QUALITY_CAP[quality];
    const profile = TIER_PROFILE[receipt.tier];

    if (!hero && currentPieces >= cap) {
      const mergeTarget = this.findMergeTarget(receipt.tier, receipt.variant);
      if (mergeTarget !== null) {
        mergeTarget.rewardIds.push(receipt.rewardId);
        mergeTarget.walletDeltaApplied += receipt.walletDeltaApplied;
        mergeTarget.maxLifetime = Math.max(mergeTarget.maxLifetime, mergeTarget.age + 1.2);
        return;
      }
    }

    if (hero) {
      this.freeCapacityForHero(Math.min(profile.satellites + 1, 10), cap);
    }

    const available = Math.max(
      1,
      cap - this.livePieceCount(),
    );
    const requested = 1 + profile.satellites;
    const count = hero
      ? Math.max(1, Math.min(requested, available + 4))
      : Math.max(1, Math.min(requested, available));
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
        random01(randomState) * Math.PI * 2 -
        Math.PI * 0.5;
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
        // Bias upward so crystal scatter does not sit on kill-translation text.
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
    let write = 0;

    for (let index = 0; index < this.bursts.length; index += 1) {
      const burst = this.bursts[index]!;
      burst.age += dt;
      const profile = TIER_PROFILE[burst.tier];
      const phase = phaseFor(burst);
      let arrived = 0;

      for (const piece of burst.pieces) {
        piece.previousX = piece.x;
        piece.previousY = piece.y;
        piece.angle += piece.spin * dt;

        if (phase === "scatter") {
          piece.x += piece.vx * dt;
          piece.y += piece.vy * dt;
          piece.vx *= Math.pow(0.12, dt);
          piece.vy =
            piece.vy * Math.pow(0.2, dt) +
            20 * dt;
        } else if (phase === "hover" || burst.age < piece.magnetDelay) {
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
          const sideSign =
            ((burst.seed + Math.round(piece.radius * 17)) & 1) === 0
              ? -1
              : 1;
          const curveStrength =
            profile.curve *
            sideSign *
            Math.min(1, distance / 220) *
            (1 - progress * 0.72);
          const desiredVx = nx * desiredSpeed + -ny * curveStrength;
          const desiredVy = ny * desiredSpeed + nx * curveStrength;
          const steer = Math.min(1, profile.steering * dt);
          piece.vx += (desiredVx - piece.vx) * steer;
          piece.vy += (desiredVy - piece.vy) * steer;
          piece.x += piece.vx * dt;
          piece.y += piece.vy * dt;

          if (distance <= Math.max(18, piece.radius + 9)) {
            arrived += 1;
          }
        }
      }

      const allArrived =
        burst.pieces.length > 0 &&
        arrived === burst.pieces.length;
      const timedOut = burst.age >= burst.maxLifetime;

      if (allArrived || timedOut) {
        events.push({
          rewardIds: [...burst.rewardIds],
          walletDeltaApplied: burst.walletDeltaApplied,
          tier: burst.tier,
          variant: burst.variant,
          hero: burst.hero,
        });
        continue;
      }

      this.bursts[write++] = burst;
    }

    this.bursts.length = write;
    return events;
  }

  draw(
    context: CanvasRenderingContext2D,
    quality: VisualQuality,
  ): void {
    context.save();
    context.lineCap = "round";

    for (const burst of this.bursts) {
      const colors = palette(burst.tier, burst.variant);
      const phase = phaseFor(burst);

      if (phase === "magnet" && quality !== "low") {
        for (const piece of burst.pieces) {
          const trailScale =
            quality === "ultra" ? 1 : quality === "high" ? 0.78 : 0.55;
          context.globalAlpha = piece.anchor ? 0.62 : 0.4;
          context.strokeStyle = colors.trail;
          context.lineWidth =
            Math.max(1, piece.radius * 0.22 * trailScale);
          context.beginPath();
          context.moveTo(piece.previousX, piece.previousY);
          context.lineTo(piece.x, piece.y);
          context.stroke();
        }
      }

      context.globalAlpha = 1;
      for (const piece of burst.pieces) {
        drawFacetCrystal(
          context,
          piece,
          colors,
          quality,
          burst.hero && piece.anchor,
          burst.age,
        );
      }
    }

    context.restore();
  }

  flush(): CreditCrystalCollectionEvent[] {
    const events = this.bursts.map((burst) => ({
      rewardIds: [...burst.rewardIds],
      walletDeltaApplied: burst.walletDeltaApplied,
      tier: burst.tier,
      variant: burst.variant,
      hero: burst.hero,
    }));
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
    return this.bursts.map(phaseFor);
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

  private freeCapacityForHero(
    requestedPieces: number,
    cap: number,
  ): void {
    let overflow =
      this.livePieceCount() + requestedPieces - cap;
    if (overflow <= 0) return;

    for (
      let burstIndex = 0;
      burstIndex < this.bursts.length && overflow > 0;
      burstIndex += 1
    ) {
      const burst = this.bursts[burstIndex]!;
      if (burst.hero || burst.pieces.length <= 1) continue;
      while (burst.pieces.length > 1 && overflow > 0) {
        burst.pieces.pop();
        overflow -= 1;
      }
    }
  }
}
