export const GRADE_IDS = [
  "aluminum",
  "copper",
  "silver",
  "gold",
  "diamond",
] as const;

export type GradeId = (typeof GRADE_IDS)[number];

export function isGradeId(value: unknown): value is GradeId {
  return (
    typeof value === "string" &&
    GRADE_IDS.includes(value as GradeId)
  );
}
