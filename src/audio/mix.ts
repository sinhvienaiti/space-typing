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

export function mixedSfxGain(
  master: number,
  group: AudioGroup,
  eventGain: number,
  pronunciationActive = false,
): number {
  const safeMaster = clamp(master, 0, 1);
  const safeEvent = clamp(eventGain, 0, 1);
  const duck = pronunciationActive ? PRONUNCIATION_DUCK[group] : 1;
  return safeMaster * AUDIO_GROUP_GAIN[group] * safeEvent * duck;
}
