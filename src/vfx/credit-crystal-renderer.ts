import type {
  CreditCrystalTier,
  CreditCrystalVariant,
} from "../rewards/combat-credit-drops";
import type { VisualQuality } from "../types";
import { creditCrystalImage } from "./credit-crystal-art";

export type CreditCrystalDrawablePiece = {
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  radius: number;
  angle: number;
  anchor: boolean;
};

export type CreditCrystalDrawBurst = {
  tier: CreditCrystalTier;
  variant: CreditCrystalVariant;
  hero: boolean;
  age: number;
  phase: "scatter" | "hover" | "magnet";
  pieces: readonly CreditCrystalDrawablePiece[];
};

type Palette = {
  core: string;
  edge: string;
  glow: string;
  trail: string;
};

const GOLDEN: Palette = {
  core: "#fff4a8",
  edge: "#ffb323",
  glow: "rgba(255,199,64,.45)",
  trail: "rgba(255,232,150,.62)",
};

const PALETTES: Readonly<Record<CreditCrystalTier, Palette>> = {
  common: {
    core: "#c79cff",
    edge: "#7b49ff",
    glow: "rgba(152,91,255,.33)",
    trail: "rgba(194,157,255,.46)",
  },
  refined: {
    core: "#bffcff",
    edge: "#9b62ff",
    glow: "rgba(124,232,255,.38)",
    trail: "rgba(184,248,255,.54)",
  },
  high: {
    core: "#eef8ff",
    edge: "#6979ff",
    glow: "rgba(112,156,255,.44)",
    trail: "rgba(178,220,255,.62)",
  },
  elite: {
    core: "#fff4ff",
    edge: "#df4cff",
    glow: "rgba(226,76,255,.48)",
    trail: "rgba(255,190,255,.66)",
  },
  "mini-boss": {
    core: "#fff",
    edge: "#c943ff",
    glow: "rgba(216,88,255,.52)",
    trail: "rgba(255,202,255,.72)",
  },
  boss: {
    core: "#fff",
    edge: "#8df4ff",
    glow: "rgba(204,89,255,.57)",
    trail: "rgba(207,246,255,.78)",
  },
  "major-boss": {
    core: "#fff",
    edge: "#78f6ff",
    glow: "rgba(247,104,255,.62)",
    trail: "rgba(228,252,255,.84)",
  },
};

function palette(
  tier: CreditCrystalTier,
  variant: CreditCrystalVariant,
): Palette {
  return variant === "golden" ? GOLDEN : PALETTES[tier];
}

function qualityFxScale(quality: VisualQuality): number {
  switch (quality) {
    case "low":
      return 0;
    case "medium":
      return 0.65;
    case "high":
      return 0.9;
    case "ultra":
      return 1.15;
  }
}

function drawBurstRelease(
  context: CanvasRenderingContext2D,
  burst: CreditCrystalDrawBurst,
  colors: Palette,
  quality: VisualQuality,
): void {
  const fx = qualityFxScale(quality);
  if (fx <= 0 || burst.pieces.length === 0) return;

  const anchor =
    burst.pieces.find((piece) => piece.anchor) ??
    burst.pieces[0]!;
  const releaseAge = Math.min(1, burst.age / 0.34);
  const fade = Math.max(0, 1 - releaseAge);
  if (fade <= 0) return;

  const heroScale = burst.hero ? 1.55 : 1;
  const radius =
    (18 + anchor.radius * (1.7 + releaseAge * 2.3)) *
    heroScale *
    fx;

  context.save();
  context.globalCompositeOperation = "lighter";
  context.globalAlpha = fade * (burst.hero ? 0.72 : 0.5) * fx;
  context.strokeStyle = colors.trail;
  context.lineWidth =
    Math.max(1, anchor.radius * 0.08) *
    (quality === "ultra" ? 1.35 : 1);
  context.beginPath();
  context.arc(anchor.x, anchor.y, radius, 0, Math.PI * 2);
  context.stroke();

  const rayCount =
    quality === "medium"
      ? 4
      : quality === "high"
        ? 7
        : 10;
  const rayLength =
    anchor.radius *
    (burst.hero ? 2.8 : 2.1) *
    (0.75 + releaseAge * 0.45);
  context.lineWidth = quality === "ultra" ? 1.5 : 1;
  for (let index = 0; index < rayCount; index += 1) {
    const angle =
      (index / rayCount) * Math.PI * 2 +
      burst.age * (burst.hero ? 1.4 : 2.2);
    const inner = anchor.radius * 0.62;
    const outer = inner + rayLength * (0.55 + (index % 3) * 0.14);
    context.beginPath();
    context.moveTo(
      anchor.x + Math.cos(angle) * inner,
      anchor.y + Math.sin(angle) * inner,
    );
    context.lineTo(
      anchor.x + Math.cos(angle) * outer,
      anchor.y + Math.sin(angle) * outer,
    );
    context.stroke();
  }
  context.restore();
}

