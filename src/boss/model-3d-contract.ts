/** Runtime contract for authored boss GLB assets. Keep this module DOM-free so CI can test it. */
export type Boss3DModelContract = {
  id: string;
  url: string;
  idleClip: string;
  skillClip: string;
  sockets: readonly [string, string, string, string];
  timing: {
    fps: number;
    chargeStartFrame: number;
    chargePeakFrame: number;
    projectileSpawnFrame: number;
    recoilFrame: number;
    recoverEndFrame: number;
  };
};

export const TYRANT_G01_3D: Boss3DModelContract = {
  id: "tyrant-g01",
  url: "/assets/space-typing/bosses/3d/tyrant-g01.glb",
  idleClip: "__SPACE_TYPING_EXPORT__00_Boss_Idle_Hover_V3",
  skillClip: "__SPACE_TYPING_EXPORT__01_Boss_Skill_Prismatic_Burst_V3",
  sockets: ["FX_CORE", "FX_CAST_L", "FX_CAST_R", "FX_HALO"],
  timing: {
    fps: 24,
    chargeStartFrame: 8,
    chargePeakFrame: 28,
    projectileSpawnFrame: 42,
    recoilFrame: 46,
    recoverEndFrame: 68,
  },
};

const MODELS = [TYRANT_G01_3D] as const;

export function boss3DModelForId(id: string): Boss3DModelContract | null {
  return MODELS.find((model) => model.id === id) ?? null;
}

/** Vite's hashed painted-art URL still contains the logical boss id. */
export function boss3DModelForPaintedArtUrl(artUrl: string): Boss3DModelContract | null {
  return MODELS.find((model) => artUrl.includes(model.id)) ?? null;
}

export function boss3DFrameSeconds(model: Boss3DModelContract, frame: number): number {
  return frame / model.timing.fps;
}
