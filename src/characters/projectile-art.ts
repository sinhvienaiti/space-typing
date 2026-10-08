import type { PlayerProjectileStyleId } from "./projectiles";

export const PLAYER_PROJECTILE_ATLAS_ASSET_ID = "player-projectile-atlas-v1";
export const PLAYER_PROJECTILE_ATLAS_URL =
  "/assets/space-typing/projectiles/player-projectiles-v1.webp";
export const PLAYER_PROJECTILE_ATLAS_COLUMNS = 3;
export const PLAYER_PROJECTILE_ATLAS_ROWS = 4;
export const PLAYER_PROJECTILE_ATLAS_CELL_WIDTH = 256;
export const PLAYER_PROJECTILE_ATLAS_CELL_HEIGHT = 128;

export const PLAYER_PROJECTILE_ATLAS_INDEX: Record<
  PlayerProjectileStyleId,
  number
> = {
  "meteor-bolt": 0,
  "crescent-slash": 1,
  "prism-dart": 2,
  "nova-pearl": 3,
  "twin-star-shot": 4,
  "halo-burst": 5,
  "thunder-needle": 6,
  "blossom-comet": 7,
  "void-spike": 8,
  "solar-lance": 9,
  "tidal-pearl": 10,
  "aurora-ribbon": 11,
};

const SPRITE_SCALE: Record<PlayerProjectileStyleId, number> = {
  "meteor-bolt": 1.22,
  "crescent-slash": 1.18,
  "prism-dart": 1.12,
  "nova-pearl": 0.98,
  "twin-star-shot": 1.02,
  "halo-burst": 0.98,
  "thunder-needle": 1.16,
  "blossom-comet": 1.08,
  "void-spike": 1.12,
  "solar-lance": 1.22,
  "tidal-pearl": 1.04,
  "aurora-ribbon": 1.16,
};

let projectileAtlas: HTMLImageElement | null = null;

export function setPlayerProjectileAtlas(
  image: HTMLImageElement | null,
): void {
  projectileAtlas = image;
}

export function hasPlayerProjectileAtlas(): boolean {
  return projectileAtlas !== null;
}

export function projectileAtlasCell(
  styleId: PlayerProjectileStyleId,
): Readonly<{ sx: number; sy: number; sw: number; sh: number }> {
  const index = PLAYER_PROJECTILE_ATLAS_INDEX[styleId];
  return {
    sx: (index % PLAYER_PROJECTILE_ATLAS_COLUMNS) *
      PLAYER_PROJECTILE_ATLAS_CELL_WIDTH,
    sy: Math.floor(index / PLAYER_PROJECTILE_ATLAS_COLUMNS) *
      PLAYER_PROJECTILE_ATLAS_CELL_HEIGHT,
    sw: PLAYER_PROJECTILE_ATLAS_CELL_WIDTH,
    sh: PLAYER_PROJECTILE_ATLAS_CELL_HEIGHT,
  };
}

export function drawPlayerProjectileArt(
  context: CanvasRenderingContext2D,
  styleId: PlayerProjectileStyleId,
  radius: number,
  glowColor: string,
  glowScale: number,
): boolean {
  if (projectileAtlas === null) return false;

  const cell = projectileAtlasCell(styleId);
  const scale = SPRITE_SCALE[styleId];
  const width = Math.max(104, Math.min(168, radius * 12.4 * scale));
  const height = width * 0.5;

  context.save();
  context.globalCompositeOperation = "source-over";
  context.globalAlpha *= 0.99;
  context.shadowColor = glowColor;
  context.shadowBlur = 5 * glowScale;
  context.drawImage(
    projectileAtlas,
    cell.sx,
    cell.sy,
    cell.sw,
    cell.sh,
    -width * 0.55,
    -height * 0.5,
    width,
    height,
  );
  context.restore();
  return true;
}
