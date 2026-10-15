import { describe, expect, it } from "vitest";
import {
  TYRANT_G01_3D,
  boss3DFrameSeconds,
  boss3DModelForPaintedArtUrl,
} from "../src/boss/model-3d-contract";

describe("boss 3D runtime contract", () => {
  it("maps the hashed tyrant-g01 painted asset to its authored GLB", () => {
    expect(boss3DModelForPaintedArtUrl("/assets/tyrant-g01-CmL9.webp")).toBe(TYRANT_G01_3D);
    expect(boss3DModelForPaintedArtUrl("/assets/tyrant-g02.webp")).toBeNull();
  });

  it("pins the exported V3 clips and VFX sockets", () => {
    expect(TYRANT_G01_3D.idleClip).toContain("Boss_Idle_Hover_V3");
    expect(TYRANT_G01_3D.skillClip).toContain("Boss_Skill_Prismatic_Burst_V3");
    expect(TYRANT_G01_3D.sockets).toEqual(["FX_CORE", "FX_CAST_L", "FX_CAST_R", "FX_HALO"]);
  });

  it("keeps projectile spawn timing aligned with the Blender export", () => {
    expect(boss3DFrameSeconds(TYRANT_G01_3D, TYRANT_G01_3D.timing.projectileSpawnFrame)).toBeCloseTo(1.75, 5);
    expect(TYRANT_G01_3D.timing.chargePeakFrame).toBeLessThan(TYRANT_G01_3D.timing.projectileSpawnFrame);
    expect(TYRANT_G01_3D.timing.projectileSpawnFrame).toBeLessThan(TYRANT_G01_3D.timing.recoverEndFrame);
  });
});
