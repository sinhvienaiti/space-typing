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
  customEnemySpeed: number;
  customBulletSpeed: number;
  customFireRate: number;
  customSpawnRate: number;
  profile: AdaptiveProfile;
  inputProfiles?: Partial<Record<"voice" | "hybrid", { encounters: number; voiceWords: number; elapsedSeconds: number; keyboardProfile?: AdaptiveProfile }>>;
};

export function createDifficultySettings(): DifficultySettings {
  return {
    mode: "balanced",
    customTargetWpm: 60,
    customPressure: 1,
    customEnemySpeed: 1,
    customBulletSpeed: 1,
    customFireRate: 1,
    customSpawnRate: 1,
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
    customEnemySpeed?: unknown;
    customBulletSpeed?: unknown;
    customFireRate?: unknown;
    customSpawnRate?: unknown;
    profile?: unknown;
    inputProfiles?: DifficultySettings["inputProfiles"];
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
    customEnemySpeed: typeof raw.customEnemySpeed === "number" && Number.isFinite(raw.customEnemySpeed)
      ? clamp(raw.customEnemySpeed, 0.1, 1.65) : fallback.customEnemySpeed,
    customBulletSpeed: typeof raw.customBulletSpeed === "number" && Number.isFinite(raw.customBulletSpeed)
      ? clamp(raw.customBulletSpeed, 0.1, 1.65) : fallback.customBulletSpeed,
    customFireRate: typeof raw.customFireRate === "number" && Number.isFinite(raw.customFireRate)
      ? clamp(raw.customFireRate, 0.1, 1.6) : fallback.customFireRate,
    customSpawnRate: typeof raw.customSpawnRate === "number" && Number.isFinite(raw.customSpawnRate)
      ? clamp(raw.customSpawnRate, 0.1, 1.45) : fallback.customSpawnRate,
    profile: sanitizeAdaptiveProfile(raw.profile),
    ...(raw.inputProfiles && typeof raw.inputProfiles === "object" ? { inputProfiles: Object.fromEntries((["voice", "hybrid"] as const).flatMap(mode => {
      const p = raw.inputProfiles?.[mode];
      if (!p || ![p.encounters, p.voiceWords, p.elapsedSeconds].every(n => typeof n === "number" && Number.isFinite(n) && n >= 0)) return [];
      return [[mode, { encounters: Math.min(10000, Math.floor(p.encounters)), voiceWords: Math.min(1e7, Math.floor(p.voiceWords)), elapsedSeconds: Math.min(1e9, p.elapsedSeconds), ...(p.keyboardProfile ? { keyboardProfile: sanitizeAdaptiveProfile(p.keyboardProfile) } : {}) }]];
    })) } : {}),
  };
}

export function recordDifficultyResult(
  input: DifficultySettings,
  wpm: number,
  accuracy: number,
  source?: { mode: "typing" | "voice" | "hybrid"; voiceWords: number; elapsedSeconds: number },
): DifficultySettings {
  const state = sanitizeDifficultySettings(input);
  if (source && source.mode !== "typing") {
    const previous = state.inputProfiles?.[source.mode] ?? { encounters: 0, voiceWords: 0, elapsedSeconds: 0 };
    return { ...state, inputProfiles: { ...state.inputProfiles, [source.mode]: {
      encounters: Math.min(10000, previous.encounters + 1), voiceWords: Math.min(1e7, previous.voiceWords + Math.max(0, source.voiceWords)), elapsedSeconds: Math.min(1e9, previous.elapsedSeconds + Math.max(0, source.elapsedSeconds)),
      ...(source.mode === "hybrid" ? { keyboardProfile: recordAdaptiveResult(previous.keyboardProfile ?? createAdaptiveProfile(), wpm, accuracy) } : {}),
    } } };
  }
  return {
    ...state,
    profile: recordAdaptiveResult(state.profile, wpm, accuracy),
  };
}

export function difficultyInputFromSettings(
  input: DifficultySettings,
  stage: number,
  vocabularyLevel: number,
  mode: "typing" | "voice" | "hybrid" = "typing",
): DifficultyInput {
  const state = sanitizeDifficultySettings(input);
  const profile = mode === "typing" ? state.profile : mode === "hybrid" ? state.inputProfiles?.hybrid?.keyboardProfile ?? createAdaptiveProfile() : createAdaptiveProfile();
  return {
    stage,
    mode: state.mode,
    vocabularyLevel,
    recentWpm: profile.smoothedWpm,
    recentAccuracy: profile.smoothedAccuracy,
    customTargetWpm: state.customTargetWpm,
    customPressure: state.customPressure,
    customEnemySpeed: state.customEnemySpeed,
    customBulletSpeed: state.customBulletSpeed,
    customFireRate: state.customFireRate,
    customSpawnRate: state.customSpawnRate,
  };
}
