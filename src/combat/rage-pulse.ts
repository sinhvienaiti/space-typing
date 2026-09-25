/** Rage charge rules. Typing fills a five-segment meter; pressing SPACE
 * spends every currently full segment on the selected ship's signature Rage.
 * Nova Pulse remains a separate consumable effect (Nova Bomb), not a universal
 * character ultimate. */
export const TYPED_RAGE_GAIN_SCALE = 0.42;
export const RAGE_SEGMENT_POWER = 20;
export const RAGE_SEGMENT_COUNT = 5;
export const NOVA_PULSE_BOSS_HP_RATIO = 0.12;
export const NOVA_PULSE_VISUAL_SECONDS = 0.72;

export type RageSpend = {
  segments: number;
  powerSpent: number;
  remainingPower: number;
  scale: number;
  full: boolean;
};

function safePower(power: number): number {
  if (!Number.isFinite(power)) return 0;
  return Math.max(0, Math.min(100, power));
}

export function availableRageSegments(power: number): number {
  return Math.min(
    RAGE_SEGMENT_COUNT,
    Math.floor(safePower(power) / RAGE_SEGMENT_POWER),
  );
}

export function spendRage(power: number): RageSpend {
  const normalizedPower = safePower(power);
  const segments = availableRageSegments(normalizedPower);
  const powerSpent = segments * RAGE_SEGMENT_POWER;
  return {
    segments,
    powerSpent,
    remainingPower: Math.max(0, normalizedPower - powerSpent),
    scale: segments / RAGE_SEGMENT_COUNT,
    full: segments === RAGE_SEGMENT_COUNT,
  };
}

export function rageScaledCount(
  fullPowerCount: number,
  segments: number,
): number {
  if (segments <= 0 || fullPowerCount <= 0) return 0;
  const safeSegments = Math.min(RAGE_SEGMENT_COUNT, Math.floor(segments));
  return Math.max(
    1,
    Math.ceil(fullPowerCount * safeSegments / RAGE_SEGMENT_COUNT),
  );
}

export function rageScaledValue(
  fullPowerValue: number,
  segments: number,
): number {
  if (!Number.isFinite(fullPowerValue) || fullPowerValue <= 0) return 0;
  const safeSegments = Math.max(
    0,
    Math.min(RAGE_SEGMENT_COUNT, Math.floor(segments)),
  );
  return fullPowerValue * safeSegments / RAGE_SEGMENT_COUNT;
}

export function typedRageGain(rawGain: number): number {
  return Math.max(0, Number.isFinite(rawGain) ? rawGain : 0) * TYPED_RAGE_GAIN_SCALE;
}

/** Nova Bomb boss damage. This intentionally remains separate from ship Rage. */
export function novaBossDamage(maxHp: number, shieldActive: boolean): number {
  if (shieldActive || !Number.isFinite(maxHp)) return 0;
  return Math.max(0, Math.round(maxHp * NOVA_PULSE_BOSS_HP_RATIO));
}
