import { clamp } from "../logic";

export const AUDIO_GROUPS = [
  "typing",
  "combat",
  "warnings",
  "ui",
  "rewards",
] as const;

export type AudioGroup = (typeof AUDIO_GROUPS)[number];

export const AUDIO_GROUP_GAIN: Record<AudioGroup, number> = {
  typing: 0.82,
  combat: 0.72,
  warnings: 0.9,
  ui: 0.62,
  // Credit crystal drops and pickups: above combat so the gem stream reads
  // through explosions, below warnings.
  rewards: 0.86,
};

export const PRONUNCIATION_DUCK: Record<AudioGroup, number> = {
  typing: 0.32,
  combat: 0.38,
  warnings: 0.68,
  ui: 0.45,
  // Crystals fly home while the word is being spoken; a light dip keeps the
  // voice on top without losing the pickup stream.
  rewards: 0.7,
};

export function sfxFocusGain(
  group: AudioGroup,
  pronunciationActive = false,
): number {
  return pronunciationActive ? PRONUNCIATION_DUCK[group] : 1;
}

export function sfxGroupBusGain(
  master: number,
  group: AudioGroup,
  pronunciationActive = false,
  categoryPreference = 1,
): number {
  return (
    clamp(master, 0, 1) *
    AUDIO_GROUP_GAIN[group] *
    sfxFocusGain(group, pronunciationActive) *
    clamp(categoryPreference, 0, 1)
  );
}

export function baseSfxEventGain(eventGain: number): number {
  return clamp(eventGain, 0, 1);
}

export function mixedSfxGain(
  master: number,
  group: AudioGroup,
  eventGain: number,
  pronunciationActive = false,
  categoryPreference = 1,
): number {
  return (
    sfxGroupBusGain(master, group, pronunciationActive, categoryPreference) *
    baseSfxEventGain(eventGain)
  );
}
