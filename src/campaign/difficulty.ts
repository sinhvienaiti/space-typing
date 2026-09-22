import { clamp } from "../logic";
import { createStageConfig, normalizeStage } from "./stage";
import type {
  DifficultyInput,
  DifficultyMode,
  DifficultyProfile,
} from "./types";

export type DifficultyModeDefinition = {
  label: string;
  recommendedWpmMin: number;
  recommendedWpmMax: number;
  targetWpm: number;
  pressureFactor: number;
  activeTypingPressureBudget: number;
  urgentThreatCap: number;
  reactionWindow: number;
  ccDurationMultiplier: number;
  enemyCooldownMultiplier: number;
  rewardMultiplier: number;
};

export const FIXED_DIFFICULTY_MODES = [
  "relax",
  "balanced",
  "hard",
  "extreme",
  "nightmare",
  "impossible",
] as const;

export type FixedDifficultyMode =
  (typeof FIXED_DIFFICULTY_MODES)[number];

export const DIFFICULTY_MODE_DEFINITIONS: Readonly<
  Record<FixedDifficultyMode, DifficultyModeDefinition>
> = {
  relax: {
    label: "Relax",
    recommendedWpmMin: 10,
    recommendedWpmMax: 30,
    targetWpm: 20,
    pressureFactor: 0.76,
    activeTypingPressureBudget: 3.6,
    urgentThreatCap: 1,
    reactionWindow: 1.35,
    ccDurationMultiplier: 0.62,
    enemyCooldownMultiplier: 1.35,
    rewardMultiplier: 0.9,
  },
  balanced: {
    label: "Balanced",
    recommendedWpmMin: 40,
    recommendedWpmMax: 70,
    targetWpm: 55,
    pressureFactor: 1,
    activeTypingPressureBudget: 5,
    urgentThreatCap: 2,
    reactionWindow: 1.05,
    ccDurationMultiplier: 0.82,
    enemyCooldownMultiplier: 1.12,
    rewardMultiplier: 1,
  },
  hard: {
    label: "Hard",
    recommendedWpmMin: 70,
    recommendedWpmMax: 100,
    targetWpm: 85,
    pressureFactor: 1.14,
    activeTypingPressureBudget: 6.2,
    urgentThreatCap: 3,
    reactionWindow: 0.9,
    ccDurationMultiplier: 0.98,
    enemyCooldownMultiplier: 1,
    rewardMultiplier: 1.15,
  },
  extreme: {
    label: "Extreme",
    recommendedWpmMin: 100,
    recommendedWpmMax: 140,
    targetWpm: 120,
    pressureFactor: 1.3,
    activeTypingPressureBudget: 7.5,
    urgentThreatCap: 4,
    reactionWindow: 0.76,
    ccDurationMultiplier: 1.08,
    enemyCooldownMultiplier: 0.9,
    rewardMultiplier: 1.35,
  },
  nightmare: {
    label: "Nightmare",
    recommendedWpmMin: 150,
    recommendedWpmMax: 200,
    targetWpm: 175,
    pressureFactor: 1.48,
    activeTypingPressureBudget: 8.8,
    urgentThreatCap: 5,
    reactionWindow: 0.64,
    ccDurationMultiplier: 1.16,
    enemyCooldownMultiplier: 0.82,
    rewardMultiplier: 1.65,
  },
  impossible: {
    label: "Impossible",
    recommendedWpmMin: 250,
    recommendedWpmMax: 300,
    targetWpm: 275,
    pressureFactor: 1.72,
    activeTypingPressureBudget: 10.2,
    urgentThreatCap: 6,
    reactionWindow: 0.52,
    ccDurationMultiplier: 1.24,
    enemyCooldownMultiplier: 0.74,
    rewardMultiplier: 2,
  },
};

function safeWpm(value: number): number {
  return clamp(Number.isFinite(value) ? value : 60, 10, 300);
}

function safeAccuracy(value: number): number {
  return clamp(Number.isFinite(value) ? value : 95, 60, 100);
}

function adaptiveWpmFactor(wpm: number): number {
  return clamp(Math.sqrt(safeWpm(wpm) / 60), 0.62, 1.72);
}

