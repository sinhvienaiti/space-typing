import { clamp } from "../logic";
import { createStageConfig, normalizeStage } from "./stage";
import type {
  DifficultyInput,
  DifficultyMode,
  DifficultyProfile,
} from "./types";

const MODE_FACTOR: Record<Exclude<DifficultyMode, "adaptive" | "custom">, number> = {
  relaxed: 0.82,
  normal: 1,
  hard: 1.14,
  expert: 1.3,
};

function safeWpm(value: number): number {
  return clamp(Number.isFinite(value) ? value : 60, 20, 220);
}

function safeAccuracy(value: number): number {
  return clamp(Number.isFinite(value) ? value : 95, 60, 100);
}

function adaptiveWpmFactor(wpm: number): number {
  return clamp(Math.sqrt(safeWpm(wpm) / 60), 0.78, 1.34);
}

function adaptiveAccuracyFactor(accuracy: number): number {
  const normalized = safeAccuracy(accuracy);
  if (normalized >= 99) return 1.08;
  if (normalized >= 97) return 1.04;
  if (normalized >= 94) return 1;
  if (normalized >= 90) return 0.95;
  return 0.88;
}

function modeFactor(input: DifficultyInput): number {
  if (input.mode === "adaptive") {
    return 1;
  }

  if (input.mode === "custom") {
    const targetWpm = safeWpm(input.customTargetWpm ?? input.recentWpm);
    const targetFactor = clamp(Math.sqrt(targetWpm / 60), 0.78, 1.34);
    const pressure = clamp(input.customPressure ?? 1, 0.7, 1.45);
    return targetFactor * pressure;
  }

  return MODE_FACTOR[input.mode];
}

export function difficultyFor(input: DifficultyInput): DifficultyProfile {
  const stage = normalizeStage(input.stage);
  const stageConfig = createStageConfig(stage);
  const vocabularyLevel = clamp(Math.floor(input.vocabularyLevel), 1, 100);
  const vocabularyProgress = (vocabularyLevel - 1) / 99;

  // Stage 1000 is much more demanding than Stage 1, but the curve remains gradual.
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

  // Harder vocabulary adds challenge itself, so combat reaction pressure is
  // compensated slightly instead of blindly stacking raw speed on top.
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
    0.62,
    3.2,
  );

  return {
    stageFactor,
    modeFactor: resolvedModeFactor,
    wpmFactor,
    accuracyFactor,
    vocabularyComplexity,
    vocabularyReactionFactor,
    combatPressure,
    enemySpeed: clamp(0.72 + combatPressure * 0.34, 0.82, 2.1),
    spawnInterval: clamp(1.48 / combatPressure, 0.34, 1.8),
    maxEnemies: Math.min(
      18,
      3 + Math.floor(stage / 85) + Math.floor(combatPressure * 1.4),
    ),
    projectilePressure: clamp(
      0.65 + combatPressure * 0.5 + stage / 1600,
      0.8,
      2.8,
    ),
    bossPressure: clamp(
      0.72 + combatPressure * 0.46 + stageConfig.galaxy * 0.035,
      0.85,
      2.7,
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

  // Standard typing convention: one WPM word ~= five characters.
  const typingSeconds = (safeCharacters * 12) / safeWordsPerMinute;
  return typingSeconds + Math.max(0, reactionBuffer);
}
