import { clamp, typingText } from "../logic";
import type { Enemy } from "../types";

export function tickEnemyRewardControl(
  enemy: Enemy,
  dt: number,
): number {
  const next = Math.max(0, (enemy.rewardControlTimer ?? 0) - Math.max(0, dt));
  enemy.rewardControlTimer = next;
  if (next <= 0) {
    enemy.rewardControlFactor = 1;
    return 1;
  }
  return clamp(enemy.rewardControlFactor ?? 1, 0, 1);
}

export function applyEnemyAreaControl(
  enemies: readonly Enemy[],
  source: Enemy,
  duration: number,
  factor: number,
  radius = 230,
): number {
  let changed = 0;
  for (const enemy of enemies) {
    if (enemy.id === source.id || enemy.elite) continue;
    if (Math.hypot(enemy.x - source.x, enemy.y - source.y) > radius) continue;

    enemy.rewardControlTimer = Math.max(
      enemy.rewardControlTimer ?? 0,
      Math.max(0, duration),
    );
    enemy.rewardControlFactor = Math.min(
      enemy.rewardControlFactor ?? 1,
      clamp(factor, 0, 1),
    );
    enemy.flash = 1;
    changed += 1;
  }
  return changed;
}

export function softenEnemyTyping(
  enemy: Enemy,
  ratio: number,
): boolean {
  const length = typingText(enemy.entry.en).length;
  if (length <= 1) return false;

  const advance = Math.max(1, Math.ceil(length * clamp(ratio, 0.05, 0.8)));
  const next = Math.min(length - 1, enemy.typed + advance);
  if (next <= enemy.typed) return false;

  enemy.typed = next;
  enemy.flash = 1;
  enemy.kick = Math.max(enemy.kick, 0.8);
  return true;
}

export function softenNearbyEnemies(
  enemies: readonly Enemy[],
  source: Enemy,
  ratio: number,
  limit = 5,
  radius = 260,
): number {
  const targets = enemies
    .filter(
      (enemy) =>
        enemy.id !== source.id &&
        !enemy.elite &&
        Math.hypot(enemy.x - source.x, enemy.y - source.y) <= radius,
    )
    .sort(
      (a, b) =>
        Math.hypot(a.x - source.x, a.y - source.y) -
        Math.hypot(b.x - source.x, b.y - source.y),
    )
    .slice(0, Math.max(0, Math.floor(limit)));

  let changed = 0;
  for (const target of targets) {
    if (softenEnemyTyping(target, ratio)) changed += 1;
  }
  return changed;
}
