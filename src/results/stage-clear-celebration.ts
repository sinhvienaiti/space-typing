export type StageClearCelebrationInput = {
  stars: 1 | 2 | 3;
  accuracy: number;
  wpm: number;
  score: number;
  elapsedSeconds: number;
};

export type StageClearCelebrationProfile = {
  level: 1 | 2 | 3 | 4 | 5;
  label: string;
  accuracyTier: 0 | 1 | 2;
  speedTier: 0 | 1 | 2;
  scoreTier: 0 | 1 | 2;
  performanceBonus: 0 | 1 | 2;
};

function safeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function stageClearCelebrationProfile(
  input: StageClearCelebrationInput,
): StageClearCelebrationProfile {
  const accuracy = Math.max(0, Math.min(100, safeNumber(input.accuracy)));
  const wpm = Math.max(0, safeNumber(input.wpm));
  const score = Math.max(0, safeNumber(input.score));
  const elapsedSeconds = Math.max(1, safeNumber(input.elapsedSeconds));
  const scorePerMinute = (score / elapsedSeconds) * 60;

  const accuracyTier: 0 | 1 | 2 =
    accuracy >= 99 ? 2 : accuracy >= 97 ? 1 : 0;
  const speedTier: 0 | 1 | 2 =
    wpm >= 90 ? 2 : wpm >= 60 ? 1 : 0;
  const scoreTier: 0 | 1 | 2 =
    score >= 25_000 || scorePerMinute >= 12_000
      ? 2
      : score >= 10_000 || scorePerMinute >= 6_000
        ? 1
        : 0;

  const premiumSignals =
    accuracyTier + speedTier + scoreTier;
  const performanceBonus: 0 | 1 | 2 =
    premiumSignals >= 4 ? 2 : premiumSignals >= 2 ? 1 : 0;

  const level = Math.max(
    1,
    Math.min(5, input.stars + performanceBonus),
  ) as 1 | 2 | 3 | 4 | 5;

  const label =
    level === 5
      ? "LEGENDARY CLEAR"
      : level === 4
        ? "ACE CLEAR"
        : level === 3
          ? "STELLAR CLEAR"
          : level === 2
            ? "GREAT CLEAR"
            : "STAGE CLEAR";

  return {
    level,
    label,
    accuracyTier,
    speedTier,
    scoreTier,
    performanceBonus,
  };
}
