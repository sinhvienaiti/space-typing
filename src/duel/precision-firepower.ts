export type DuelPrecisionOrdnance =
  | "laser-burst"
  | "micro-missile"
  | "missile-salvo"
  | "heavy-bomb"
  | "precision-barrage"
  | "major-ordnance";

export type DuelPrecisionMilestone = {
  streak: 10 | 20 | 35 | 50 | 75 | 100;
  ordnance: DuelPrecisionOrdnance;
  baseDamage: number;
};

export const DUEL_PRECISION_MILESTONES: readonly DuelPrecisionMilestone[] = [
  { streak: 10, ordnance: "laser-burst", baseDamage: 2 },
  { streak: 20, ordnance: "micro-missile", baseDamage: 4 },
  { streak: 35, ordnance: "missile-salvo", baseDamage: 7 },
  { streak: 50, ordnance: "heavy-bomb", baseDamage: 10 },
  { streak: 75, ordnance: "precision-barrage", baseDamage: 14 },
  { streak: 100, ordnance: "major-ordnance", baseDamage: 18 },
] as const;

export type DuelPrecisionAccuracyTier = 0 | 1 | 2 | 3;

export function duelPrecisionAccuracyTier(
  correctChars: number,
  wrongChars: number,
): DuelPrecisionAccuracyTier {
  const correct = Math.max(0, correctChars);
  const wrong = Math.max(0, wrongChars);
  const total = correct + wrong;
  if (total <= 0) return 0;
  const accuracy = correct / total;
  if (accuracy >= 0.99) return 3;
  if (accuracy >= 0.97) return 2;
  if (accuracy >= 0.9) return 1;
  return 0;
}

export function duelPrecisionDamageScale(
  tier: DuelPrecisionAccuracyTier,
): number {
  switch (tier) {
    case 0:
      return 1;
    case 1:
      return 1.1;
    case 2:
      return 1.2;
    case 3:
      return 1.35;
  }
}

export function duelPrecisionMilestone(
  streak: number,
): DuelPrecisionMilestone | null {
  return (
    DUEL_PRECISION_MILESTONES.find(
      (milestone) => milestone.streak === streak,
    ) ?? null
  );
}
