import type {
  CreditCrystalTier,
  CreditCrystalVariant,
} from "../rewards/combat-credit-drops";
import type { VisualQuality } from "../types";\nimport { creditCrystalImage } from "./credit-crystal-art";

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
    const image = creditCrystalImage(
      burst.tier,
      burst.variant,
      quality,
    );
    if (burst.phase === "magnet" && quality !== "low") {
      const trailScale =
        quality === "ultra" ? 1 : quality === "high" ? 0.78 : 0.55;
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
    for (const piece of burst.pieces) {
      drawCrystal(
        context,
        piece,
        colors,
        quality,
        burst.hero && piece.anchor,
        burst.age,
        image,
      );
    }
  }
  context.restore();
}
