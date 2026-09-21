import { clamp } from "../logic";
import type { StatBonus } from "../stats/core";
import {
  createEmptyTalentRanks,
  isValidTalentRanks,
  sanitizeTalentRanks,
  talentPointsForLevel,
  totalTalentPoints,
  type TalentRanks,
} from "./talents";

export const MAX_CHARACTER_LEVEL = 50;
export const MAX_CHARACTER_MASTERY = 20;

export type CharacterProgress = {
  level: number;
  xp: number;
  mastery: number;
  masteryXp: number;
  talents: TalentRanks;
};

export type CharacterProgressAward = {
  progress: CharacterProgress;
  xpGained: number;
  levelUps: number;
  masteryUps: number;
};

export type CharacterClearPerformance = {
  stage: number;
  accuracy: number;
  wpm: number;
};

export function createStarterCharacterProgress(): CharacterProgress {
  return {
    level: 1,
    xp: 0,
    mastery: 0,
    masteryXp: 0,
    talents: createEmptyTalentRanks(),
  };
}

export function xpNeededForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.min(MAX_CHARACTER_LEVEL, Math.floor(level)));
  return 120 + safeLevel * 35;
}

export function xpNeededForMastery(mastery: number): number {
  const safeMastery = Math.max(
    0,
    Math.min(MAX_CHARACTER_MASTERY, Math.floor(mastery)),
  );
  return 300 + safeMastery * 100;
}

export function stageClearCharacterXp(
  performance: CharacterClearPerformance,
): number {
  const stage = clamp(Math.floor(performance.stage), 1, 1000);
  const accuracy = clamp(performance.accuracy, 0, 100);
  const wpm = clamp(performance.wpm, 0, 150);

  return Math.round(
    50 +
      Math.min(250, stage * 0.3) +
      accuracy * 0.6 +
      wpm * 0.3,
  );
}

export function awardCharacterProgress(
  current: CharacterProgress,
  performance: CharacterClearPerformance,
): CharacterProgressAward {
  const xpGained = stageClearCharacterXp(performance);
  let level = current.level;
  let xp = current.xp + xpGained;
  let mastery = current.mastery;
  let masteryXp = current.masteryXp + Math.max(12, Math.round(xpGained * 0.22));
  let levelUps = 0;
  let masteryUps = 0;

  while (level < MAX_CHARACTER_LEVEL) {
    const needed = xpNeededForLevel(level);
    if (xp < needed) break;
    xp -= needed;
    level += 1;
    levelUps += 1;
  }

  if (level >= MAX_CHARACTER_LEVEL) {
    level = MAX_CHARACTER_LEVEL;
    xp = 0;
  }

  while (mastery < MAX_CHARACTER_MASTERY) {
    const needed = xpNeededForMastery(mastery);
    if (masteryXp < needed) break;
    masteryXp -= needed;
    mastery += 1;
    masteryUps += 1;
  }

  if (mastery >= MAX_CHARACTER_MASTERY) {
    mastery = MAX_CHARACTER_MASTERY;
    masteryXp = 0;
  }

  return {
    progress: {
      level,
      xp,
      mastery,
      masteryXp,
      talents: current.talents,
    },
    xpGained,
    levelUps,
    masteryUps,
  };
}

export function sanitizeCharacterProgress(value: unknown): CharacterProgress {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return createStarterCharacterProgress();
  }

  const raw = value as {
    level?: unknown;
    xp?: unknown;
    mastery?: unknown;
    masteryXp?: unknown;
    talents?: unknown;
  };

  const level =
    typeof raw.level === "number" && Number.isFinite(raw.level)
      ? Math.floor(clamp(raw.level, 1, MAX_CHARACTER_LEVEL))
      : 1;
  const mastery =
    typeof raw.mastery === "number" && Number.isFinite(raw.mastery)
      ? Math.floor(clamp(raw.mastery, 0, MAX_CHARACTER_MASTERY))
      : 0;

  const talents = sanitizeTalentRanks(raw.talents);
  const allowedTalentPoints = talentPointsForLevel(level);
  while (totalTalentPoints(talents) > allowedTalentPoints) {
    if (talents.reactor > 0) {
      talents.reactor -= 1;
    } else if (talents.bulwark > 0) {
      talents.bulwark -= 1;
    } else if (talents.assault > 0) {
      talents.assault -= 1;
    }
  }

  return {
    level,
    xp:
      level >= MAX_CHARACTER_LEVEL
        ? 0
        : typeof raw.xp === "number" && Number.isFinite(raw.xp)
          ? Math.floor(clamp(raw.xp, 0, xpNeededForLevel(level) - 1))
          : 0,
    mastery,
    masteryXp:
      mastery >= MAX_CHARACTER_MASTERY
        ? 0
        : typeof raw.masteryXp === "number" && Number.isFinite(raw.masteryXp)
          ? Math.floor(
              clamp(raw.masteryXp, 0, xpNeededForMastery(mastery) - 1),
            )
          : 0,
    talents,
  };
}

export function isValidCharacterProgress(
  value: unknown,
): value is CharacterProgress {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const raw = value as CharacterProgress;
  if (
    !Number.isInteger(raw.level) ||
    raw.level < 1 ||
    raw.level > MAX_CHARACTER_LEVEL ||
    !Number.isInteger(raw.xp) ||
    raw.xp < 0 ||
    !Number.isInteger(raw.mastery) ||
    raw.mastery < 0 ||
    raw.mastery > MAX_CHARACTER_MASTERY ||
    !Number.isInteger(raw.masteryXp) ||
    raw.masteryXp < 0 ||
    !isValidTalentRanks(raw.talents) ||
    totalTalentPoints(raw.talents) > talentPointsForLevel(raw.level)
  ) {
    return false;
  }

  if (
    (raw.level >= MAX_CHARACTER_LEVEL && raw.xp !== 0) ||
    (raw.level < MAX_CHARACTER_LEVEL &&
      raw.xp >= xpNeededForLevel(raw.level))
  ) {
    return false;
  }

  return (
    (raw.mastery >= MAX_CHARACTER_MASTERY && raw.masteryXp === 0) ||
    (raw.mastery < MAX_CHARACTER_MASTERY &&
      raw.masteryXp < xpNeededForMastery(raw.mastery))
  );
}

export function characterProgressStatBonus(
  progress: CharacterProgress,
): StatBonus {
  const levelDelta = Math.max(0, progress.level - 1);
  const mastery = Math.max(0, progress.mastery);

  return {
    hull: levelDelta * 0.6 + mastery * 0.8,
    shield: levelDelta * 0.4 + mastery * 0.5,
    firepower: levelDelta * 0.16 + mastery * 0.3,
    energy: levelDelta * 0.35 + mastery * 0.5,
    reactor: levelDelta * 0.05 + mastery * 0.1,
    focus: levelDelta * 0.08 + mastery * 0.2,
  };
}
