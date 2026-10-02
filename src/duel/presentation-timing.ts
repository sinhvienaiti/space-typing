export const DUEL_PROJECTILE_BASE_TRAVEL_MS = 720;

export function duelProjectileTravelMs(
  rawSpeedScale: number,
): number {
  const speedScale =
    Number.isFinite(rawSpeedScale)
      ? Math.max(0.5, rawSpeedScale)
      : 1;
  return Math.max(
    1,
    Math.round(
      DUEL_PROJECTILE_BASE_TRAVEL_MS / speedScale,
    ),
  );
}
