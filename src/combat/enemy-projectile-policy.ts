import type { DifficultyProfile } from "../campaign/types";
import type { EnemyProjectileMode } from "../types";

export function sanitizeEnemyProjectileMode(
  value: unknown,
): EnemyProjectileMode {
  if (value === "auto" || value === "off" || value === "on") return value;
  if (value === true) return "on";
  if (value === false) return "off";
  return "auto";
}

export function normalEnemyProjectilesEnabled(
  modeInput: unknown,
  difficulty: Pick<DifficultyProfile, "normalEnemyProjectilesDefault"> | null,
): boolean {
  const mode = sanitizeEnemyProjectileMode(modeInput);
  if (mode === "off") return false;
  if (mode === "on") return true;
  return difficulty?.normalEnemyProjectilesDefault === true;
}

export function bossProjectilesEnabled(): true {
  return true;
}
