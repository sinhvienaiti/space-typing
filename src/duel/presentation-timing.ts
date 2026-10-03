/**
 * Attack flight on the authority clock. 720 ms crossed the ~1,250 px
 * horizontal corridor at ~1,700 px/s and read as a flash; at 860 ms a
 * missile or bomb is visibly launched, travels and lands (2026-10-03).
 */
export const DUEL_PROJECTILE_BASE_TRAVEL_MS = 860;

/**
 * Typing-cannon bolt flight. It was 360 ms (~3,500 px/s): at 30 fps a bolt
 * was on screen for ~11 frames and jumped ~115 px per frame, so players saw
 * a streak, not a shot. Damage still resolves on this authority clock.
 */
export const DUEL_CANNON_TRAVEL_MS = 600;

/** Bolts accelerate toward the target: readable launch, hard arrival. */
export const DUEL_SHOT_FLIGHT_EASE = 1.38;

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

/**
 * Practice and the online authority hold the finished round this long before
 * dealing the next one, so both players see the KO, the result and the
 * "ROUND N" call. Input is ignored during the break; no gameplay runs.
 */
export const DUEL_ROUND_BREAK_SECONDS = 5;

/**
 * KO cinematic, in ms after the round-ended event. Visuals (combat-juice)
 * and audio (DuelCombatAudioRouter) both read this table so every chain
 * blast sounds exactly when it is drawn.
 */
export const DUEL_KO_TIMELINE = {
  chainMs: [90, 250, 400, 560, 700, 860, 1010] as readonly number[],
  finalMs: 1320,
  bannerMs: 1820,
  readyMs: 3900,
} as const;
