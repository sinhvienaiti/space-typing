import { clamp } from "../logic";
import type { EliteModifier } from "../types";

const MODIFIERS: EliteModifier[] = [
  "swift",
  "armored",
  "frenzy",
  "volatile",
];

export type EliteStats = {
  speed: number;
  layers: number;
  actionCooldown: number | null;
};

export function rollElite(
  chance: number,
  random = Math.random(),
): boolean {
  return random < clamp(chance, 0, 0.85);
}

export function eliteModifierCount(stageSlots: number): number {
  return Math.min(3, Math.max(1, Math.floor(stageSlots) || 1));
}

export function pickEliteModifiers(
  count: number,
  random = Math.random,
): EliteModifier[] {
  const pool = [...MODIFIERS];
  const result: EliteModifier[] = [];
  const finalCount = Math.min(pool.length, Math.max(0, Math.floor(count)));

  while (result.length < finalCount && pool.length > 0) {
    const index = Math.min(
      pool.length - 1,
      Math.floor(clamp(random(), 0, 0.999999) * pool.length),
    );
    const [modifier] = pool.splice(index, 1);
    if (modifier !== undefined) result.push(modifier);
  }

  return result;
}

export function applyEliteModifiers(
  stats: EliteStats,
  modifiers: EliteModifier[],
): EliteStats {
  let speed = stats.speed;
  let layers = stats.layers;
  let actionCooldown = stats.actionCooldown;

  for (const modifier of modifiers) {
    if (modifier === "swift") {
      speed *= 1.22;
    } else if (modifier === "armored") {
      layers = Math.min(3, layers + 1);
    } else if (modifier === "frenzy") {
      if (actionCooldown === null) {
        speed *= 1.1;
      } else {
        actionCooldown *= 0.72;
      }
    }
  }

  return {
    speed,
    layers,
    actionCooldown,
  };
}
