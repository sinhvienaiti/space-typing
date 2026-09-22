import { clamp } from "../logic";

export type AdaptiveProfile = {
  smoothedWpm: number;
  smoothedAccuracy: number;
  samples: number;
};

export function createAdaptiveProfile(): AdaptiveProfile {
  return {
    smoothedWpm: 60,
    smoothedAccuracy: 96,
    samples: 0,
  };
}

export function sanitizeAdaptiveProfile(
  value: unknown,
): AdaptiveProfile {
  const fallback = createAdaptiveProfile();
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  const raw = value as Partial<AdaptiveProfile>;
  return {
    smoothedWpm:
      typeof raw.smoothedWpm === "number" &&
      Number.isFinite(raw.smoothedWpm)
        ? clamp(raw.smoothedWpm, 20, 220)
        : fallback.smoothedWpm,
    smoothedAccuracy:
      typeof raw.smoothedAccuracy === "number" &&
      Number.isFinite(raw.smoothedAccuracy)
        ? clamp(raw.smoothedAccuracy, 60, 100)
        : fallback.smoothedAccuracy,
    samples:
      typeof raw.samples === "number" &&
      Number.isFinite(raw.samples)
        ? Math.floor(clamp(raw.samples, 0, 10_000))
        : 0,
  };
}

export function recordAdaptiveResult(
  input: AdaptiveProfile,
  wpm: number,
  accuracy: number,
): AdaptiveProfile {
  const state = sanitizeAdaptiveProfile(input);
  const nextWpm = clamp(Number.isFinite(wpm) ? wpm : 60, 20, 220);
  const nextAccuracy = clamp(
    Number.isFinite(accuracy) ? accuracy : 95,
    60,
    100,
  );

  if (state.samples === 0) {
    return {
      smoothedWpm: nextWpm,
      smoothedAccuracy: nextAccuracy,
      samples: 1,
    };
  }

  const alpha = 0.25;
  return {
    smoothedWpm:
      state.smoothedWpm * (1 - alpha) + nextWpm * alpha,
    smoothedAccuracy:
      state.smoothedAccuracy * (1 - alpha) + nextAccuracy * alpha,
    samples: Math.min(10_000, state.samples + 1),
  };
}
