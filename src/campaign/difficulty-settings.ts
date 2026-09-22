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

export const DIFFICULTY_MODES = [
  "relax",
  "balanced",
  "hard",
  "extreme",
  "nightmare",
  "impossible",
  "adaptive",
  "custom",
] as const satisfies readonly DifficultyMode[];

const LEGACY_DIFFICULTY_MODE_MAP: Readonly<
  Record<string, DifficultyMode>
> = {
  relaxed: "relax",
  normal: "balanced",
  expert: "extreme",
};

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
  fallback: DifficultyMode,
): DifficultyMode {
  if (typeof value !== "string") return fallback;
  if (DIFFICULTY_MODES.includes(value as DifficultyMode)) {
    return value as DifficultyMode;
  }
  return LEGACY_DIFFICULTY_MODE_MAP[value] ?? fallback;
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
    mode: sanitizeDifficultyMode(raw.mode, fallback.mode),
    customTargetWpm:
      typeof raw.customTargetWpm === "number" &&
      Number.isFinite(raw.customTargetWpm)
        ? clamp(raw.customTargetWpm, 10, 300)
        : fallback.customTargetWpm,
    customPressure:
      typeof raw.customPressure === "number" &&
      Number.isFinite(raw.customPressure)
        ? clamp(raw.customPressure, 0.65, 1.6)
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
