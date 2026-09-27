import { describe, expect, it, vi } from "vitest";
import {
  drawPlayerProjectileArt,
  hasPlayerProjectileAtlas,
  PLAYER_PROJECTILE_ATLAS_INDEX,
  projectileAtlasCell,
  setPlayerProjectileAtlas,
} from "../src/characters/projectile-art";

describe("generated projectile art atlas", () => {
  it("maps all twelve concepts to unique 256x128 atlas cells", () => {
    const indices = Object.values(PLAYER_PROJECTILE_ATLAS_INDEX);
    expect(indices).toHaveLength(12);
    expect(new Set(indices).size).toBe(12);
    expect(projectileAtlasCell("prism-dart")).toEqual({
      sx: 512,
      sy: 0,
      sw: 256,
      sh: 128,
    });
    expect(projectileAtlasCell("tidal-pearl")).toEqual({
      sx: 256,
      sy: 384,
      sw: 256,
      sh: 128,
    });
  });

  it("uses the loaded generated atlas as the authoritative body draw path", () => {
    const drawImage = vi.fn();
    const context = {
      save: vi.fn(),
      restore: vi.fn(),
      drawImage,
      globalCompositeOperation: "source-over",
      globalAlpha: 1,
      shadowColor: "",
      shadowBlur: 0,
    } as unknown as CanvasRenderingContext2D;

    setPlayerProjectileAtlas({
      naturalWidth: 768,
      naturalHeight: 512,
    } as HTMLImageElement);

    expect(
      drawPlayerProjectileArt(
        context,
        "meteor-bolt",
        12,
        "#38bfff",
        1,
      ),
    ).toBe(true);
    expect(drawImage).toHaveBeenCalledTimes(1);

    setPlayerProjectileAtlas(null);
  });

  it("keeps a deterministic procedural fallback when generated art is absent", () => {
    setPlayerProjectileAtlas(null);
    expect(hasPlayerProjectileAtlas()).toBe(false);

    setPlayerProjectileAtlas({
      naturalWidth: 768,
      naturalHeight: 512,
    } as HTMLImageElement);
    expect(hasPlayerProjectileAtlas()).toBe(true);

    setPlayerProjectileAtlas(null);
  });
});
