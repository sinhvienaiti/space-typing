import { clamp } from "../logic";
import {
  createCoreStats,
  type CoreStats,
} from "./core";

export const DEFAULT_PLAYER_BASE_STATS = createCoreStats({
  hull: 100,
  shield: 40,
  firepower: 10,
  armor: 8,
  energy: 100,
  reactor: 8,
  focus: 8,
  ward: 6,
  luck: 5,
  salvage: 5,
});

export type PlayerResources = {
  hull: number;
  shield: number;
  energy: number;
};

export type DamageResult = {
  resources: PlayerResources;
  absorbedByShield: number;
  hullDamage: number;
};

export function createPlayerResources(
  stats: CoreStats,
): PlayerResources {
  return {
    hull: stats.hull,
    shield: stats.shield,
    energy: stats.energy,
  };
}

export function armorDamage(
  rawDamage: number,
  armor: number,
): number {
  const damage = Math.max(0, rawDamage);
  const safeArmor = Math.max(0, armor);
  return damage * (100 / (100 + safeArmor));
}

export function applyIncomingDamage(
  resources: PlayerResources,
  stats: CoreStats,
  rawDamage: number,
): DamageResult {
  const damage = armorDamage(rawDamage, stats.armor);
  const absorbedByShield = Math.min(resources.shield, damage);
  const hullDamage = Math.max(0, damage - absorbedByShield);

  return {
    resources: {
      hull: clamp(resources.hull - hullDamage, 0, stats.hull),
      shield: clamp(
        resources.shield - absorbedByShield,
        0,
        stats.shield,
      ),
      energy: clamp(resources.energy, 0, stats.energy),
    },
    absorbedByShield,
    hullDamage,
  };
}

export function regenerateResources(
  resources: PlayerResources,
  stats: CoreStats,
  dt: number,
  shieldCanRegenerate: boolean,
): PlayerResources {
  const seconds = Math.max(0, dt);
  const shieldRate = Math.max(0, stats.shield * 0.08);

  return {
    hull: clamp(resources.hull, 0, stats.hull),
    shield: clamp(
      resources.shield +
        (shieldCanRegenerate ? shieldRate * seconds : 0),
      0,
      stats.shield,
    ),
    energy: clamp(
      resources.energy + Math.max(0, stats.reactor) * seconds,
      0,
      stats.energy,
    ),
  };
}

export function firepowerDamage(
  baseDamage: number,
  stats: CoreStats,
): number {
  const factor = 1 + Math.max(0, stats.firepower) / 100;
  return Math.max(1, Math.round(Math.max(0, baseDamage) * factor));
}

export function focusPowerGain(
  baseGain: number,
  stats: CoreStats,
): number {
  const factor = 1 + Math.max(0, stats.focus) / 100;
  return Math.max(0, baseGain) * factor;
}

export function wardDuration(
  baseSeconds: number,
  stats: CoreStats,
): number {
  const safeWard = Math.max(0, stats.ward);
  return Math.max(0, baseSeconds) * (100 / (100 + safeWard));
}

export function luckFactor(stats: CoreStats): number {
  return 1 + Math.max(0, stats.luck) / 100;
}

export function salvageFactor(stats: CoreStats): number {
  return 1 + Math.max(0, stats.salvage) / 100;
}