function drawSparkle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  colors: Palette,
  alpha: number,
): void {
  context.save();
  context.globalCompositeOperation = "lighter";
  context.globalAlpha = alpha;
  context.strokeStyle = colors.core;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(x - radius, y);
  context.lineTo(x + radius, y);
  context.moveTo(x, y - radius);
  context.lineTo(x, y + radius);
  context.stroke();
  context.restore();
}

function drawCrystal(
  context: CanvasRenderingContext2D,
  piece: CreditCrystalDrawablePiece,
  colors: Palette,
  quality: VisualQuality,
  hero: boolean,
  age: number,
  image: HTMLImageElement | null,
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

  if (image !== null) {
    const size = r * 2.15;
    context.globalAlpha = 1;
    context.drawImage(
      image,
      -size / 2,
      -size / 2,
      size,
      size,
    );
  } else {
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

    context.strokeStyle = "rgba(255,255,255,.82)";
    context.lineWidth = hero ? 1.5 : 1;
    context.beginPath();
    context.moveTo(-r * 0.28, -r * 0.18);
    context.lineTo(0, -r * 0.72);
    context.lineTo(r * 0.24, -r * 0.2);
    context.stroke();
  }

  if (hero && (quality === "high" || quality === "ultra")) {
    const sweep = ((age * 2.6) % 1) * 2 - 1;
    context.globalAlpha = quality === "ultra" ? 0.9 : 0.68;
    context.strokeStyle = "#fff";
    context.lineWidth = quality === "ultra" ? 2.1 : 1.4;
    context.beginPath();
    context.moveTo(sweep * r - r * 0.18, -r * 0.7);
    context.lineTo(sweep * r + r * 0.2, r * 0.72);
    context.stroke();
  }
  context.restore();
}

export function drawCreditCrystalBursts(
  context: CanvasRenderingContext2D,
  bursts: readonly CreditCrystalDrawBurst[],
  quality: VisualQuality,
): void {
  context.save();
  context.lineCap = "round";

  for (const burst of bursts) {
    const colors = palette(burst.tier, burst.variant);
    drawBurstRelease(context, burst, colors, quality);
    const image = creditCrystalImage(
      burst.tier,
      burst.variant,
      quality,
    );
    if (burst.phase === "magnet" && quality !== "low") {
      const trailScale =
        quality === "ultra" ? 1.28 : quality === "high" ? 1 : 0.7;
      for (const piece of burst.pieces) {
        context.globalAlpha = piece.anchor ? 0.62 : 0.4;
        context.strokeStyle = colors.trail;
        context.lineWidth = Math.max(
          1,
          piece.radius * 0.22 * trailScale,
        );
        context.beginPath();
        context.moveTo(piece.previousX, piece.previousY);
        context.lineTo(piece.x, piece.y);
        context.stroke();
      }
    }

    context.globalAlpha = 1;
    for (let index = 0; index < burst.pieces.length; index += 1) {
      const piece = burst.pieces[index]!;
      drawCrystal(
        context,
        piece,
        colors,
        quality,
        burst.hero && piece.anchor,
        burst.age,
        image,
      );

      if (
        (quality === "high" || quality === "ultra") &&
        (piece.anchor || index % 3 === 0)
      ) {
        const pulse =
          0.5 +
          0.5 *
            Math.sin(
              burst.age * (piece.anchor ? 10 : 14) +
                index * 1.7,
            );
        const sparkleAlpha =
          (quality === "ultra" ? 0.78 : 0.52) *
          (piece.anchor ? 1 : 0.72) *
          pulse;
        if (sparkleAlpha > 0.12) {
          const angle = piece.angle + burst.age * 1.9;
          const offset = piece.radius * (piece.anchor ? 0.82 : 0.62);
          drawSparkle(
            context,
            piece.x + Math.cos(angle) * offset,
            piece.y + Math.sin(angle) * offset,
            Math.max(
              2.5,
              piece.radius *
                (piece.anchor ? 0.46 : 0.28) *
                (0.7 + pulse * 0.5),
            ),
            colors,
            sparkleAlpha,
          );
        }
      }
    }
  }
  context.restore();
}
