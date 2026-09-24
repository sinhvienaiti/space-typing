export const GRADE_IDS = [
  "aluminum",
  "copper",
  "silver",
  "gold",
  "diamond",
] as const;

export type GradeId = (typeof GRADE_IDS)[number];

export const GRADE_LABELS: Record<GradeId, string> = {
  aluminum: "Aluminum",
  copper: "Copper",
  silver: "Silver",
  gold: "Gold",
  diamond: "Diamond",
};

export const GRADE_STAT_MULTIPLIER: Record<GradeId, number> = {
  aluminum: 1,
  copper: 1.12,
  silver: 1.28,
  gold: 1.5,
  diamond: 1.8,
};

export type GradePresentation = {
  label: string;
  icon: string;
  cssClass: string;
};

export const GRADE_PRESENTATION: Record<GradeId, GradePresentation> = {
  aluminum: {
    label: "Aluminum",
    icon: "◇",
    cssClass: "grade-aluminum",
  },
  copper: {
    label: "Copper",
    icon: "⬡",
    cssClass: "grade-copper",
  },
  silver: {
    label: "Silver",
    icon: "◆",
    cssClass: "grade-silver",
  },
  gold: {
    label: "Gold",
    icon: "✦",
    cssClass: "grade-gold",
  },
  diamond: {
    label: "Diamond",
    icon: "✧",
    cssClass: "grade-diamond",
  },
};

export function isGradeId(value: unknown): value is GradeId {
  return (
    typeof value === "string" &&
    GRADE_IDS.includes(value as GradeId)
  );
}

export function gradeLabel(grade: GradeId): string {
  return GRADE_LABELS[grade];
}

export function gradeStatMultiplier(grade: GradeId): number {
  return GRADE_STAT_MULTIPLIER[grade];
}