function adaptiveAccuracyFactor(accuracy: number): number {
  const normalized = safeAccuracy(accuracy);
  if (normalized >= 99) return 1.08;
  if (normalized >= 97) return 1.04;
  if (normalized >= 94) return 1;
  if (normalized >= 90) return 0.95;
  return 0.88;
}

function customTargetWpm(input: DifficultyInput): number {
  return safeWpm(input.customTargetWpm ?? input.recentWpm);
}

function customPressure(input: DifficultyInput): number {
  return clamp(input.customPressure ?? 1, 0.65, 1.6);
}

function fixedDefinition(
  mode: DifficultyMode,
): DifficultyModeDefinition | null {
  if (
    mode === "adaptive" ||
    mode === "custom"
  ) {
    return null;
  }
  return DIFFICULTY_MODE_DEFINITIONS[mode];
}

function targetWpmFor(input: DifficultyInput): number {
  const fixed = fixedDefinition(input.mode);
  if (fixed !== null) return fixed.targetWpm;
  if (input.mode === "custom") return customTargetWpm(input);
  return safeWpm(input.recentWpm);
}

function modeFactor(input: DifficultyInput): number {
  const fixed = fixedDefinition(input.mode);
  if (fixed !== null) return fixed.pressureFactor;

  if (input.mode === "adaptive") return 1;

  const targetFactor = clamp(
    Math.sqrt(customTargetWpm(input) / 60),
    0.62,
    1.72,
  );
  return targetFactor * customPressure(input);
}

function pressureBudgetFor(
  input: DifficultyInput,
  targetWpm: number,
): number {
  const fixed = fixedDefinition(input.mode);
  if (fixed !== null) return fixed.activeTypingPressureBudget;

  const wpmFactor = clamp(
    Math.sqrt(targetWpm / 55),
    0.7,
    2.25,
  );
  const custom = input.mode === "custom" ? customPressure(input) : 1;
  return clamp(5 * wpmFactor * custom, 3.2, 10.8);
}

function urgentThreatCapFor(
  input: DifficultyInput,
  targetWpm: number,
): number {
  const fixed = fixedDefinition(input.mode);
  if (fixed !== null) return fixed.urgentThreatCap;

  if (targetWpm < 40) return 1;
  if (targetWpm < 75) return 2;
  if (targetWpm < 110) return 3;
  if (targetWpm < 150) return 4;
  if (targetWpm < 220) return 5;
  return 6;
}

function reactionWindowFor(
  input: DifficultyInput,
  targetWpm: number,
): number {
  const fixed = fixedDefinition(input.mode);
  if (fixed !== null) return fixed.reactionWindow;

  const custom =
    input.mode === "custom" ? customPressure(input) : 1;
  return clamp(
    1.05 / Math.sqrt(targetWpm / 55) / Math.sqrt(custom),
    0.5,
    1.5,
  );
}

function ccDurationMultiplierFor(
  input: DifficultyInput,
  targetWpm: number,
): number {
  const fixed = fixedDefinition(input.mode);
  if (fixed !== null) return fixed.ccDurationMultiplier;

  return clamp(0.82 + (targetWpm - 55) / 420, 0.58, 1.25);
}

function enemyCooldownMultiplierFor(
  input: DifficultyInput,
  targetWpm: number,
): number {
  const fixed = fixedDefinition(input.mode);
  if (fixed !== null) return fixed.enemyCooldownMultiplier;

  const custom =
    input.mode === "custom" ? customPressure(input) : 1;
  return clamp(
    1.12 / Math.sqrt(targetWpm / 55) / Math.sqrt(custom),
    0.72,
    1.45,
  );
}

function rewardMultiplierFor(
  input: DifficultyInput,
  targetWpm: number,
): number {
  const fixed = fixedDefinition(input.mode);
  if (fixed !== null) return fixed.rewardMultiplier;

  const custom =
    input.mode === "custom" ? customPressure(input) : 1;
  return clamp(
    1 + Math.max(0, targetWpm - 55) / 220 * custom,
    0.9,
    2,
  );
}

