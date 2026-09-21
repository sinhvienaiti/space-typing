import type { Enemy } from "./types";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeWord(word: string): string {
  return word.trim().toLocaleLowerCase("en-US");
}

export function multiplierForStreak(streak: number): number {
  if (streak >= 100) return 4;
  if (streak >= 50) return 3;
  if (streak >= 25) return 2;
  return 1;
}

export function chooseTarget(
  enemies: Enemy[],
  key: string,
  playerX: number,
  playerY: number,
): Enemy | null {
  const candidates = enemies.filter((enemy) => {
    const word = normalizeWord(enemy.entry.en);
    return enemy.typed === 0 && word[0] === key;
  });

  candidates.sort((a, b) => {
    const distanceA = Math.hypot(a.x - playerX, a.y - playerY);
    const distanceB = Math.hypot(b.x - playerX, b.y - playerY);
    return distanceA - distanceB;
  });

  return candidates[0] ?? null;
}

export function accuracyPercent(hits: number, misses: number): number {
  const total = hits + misses;
  return total === 0 ? 100 : (hits / total) * 100;
}

export function waveForKills(kills: number): number {
  return Math.floor(Math.max(0, kills) / 8) + 1;
}
