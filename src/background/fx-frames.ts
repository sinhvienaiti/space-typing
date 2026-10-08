import type { FxFrameId } from "./director";

/** Layout of the procedural FX atlas drawn by webgl/fx-atlas.ts. */
export const FX_ATLAS_WIDTH = 512;
export const FX_ATLAS_HEIGHT = 256;

type Rect = { x: number; y: number; w: number; h: number };

export const FX_RECTS: Readonly<Record<FxFrameId, Rect>> = {
  glow: { x: 0, y: 0, w: 128, h: 128 },
  sparkle: { x: 128, y: 0, w: 128, h: 128 },
  mote: { x: 256, y: 0, w: 64, h: 64 },
  streak: { x: 0, y: 128, w: 512, h: 64 },
};

function frame(rect: Rect): { u0: number; v0: number; u1: number; v1: number; aspect: number } {
  const insetU = 0.5 / FX_ATLAS_WIDTH;
  const insetV = 0.5 / FX_ATLAS_HEIGHT;
  return {
    u0: rect.x / FX_ATLAS_WIDTH + insetU,
    v0: rect.y / FX_ATLAS_HEIGHT + insetV,
    u1: (rect.x + rect.w) / FX_ATLAS_WIDTH - insetU,
    v1: (rect.y + rect.h) / FX_ATLAS_HEIGHT - insetV,
    aspect: rect.w / rect.h,
  };
}

export const FX_FRAMES = {
  glow: frame(FX_RECTS.glow),
  sparkle: frame(FX_RECTS.sparkle),
  mote: frame(FX_RECTS.mote),
  streak: frame(FX_RECTS.streak),
} as const;
