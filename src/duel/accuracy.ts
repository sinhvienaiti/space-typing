export type DuelActionQuality = {
  mistakes: number;
  scale: number;
  grade: "perfect" | "corrected" | "scrappy";
};

export function duelActionQualityForMistakes(
  mistakes: number,
): DuelActionQuality {
  const safe = Math.max(
    0,
    Math.floor(Number.isFinite(mistakes) ? mistakes : 0),
  );
  if (safe === 0) {
    return { mistakes: 0, scale: 1, grade: "perfect" };
  }
  if (safe === 1) {
    return { mistakes: 1, scale: 0.95, grade: "corrected" };
  }
  return { mistakes: safe, scale: 0.85, grade: "scrappy" };
}

export function sanitizeDuelActionQualityScale(
  value: number,
): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(0.75, Math.min(1, value));
}
