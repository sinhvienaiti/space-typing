import { clamp } from "../logic";
import type { AudioCategoryVolumes, GameSettings } from "../types";

export const DEFAULT_AUDIO_CATEGORY_VOLUMES: AudioCategoryVolumes = {
  typing: 1,
  combat: 1,
  warnings: 1,
  ui: 1,
  rewards: 1,
};

/** Recommended is the shipped quality target, not a repair preset. */
export const RECOMMENDED_AUDIO = {
  masterVolume: 1,
  pronunciationVolume: 1,
  musicVolume: 0.26,
  ambientVolume: 0.08,
  sfxVolume: 0.5,
  creditVolume: 1,
  announcerVolume: 0.85,
  audioCategoryVolumes: DEFAULT_AUDIO_CATEGORY_VOLUMES,
} as const;

export function sanitizeAudioLevel(value: unknown, fallback = 1, max = 1): number {
  return typeof value === "number" && Number.isFinite(value)
    ? clamp(value, 0, max)
    : clamp(fallback, 0, max);
}

export function sanitizeAudioCategoryVolumes(value: unknown): AudioCategoryVolumes {
  const source = value !== null && typeof value === "object"
    ? value as Partial<AudioCategoryVolumes>
    : {};
  return {
    typing: sanitizeAudioLevel(source.typing, 1),
    combat: sanitizeAudioLevel(source.combat, 1),
    warnings: sanitizeAudioLevel(source.warnings, 1),
    ui: sanitizeAudioLevel(source.ui, 1),
    rewards: sanitizeAudioLevel(source.rewards, 1),
  };
}

export function recommendedAudioSettings(settings: GameSettings): GameSettings {
  return {
    ...settings,
    masterVolume: RECOMMENDED_AUDIO.masterVolume,
    pronunciationVolume: RECOMMENDED_AUDIO.pronunciationVolume,
    musicVolume: RECOMMENDED_AUDIO.musicVolume,
    ambientVolume: RECOMMENDED_AUDIO.ambientVolume,
    sfxVolume: RECOMMENDED_AUDIO.sfxVolume,
    creditVolume: RECOMMENDED_AUDIO.creditVolume,
    announcerVolume: RECOMMENDED_AUDIO.announcerVolume,
    audioCategoryVolumes: { ...DEFAULT_AUDIO_CATEGORY_VOLUMES },
  };
}
