import { clamp } from "../logic";

export const MAX_CREDITS = 999_999_999;

export function sanitizeCredits(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.floor(clamp(value, 0, MAX_CREDITS));
}

export function isValidCredits(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_CREDITS
  );
}

export function addCredits(current: number, amount: number): number {
  return sanitizeCredits(
    sanitizeCredits(current) + Math.max(0, Math.floor(amount)),
  );
}

export function spendCredits(
  current: number,
  amount: number,
): { credits: number; spent: boolean } {
  const credits = sanitizeCredits(current);
  const cost = Math.max(0, Math.floor(amount));
  if (cost <= 0 || cost > credits) {
    return { credits, spent: false };
  }
  return { credits: credits - cost, spent: true };
}

export function stageClearCreditReward(input: {
  stage: number;
  accuracy: number;
  salvage: number;
}): number {
  const stage = Math.max(1, Math.min(1000, Math.floor(input.stage)));
  const accuracy = clamp(input.accuracy, 0, 100);
  const salvage = clamp(input.salvage, 0, 100);

  const base = 24 + Math.floor(stage * 0.7);
  const accuracyMultiplier =
    accuracy >= 99
      ? 1.25
      : accuracy >= 97
        ? 1.16
        : accuracy >= 94
          ? 1.08
          : 1;
  const salvageMultiplier = 1 + salvage * 0.005;

  return Math.max(
    1,
    Math.floor(base * accuracyMultiplier * salvageMultiplier),
  );
}
