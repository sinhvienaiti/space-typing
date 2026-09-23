/** Shared Rage / Nova Pulse rules. Typed keys build charge gradually; stage
 * rewards and explicit Power pickups retain their authored full values. */
export const TYPED_RAGE_GAIN_SCALE = 0.42;
export const NOVA_PULSE_BOSS_HP_RATIO = 0.12;
export const NOVA_PULSE_VISUAL_SECONDS = 0.72;

export function typedRageGain(rawGain: number): number {
  return Math.max(0, Number.isFinite(rawGain) ? rawGain : 0) * TYPED_RAGE_GAIN_SCALE;
}

export function novaBossDamage(maxHp: number, shieldActive: boolean): number {
  if (shieldActive || !Number.isFinite(maxHp)) return 0;
  return Math.max(0, Math.round(maxHp * NOVA_PULSE_BOSS_HP_RATIO));
}
