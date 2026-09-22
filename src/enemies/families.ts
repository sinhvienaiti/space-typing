export const ENEMY_FAMILY_IDS = [
  "rainbow",
  "angel",
  "devil",
  "frost",
  "prism",
  "nature",
  "shadow",
  "cosmic",
] as const;

export type EnemyFamilyId = (typeof ENEMY_FAMILY_IDS)[number];

export function isEnemyFamilyId(value: unknown): value is EnemyFamilyId {
  return (
    typeof value === "string" &&
    ENEMY_FAMILY_IDS.includes(value as EnemyFamilyId)
  );
}
