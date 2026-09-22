import type {
  DifficultyInput,
  DifficultyMode,
} from "./types";
import {
  createAdaptiveProfile,
  recordAdaptiveResult,
  sanitizeAdaptiveProfile,
  type AdaptiveProfile,
} from "./adaptive-profile";
import { clamp } from "../logic";
import {
  DIFFICULTY_MODES,
  migrateDifficultyMode,
} from "./difficulty-modes";

export { DIFFICULTY_MODES };

export type DifficultySettings = {
  mode: DifficultyMode;
  customTargetWpm: number;
  customPressure: number;
  profile: AdaptiveProfile;
};

export function createDifficultySettings(): DifficultySettings {
  return {
    mode: "balanced",
    customTargetWpm: 60,
    customPressure: 1,
    profile: createAdaptiveProfile(),
  };
}

function sanitizeDifficultyMode(
  value: unknown,
): DifficultyMode | null {
  return migrateDifficultyMode(value);
}

export function sanitizeDifficultySettings(
  value: unknown,
): DifficultySettings {
  const fallback = createDifficultySettings();
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  const raw = value as {
    mode?: unknown;
    customTargetWpm?: unknown;
    customPressure?: unknown;
    profile?: unknown;
  };

  return {
    mode: sanitizeDifficultyMode(raw.mode) ?? fallback.mode,
    customTargetWpm:
      typeof raw.customTargetWpm === "number" &&
      Number.isFinite(raw.customTargetWpm)
        ? clamp(raw.customTargetWpm, 10, 300)
        : fallback.customTargetWpm,
    customPressure:
      typeof raw.customPressure === "number" &&
      Number.isFinite(raw.customPressure)
        ? clamp(raw.customPressure, 0.7, 1.45)
        : fallback.customPressure,
    profile: sanitizeAdaptiveProfile(raw.profile),
  };
}

export function recordDifficultyResult(
  input: DifficultySettings,
  wpm: number,
  accuracy: number,
): DifficultySettings {
  const state = sanitizeDifficultySettings(input);
  return {
    ...state,
    profile: recordAdaptiveResult(state.profile, wpm, accuracy),
  };
}

export function difficultyInputFromSettings(
  input: DifficultySettings,
  stage: number,
  vocabularyLevel: number,
): DifficultyInput {
  const state = sanitizeDifficultySettings(input);
  return {
    stage,
    mode: state.mode,
    vocabularyLevel,
    recentWpm: state.profile.smoothedWpm,
    recentAccuracy: state.profile.smoothedAccuracy,
    customTargetWpm: state.customTargetWpm,
    customPressure: state.customPressure,
  };
}