function recommendedBand(
  input: DifficultyInput,
  targetWpm: number,
): { min: number; max: number } {
  const fixed = fixedDefinition(input.mode);
  if (fixed !== null) {
    return {
      min: fixed.recommendedWpmMin,
      max: fixed.recommendedWpmMax,
    };
  }

  return {
    min: Math.max(10, Math.round(targetWpm * 0.82)),
    max: Math.min(300, Math.round(targetWpm * 1.18)),
  };
}

export function difficultyModeDefinition(
  mode: FixedDifficultyMode,
): DifficultyModeDefinition {
  return DIFFICULTY_MODE_DEFINITIONS[mode];
}

export function difficultyFor(input: DifficultyInput): DifficultyProfile {
  const stage = normalizeStage(input.stage);
  const stageConfig = createStageConfig(stage);
  const vocabularyLevel = clamp(Math.floor(input.vocabularyLevel), 1, 100);
  const vocabularyProgress = (vocabularyLevel - 1) / 99;

  const stageFactor =
    1 +
    (stage - 1) * 0.00125 +
    (stageConfig.galaxy - 1) * 0.018;

  const resolvedModeFactor = modeFactor(input);
  const wpmFactor =
    input.mode === "adaptive" ? adaptiveWpmFactor(input.recentWpm) : 1;
  const accuracyFactor =
    input.mode === "adaptive"
      ? adaptiveAccuracyFactor(input.recentAccuracy)
      : 1;

  const vocabularyComplexity = 1 + vocabularyProgress * 0.45;
  const vocabularyReactionFactor = 1 - vocabularyProgress * 0.1;

  const roleFactor =
    stageConfig.role === "major-boss"
      ? 1.18
      : stageConfig.role === "boss"
        ? 1.12
        : stageConfig.role === "gauntlet"
          ? 1.1
          : stageConfig.role === "elite" ||
              stageConfig.role === "mini-boss"
            ? 1.06
            : 1;

  const combatPressure = clamp(
    stageFactor *
      resolvedModeFactor *
      wpmFactor *
      accuracyFactor *
      vocabularyReactionFactor *
      roleFactor,
    0.52,
    3.65,
  );
  const targetWpm = targetWpmFor(input);
  const band = recommendedBand(input, targetWpm);

  return {
    targetWpm,
    recommendedWpmMin: band.min,
    recommendedWpmMax: band.max,
    activeTypingPressureBudget: pressureBudgetFor(input, targetWpm),
    urgentThreatCap: urgentThreatCapFor(input, targetWpm),
    reactionWindow: reactionWindowFor(input, targetWpm),
    ccDurationMultiplier: ccDurationMultiplierFor(input, targetWpm),
    enemyCooldownMultiplier: enemyCooldownMultiplierFor(input, targetWpm),
    rewardMultiplier: rewardMultiplierFor(input, targetWpm),
    stageFactor,
    modeFactor: resolvedModeFactor,
    wpmFactor,
    accuracyFactor,
    vocabularyComplexity,
    vocabularyReactionFactor,
    combatPressure,
    enemySpeed: clamp(0.68 + combatPressure * 0.34, 0.78, 2.15),
    spawnInterval: clamp(1.5 / combatPressure, 0.3, 2),
    maxEnemies: Math.min(
      18,
      3 + Math.floor(stage / 85) + Math.floor(combatPressure * 1.35),
    ),
    projectilePressure: clamp(
      0.62 + combatPressure * 0.5 + stage / 1600,
      0.72,
      2.9,
    ),
    bossPressure: clamp(
      0.7 + combatPressure * 0.46 + stageConfig.galaxy * 0.035,
      0.8,
      2.8,
    ),
  };
}

export function estimatedTypingSeconds(
  characterCount: number,
  wpm: number,
  reactionBuffer = 0.65,
): number {
  const safeCharacters = Math.max(1, Math.floor(characterCount));
  const safeWordsPerMinute = safeWpm(wpm);

  const typingSeconds = (safeCharacters * 12) / safeWordsPerMinute;
  return typingSeconds + Math.max(0, reactionBuffer);
}
