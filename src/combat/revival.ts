import { clamp } from "../logic";

export const PHOENIX_REVIVE_HULL_RATIO = 0.35;
export const PHOENIX_REVIVE_SHIELD_RATIO = 0.25;
export const PHOENIX_REVIVE_ENERGY_RATIO = 0.3;
export const PHOENIX_REVIVE_GRACE_SECONDS = 2.5;

export type PhoenixReviveResources = {
  hull: number;
  shield: number;
  energy: number;
};

export function phoenixReviveResources(
  maxHull: number,
  maxShield: number,
  maxEnergy: number,
): PhoenixReviveResources {
  const hullMax = Math.max(1, maxHull);
  const shieldMax = Math.max(0, maxShield);
  const energyMax = Math.max(0, maxEnergy);

  return {
    hull: clamp(
      Math.max(1, hullMax * PHOENIX_REVIVE_HULL_RATIO),
      1,
      hullMax,
    ),
    shield: clamp(
      shieldMax * PHOENIX_REVIVE_SHIELD_RATIO,
      0,
      shieldMax,
    ),
    energy: clamp(
      energyMax * PHOENIX_REVIVE_ENERGY_RATIO,
      0,
      energyMax,
    ),
  };
}
