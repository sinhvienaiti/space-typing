export const ENEMY_ROLE_IDS = [
  "normal",
  "swift",
  "tank",
  "support",
  "burst",
  "control",
  "reward",
  "elite",
  "mini-boss",
  "boss",
] as const;

export type EnemyRoleId = (typeof ENEMY_ROLE_IDS)[number];

export function isEnemyRoleId(value: unknown): value is EnemyRoleId {
  return (
    typeof value === "string" &&
    ENEMY_ROLE_IDS.includes(value as EnemyRoleId)
  );
}
