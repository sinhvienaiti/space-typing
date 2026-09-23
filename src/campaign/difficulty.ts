import { clamp } from "../logic";
import { createStageConfig, normalizeStage } from "./stage";
import {
  difficultyModeDefinition,
} from "./difficulty-modes";
import type {
  DifficultyInput,
  DifficultyProfile,
} from "./types";

function safeWpm(value: number): number {
  return clamp(Number.isFinite(value) ? value : 60, 10, 300);
}

function safeAccuracy(value: number): number {
  return clamp(Number.isFinite(value) ? value : 95, 60, 100);
}

function adaptiveWpmFactor(wpm: number): number {
  return clamp(Math.sqrt(safeWpm(wpm) / 60), 0.76, 1.4);
}

function adaptiveAccuracyFactor(accuracy: number): number {
  const normalized = safeAccuracy(accuracy);
  if (normalized >= 99) return 1.08;
  if (normalized >= 97) return 1.04;
  if (normalized >= 94) return 1;
  if (normalized >= 90) return 0.95;
  return 0.88;
}

function targetWpm(input: DifficultyInput): number {
  if (input.mode === "adaptive") {
    return safeWpm(input.recentWpm);
  }
  if (input.mode === "custom") {
    return safeWpm(input.customTargetWpm ?? input.recentWpm);
  }

  const definition = difficultyModeDefinition(input.mode);
  return (
    definition.recommendedWpmMin +
    definition.recommendedWpmMax
  ) / 2;
}

export function difficultyFor(
  input: DifficultyInput,
): DifficultyProfile {
  const stage = normalizeStage(input.stage);
  const stageConfig = createStageConfig(stage);
  const vocabularyLevel = clamp(
    Math.floor(input.vocabularyLevel),
    1,
    100,
  );
  const vocabularyProgress = (vocabularyLevel - 1) / 99;
  const definition = difficultyModeDefinition(
    input.mode,
    input.recentWpm,
    input.customTargetWpm ?? input.recentWpm,
    input.customPressure ?? 1,
  );

  // Campaign progression increases pressure gradually, but every player mode
  // keeps its own hard dimensions/caps.
  const stageFactor =
    1 +
    (stage - 1) * 0.00115 +
    (stageConfig.galaxy - 1) * 0.016;

  const wpmFactor =
    input.mode === "adaptive"
      ? adaptiveWpmFactor(input.recentWpm)
      : 1;
  const accuracyFactor =
    input.mode === "adaptive"
      ? adaptiveAccuracyFactor(input.recentAccuracy)
      : 1;

  // Harder vocabulary is already harder to type, so reaction pressure gets a
  // small compensation instead of stacking speed linearly with vocabulary.
  const vocabularyComplexity =
    1 + vocabularyProgress * 0.45;
  const vocabularyReactionFactor =
    1 - vocabularyProgress * 0.1;

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

  const custom = input.mode === "custom";
  const enemySpeedSetting = custom ? clamp(input.customEnemySpeed ?? 1, 0.45, 1.65) : 1;
  const bulletSpeedSetting = custom ? clamp(input.customBulletSpeed ?? 1, 0.45, 1.65) : 1;
  const fireRateSetting = custom ? clamp(input.customFireRate ?? 1, 0.4, 1.6) : 1;
  const spawnRateSetting = custom ? clamp(input.customSpawnRate ?? 1, 0.55, 1.45) : 1;

  // Balanced is practice-first in the first Worlds. Total stage duration
  // grows separately from simultaneous pressure and hostile attack tempo.
  const earlyPractice = input.mode === "balanced" || input.mode === "relax"
    ? Math.max(0, 1 - (stage - 1) / 50)
    : 0;

  const combatPressure = clamp(
    stageFactor *
      definition.modeFactor *
      wpmFactor *
      accuracyFactor *
      vocabularyReactionFactor *
      roleFactor,
    0.55,
    3.6,
  );

  const modeStageBudgetScale = clamp(
    0.92 + (stage - 1) / 2600,
    0.92,
    1.3,
  );

  const enemySpeed = clamp(
    (0.74 + Math.sqrt(combatPressure) * 0.36) *
      (1 - earlyPractice * 0.09) * enemySpeedSetting,
    0.45,
    2.6,
  );

  const rawSpawnInterval =
    1.55 /
    Math.max(0.65, combatPressure);
  const spawnInterval = clamp(
    rawSpawnInterval / spawnRateSetting,
    definition.spawnIntervalFloor * (custom ? 0.75 : 1),
    definition.spawnIntervalCeiling * (custom ? 1.6 : 1),
  );

  const desiredMaxEnemies =
    2 +
    Math.floor(stage / 95) +
    Math.floor(combatPressure * 1.35);
  const maxEnemies = Math.max(
    2,
    Math.min(
      definition.maxEnemiesCap,
      desiredMaxEnemies,
    ),
  );

  const projectilePressure = clamp(
    (0.62 +
      combatPressure * 0.46 +
      stage / 1800) *
      definition.projectileScale * (1 - earlyPractice * 0.16),
    0.55,
    3.15,
  );

  const bossPressure = clamp(
    (0.74 +
      combatPressure * 0.43 +
      stageConfig.galaxy * 0.032) *
      definition.bossAggressionScale,
    0.75,
    3.15,
  );

  return {
    stageFactor,
    modeFactor: definition.modeFactor,
    wpmFactor,
    accuracyFactor,
    vocabularyComplexity,
    vocabularyReactionFactor,
    combatPressure,
    enemySpeed,
    spawnInterval,
    maxEnemies,
    projectilePressure,
    projectileSpeedScale: bulletSpeedSetting * (1 - earlyPractice * 0.18),
    bossPressure,
    targetWpm: targetWpm(input),
    pressureBudget:
      definition.pressureBudget *
      modeStageBudgetScale,
    urgentThreatCap: definition.urgentThreatCap,
    attackIntervalFactor:
      definition.attackIntervalFactor * (1 + earlyPractice * 0.46) / fireRateSetting,
    wordScoreOffset: definition.wordScoreOffset,
    controllerSupportCap:
      definition.controllerSupportCap,
    hardCcDurationFactor:
      definition.hardCcDurationFactor,
    ccImmunityFactor: definition.ccImmunityFactor,
    hiddenChallengeMultiplier:
      definition.hiddenChallengeMultiplier,
    rewardMultiplier: definition.rewardMultiplier,
    reactionWindow: definition.reactionWindow,
    formationComplexity:
      definition.formationComplexity,
  };
}

export function estimatedTypingSeconds(
  characterCount: number,
  wpm: number,
  reactionBuffer = 0.65,
): number {
  const safeCharacters = Math.max(
    1,
    Math.floor(characterCount),
  );
  const safeWordsPerMinute = safeWpm(wpm);

  // Standard typing convention: one WPM word ~= five characters.
  const typingSeconds =
    (safeCharacters * 12) /
    safeWordsPerMinute;
  return (
    typingSeconds +
    Math.max(0, reactionBuffer)
  );
}
