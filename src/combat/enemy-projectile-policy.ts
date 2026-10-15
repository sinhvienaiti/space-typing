import {
  ACTIVE_ENEMY_RUNTIME_SESSION,
  type AdminEnemyProjectileMode,
} from "../admin/enemy-runtime-policy";
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

/**
 * Published Admin policy is authoritative for normal-enemy projectiles.
 * A null Admin value means the runtime is standalone/legacy, so the existing
 * persisted player value remains the compatibility fallback.
 */
export function resolveEnemyProjectileMode(
  localModeInput: unknown,
  adminMode: AdminEnemyProjectileMode | null = ACTIVE_ENEMY_RUNTIME_SESSION.projectileMode,
): EnemyProjectileMode {
  return adminMode ?? sanitizeEnemyProjectileMode(localModeInput);
}

export function normalEnemyProjectilesEnabled(
  modeInput: unknown,
  difficulty: Pick<DifficultyProfile, "normalEnemyProjectilesDefault"> | null,
  adminMode: AdminEnemyProjectileMode | null = ACTIVE_ENEMY_RUNTIME_SESSION.projectileMode,
): boolean {
  const mode = resolveEnemyProjectileMode(modeInput, adminMode);
  if (mode === "off") return false;
  if (mode === "on") return true;
  return difficulty?.normalEnemyProjectilesDefault === 1;
}

export function bossProjectilesEnabled(): true {
  return true;
}
